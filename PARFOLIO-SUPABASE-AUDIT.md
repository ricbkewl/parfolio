# ParFolio Supabase Compatibility Audit

Verified: 2026-09-02 UTC
Project: `unsysuuhykdmbsasdhzg`

## Current lifecycle

The current authenticated lifecycle schema is installed and protected by RLS:

- `golfer_profiles`, `golfer_club_distances`
- `shared_rounds`, `round_players`, `round_scores`, `round_hole_stats`
- `round_messages`, `hidden_round_history`
- `courses`, `app_admins`

The app-facing RPCs for profile, round creation/joining, host management,
history, clubs and administration are installed. The five shared-round tables
required for live play are in the `supabase_realtime` publication.

## v182 verification

A two-user rollback test passed for:

1. authenticated round creation;
2. second-golfer join;
3. each golfer writing their own score;
4. both golfers reading synchronized scores;
5. rejection of cross-golfer score edits;
6. participant chat writes;
7. rejection of non-host round completion;
8. host completion and rejection of post-completion scoring;
9. previous-round membership.

The transaction was rolled back, so the test did not add production rounds,
players, scores or messages.

## Security and performance repair

- Added `round_players_current_user_id_idx` for Previous Rounds lookups and its
  current-table foreign key.
- Fixed the mutable `set_updated_at` function search path.
- Removed public/API execution from trigger and event-trigger helpers.
- Preserved legacy v148 rows but quarantined their tables with revoked grants
  and explicit deny policies.
- Revoked the three broken v148 RPCs. The current app uses the shared-round RPCs.
- Eliminated the legacy `auth.uid()` RLS initialization warnings.

Supabase still reports its general warning for intentionally authenticated
`SECURITY DEFINER` lifecycle RPCs; those functions use a fixed empty search
path and enforce `auth.uid()` authorization internally. Leaked-password
protection remains a dashboard-level Auth setting and should be enabled when
the project plan exposes it.
