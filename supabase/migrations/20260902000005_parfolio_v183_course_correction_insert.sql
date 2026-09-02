-- SECURITY INVOKER callers have INSERT but intentionally do not have SELECT.
-- Generate the UUID before the insert so the RPC can return it without an
-- INSERT ... RETURNING privilege dependency.

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
security invoker
set search_path = ''
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  if char_length(trim(coalesce(p_course_ref,''))) not between 1 and 180 then raise exception 'Invalid course reference'; end if;
  if char_length(trim(coalesce(p_course_name,''))) not between 1 and 180 then raise exception 'Invalid course name'; end if;
  if p_issue_type not in ('routing','tee','aim','green','par','course_info','other') then raise exception 'Invalid issue type'; end if;
  if char_length(trim(coalesce(p_suggestion_text,''))) not between 5 and 2000 then raise exception 'Invalid suggestion'; end if;
  if p_hole_number is not null and p_hole_number not between 1 and 54 then raise exception 'Invalid hole number'; end if;
  if (p_suggested_lat is null) <> (p_suggested_lng is null) then raise exception 'Both latitude and longitude are required'; end if;
  if p_suggested_lat is not null and (
    p_suggested_lat not between -90 and 90
    or p_suggested_lng not between -180 and 180
    or (p_suggested_lat=0 and p_suggested_lng=0)
  ) then raise exception 'Invalid suggested location'; end if;

  insert into public.course_correction_suggestions (
    id,course_ref,open_golf_api_id,course_name,issue_type,hole_number,
    suggestion_text,suggested_lat,suggested_lng,submitter_name,submitter_email,submitted_by
  ) values (
    new_id,trim(p_course_ref),nullif(trim(coalesce(p_open_golf_api_id,'')),''),trim(p_course_name),p_issue_type,p_hole_number,
    trim(p_suggestion_text),p_suggested_lat,p_suggested_lng,
    nullif(trim(coalesce(p_submitter_name,'')),''),nullif(trim(coalesce(p_submitter_email,'')),''),(select auth.uid())
  );

  return new_id;
end;
$$;

revoke all on function public.submit_parfolio_course_correction(text,text,text,text,text,integer,double precision,double precision,text,text) from public;
grant execute on function public.submit_parfolio_course_correction(text,text,text,text,text,integer,double precision,double precision,text,text) to anon, authenticated;
