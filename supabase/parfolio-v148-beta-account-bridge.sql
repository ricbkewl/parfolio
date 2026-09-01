-- ParFolio v148 beta-account bridge.
-- Apply AFTER atg-v148-compatibility.sql.
-- Preserves ParFolio's own existing beta profile, club-distance and admin-role data when present.
-- It never reads or copies anything from ATG.

do $$
begin
  if to_regclass('public.profiles') is not null then
    insert into public.golfer_profiles(user_id,first_name,last_name,phone,avatar_path,created_at,updated_at)
    select
      p.id,
      nullif(trim(p.first_name),'') as first_name,
      nullif(trim(p.last_name),'') as last_name,
      nullif(trim(p.phone),'') as phone,
      null,
      coalesce(p.created_at,now()),
      coalesce(p.updated_at,now())
    from public.profiles p
    where nullif(trim(p.first_name),'') is not null
      and nullif(trim(p.last_name),'') is not null
      and char_length(trim(coalesce(p.phone,''))) between 7 and 30
      and exists(select 1 from auth.users u where u.id=p.id)
    on conflict(user_id) do update set
      first_name=excluded.first_name,
      last_name=excluded.last_name,
      phone=excluded.phone,
      updated_at=greatest(public.golfer_profiles.updated_at,excluded.updated_at);

    if exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='role'
    ) then
      insert into public.app_admins(user_id,role)
      select p.id,p.role
      from public.profiles p
      where p.role in ('super_admin','course_admin')
        and exists(select 1 from auth.users u where u.id=p.id)
      on conflict(user_id) do update set role=excluded.role;
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.clubs') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='clubs' and column_name='club_name')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='clubs' and column_name='carry_yards') then
    insert into public.golfer_club_distances(user_id,club,carry_yards,updated_at)
    select c.user_id,trim(c.club_name),c.carry_yards,coalesce(c.updated_at,now())
    from public.clubs c
    where c.carry_yards between 20 and 350
      and char_length(trim(c.club_name)) between 1 and 40
      and (not exists(select 1 from information_schema.columns where table_schema='public' and table_name='clubs' and column_name='is_active') or coalesce(c.is_active,true))
      and exists(select 1 from auth.users u where u.id=c.user_id)
    on conflict(user_id,club) do update set
      carry_yards=excluded.carry_yards,
      updated_at=greatest(public.golfer_club_distances.updated_at,excluded.updated_at);
  end if;
end $$;
