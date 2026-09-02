-- ParFolio v183 catalog-course correction queue.
-- Shared-library courses keep using the neutral library RPC. This queue covers
-- OpenGolf/catalog courses which do not yet have a neutral shared_course_id.

create extension if not exists pgcrypto;

create table if not exists public.course_correction_suggestions (
  id uuid primary key default gen_random_uuid(),
  course_ref text not null check (char_length(trim(course_ref)) between 1 and 180),
  shared_course_id uuid,
  open_golf_api_id text,
  course_name text not null check (char_length(trim(course_name)) between 1 and 180),
  issue_type text not null check (issue_type in ('routing','tee','aim','green','par','course_info','other')),
  hole_number smallint check (hole_number between 1 and 54),
  suggestion_text text not null check (char_length(trim(suggestion_text)) between 5 and 2000),
  suggested_lat double precision,
  suggested_lng double precision,
  submitter_name text check (submitter_name is null or char_length(submitter_name)<=120),
  submitter_email text check (submitter_email is null or char_length(submitter_email)<=254),
  submitted_by uuid references auth.users(id) on delete set null default auth.uid(),
  source_app text not null default 'parfolio' check (source_app='parfolio'),
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected')),
  created_at timestamptz not null default now(),
  check (
    (suggested_lat is null and suggested_lng is null)
    or (
      suggested_lat between -90 and 90
      and suggested_lng between -180 and 180
      and not (suggested_lat=0 and suggested_lng=0)
    )
  )
);

alter table public.course_correction_suggestions enable row level security;
revoke all on table public.course_correction_suggestions from public, anon, authenticated;

create index if not exists course_correction_suggestions_pending_idx
  on public.course_correction_suggestions (status, created_at desc);
create index if not exists course_correction_suggestions_course_ref_idx
  on public.course_correction_suggestions (course_ref, created_at desc);

create or replace function public.submit_parfolio_course_correction(
  p_course_ref text,
  p_open_golf_api_id text,
  p_course_name text,
  p_issue_type text,
  p_suggestion_text text,
  p_hole_number integer default null,
  p_suggested_lat double precision default null,
  p_suggested_lng double precision default null,
  p_submitter_name text default null,
  p_submitter_email text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if char_length(trim(coalesce(p_course_ref,''))) not between 1 and 180 then
    raise exception 'Invalid course reference';
  end if;
  if char_length(trim(coalesce(p_course_name,''))) not between 1 and 180 then
    raise exception 'Invalid course name';
  end if;
  if p_issue_type not in ('routing','tee','aim','green','par','course_info','other') then
    raise exception 'Invalid issue type';
  end if;
  if char_length(trim(coalesce(p_suggestion_text,''))) not between 5 and 2000 then
    raise exception 'Invalid suggestion';
  end if;
  if p_hole_number is not null and p_hole_number not between 1 and 54 then
    raise exception 'Invalid hole number';
  end if;
  if (p_suggested_lat is null) <> (p_suggested_lng is null) then
    raise exception 'Both latitude and longitude are required';
  end if;
  if p_suggested_lat is not null and (
    p_suggested_lat not between -90 and 90
    or p_suggested_lng not between -180 and 180
    or (p_suggested_lat=0 and p_suggested_lng=0)
  ) then
    raise exception 'Invalid suggested location';
  end if;

  insert into public.course_correction_suggestions (
    course_ref,open_golf_api_id,course_name,issue_type,hole_number,
    suggestion_text,suggested_lat,suggested_lng,submitter_name,submitter_email,submitted_by
  ) values (
    trim(p_course_ref),nullif(trim(coalesce(p_open_golf_api_id,'')),''),trim(p_course_name),p_issue_type,p_hole_number,
    trim(p_suggestion_text),p_suggested_lat,p_suggested_lng,
    nullif(trim(coalesce(p_submitter_name,'')),''),nullif(trim(coalesce(p_submitter_email,'')),''),(select auth.uid())
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_parfolio_course_correction(text,text,text,text,text,integer,double precision,double precision,text,text) from public;
grant execute on function public.submit_parfolio_course_correction(text,text,text,text,text,integer,double precision,double precision,text,text) to anon, authenticated;
