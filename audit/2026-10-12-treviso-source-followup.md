# Treviso source follow-up

The previous official-PDF run reported a scorecard without numbered routing. Two official page images with opaque filenames were discovered but excluded by the original keyword-only asset selector.

Code `e543aea90ae631ce2cb37cc6c377fe3e709ca74a` considers same-origin document-library images after named references. It excludes obvious logo/banner/social decoration, preserves the three-asset maximum, and retains the existing byte/deadline/redirect limits. This is candidate discovery only: image inclusion does not establish hole identity. All 22 focused tests passed, including selection priority, bounded asset count and exclusion of external origins.

Additional source research:

- https://trevisobaynaplesfl.com/Treviso%20bay%20site%20plan.pdf — search index describes a community plan with numbered golf features, but its indexed publication is about 15 years old. Direct retrieval and search opening returned HTTP 502. Not imported or accepted as current routing.
- https://www.suncoastglobalrealty.com/treviso-bay-naples — lists a community site plan but cautions that documents may be incomplete or inaccurate. No numbering accepted from the page.
- https://d15zjc2r4e8kr7.cloudfront.net/9831/community-maps/Treviso%20BayWEBNEW.pdf — search extraction identifies a community map and explicit duplication restrictions. Not imported into the recovery pipeline.

Direct workspace requests for the two official JPEGs returned HTTP 403. The deployed preview previously retrieved the official page and PDF with HTTP 200; the preview test checks that actual runtime without changing request identity or credentials.

## Live result

Preview `dpl_Bba46dCfBR1Uh9VdErzMJ5jAnpRz` returned HTTP 200 in 16.8 seconds. It retrieved the official page, PDF and both previously excluded JPEGs with HTTP 200, then supplied all three assets with NAIP imagery to Gemini 2.5 Flash. Full source hashes and responses are recorded in `2026-10-12-treviso-three-assets-report.json`.

Result: `insufficient_evidence`, zero candidate holes, `promotable:false`, `armed:false`. The model still reported scorecard information without numbered visual routing. This is a model-reported assessment, not independent visual inspection. Treviso remains unresolved; repeated analysis of the same assets is unlikely to fix the missing numbering evidence. No geometry, production deployment, subscriptions or billing settings changed.

## Next test candidate

Talamore publishes a six-page map document at https://talamoregolfresort.com/wp-content/uploads/2019/06/In-Room-Dir-2019-Maps-1.pdf . Search retrieved the PDF and identifies page 1 as Map of Talamore and page 4 as Map of Mid South. This is a lead, not yet verified usable numbered routing: the document's age, visual numbering and correspondence to current imagery need checking. The direct workspace download returned HTTP 403. No NC diagnostic allowlist or database entry was changed.
