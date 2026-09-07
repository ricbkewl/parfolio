# ParFolio production audit — September 7, 2026

Permanent production URL: https://ricbkewl.github.io/parfolio/

Application repair release: `daf77c20ddd23d4811e39a2410df5bf1fb0545d1` (v222). [Successful Pages deployment](https://github.com/ricbkewl/parfolio/actions/runs/34130018727).
Main subsequently advanced to `5201a1aaa332ce29f0ca62d8277815768818a24c` for the scheduled Golf Feed only. No ATG repository or backend was modified.

**Assessment: suitable for controlled beta, not yet certified for unrestricted public launch. Readiness: 80/100 (engineering judgment, not the automated pass percentage).**

## Measured results

The final v222 automated sample comprises **116 checks: 115 passed, one failed/inconclusive**:
- 96 real production browser checks: 95 passed; WebKit offline reload produced an internal browser error.
- 13 transactional backend behavior checks: all passed; synthetic users/rounds/messages were rolled back.
- Seven local regression suites: all passed, including editor continuity and catalog refresh.

This total counts the defined final test sample, not every SQL statement, static observation, earlier rerun, or historical CI workflow. It does not count untested authenticated browser interactions as passes.

[Final three-browser run and screenshots](https://github.com/ricbkewl/parfolio/actions/runs/34130053818). The workflow is red because it preserves the offline failure instead of suppressing it. Raw results are in `audit/production-browser-v222.json`. Tested desktop Chromium 1440×900, mobile Chromium 390×844, and WebKit 390×844; these are browser configurations, not physical iPhone/Android hardware.

**16 repair groups completed**, detailed below. No remaining critical vulnerability was identified in the inspected surface; this is not a guarantee of absence.

## Critical — repaired

1. **Anonymous friend-request acceptance.** `social_respond_friend_request` was SECURITY DEFINER, executable by anonymous callers, and used `receiver_id <> auth.uid()`; SQL NULL semantics could bypass rejection with no user. Added explicit authentication rejection and null-safe comparison; revoked PUBLIC/anon execution on social RPCs. Also removed direct authenticated INSERT privileges that bypassed friendship/block checks. Authenticated callers retain the scoped RPCs. Migration: `20260907034700_social_authorization_audit.sql`. Verified anonymous EXECUTE false and authenticated direct-message INSERT false.

## High priority — repaired

2. **Direct-message deployment mismatch.** Live `social-v211.js` referenced missing image/deletion fields, RPCs, and a bucket. Installed the private `dm-media` bucket, image/tombstone columns, participant/sender policies and RPCs; hardened null photo paths and default function grants. Migration: `20260907034718_install_dm_media_audit.sql`. Verified fields, private bucket, and role grants. Actual photo upload/UI lifecycle still needs authenticated browser testing.

3. **Protected-view restoration and sign-out state.** Ported the previously unreleased centralized route protections into current `app.js`, preserving later features. Private views wait for session restoration; mapping requires course admin; directory requires super admin; sign-out clears private client state. Regression tests and anonymous production route checks passed. Full sign-in/token-expiry behavior with a real test account remains unverified.

4. **Editor returns to hole 1 / resets marker.** `course-edit-guard-v214.js` normalized every render by assigning hole 1 and a default target. It now retains the current hole and target. Production checks retained hole 7/back; regression tests covered tee, aim1, aim2, front, center and back. Existing geometry was not rewritten.

5. **Duplicate runtime initialization.** `offline-courses-v193.js` injected UI consistency already included by index; UI consistency injected Indonesia a second time. Removed both redundant bootstraps. All three browsers confirmed unique script URLs.

6. **Partial GPS and hole-filter state.** `gps-search-priority-v186.js` reported partial GPS as “located” while `course-filter-sort-v203.js` filtered “partial”; partial results disappeared. Corrected the key and 9/18-hole selected-state rendering. Live partial filter now returns courses.

7. **ZIP, short-token, and autocomplete false matches.** Numeric ZIP queries fell through fuzzy name matching, and reverse prefix comparisons admitted one-letter/short tokens (e.g. unrelated “J” courses for Jakarta). `smart-course-search-v176-fix.js` now matches ZIP prefixes against postal fields and applies meaningful-token matching to single and multiple terms with bounded prefixes. Suggestions use the same predicate. Typo, city/state, ZIP, and Jakarta production tests passed.

8. **Sierra Lakes missing address/ZIP.** ParFolio catalog row had null postal/address values. Restored 92336 and the address from the [official contact page](https://www.sierralakes.com/contact-us/). No coordinates or hole geometry changed. Recorded SQL: `supabase/audit-sierra-lakes-postal.sql`.

9. **Course previews missing catalog coordinates / misleading labels.** `app.js` preview-point selection ignored catalog-only coordinates. It now uses validated catalog points when no hole point exists and calls the OSM fallback a map preview. This does not claim street maps are satellite imagery or complete the separate official-photo rollout.

10. **Cache isolation and stale asset revisions.** Service-worker activation deleted every cache on the origin, not just ParFolio caches. Deletion is now scoped to `parfolio-`; index script/style revisions and the offline cache advanced to v222. Existing cached installations can request the repaired asset versions. Chromium offline shell checks passed; WebKit limitation remains below.

11. **Catalog loss after saves / blank metadata overwrite.** Base `loadCourses` replaced the combined catalog with private rows although regional loaders run once. It now retains source-prefixed reference rows while refreshing authoritative UUID-backed saved rows; deleted local rows are not retained. California merging now retains existing postal/address values when incoming values are empty. Regression tests verify reference retention and local-row deletion behavior.

## Medium priority — repaired

12. **Repeated Google-health DOM scans.** Mutation callbacks in `google-maps-health-v215.js` could queue many whole-page inspections per frame. Coalesced pending inspections; provider fallback behavior remains intact.

13. **Diagnostic workflows could publish code / create commit churn.** The compatibility workflow could rebase a branch then push it to main. Both compatibility and backend-contract reporting now use read-only permissions and artifacts. Anonymous OpenAPI absence is no longer described as proof that private objects are missing.

14. **Obsolete ATG replacement workflow.** `.github/workflows/migrate-atg-v148.yml` still contained a destructive foundation-replacement job. Replaced it with an archived, read-only manual notice. ATG itself was not accessed or modified by this repair.

15. **Residual chat watermark filename.** `styles.css` referenced an Agape image filename. Replaced it with the ParFolio icon. The loaded JavaScript, production text, and runtime isolation checks found no religious branding or Vercel production dependency.

16. **Legacy browser QA ran before initialization completed.** The old Smart Courses workflow waited for only 100 courses, which can occur before later UI wrappers load, then failed “Quick filters missing.” Its wait now requires completed initialization/regional loads and the visible quick-filter control. The v222 three-browser suite already exercised the actual course UI successfully; the legacy workflow is separately retested after this correction.

## High priority — remaining data and verification limits

- **ZIP coverage is mostly absent in the private regional catalog:** 1,911 of 1,913 active rows lack postal codes after the Sierra Lakes correction. Search logic is repaired, but it cannot reliably find metadata that was never imported. Some additional NY/shared records have ZIPs, so this is not the whole-app missing-ZIP count. Safest fix: source-backed address/ZIP enrichment with provenance and conflict review; do not infer ZIPs from fuzzy course-name matches.
- **New York source identity corruption:** `ny-course-catalog-v158.js` labels “Antioch Golf Club”, address “40150 North Route 59”, as NY; the [official course at that address](https://www.valleyridgegolfcourse.com/) is in Illinois. It also labels “Wild Wing Plantation Hummingbird Course” as Mamaroneck, NY, while [Wild Wing’s official site](https://www.playwildwing.com/) places Hummingbird in Conway, South Carolina. Coordinates alone pass the geographic bounds check, so bounds checking is insufficient. Raw source records/geometry were preserved. Safest fix: quarantine identity conflicts from GPS publication, reconcile stable source IDs against official identity, then remap only reviewed records. Do not bulk move or overwrite saved course geometry.
- **Authenticated browser lifecycle remains unverified:** no signed-in golfer/admin browser session was supplied. Actual start/join screens, QR scanning, score entry, scorecard sharing, chat/photo uploads, Previous Rounds, profile updates, token restoration and admin editing were not certified end to end. Backend behavior and route guards were tested separately. A successful SQL check does not substitute for these user interactions.
- **Real-device GPS/camera behavior remains unverified:** live movement, GPS accuracy, phone permission prompts, safe-area behavior around physical device cutouts, and hole-to-hole camera/flyover visual behavior need a real-device round. The existing tee-to-green camera, flyover, route and planner scripts were preserved. Do not report simulated map tiles as proof of live GPS accuracy.

## Medium priority — remaining

- **iPhone/WebKit offline reload:** the service worker activated, but two reruns of offline reload returned “WebKit encountered an internal error.” Chromium mobile/desktop offline shells passed. The available evidence cannot distinguish a WebKit automation limitation from a Safari-specific defect; test an installed PWA on a physical iPhone before certification. No speculative service-worker workaround was applied.
- **Startup cost and patch layering:** 66 index-loaded scripts total about 1.71 MB uncompressed; largest are NY catalog (~401 KB), QR scanner (~375 KB), app (~240 KB), Supabase (~212 KB), and Leaflet (~148 KB). Numerous editor scripts load on Home. Safest next step: measured lazy loading of scanner/editor and regional catalog data behind regression gates; avoid removing apparently duplicate wrappers without checking their override order.
- **Database performance advisors:** four unindexed foreign-key findings, nine RLS init-plan findings, nine no-primary-key findings on staging-style tables, and 14 unused-index observations. These are not proof of a current slow query. Add indexes only after checking query plans; do not drop unused indexes based on a short beta observation window.
- **Leaked-password protection disabled:** Supabase advisor reports this Auth option disabled. This is an account/Auth configuration follow-up; no credentials, billing changes, or replacement project were introduced.
- **Shared name-only matching:** `shared-course-library-v145.js` can fall back to normalized name and payload hydration also falls back to name. Same-name courses in different places could collide. Safest fix: stable source IDs first, then corroborated city/state/coordinates; review affected merges before rewriting existing IDs.
- **Course imagery remains incomplete:** the separate official-photo/satellite feature branch is not part of this audit release. Card previews may still use OSM street maps. Official-photo reuse must retain permission/source attribution; Google map availability alone does not establish photo rights.

## Low priority / cleanup

- Readme opens/closes correctly but its localized guide still displays an old feature-guide version/date and some older map terminology.
- GitHub Pages uploads the repository root. SQL, reports, and obsolete non-runtime files should eventually be excluded with an explicit static-site artifact allowlist, after verifying all lazy assets. The security scan found no service-role JWT, private key, or secret-key pattern in 199 inspected text/code files, but this is not a full git-history secret audit.
- Critical libraries are already locally vendored and versioned. Google Maps, weather, open data and feed thumbnails necessarily remain external integrations. Preserve provider attribution and monitor availability rather than copying provider tiles indiscriminately.

## Passed / healthy evidence

- Pages production deployment and all 100 referenced shell assets; PWA manifest and active service worker.
- Mobile/desktop/WebKit home and course layouts without horizontal overflow; 6-o’clock floating Map position/opening; Readme and course-correction form opening.
- No JavaScript page exceptions, unexpected HTTP errors, failed requests or console errors in final browser samples.
- Google Satellite **California, New York, Indonesia × three browser configurations = nine successful tile-loaded checks**, without Google auth/error overlays. No current key/referrer failure reproduced.
- Supabase Auth settings endpoint 200; all 38 public tables have RLS enabled; core realtime publication contains shared_rounds, round_players, round_scores, round_hole_stats and round_messages.
- Avatar buckets intentionally public with ownership-restricted writes; round-chat-media and dm-media private with participant/sender restrictions.
- Anonymous friend-response/photo RPC access denied. Private profiles, admin roles, scores and chat are scoped by grants/RLS.
- Rollback test: create round; own score insert; join/shared scorecard; denial of other golfer score updates; participant chat; denial of non-host completion; denial of non-admin directory/promotion; outsider round/score/chat invisibility; completed-round score immutability; completed history visibility.
- 14 saved course rows remain; zero synthetic audit users remain.
- Shared Golf Course Library pagination loaded **1,251 rows**. Settled browser catalog: **2,867 entries** (CA 1,150, NY 970, TX 609, Indonesia 139; labels/merges are not a deduplicated verified physical-course census).
- Private active regional catalog: **1,913 rows**; CA 1,146 / TX 631 / ID 136. Classified GPS-ready 299 / 210 / 22 respectively; partial 83 / 96 / 8. NY geometry source: 551 records, 503 complete and 48 partial. These categories describe data completeness, not official identity verification.
- OpenGolf search and Overpass probes both returned HTTP 200. “Check Sources” uses these integrations. Network reachability does not certify every returned course match or authorize automatic geometry overwrite.

## What must happen before public-launch certification

Use dedicated test accounts on real iPhone/Android devices for the protected golfer lifecycle and offline recovery, resolve source identity conflicts before relying on their GPS labels, and improve address/ZIP coverage. Keep the working camera, floating Map, saved geometry, and private-user boundaries intact.
