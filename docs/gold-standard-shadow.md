# Gold Standard / Shadow Test

Sierra Lakes Golf Club in Fontana, California is the first fixed 18-hole benchmark. This server-side diagnostic is available locally and through the protected runner in Preview only. It exposes no promotion, staging, queue, cursor, catalog update, or geometry write operation. ATG and map/camera code are untouched. No paid provider is imported or called.

## Protected Preview request

POST `/api/gps-rollout-runner` using the existing `x-parfolio-rollout-secret` header and this exact JSON body:

```json
{"mode":"gold_standard_shadow","country_code":"US","state_code":"CA","report_only":true,"test_course":"sierra_lakes","batch_size":1}
```

The mode rejects production/development environments, missing authentication, other courses, additional request fields and write flags before recovery. The response contains metrics, classification, integrity hashes and source provenance, omitting only the bulky raw OSM snapshot. Source failures return HTTP 503 with no promotion. A valid comparison can return `compared_requires_review`; that is evidence, not an approval.

## Run

With Node 22 and an existing server environment containing the ParFolio Supabase URL and server key:

```sh
node --env-file=/secure/path/server.env scripts/gold-standard-shadow.cjs /path/to/new-report-directory
```

The directory must not exist. Output is `report.json` (including OSM source evidence) and `report.md`. Keep server credentials outside the repository. The existing read-only adapter restricts access to the ParFolio project. This command makes database GET requests and free Overpass query requests only.

For credentials-free replay of captured connector evidence:

```sh
node scripts/gold-standard-shadow.cjs --evidence /path/to/evidence /path/to/new-report-directory
```

Evidence requires `catalog-before.json`, `catalog-after.json`, `geometry-before.json`, `geometry-after.json`, and `recovery.json` with the original Overpass response in `raw`. Replay does not query production or establish current production state. It compares the supplied snapshots and recomputes recovery from raw OSM. Reports explicitly distinguish replay from a live run.

## Isolation and safety

The recovery input is an explicit immutable catalog allowlist: identity, declared hole count, location and region. It excludes mapping class, verified points, routes, and source identifiers. The answer key stays in the scorer. Production mapping class is never temporarily changed. The runner validates the full answer key and hashes every geometry field before and after recovery; a change invalidates the run. Catalog identity and status are checked again too.

The existing Florida OSM request and row conversion have been extracted verbatim into `authoritative-osm-input.js` so staging and shadow testing share the same source inputs. Existing classifier and promotion rules are unchanged. Exactly 18 unique, strictly numbered traces can be scored as diagnostic candidates even when course-name matching requires review; duplicate or missing traces are never silently selected. A compared candidate is never authorized for promotion by this mode.

OSM trace endpoints are compared by original hole number. No best-fit permutation, reversed trace selection, baseline coordinates, or baseline-derived search bounds influence recovery. A nearest-green diagnostic flags possible numbering problems without fixing them using the answer key.

## Metrics and interpretation

Distances use haversine meters with radius 6,371,000 m. Tee, green and combined statistics include count, arithmetic mean, median, nearest-rank P95, maximum and RMSE. Missing points are excluded with explicit coverage, never counted as zero. An empty comparison has null metrics.

Sierra Lakes' live catalog is GPS-ready, but its hole records have source `ca_osm_stage_restore` and validation state `partial`. The first captured run recovered all 18 holes and matched all 36 stored endpoints exactly. All 18 source OSM identifiers overlap. This validates reproducibility, not independent surveyed or imagery-derived accuracy. OSM calls the course `Sierra Lakes`, producing an existing name similarity score of 0.5; the unchanged classifier requires review.

No imagery was needed for this complete OSM reconstruction. This mode deliberately does not invoke the existing paid vision fallback. If OSM is insufficient, it reports unresolved coverage; free USGS/NAIP manual or independent recovery is separate future work. No automated model training or rule changes occur from this single benchmark.

## Verify

```sh
node --test tests/gold-standard-shadow.test.js tests/gold-standard-shadow-api.test.js
```

Tests cover isolation under answer-key perturbation, network method/provider restrictions, exact and offset distances, empty coverage, invalid and duplicate rows, sequence swaps, source failure, identity review, and before/after production snapshot checks.
