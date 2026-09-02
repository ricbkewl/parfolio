-- The legacy schema already owns round_players_user_id_idx, so the current
-- round_players table needs a collision-free index name.
create index if not exists round_players_current_user_id_idx
  on public.round_players (user_id);
