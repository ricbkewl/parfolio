create or replace function public.set_course_admin(target_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  normalized_email text := lower(trim(target_email));
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can add course administrators'
      using errcode = '42501';
  end if;

  select id
  into target_id
  from auth.users
  where lower(email) = normalized_email;

  if target_id is null then
    raise exception 'No app user exists with this email';
  end if;

  if target_id = (select auth.uid()) then
    raise exception 'Your own super-admin role cannot be replaced';
  end if;

  insert into public.app_admins (user_id, role)
  values (target_id, 'course_admin')
  on conflict (user_id)
  do update set role = 'course_admin';

  return jsonb_build_object(
    'user_id', target_id,
    'email', normalized_email,
    'role', 'course_admin'
  );
end;
$$;

revoke all on function public.set_course_admin(text) from public, anon;
grant execute on function public.set_course_admin(text) to authenticated;
