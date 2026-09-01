-- ParFolio v148 legacy-schema bridge.
-- IMPORTANT: this must run BEFORE atg-v148-compatibility.sql.
-- The earlier ParFolio beta used a different `round_players` contract tied to public.rounds.
-- ATG v148 expects `round_players` to belong to `shared_rounds` and use `display_name`.
-- Preserve the old table instead of dropping user data, then let the compatibility installer
-- create the v148 table under the expected name.

do $$
begin
  if to_regclass('public.round_players') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='round_players' and column_name='display_name_snapshot'
     )
     and not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='round_players' and column_name='display_name'
     ) then

    if to_regclass('public.round_players_legacy_pre_v148') is null then
      alter table public.round_players rename to round_players_legacy_pre_v148;
    else
      raise exception 'Legacy round_players schema still occupies public.round_players while round_players_legacy_pre_v148 already exists. Resolve this duplicate legacy table before installing v148.';
    end if;
  end if;
end $$;

-- Keep the preserved beta table private. The v148 frontend never reads it.
do $$
begin
  if to_regclass('public.round_players_legacy_pre_v148') is not null then
    execute 'alter table public.round_players_legacy_pre_v148 enable row level security';
    execute 'revoke all on public.round_players_legacy_pre_v148 from anon, authenticated';
  end if;
end $$;
