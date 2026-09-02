-- ParFolio v182 systemwide database repair.
-- Preserves all legacy data while removing obsolete objects from the Data API.

create index if not exists round_players_current_user_id_idx
  on public.round_players (user_id);

alter function public.set_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- These v148 RPCs target the retired round schema and became invalid after the
-- current round_players table replaced its legacy shape. The current app uses
-- create_shared_round/join_shared_round and related lifecycle RPCs instead.
revoke execute on function public.create_parfolio_round(uuid, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.join_parfolio_round(text, text) from public, anon, authenticated;
revoke execute on function public.resume_parfolio_round() from public, anon, authenticated;

comment on function public.create_parfolio_round(uuid, text, integer, text, text)
  is 'Deprecated v148 API. Retained for data recovery only; use create_shared_round.';
comment on function public.join_parfolio_round(text, text)
  is 'Deprecated v148 API. Retained for data recovery only; use join_shared_round.';
comment on function public.resume_parfolio_round()
  is 'Deprecated v148 API. Retained for data recovery only; use current shared-round reads.';

-- Quarantine the retired schema without deleting its rows. RLS remains enabled,
-- but no signed-out or signed-in Data API role can reach these tables.
revoke all on table public.rounds from anon, authenticated;
revoke all on table public.round_players_legacy_pre_v148 from anon, authenticated;
revoke all on table public.hole_scores from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clubs from anon, authenticated;

drop policy if exists rounds_delete_host on public.rounds;
drop policy if exists rounds_insert_host on public.rounds;
drop policy if exists rounds_select_participant on public.rounds;
drop policy if exists rounds_update_host on public.rounds;

drop policy if exists round_players_delete_host on public.round_players_legacy_pre_v148;
drop policy if exists round_players_insert_self on public.round_players_legacy_pre_v148;
drop policy if exists round_players_select_participants on public.round_players_legacy_pre_v148;
drop policy if exists round_players_update_self_or_host on public.round_players_legacy_pre_v148;

drop policy if exists scores_delete_own on public.hole_scores;
drop policy if exists scores_insert_own on public.hole_scores;
drop policy if exists scores_select_round_participants on public.hole_scores;
drop policy if exists scores_update_own on public.hole_scores;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists clubs_delete_own on public.clubs;
drop policy if exists clubs_insert_own on public.clubs;
drop policy if exists clubs_select_own on public.clubs;
drop policy if exists clubs_update_own on public.clubs;
