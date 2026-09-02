-- Keep correction submission behind validation while avoiding an anonymously
-- executable SECURITY DEFINER function. RLS authorizes insert-only access.

drop policy if exists "Submit course corrections" on public.course_correction_suggestions;
create policy "Submit course corrections"
on public.course_correction_suggestions for insert
to anon, authenticated
with check (
  source_app='parfolio'
  and status='pending'
  and submitted_by is not distinct from (select auth.uid())
);

grant insert on public.course_correction_suggestions to anon, authenticated;

alter function public.submit_parfolio_course_correction(
  text,text,text,text,text,integer,double precision,double precision,text,text
) security invoker;
