-- ParFolio v148 Realtime compatibility.
-- ATG v148 publishes live round state, players, scores, hole stats and chat through Supabase Realtime.
-- This adds the same five ParFolio tables idempotently.

do $$
declare t text;
begin
  foreach t in array array['shared_rounds','round_players','round_scores','round_hole_stats','round_messages'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Required realtime table public.% is missing', t;
    end if;
    if not exists (
      select 1
      from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
