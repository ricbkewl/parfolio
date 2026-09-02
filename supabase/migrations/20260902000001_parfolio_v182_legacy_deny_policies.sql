-- Explicit deny policies document the quarantined state while preserving RLS.
-- Table grants are also revoked by the preceding migration.

create policy legacy_quarantined on public.rounds
  for all to public using (false) with check (false);
create policy legacy_quarantined on public.round_players_legacy_pre_v148
  for all to public using (false) with check (false);
create policy legacy_quarantined on public.hole_scores
  for all to public using (false) with check (false);
create policy legacy_quarantined on public.profiles
  for all to public using (false) with check (false);
create policy legacy_quarantined on public.clubs
  for all to public using (false) with check (false);
