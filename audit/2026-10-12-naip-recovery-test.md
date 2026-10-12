# Treviso Bay imagery recovery test — 2026-10-12

## Changes verified

- Recovery preview branch: `gps-rollout-engine`.
- Code commit: `9068c424d0677ab852f6645d467f6842593138da`.
- Switched the imagery export endpoint from USGSNAIPPlus to USGSNAIPImagery.
- Disabled ArcGIS aspect-ratio adjustment so the requested bounding box remains the image georeference.
- Removed the MapTiler fallback from the report-only recovery pipeline. Legacy display code and the standalone MapTiler diagnostic remain unchanged.
- Increased the bounded imagery request timeout to 30 seconds.
- Preview-only `PARFOLIO_VISION_MODEL` changed from `anthropic/claude-opus-5` to `alibaba/qwen3.7-flash`; Vercel's model catalog listed the latter as vision-capable and eligible for free AI Gateway credit. Production configuration was not changed.

## Evidence

The same 1024px Treviso image request timed out against NAIP Plus, while the dedicated NAIP service returned HTTP 200 and 330,796 JPEG bytes in 16.7 seconds.

A 2048px NAIP export with the requested extent preserved returned HTTP 200, 1,915,913 JPEG bytes, in 17.5 seconds. Visual inspection confirmed aerial imagery with golf features; the image has no numbered-hole labels and does not establish complete course coverage.

All 14 focused tests passed:

`node --test tests/eastpointe-vision-report.test.js tests/gps-rollout-safety.test.js`

The first deployed report reached AI Gateway and returned `ai_gateway_http_403` for Claude Opus 5. Gateway logs confirmed the named Parfolio GPS Vision key, Bedrock routing, no token usage, and $0 cost. The exact rejection reason was not available in the endpoint response.

After selecting the free-credit-eligible model, preview deployment `dpl_7S8Kshd3c6iXzwAwGsGyWGQJWzzy` returned HTTP 200 in 33.4 seconds:

```json
{
  "ok": true,
  "armed": false,
  "read_only": true,
  "report_only": true,
  "promotable": false,
  "course_id": "4d58741c-12f9-4e3d-8947-cf4d7f2c4190",
  "mapping_class": "location_pending",
  "missing_holes": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  "status": "requires_manual_review",
  "holes": []
}
```

## Interpretation and remaining work

Imagery retrieval and live AI execution now work without MapTiler. This is not a successful GPS recovery: the model returned zero candidate coordinates, and the response does not explain why. No geometry was written or promoted. No subscriptions, paid credits, or automatic top-ups were purchased/enabled.

Next requirement: verify full-course image coverage and supply a reusable, independently numbered layout or course-provided evidence. Then assess candidate coordinates against independent evidence before enabling promotion. Do not weaken the instruction to omit ambiguous holes merely to produce results.

The official course homepage could not be retrieved during the follow-up reference search. No third-party mapping geometry was imported.

## Follow-up: coverage and abstention diagnosis

Live OpenStreetMap relation 5454409 identifies TPC Treviso Bay and has two outer ways, 276576645 and 276756042. Their combined extent is `[-81.7352626,26.0662335,-81.7199854,26.0755794]`. The original image extent already enclosed those boundaries. A tighter extent with 0.0005-degree padding improves image detail without requiring a change to the catalog location.

Using feature centroids inside the two boundary polygons, the live map response contained 73 tee polygons, 20 greens, six fairways, and six hole paths. The paths (1529310462, 1529310507, 1529310508, 1529310511, 1529319358, 1530703364) had no `ref` or `name` identifying a hole number. These counts do not establish 20 playing holes; practice greens and tee variants require classification. Source: https://www.openstreetmap.org/relation/5454409 — © OpenStreetMap contributors, ODbL 1.0. No OSM geometry was written to the production database.

Code commit `9dfa3cf7c3714486c42e34359871856fef30dd71` adds:

- Explicit bounded image extents and provenance for the hard-locked Treviso diagnostic.
- Rejection of model coordinates outside the supplied image extent.
- A model-reported assessment with allowlisted reason codes.
- `insufficient_evidence` status for reports with no candidate points.

All 16 focused tests passed. Preview deployment `dpl_H2K7xQ4XTaLSYLmGLd1mGRDyfgfC` returned HTTP 200 in 53.6 seconds, with no candidate holes, no writes, and `promotable:false`. Its reported reasons were `missing_hole_numbering` and `ambiguous_features`. The model explained that the visible course features could not be assigned to holes 1–18 without numbering or a routing diagram. This explanation is model-reported, not a claim that recovery is impossible with additional evidence.

Next gate: obtain independently numbered course routing, match it to the existing imagery and feature candidates, then verify coordinates. Neither scorecard yardages alone nor a plausible shortest walking route proves hole identity. The official course-tour page was also inaccessible to the research fetch. No paid service or subscription was added.
