-- ParFolio v211 — private DM photos + delete-for-everyone / delete-for-me.

alter table public.direct_messages
  add column if not exists image_path text,
  add column if not exists image_mime text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_for uuid[] not null default '{}'::uuid[];

alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages drop constraint if exists direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check check (
  deleted_at is not null
  or char_length(btrim(coalesce(body,''))) between 1 and 2000
  or image_path is not null
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('dm-media','dm-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=8388608,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists dm_media_participant_read on storage.objects;
create policy dm_media_participant_read on storage.objects
for select to authenticated
using (
  bucket_id='dm-media'
  and exists (
    select 1 from public.direct_conversations c
    where c.id::text=split_part(name,'/',1)
      and auth.uid() in (c.user_a,c.user_b)
  )
);

drop policy if exists dm_media_sender_insert on storage.objects;
create policy dm_media_sender_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='dm-media'
  and split_part(name,'/',2)=auth.uid()::text
  and exists (
    select 1 from public.direct_conversations c
    where c.id::text=split_part(name,'/',1)
      and auth.uid() in (c.user_a,c.user_b)
  )
);

drop policy if exists dm_media_sender_delete on storage.objects;
create policy dm_media_sender_delete on storage.objects
for delete to authenticated
using (
  bucket_id='dm-media'
  and split_part(name,'/',2)=auth.uid()::text
  and exists (
    select 1 from public.direct_conversations c
    where c.id::text=split_part(name,'/',1)
      and auth.uid() in (c.user_a,c.user_b)
  )
);

drop policy if exists direct_messages_participant_read on public.direct_messages;
create policy direct_messages_participant_read on public.direct_messages
for select to authenticated
using (
  not (auth.uid()=any(hidden_for))
  and exists (
    select 1 from public.direct_conversations c
    where c.id=conversation_id and auth.uid() in (c.user_a,c.user_b)
  )
);

create or replace function public.social_send_dm_photo(conversation uuid, storage_path text, caption text default '')
returns bigint language plpgsql security definer
set search_path=pg_catalog,public,auth,storage
as $$
declare me uuid:=auth.uid(); mid bigint; other_user uuid;
begin
  select case when c.user_a=me then c.user_b when c.user_b=me then c.user_a else null end
    into other_user from public.direct_conversations c where c.id=conversation;
  if other_user is null then raise exception 'Conversation unavailable'; end if;
  if split_part(storage_path,'/',1)<>conversation::text or split_part(storage_path,'/',2)<>me::text then
    raise exception 'Invalid photo path';
  end if;
  if char_length(btrim(coalesce(caption,'')))>2000 then raise exception 'Caption too long'; end if;
  if exists(select 1 from public.user_blocks x where (x.blocker_id=me and x.blocked_id=other_user) or (x.blocker_id=other_user and x.blocked_id=me)) then
    raise exception 'Conversation unavailable';
  end if;
  insert into public.direct_messages(conversation_id,sender_id,body,image_path,image_mime)
  values(conversation,me,btrim(coalesce(caption,'')),storage_path,'image/jpeg') returning id into mid;
  update public.direct_conversations set last_message_at=now() where id=conversation;
  return mid;
end $$;

create or replace function public.social_delete_dm_for_me(message_id bigint)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,auth
as $$
declare me uuid:=auth.uid();
begin
  update public.direct_messages m
  set hidden_for=case when me=any(m.hidden_for) then m.hidden_for else array_append(m.hidden_for,me) end
  where m.id=message_id
    and exists(select 1 from public.direct_conversations c where c.id=m.conversation_id and me in (c.user_a,c.user_b));
  if not found then raise exception 'Message unavailable'; end if;
  return true;
end $$;

create or replace function public.social_delete_dm_for_everyone(message_id bigint)
returns text language plpgsql security definer
set search_path=pg_catalog,public,auth
as $$
declare me uuid:=auth.uid(); old_path text;
begin
  select image_path into old_path from public.direct_messages where id=message_id and sender_id=me for update;
  if not found then raise exception 'Only the sender can delete this message for everyone'; end if;
  update public.direct_messages
    set body='',image_path=null,image_mime=null,deleted_at=coalesce(deleted_at,now()),deleted_by=me
    where id=message_id;
  return old_path;
end $$;

create or replace function public.social_unread_dm_count()
returns bigint language sql stable security definer
set search_path=pg_catalog,public,auth
as $$
  select count(*)::bigint
  from public.direct_messages m
  join public.direct_conversations c on c.id=m.conversation_id
  where auth.uid() in (c.user_a,c.user_b)
    and m.sender_id<>auth.uid()
    and m.read_at is null
    and m.deleted_at is null
    and not (auth.uid()=any(m.hidden_for))
$$;

grant execute on function public.social_send_dm_photo(uuid,text,text) to authenticated;
grant execute on function public.social_delete_dm_for_me(bigint) to authenticated;
grant execute on function public.social_delete_dm_for_everyone(bigint) to authenticated;
grant select on public.direct_messages to authenticated;
