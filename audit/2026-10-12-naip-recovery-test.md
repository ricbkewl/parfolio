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

## Follow-up: official website layout retrieval

Code commit `a9a879db8381479c0c519f4274580e1bd035d901` connects the hard-locked Treviso diagnostic to its official course-tour page before imagery/AI execution. It discovers up to three same-origin JPEG/PNG/PDF asset URLs whose tags identify course layouts, routing, scorecards or numbered holes. Requests share a 10-second deadline, forbid redirects, and have a 4 MiB per-response limit. Source URLs, timestamps, HTTP outcomes, MIME types and successful-response SHA-256 hashes are recorded. No website-provided arbitrary origin is fetched.

Candidate JPEG/PNG images and PDF documents are supplied separately alongside the georeferenced aerial image. Instructions require visible numbering and distinctive feature matching; schematic pixels must never supply coordinates. A scorecard-only image is not evidence of routing. The report remains unarmed, unpromotable and read-only.

Limitations: this is configured for Treviso, not yet a general course-site crawler. Cross-origin CDN assets, JavaScript-only layouts, nested page discovery and redirected pages require further source configuration/handling. Missing or blocked assets produce `requires_source_review` without an imagery or AI request. Batch execution remains disarmed.

Validation: all 20 focused tests passed, including official-source 403, origin filtering, oversized/redirected responses, separate multimodal image labeling and existing protection/coordinate gates. An ordinary public request to the official course-tour URL returned HTTP 403 in this workspace.

Live preview `dpl_BRwXpWKu53NfNmJ7YCsww1xGaNBZ` returned HTTP 200 in 8.8 seconds. Unlike the workspace fetch, the deployed runtime retrieved the official page with HTTP 200. The first parser found no usable assets. Follow-up commit `1437f2fdf7cb907dc801706a141cb72dc9b412a5` exposes bounded discovered-asset metadata, including excluded origins. Its preview returned HTTP 200 in 5.4 seconds and identified a same-origin 2025 Scorecard PDF using a document-system URL with a path segment after `.pdf`.

Commit `f26529828c9c03732cb559b172c77bc85104e106` recognizes that document URL shape and includes PDFs as inline file inputs alongside the aerial image. The payload follows Vercel's OpenAI-compatible adapter source: https://github.com/vercel/ai/blob/main/packages/openai-compatible/src/chat/convert-to-openai-compatible-chat-messages.ts . All 21 focused tests passed. A PDF file name does not establish that it contains a numbered routing diagram; the model must assess the actual contents.

The first PDF run on `dpl_8ckqAVRney1ZGaj432C58S8Fuq8u` returned `ai_gateway_http_400` in 5.9 seconds. Dashboard logs confirmed Alibaba Cloud/Qwen 3.7 Flash rejected non-image file parts, with no reported usage and $0 cost for that request. The current Vercel PDF documentation confirms the inline `file.file_data` Chat Completions shape used here: https://vercel.com/docs/ai-gateway/inputs-and-tools/file-input . Catalog modality metadata alone did not guarantee working PDF support on this provider route.

Changed only the `gps-rollout-engine` preview branch model environment value to `google/gemini-2.5-flash`. The live model catalog lists PDF/image input and no training on prompt data; Vercel's model table shows eligibility for Free AI Gateway Credit. No paid credits, subscriptions, or top-ups were added. This change addresses the observed provider input limitation rather than retrying the rejected payload against the same route.

Final live preview `dpl_4t9D87gnLsBDQD9WLzGzsA72Ncbh` (code `f26529828c9c03732cb559b172c77bc85104e106`, Gemini 2.5 Flash environment) returned HTTP 200 in 16.9 seconds. Both official page and PDF returned HTTP 200. The PDF was 141,889 bytes with SHA-256 `cadb97e8b246d9a37f03b87a2cb0977415d8e8b8457608e759aea63e48ae68f3`. The report recorded `candidate_layouts_retrieved` and successfully performed the combined PDF + NAIP analysis.

The model returned `insufficient_evidence`, zero holes and reasons `missing_hole_numbering` / `insufficient_evidence`. It described the PDF as a table of yardages and pars without a numbered visual routing diagram. This content assessment is model-reported; no independent visual inspection of the PDF was completed in this workspace because its direct request returned 403. Asset discovery also records two page-image JPEG links with opaque names, which were not independently analyzed. No valid numbered hole match has been demonstrated.

Remaining requirement: retrieve a genuine numbered course-routing diagram or hole-by-hole visual reference, then verify the correspondence and coordinate accuracy. Website retrieval is now implemented and live-tested for the configured diagnostic, but generalized discovery and batch processing remain unfinished. Production and stored course geometry were unchanged.

AI Gateway dashboard verification: the final request at 2026-10-12T19:08:32Z is HTTP 200, model `google/gemini-2.5-flash`, provider Google Vertex AI, approximately 1.5K input / 1.5K output tokens, 11.33-second Gateway duration and $0.0043 usage cost against available credits. No billing settings were changed.
