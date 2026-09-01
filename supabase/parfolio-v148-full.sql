-- ParFolio v148 complete Supabase installer
-- Generated from the audited compatibility migrations. No ATG user/round/chat/private data is included.
-- Safe to re-run: table/function/policy/bucket operations are written to be idempotent.

-- ParFolio backend compatibility layer for the ATG v148 frontend.
-- This creates the private round/profile/chat tables and RPCs expected by the copied ATG UI.
-- It intentionally does NOT copy any ATG user data, scores, chat, credentials, or private course data.
-- Course IDs remain external/shared-library references, so shared_rounds.course_id has no local FK.

create extension if not exists pgcrypto;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','course_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.golfer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  phone text not null check (length(trim(phone)) between 7 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  avatar_path text
);

create table if not exists public.golfer_club_distances (
  user_id uuid not null references auth.users(id) on delete cascade,
  club text not null check (char_length(trim(club)) between 1 and 40),
  carry_yards smallint not null check (carry_yards between 20 and 350),
  updated_at timestamptz not null default now(),
  primary key (user_id, club)
);

create table if not exists public.shared_rounds (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  course_id uuid,
  course_name text not null,
  holes smallint not null check (holes in (9,18)),
  pars jsonb not null,
  status text not null default 'active' check (status in ('active','complete')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_players (
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

create table if not exists public.round_scores (
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hole smallint not null check (hole between 1 and 18),
  strokes smallint not null check (strokes between 1 and 20),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id, hole),
  foreign key (round_id, user_id) references public.round_players(round_id, user_id) on delete cascade
);

create table if not exists public.round_hole_stats (
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hole smallint not null check (hole between 1 and 18),
  putts smallint check (putts between 0 and 4),
  fairway_hit boolean,
  green_in_regulation boolean,
  chip_shots smallint check (chip_shots between 0 and 9),
  sand_shots smallint check (sand_shots between 0 and 9),
  penalties smallint check (penalties between 0 and 9),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id, hole),
  foreign key (round_id, user_id) references public.round_players(round_id, user_id) on delete cascade
);

create table if not exists public.round_messages (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  created_at timestamptz not null default now(),
  media_path text,
  media_type text,
  media_name text,
  constraint round_messages_content_check check (
    char_length(trim(coalesce(message,''))) <= 500
    and (
      char_length(trim(coalesce(message,''))) >= 1
      or (media_path is not null and media_type = 'image/jpeg')
    )
  )
);

create table if not exists public.hidden_round_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, round_id)
);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.app_admins where user_id=(select auth.uid()) and role='super_admin');
$$;

create or replace function public.is_course_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.app_admins where user_id=(select auth.uid()) and role in ('super_admin','course_admin'));
$$;

create or replace function public.is_round_participant(target_round uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.round_players where round_id=target_round and user_id=(select auth.uid()));
$$;

create or replace function public.is_round_active(target_round uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.shared_rounds where id=target_round and status='active');
$$;

create or replace function public.can_delete_round_media(target_round uuid, uploader uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select (select auth.uid()) = uploader
  or exists (select 1 from public.shared_rounds where id=target_round and created_by=(select auth.uid()));
$$;

create or replace function public.create_shared_round(
  p_course_id uuid, p_course_name text, p_holes smallint, p_pars jsonb, p_display_name text
) returns jsonb language plpgsql security definer set search_path to '' as $$
declare new_round_id uuid; new_code text;
begin
  if (select auth.uid()) is null then raise exception 'Sign in is required' using errcode='42501'; end if;
  if p_holes not in (9,18) then raise exception 'Round must have 9 or 18 holes'; end if;
  if jsonb_typeof(p_pars) <> 'array' or jsonb_array_length(p_pars) <> p_holes then raise exception 'Par list does not match hole count'; end if;
  if char_length(trim(p_display_name)) not between 1 and 40 then raise exception 'Enter your player name'; end if;
  loop
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text),1,6));
    exit when not exists (select 1 from public.shared_rounds where join_code=new_code);
  end loop;
  insert into public.shared_rounds(join_code,course_id,course_name,holes,pars,created_by)
  values(new_code,p_course_id,trim(p_course_name),p_holes,p_pars,(select auth.uid())) returning id into new_round_id;
  insert into public.round_players(round_id,user_id,display_name)
  values(new_round_id,(select auth.uid()),trim(p_display_name));
  return jsonb_build_object('round_id',new_round_id,'join_code',new_code);
end; $$;

create or replace function public.join_shared_round(p_join_code text,p_display_name text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare target_round public.shared_rounds%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Sign in is required' using errcode='42501'; end if;
  if char_length(trim(p_display_name)) not between 1 and 40 then raise exception 'Enter your player name'; end if;
  select * into target_round from public.shared_rounds where join_code=upper(trim(p_join_code)) and status='active';
  if target_round.id is null then raise exception 'Round code not found'; end if;
  insert into public.round_players(round_id,user_id,display_name)
  values(target_round.id,(select auth.uid()),trim(p_display_name))
  on conflict(round_id,user_id) do update set display_name=excluded.display_name;
  return jsonb_build_object('round_id',target_round.id,'join_code',target_round.join_code);
end; $$;

create or replace function public.manage_round_status(p_round_id uuid,p_status text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_status not in ('active','complete') then raise exception 'Invalid round status'; end if;
  update public.shared_rounds set status=p_status,updated_at=now()
  where id=p_round_id and created_by=(select auth.uid());
  if not found then raise exception 'Only the round host can change its status' using errcode='42501'; end if;
end; $$;

create or replace function public.remove_round_player(p_round_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not exists(select 1 from public.shared_rounds where id=p_round_id and created_by=(select auth.uid())) then
    raise exception 'Only the round host can remove a player' using errcode='42501';
  end if;
  if p_user_id=(select auth.uid()) then raise exception 'The round host cannot remove themselves'; end if;
  if exists(select 1 from public.round_scores where round_id=p_round_id and user_id=p_user_id) then
    raise exception 'This player already has recorded scores and cannot be removed';
  end if;
  delete from public.round_players where round_id=p_round_id and user_id=p_user_id;
  if not found then raise exception 'Player not found'; end if;
end; $$;

create or replace function public.delete_owned_round(p_round_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  delete from public.shared_rounds where id=p_round_id and created_by=(select auth.uid());
  if not found then raise exception 'Only the round creator can permanently delete this round' using errcode='42501'; end if;
end; $$;

create or replace function public.hide_round_from_my_history(p_round_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not exists(select 1 from public.round_players where round_id=p_round_id and user_id=(select auth.uid())) then
    raise exception 'You did not participate in this round' using errcode='42501';
  end if;
  insert into public.hidden_round_history(user_id,round_id) values((select auth.uid()),p_round_id)
  on conflict(user_id,round_id) do nothing;
end; $$;

create or replace function public.save_my_club_distances(p_distances jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare saved_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Sign in is required' using errcode='42501'; end if;
  if p_distances is null or jsonb_typeof(p_distances) <> 'object' then raise exception 'Club distances must be a JSON object'; end if;
  delete from public.golfer_club_distances where user_id=(select auth.uid());
  insert into public.golfer_club_distances(user_id,club,carry_yards,updated_at)
  select (select auth.uid()),trim(entry.key),entry.value::smallint,now()
  from jsonb_each_text(p_distances) entry
  where char_length(trim(entry.key)) between 1 and 40
    and entry.value ~ '^[0-9]{2,3}$'
    and entry.value::integer between 20 and 350;
  get diagnostics saved_count=row_count;
  return saved_count;
end; $$;

create or replace function public.save_my_golfer_profile(p_first_name text,p_last_name text,p_phone text)
returns void language plpgsql security definer set search_path to '' as $$
declare viewer_id uuid := (select auth.uid()); given_name text:=trim(coalesce(p_first_name,'')); family_name text:=trim(coalesce(p_last_name,'')); phone_number text:=trim(coalesce(p_phone,''));
begin
  if viewer_id is null then raise exception 'Sign in before saving a golfer profile' using errcode='42501'; end if;
  if length(given_name) not between 1 and 80 or length(family_name) not between 1 and 80 then raise exception 'First and last name are required'; end if;
  if length(phone_number) not between 7 and 30 then raise exception 'Enter a valid phone number'; end if;
  insert into public.golfer_profiles(user_id,first_name,last_name,phone)
  values(viewer_id,given_name,family_name,phone_number)
  on conflict(user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,updated_at=now();
end; $$;

create or replace function public.save_my_avatar_path(p_avatar_path text)
returns void language plpgsql security definer set search_path to '' as $$
declare viewer_id uuid := (select auth.uid()); clean_path text:=trim(coalesce(p_avatar_path,''));
begin
  if viewer_id is null then raise exception 'Sign in before uploading a profile picture' using errcode='42501'; end if;
  if clean_path <> viewer_id::text || '/avatar.jpg' then raise exception 'Invalid profile picture path'; end if;
  update public.golfer_profiles set avatar_path=clean_path,updated_at=now() where user_id=viewer_id;
  if not found then raise exception 'Complete your golfer profile before uploading a picture'; end if;
end; $$;

create or replace function public.list_registered_golfers()
returns table(user_id uuid,first_name text,last_name text,email text,phone text,avatar_path text)
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_super_admin() then raise exception 'Only the Super Admin can view registered golfers' using errcode='42501'; end if;
  return query
  select u.id,p.first_name,p.last_name,u.email::text,p.phone,p.avatar_path
  from auth.users u left join public.golfer_profiles p on p.user_id=u.id
  order by p.last_name nulls last,p.first_name nulls last,u.email;
end; $$;

create or replace function public.set_course_admin(target_email text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare target_id uuid; normalized_email text:=lower(trim(target_email));
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can add course administrators' using errcode='42501'; end if;
  select id into target_id from auth.users where lower(email)=normalized_email;
  if target_id is null then raise exception 'No app user exists with this email'; end if;
  if target_id=(select auth.uid()) then raise exception 'Your own super-admin role cannot be replaced'; end if;
  insert into public.app_admins(user_id,role) values(target_id,'course_admin')
  on conflict(user_id) do update set role='course_admin';
  return jsonb_build_object('user_id',target_id,'email',normalized_email,'role','course_admin');
end; $$;

create or replace function public.create_golfer_profile_after_signup()
returns trigger language plpgsql security definer set search_path to '' as $$
declare given_name text:=trim(coalesce(new.raw_user_meta_data->>'first_name','')); family_name text:=trim(coalesce(new.raw_user_meta_data->>'last_name','')); phone_number text:=trim(coalesce(new.raw_user_meta_data->>'phone',''));
begin
  if given_name<>'' and family_name<>'' and phone_number<>'' then
    insert into public.golfer_profiles(user_id,first_name,last_name,phone)
    values(new.id,given_name,family_name,phone_number)
    on conflict(user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,updated_at=now();
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_golfer_profile on auth.users;
create trigger on_auth_user_created_golfer_profile after insert on auth.users
for each row execute function public.create_golfer_profile_after_signup();

-- Backfill existing ParFolio profiles if the earlier beta table still exists.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $q$
      insert into public.golfer_profiles(user_id,first_name,last_name,phone)
      select id,trim(first_name),trim(last_name),trim(phone)
      from public.profiles
      where nullif(trim(first_name),'') is not null
        and nullif(trim(last_name),'') is not null
        and length(trim(phone)) between 7 and 30
      on conflict(user_id) do update
      set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,updated_at=now()
    $q$;
  end if;
end $$;

-- RLS
alter table public.app_admins enable row level security;
alter table public.golfer_profiles enable row level security;
alter table public.golfer_club_distances enable row level security;
alter table public.shared_rounds enable row level security;
alter table public.round_players enable row level security;
alter table public.round_scores enable row level security;
alter table public.round_hole_stats enable row level security;
alter table public.round_messages enable row level security;
alter table public.hidden_round_history enable row level security;

-- Recreate policies idempotently.
do $$ declare r record; begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('app_admins','golfer_profiles','golfer_club_distances','shared_rounds','round_players','round_scores','round_hole_stats','round_messages','hidden_round_history') loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

create policy "Admins can view their own role" on public.app_admins for select to authenticated using (user_id=(select auth.uid()) or public.is_super_admin());
create policy "Super admins can add administrators" on public.app_admins for insert to authenticated with check (public.is_super_admin());
create policy "Super admins can update administrators" on public.app_admins for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "Super admins can remove administrators" on public.app_admins for delete to authenticated using (public.is_super_admin());

create policy "Golfers can view their own profile" on public.golfer_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "Golfers can create their own profile" on public.golfer_profiles for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Golfers can update their own profile" on public.golfer_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "Golfers can view their own club distances" on public.golfer_club_distances for select to authenticated using (user_id=(select auth.uid()));

create policy "Participants can view rounds" on public.shared_rounds for select to authenticated using (public.is_round_participant(id));
create policy "Creators can update rounds" on public.shared_rounds for update to authenticated using (created_by=(select auth.uid())) with check (created_by=(select auth.uid()));
create policy "Participants can view players" on public.round_players for select to authenticated using (public.is_round_participant(round_id));
create policy "Participants can view scores" on public.round_scores for select to authenticated using (public.is_round_participant(round_id));
create policy "Golfers can add their own scores" on public.round_scores for insert to authenticated with check (user_id=(select auth.uid()) and public.is_round_participant(round_id) and public.is_round_active(round_id));
create policy "Golfers can update their own scores" on public.round_scores for update to authenticated using (user_id=(select auth.uid()) and public.is_round_participant(round_id) and public.is_round_active(round_id)) with check (user_id=(select auth.uid()) and public.is_round_active(round_id));
create policy "Participants can view hole stats" on public.round_hole_stats for select to authenticated using (public.is_round_participant(round_id));
create policy "Golfers can add their own hole stats" on public.round_hole_stats for insert to authenticated with check (user_id=(select auth.uid()) and public.is_round_participant(round_id));
create policy "Golfers can update their own hole stats" on public.round_hole_stats for update to authenticated using (user_id=(select auth.uid()) and public.is_round_participant(round_id)) with check (user_id=(select auth.uid()));
create policy "Participants can view round messages" on public.round_messages for select to authenticated using (public.is_round_participant(round_id));
create policy "Participants can send round messages" on public.round_messages for insert to authenticated with check (user_id=(select auth.uid()) and public.is_round_participant(round_id));
create policy "Golfers can view their hidden rounds" on public.hidden_round_history for select to authenticated using (user_id=(select auth.uid()));
create policy "Golfers can hide their own rounds" on public.hidden_round_history for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Golfers can restore their own rounds" on public.hidden_round_history for delete to authenticated using (user_id=(select auth.uid()));

-- Minimal grants; RLS remains the authorization boundary.
grant usage on schema public to authenticated;
grant select on public.app_admins,public.golfer_profiles,public.golfer_club_distances,public.shared_rounds,public.round_players,public.round_scores,public.round_hole_stats,public.round_messages,public.hidden_round_history to authenticated;
grant insert,update on public.golfer_profiles to authenticated;
grant insert,update on public.round_scores,public.round_hole_stats,public.round_messages to authenticated;
grant insert,delete on public.hidden_round_history to authenticated;
grant update on public.shared_rounds to authenticated;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_course_admin() to authenticated;
grant execute on function public.is_round_participant(uuid) to authenticated;
grant execute on function public.is_round_active(uuid) to authenticated;
grant execute on function public.can_delete_round_media(uuid,uuid) to authenticated;
grant execute on function public.create_shared_round(uuid,text,smallint,jsonb,text) to authenticated;
grant execute on function public.join_shared_round(text,text) to authenticated;
grant execute on function public.manage_round_status(uuid,text) to authenticated;
grant execute on function public.remove_round_player(uuid,uuid) to authenticated;
grant execute on function public.delete_owned_round(uuid) to authenticated;
grant execute on function public.hide_round_from_my_history(uuid) to authenticated;
grant execute on function public.save_my_club_distances(jsonb) to authenticated;
grant execute on function public.save_my_golfer_profile(text,text,text) to authenticated;
grant execute on function public.save_my_avatar_path(text) to authenticated;
grant execute on function public.list_registered_golfers() to authenticated;
grant execute on function public.set_course_admin(text) to authenticated;

-- ---- ParFolio local courses + storage supplement ----
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
