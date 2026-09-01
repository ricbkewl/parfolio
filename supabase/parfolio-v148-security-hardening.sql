-- ParFolio v148 security hardening supplement.
-- Apply after the base compatibility migration. Idempotent.

-- Round status changes are performed only through manage_round_status(), which enforces host ownership.
-- Remove broad direct UPDATE access to shared_rounds so clients cannot alter course/pars/creator fields.
drop policy if exists "Creators can update rounds" on public.shared_rounds;
revoke update on public.shared_rounds from authenticated;

-- Score and optional putting stats should be immutable after the host ends the round.
drop policy if exists "Golfers can add their own hole stats" on public.round_hole_stats;
drop policy if exists "Golfers can update their own hole stats" on public.round_hole_stats;
create policy "Golfers can add their own hole stats"
on public.round_hole_stats for insert to authenticated
with check (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
);
create policy "Golfers can update their own hole stats"
on public.round_hole_stats for update to authenticated
using (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
)
with check (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
);

-- Chat becomes read-only when the round is ended. Historical messages remain visible to participants.
drop policy if exists "Participants can send round messages" on public.round_messages;
create policy "Participants can send round messages"
on public.round_messages for insert to authenticated
with check (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
);

-- Tighten score UPDATE check so participation cannot be bypassed by a changed row payload.
drop policy if exists "Golfers can update their own scores" on public.round_scores;
create policy "Golfers can update their own scores"
on public.round_scores for update to authenticated
using (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
)
with check (
  user_id=(select auth.uid())
  and public.is_round_participant(round_id)
  and public.is_round_active(round_id)
);
