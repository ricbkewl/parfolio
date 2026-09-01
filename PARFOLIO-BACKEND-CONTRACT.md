# ParFolio Frontend ↔ Supabase Contract

Generated: 2026-09-01T09:16:07.053307+00:00

## Frontend dependencies

Tables: `app_admins`, `courses`, `golfer-avatars`, `golfer_club_distances`, `golfer_profiles`, `hidden_round_history`, `round-chat-media`, `round_hole_stats`, `round_messages`, `round_players`, `round_scores`, `shared_rounds`

RPCs: `create_shared_round`, `delete_owned_round`, `hide_round_from_my_history`, `join_shared_round`, `list_registered_golfers`, `manage_round_status`, `remove_round_player`, `save_my_avatar_path`, `save_my_club_distances`, `save_my_golfer_profile`, `set_course_admin`

Storage buckets: `golfer-avatars`, `round-chat-media`

## Migration coverage

Missing tables: `courses`, `golfer-avatars`, `round-chat-media`

Missing RPCs: None

Missing buckets: `golfer-avatars`, `round-chat-media`
