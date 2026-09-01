-- ParFolio v148 post-install verifier.
-- Run after supabase/parfolio-v148-full.sql in the ParFolio Supabase project.
-- This is read-only and raises an exception if a required backend component is missing.

do $$
declare
  missing text[] := '{}';
  t text;
  f text;
  b text;
  rt text;
begin
  foreach t in array array['app_admins','golfer_profiles','golfer_club_distances','shared_rounds','round_players','round_scores','round_hole_stats','round_messages','hidden_round_history','courses'] loop
    if to_regclass('public.'||t) is null then missing := array_append(missing,'table:'||t); end if;
  end loop;

  foreach f in array array['is_super_admin','is_course_admin','is_round_participant','is_round_active','can_delete_round_media','create_shared_round','join_shared_round','manage_round_status','remove_round_player','delete_owned_round','hide_round_from_my_history','save_my_club_distances','save_my_golfer_profile','save_my_avatar_path','list_registered_golfers','set_course_admin'] loop
    if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=f) then
      missing := array_append(missing,'function:'||f);
    end if;
  end loop;

  foreach b in array array['golfer-avatars','round-chat-media'] loop
    if not exists(select 1 from storage.buckets where id=b) then missing := array_append(missing,'bucket:'||b); end if;
  end loop;

  foreach rt in array array['shared_rounds','round_players','round_scores','round_hole_stats','round_messages'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=rt) then
      missing := array_append(missing,'realtime:'||rt);
    end if;
  end loop;

  if cardinality(missing) > 0 then
    raise exception 'ParFolio v148 backend verification failed. Missing: %', array_to_string(missing,', ');
  end if;

  raise notice 'ParFolio v148 backend verification PASSED: schema, RPCs, storage and Realtime are present.';
end $$;

select
  (select count(*) from public.golfer_profiles) as golfer_profiles,
  (select count(*) from public.shared_rounds) as shared_rounds,
  (select count(*) from public.round_players) as round_players,
  (select count(*) from public.round_scores) as round_scores,
  (select count(*) from public.round_messages) as round_messages,
  (select count(*) from public.courses) as local_courses;
