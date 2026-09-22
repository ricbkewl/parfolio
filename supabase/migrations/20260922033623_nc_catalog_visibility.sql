-- Keep the nationwide catalog available for course administrators while
-- exposing only active GPS Ready courses to ordinary golfers.
grant execute on function public.is_course_admin() to anon, authenticated;

drop policy if exists course_catalog_public_read on public.course_catalog;
drop policy if exists course_catalog_visibility on public.course_catalog;
create policy course_catalog_visibility on public.course_catalog
  for select to anon, authenticated
  using (
    (is_active and rejection_reason is null and mapping_class = 'gps_ready')
    or (select public.is_course_admin())
  );

drop policy if exists course_hole_public_read on public.course_hole_geometry;
drop policy if exists course_hole_visibility on public.course_hole_geometry;
create policy course_hole_visibility on public.course_hole_geometry
  for select to anon, authenticated
  using (
    (validation_state = 'validated' and exists (
      select 1 from public.course_catalog c
      where c.id = course_id and c.is_active
        and c.mapping_class = 'gps_ready' and c.rejection_reason is null
    )) or (select public.is_course_admin())
  );

grant insert, update on public.course_catalog, public.course_hole_geometry to authenticated;
drop policy if exists course_catalog_admin_insert on public.course_catalog;
drop policy if exists course_catalog_admin_update on public.course_catalog;
drop policy if exists course_hole_admin_insert on public.course_hole_geometry;
drop policy if exists course_hole_admin_update on public.course_hole_geometry;
create policy course_catalog_admin_insert on public.course_catalog
  for insert to authenticated with check ((select public.is_course_admin()));
create policy course_catalog_admin_update on public.course_catalog
  for update to authenticated using ((select public.is_course_admin()))
  with check ((select public.is_course_admin()));
create policy course_hole_admin_insert on public.course_hole_geometry
  for insert to authenticated with check ((select public.is_course_admin()));
create policy course_hole_admin_update on public.course_hole_geometry
  for update to authenticated using ((select public.is_course_admin()))
  with check ((select public.is_course_admin()));
