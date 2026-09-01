-- ParFolio ATG-v148 compatibility supplement: local admin course workspace + storage.
-- Safe to run after supabase/atg-v148-compatibility.sql. Idempotent.
-- This contains no ATG user, round, score, chat, or private course data.

create extension if not exists pgcrypto;

-- ATG v148 still expects a small local `courses` workspace for administrator-created or
-- corrected courses. The neutral Shared Golf Course Library is loaded separately in the browser.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  holes smallint not null check (holes in (9,18)),
  pars jsonb not null default '[]'::jsonb,
  greens jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

drop policy if exists "Authenticated golfers can view local courses" on public.courses;
drop policy if exists "Course admins can create local courses" on public.courses;
drop policy if exists "Course admins can update local courses" on public.courses;
drop policy if exists "Super admins can delete local courses" on public.courses;

create policy "Authenticated golfers can view local courses"
on public.courses for select to authenticated
using (true);

create policy "Course admins can create local courses"
on public.courses for insert to authenticated
with check (public.is_course_admin() and created_by=(select auth.uid()));

create policy "Course admins can update local courses"
on public.courses for update to authenticated
using (public.is_course_admin())
with check (public.is_course_admin() and updated_by=(select auth.uid()));

create policy "Super admins can delete local courses"
on public.courses for delete to authenticated
using (public.is_super_admin());

grant select on public.courses to authenticated;
grant insert,update,delete on public.courses to authenticated;

-- Storage buckets expected by app.js.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'golfer-avatars','golfer-avatars',true,5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'round-chat-media','round-chat-media',false,5242880,
  array['image/jpeg']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Avatar object name is exactly: <auth.uid()>/avatar.jpg
-- Public read is intentional because app.js uses getPublicUrl().
drop policy if exists "Avatar public read" on storage.objects;
drop policy if exists "Golfers upload own avatar" on storage.objects;
drop policy if exists "Golfers update own avatar" on storage.objects;
drop policy if exists "Golfers delete own avatar" on storage.objects;

create policy "Avatar public read"
on storage.objects for select to public
using (bucket_id='golfer-avatars');

create policy "Golfers upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id='golfer-avatars'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and name=(select auth.uid())::text || '/avatar.jpg'
);

create policy "Golfers update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id='golfer-avatars'
  and (storage.foldername(name))[1]=(select auth.uid())::text
)
with check (
  bucket_id='golfer-avatars'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and name=(select auth.uid())::text || '/avatar.jpg'
);

create policy "Golfers delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id='golfer-avatars'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

-- Chat object name: <round_uuid>/<uploader_uuid>/<random>.jpg
-- A participant may read the media for that round; only the uploader or round host may delete it.
drop policy if exists "Round participants read chat media" on storage.objects;
drop policy if exists "Round participants upload own chat media" on storage.objects;
drop policy if exists "Uploader or host deletes chat media" on storage.objects;

create policy "Round participants read chat media"
on storage.objects for select to authenticated
using (
  bucket_id='round-chat-media'
  and array_length(storage.foldername(name),1)>=2
  and public.is_round_participant(((storage.foldername(name))[1])::uuid)
);

create policy "Round participants upload own chat media"
on storage.objects for insert to authenticated
with check (
  bucket_id='round-chat-media'
  and array_length(storage.foldername(name),1)>=2
  and ((storage.foldername(name))[2])=(select auth.uid())::text
  and public.is_round_participant(((storage.foldername(name))[1])::uuid)
  and public.is_round_active(((storage.foldername(name))[1])::uuid)
);

create policy "Uploader or host deletes chat media"
on storage.objects for delete to authenticated
using (
  bucket_id='round-chat-media'
  and array_length(storage.foldername(name),1)>=2
  and public.can_delete_round_media(
    ((storage.foldername(name))[1])::uuid,
    ((storage.foldername(name))[2])::uuid
  )
);
