# Numbered source refresh

This report-only recovery step checks current explicitly numbered OpenStreetMap traces before visual analysis. It is implemented as a reusable module and CLI; the production batch runner remains unchanged and disarmed.

## Run a controlled report

`node scripts/report-numbered-osm-refresh.js audit/2026-10-20-talamore-refresh-input.json`

The input is a course identity and existing-geometry snapshot. Refresh the snapshot before reviewing any production correction. If the catalog hole count is null, operator-verified hole-count evidence must identify the same course and its source URL. This evidence affects the report only; no database metadata is updated. The CLI prints JSON and performs only two bounded public OSM reads.

`runSourceFirstRecovery(input, {visualReport})` composes the numbered-source check with a caller-configured report-only visual analysis function. Complete source candidates and source/context errors stop before AI. Incomplete source results pass only unresolved hole numbers to visual analysis; source proposals remain separately labeled, unaccepted candidates. Existing production diagnostics are not yet switched to this new orchestrator.

## Current limits

- Requires an explicitly linked OSM way representing a closed golf-course boundary. Relation/multipolygon courses require separate handling.
- Confirms course name, course-center containment, route-node containment, and tee/green polygon containment. Route-node containment does not prove that every segment lies inside a concave boundary.
- Duplicate requested numbers, missing source nodes and ambiguous existing rows stop or defer recovery.
- Preserves all existing complete rows. The whole-course gate checks sequential numbering, finite coordinates and plausible lengths; it does not independently re-survey existing coordinates.
- Each response is capped at 8 MiB while streaming, both reads share a 30-second deadline, redirects are rejected, and failures do not retry another provider.
- Public OSM map reads are for bounded diagnostics here. A scaled batch rollout still needs caching and an appropriate bulk-data acquisition strategy.
- Every result remains `promotable:false`; publication requires the existing independent review and promotion workflow.

## October 20 live verification

Talamore boundary and full-course map requests both returned HTTP 200. The automatic refresh found only missing hole 12, using OSM way 1087502869, and preserved the snapshot's 17 existing rows. The combined set passed the 18-hole engine validator. No AI request, database write or deployment was performed.

Source hashes and the exact output are recorded in `audit/2026-10-20-talamore-numbered-refresh-live.json`. Eight targeted refresh/orchestration tests and four existing rollout safety tests passed. This establishes repeatable live source recovery for one course, not unattended publication readiness. The original September import omission remains unexplained.

OSM API reference: https://wiki.openstreetmap.org/wiki/API_v0.6

Source attribution: © OpenStreetMap contributors, ODbL 1.0. The replay fixture contains the relevant source nodes and ways, with contributor account fields omitted.
