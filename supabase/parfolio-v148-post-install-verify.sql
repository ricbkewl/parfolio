-- ParFolio v148 post-install verification.
-- Run after supabase/parfolio-v148-full.sql in the ParFolio Supabase SQL editor.
-- Expected result: every row returns present = true.

with expected(kind,name) as (
  values
    ('table','app_admins'),
    ('table','golfer_profiles'),
    ('table','golfer_club_distances'),
    ('table','shared_rounds'),
    ('table','round_players'),
    ('table','round_scores'),
    ('table','round_hole_stats'),
    ('table','round_messages'),
    ('table','hidden_round_history'),
    ('table','courses'),
    ('function','create_shared_round'),
    ('function','join_shared_round'),
    ('function','save_my_golfer_profile'),
    ('function','save_my_avatar_path'),
    ('function','save_my_club_distances'),
    ('function','set_course_admin'),
    ('function','list_registered_golfers'),
    ('function','hide_round_from_my_history'),
    ('function','delete_owned_round'),
    ('function','manage_round_status'),
    ('function','remove_round_player'),
    ('bucket','golfer-avatars'),
    ('bucket','round-chat-media')
), checks as (
  select e.kind,e.name,
    case e.kind
      when 'table' then exists(
        select 1 from information_schema.tables t
        where t.table_schema='public' and t.table_name=e.name
      )
      when 'function' then exists(
        select 1 from information_schema.routines r
        where r.routine_schema='public' and r.routine_name=e.name
      )
      when 'bucket' then exists(
        select 1 from storage.buckets b where b.id=e.name
      )
      else false
    end as present
  from expected e
)
select kind,name,present
from checks
order by case kind when 'table' then 1 when 'function' then 2 else 3 end,name;

-- RLS should be enabled on every user-facing public table.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'app_admins','golfer_profiles','golfer_club_distances','shared_rounds','round_players',
    'round_scores','round_hole_stats','round_messages','hidden_round_history','courses'
  )
order by c.relname;

-- Verify the two storage buckets have the intended visibility.
select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets
where id in ('golfer-avatars','round-chat-media')
order by id;
