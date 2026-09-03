# ParFolio Supabase Compatibility Audit

Generated: 2026-09-03T00:30:08.123865+00:00
PostgREST OpenAPI status: `ERROR: HTTP Error 401: Unauthorized`

## Expected tables

| Table | OpenAPI | REST probe |
|---|---:|---:|
| `app_admins` | NO | `401` |
| `golfer_profiles` | NO | `401` |
| `golfer_club_distances` | NO | `401` |
| `shared_rounds` | NO | `401` |
| `round_players` | NO | `401` |
| `round_scores` | NO | `401` |
| `round_hole_stats` | NO | `401` |
| `round_messages` | NO | `401` |
| `hidden_round_history` | NO | `401` |
| `courses` | NO | `401` |

## Expected RPCs

| RPC | OpenAPI |
|---|---:|
| `create_shared_round` | NO |
| `join_shared_round` | NO |
| `save_my_golfer_profile` | NO |
| `save_my_avatar_path` | NO |
| `save_my_club_distances` | NO |
| `set_course_admin` | NO |
| `list_registered_golfers` | NO |
| `hide_round_from_my_history` | NO |
| `delete_owned_round` | NO |
| `manage_round_status` | NO |
| `remove_round_player` | NO |

## Storage

Expected buckets: `golfer-avatars`, `round-chat-media`

Bucket-list probe HTTP: `200`

```text
[]
```

## Summary

Missing from public PostgREST schema: **10 tables** and **11 RPCs**.

Missing tables: `app_admins`, `golfer_profiles`, `golfer_club_distances`, `shared_rounds`, `round_players`, `round_scores`, `round_hole_stats`, `round_messages`, `hidden_round_history`, `courses`
Missing RPCs: `create_shared_round`, `join_shared_round`, `save_my_golfer_profile`, `save_my_avatar_path`, `save_my_club_distances`, `set_course_admin`, `list_registered_golfers`, `hide_round_from_my_history`, `delete_owned_round`, `manage_round_status`, `remove_round_player`

A `401` or `403` REST probe can still mean the relation exists and is correctly protected by RLS. A missing OpenAPI path is the stronger signal that the relation/function is not exposed or not installed.
