CREATE OR REPLACE FUNCTION public.social_respond_friend_request(request_id uuid, accept_request boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare
  me uuid := auth.uid();
  req public.friend_requests%rowtype;
begin
  if me is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select *
  into req
  from public.friend_requests
  where id = request_id
    and status = 'pending'
  for update;

  if req.id is null or req.receiver_id is distinct from me then
    raise exception 'Request unavailable';
  end if;

  if accept_request then
    if exists (
      select 1
      from public.user_blocks b
      where
        (b.blocker_id = req.sender_id and b.blocked_id = req.receiver_id)
        or
        (b.blocker_id = req.receiver_id and b.blocked_id = req.sender_id)
    ) then
      raise exception 'Friend request unavailable';
    end if;

    insert into public.friendships(user_a, user_b)
    values(
      least(req.sender_id, req.receiver_id),
      greatest(req.sender_id, req.receiver_id)
    )
    on conflict do nothing;

    update public.friend_requests
    set status = 'accepted',
        responded_at = now()
    where id = req.id;
  else
    update public.friend_requests
    set status = 'declined',
        responded_at = now()
    where id = req.id;
  end if;

  return true;
end
$function$
;
-- Social writes must use the membership/block-checking RPCs.
revoke insert on public.friend_requests, public.direct_messages from authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'social\_%' escape '\'
  loop
    execute format('revoke execute on function %s from public, anon',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
