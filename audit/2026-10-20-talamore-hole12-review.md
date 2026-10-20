# Talamore hole 12: source refresh candidate

## Result

The existing 17 database rows plus the explicitly numbered current OSM hole-12 trace pass `validateTeeCenterCourse(..., 18)`. This is a report-only recovery candidate, not a published or surveyed course. Existing database rows, catalog metadata and production deployment were not changed. No AI request or paid service was used.

The candidate and source provenance are in `2026-10-20-talamore-hole12-candidate.json`; the exact read-only database snapshot used for comparison is in `2026-10-20-talamore-existing-snapshot.json`.

## Evidence

- Official course page: https://talamoregolfresort.com/talamore-golf-club/ . The 18-hole tour embeds https://fast.wistia.net/embed/playlists/isad0gdtjg . One public 245-second media item, `kowd338qtb`, contains visible hole labels. Frames at 156, 159, 162 and 165 seconds visibly show hole 12. It is a computer-rendered tour with 2017 media metadata, not a current drone survey.
- Current OSM way https://www.openstreetmap.org/way/1087502869 explicitly has `golf=hole`, `ref=12`, `par=4`, version 2, timestamp June 24, 2025. Its three route points supply the candidate coordinates; the tour supplies corroborating visual context only.
- Tee endpoint lies inside OSM tee polygon 1087499648. Green endpoint lies inside OSM green polygon 1087502868. All three route nodes lie inside course boundary 429298983, matching the database's course source URI. Ray-crossing point-in-polygon checks passed.
- USGS NAIP aerial crop confirms visible tee boxes, crossing cart path, northwest-running fairway/dogleg and green corresponding to the candidate corridor. Image acquisition date was not established. No positional accuracy claim is made.
- Existing hole 11 and 13 coordinates and source URIs align with surrounding OSM routes. All 17 original rows were kept exactly as read.

## Why the machine should refresh numbered sources first

The hole-12 way was already numbered before the database's September 22, 2026 import. Its omission is therefore not explained by recently added mapping. The original import rejection/filter has not been established; do not claim a specific root cause yet.

Current rollout source loading reads `fl_*` staging tables. Its live-feature refresh is within Level 2 and focuses on tee/green/fairway reconstruction; it does not provide a general, source-bound numbered-hole refresh for this NC course. Additionally, Talamore's catalog `holes` is null, so the existing diagnostic correctly rejects its incomplete context. Neither guard was bypassed.

The next implementation should add a bounded refresh of explicitly numbered OSM traces for an already identified course, preserving existing complete holes and recording source versions. It should use verified hole-count evidence, reject ambiguous/duplicate numbering and out-of-bound geometry, then run the whole-course gate. Do not promote a scorecard-yardage guess to verified numbering.

## Validation performed

Combined row count 18, unique sequential hole numbers, finite coordinates, plausible tee-to-center distances: passed existing engine validator. All three spatial containment checks passed. No database write, promotion, automatic runner enablement, billing change or production deployment occurred.

Attribution: © OpenStreetMap contributors, ODbL 1.0. No proprietary flyover frames were committed or distributed with this report.
