-- Run this entire file once in the Supabase SQL Editor.
-- It creates private realtime chat, including compressed photo sharing,
-- for round participants. This file is safe to run again as an upgrade.

create table if not exists public.round_messages (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  media_path text,
  media_type text,
  media_name text,
  created_at timestamptz not null default now()
);

alter table public.round_messages add column if not exists media_path text;
alter table public.round_messages add column if not exists media_type text;
alter table public.round_messages add column if not exists media_name text;
alter table public.round_messages alter column message drop not null;
alter table public.round_messages drop constraint if exists round_messages_message_check;
alter table public.round_messages drop constraint if exists round_messages_content_check;
alter table public.round_messages add constraint round_messages_content_check check (
  char_length(trim(coalesce(message, ''))) <= 500
  and (
    char_length(trim(coalesce(message, ''))) >= 1
    or (media_path is not null and media_type = 'image/jpeg')
  )
);

create index if not exists round_messages_round_created_idx
  on public.round_messages (round_id, created_at);

alter table public.round_messages enable row level security;

drop policy if exists "Participants can view round messages" on public.round_messages;
create policy "Participants can view round messages"
on public.round_messages for select to authenticated
using (public.is_round_participant(round_id));

drop policy if exists "Participants can send round messages" on public.round_messages;
create policy "Participants can send round messages"
on public.round_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_round_participant(round_id)
);

revoke all on public.round_messages from anon, authenticated;
grant select, insert on public.round_messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('round-chat-media', 'round-chat-media', false, 3145728, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Round golfers can view chat photos" on storage.objects;
create policy "Round golfers can view chat photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'round-chat-media'
  and public.is_round_participant(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Round golfers can upload chat photos" on storage.objects;
create policy "Round golfers can upload chat photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'round-chat-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.is_round_participant(((storage.foldername(name))[1])::uuid)
);

create or replace function public.can_delete_round_media(target_round uuid, uploader uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = uploader
  or exists (
    select 1 from public.shared_rounds
    where id = target_round and created_by = (select auth.uid())
  );
$$;

revoke all on function public.can_delete_round_media(uuid, uuid) from public, anon;
grant execute on function public.can_delete_round_media(uuid, uuid) to authenticated;

drop policy if exists "Golfers and hosts can delete chat photos" on storage.objects;
create policy "Golfers and hosts can delete chat photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'round-chat-media'
  and public.can_delete_round_media(
    ((storage.foldername(name))[1])::uuid,
    ((storage.foldername(name))[2])::uuid
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'round_messages'
  ) then
    alter publication supabase_realtime add table public.round_messages;
  end if;
end;
$$;
