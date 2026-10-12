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
