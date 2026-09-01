-- Run this file once in the Supabase SQL Editor before using putt tracking.
-- Scores continue to live in round_scores. Optional per-hole statistics live here.

create table if not exists public.round_hole_stats (
  round_id uuid not null references public.shared_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hole smallint not null check (hole between 1 and 18),
  putts smallint check (putts between 0 and 4),
  fairway_hit boolean,
  green_in_regulation boolean,
  chip_shots smallint check (chip_shots between 0 and 9),
  sand_shots smallint check (sand_shots between 0 and 9),
  penalties smallint check (penalties between 0 and 9),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id, hole),
  foreign key (round_id, user_id)
    references public.round_players(round_id, user_id) on delete cascade
);

alter table public.round_hole_stats enable row level security;

drop policy if exists "Participants can view hole stats" on public.round_hole_stats;
create policy "Participants can view hole stats"
on public.round_hole_stats for select to authenticated
using (public.is_round_participant(round_id));

drop policy if exists "Golfers can add their own hole stats" on public.round_hole_stats;
create policy "Golfers can add their own hole stats"
on public.round_hole_stats for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_round_participant(round_id)
);

drop policy if exists "Golfers can update their own hole stats" on public.round_hole_stats;
create policy "Golfers can update their own hole stats"
on public.round_hole_stats for update to authenticated
using (
  user_id = (select auth.uid())
  and public.is_round_participant(round_id)
)
with check (user_id = (select auth.uid()));

grant select, insert, update on public.round_hole_stats to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'round_hole_stats'
  ) then
    alter publication supabase_realtime add table public.round_hole_stats;
  end if;
end $$;
