-- ParFolio v208: authenticated table grants for Friends + direct messages.

grant select, insert, update on public.social_profiles to authenticated;
grant select, insert on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, update, delete on public.user_blocks to authenticated;
grant select on public.direct_conversations to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant usage, select on sequence public.direct_messages_id_seq to authenticated;

revoke all on public.social_profiles from anon;
revoke all on public.friend_requests from anon;
revoke all on public.friendships from anon;
revoke all on public.user_blocks from anon;
revoke all on public.direct_conversations from anon;
revoke all on public.direct_messages from anon;
