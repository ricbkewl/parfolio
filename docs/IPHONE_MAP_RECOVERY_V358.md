# iPhone map and GPS resume recovery, v358

Status: code-level recovery release. Physical iPhone verification is still required. The results below describe pre-publication testing.

## What changed

- GPS now suspends/resumes independently of Google Maps. A failed or pending map cannot prevent a new location watch.
- Replaced GPS watches reject late success and error callbacks, including when the golfer stays on the same hole. Callbacks also check the active round, owner, hole, view and visibility.
- Hiding the app invalidates pending map initialization, tile readiness and camera callbacks. The suspended renderer cannot be reused by Next Hole.
- Foreground recovery creates a fresh map only after its connected container has nonzero dimensions. A layout that stays unavailable fails visibly after five seconds instead of waiting forever.
- Runtime configuration has a ten-second deadline. Old completions cannot reset the newer loader attempt.
- Context restoration rearms tile readiness; it does not itself declare the map healthy. Context handlers keep working after normal Next Hole renderer reuse.
- The replacement map restores the latest known GPS marker even if the fresh location arrived while imagery was loading.
- Late errors, tile events, gestures, planner drags and camera callbacks cannot mutate a replacement map or another hole. Automatic tile recovery remains bounded, followed by a Retry map button.
- The Google-only, flat vector map and tee-to-green camera are preserved. Healthy hole changes continue reusing the renderer.
- Application asset and service-worker cache versions advance to v358. There are no round-data migrations, site-data clearing operations or new storage cleanup behavior.
- Runtime CI now includes the map/GPS lifecycle regressions and runs for test-only changes.

## Base and application

Repository: https://github.com/ricbkewl/parfolio

Test base: main at e9f276e5a63579a1951c956ae26d1a08000e0f54, October 13, 2026. Publication was checked against 415f77d130663575015e9d6e3c1328d13dfa1fa6; its sole newer change is the automatic Golf Feed refresh, which is preserved.

The normal Git transport was unavailable in the test workspace. Source files were read from that exact GitHub commit into an isolated local branch. The changed existing files were verified against their Git blob hashes. Unavailable binary image assets were not synthesized or replaced.

From an appropriate checkout, inspect the patch, then run:

```sh
git apply --check parfolio-iphone-map-recovery-v358.patch
git apply parfolio-iphone-map-recovery-v358.patch
node tests/gps-lifecycle-v356.mjs
node tests/map-lifecycle-v356.mjs
node tests/map-resume-recovery.mjs
node tests/round-map-recovery.mjs
node tests/universal-gps-standard-v287.mjs
node tests/i18n-mutation-recovery-v356.mjs
```

If main has changed, rebase/review the patch rather than overwriting current work. The initial patch artifact did not publish, merge or deploy anything. Publication requires separate authorization.

## Verification

Passed locally with Node 24:

- 25 integrated regression tests executing production map/GPS functions with deterministic DOM, Maps and geolocation doubles
- Existing 14 map lifecycle scenarios and 12 active-round geometry/recovery scenarios
- Expanded GPS suite, including 12 lifecycle-driven lock/unlock simulations, both event orders, three zero-delay cycles, same-hole success/error races, BFCache, current geometry, API exceptions and rendering failures
- Universal GPS course-loading and translation-mutation recovery checks
- Syntax checks for every root JavaScript file and the runtime isolation guard
- Patch application check against the exact materialized base

Ten targeted regressions were run against unchanged main and the patched code: all ten fail on main and pass with this patch. This demonstrates code-path changes, not proof of the original physical-device cause.

The wider Node suite contains 17 scripts: 13 pass. Three unrelated failures reproduce on unchanged main: mobile-map-stability-v223 (old GPS-search observer assertion), production-repairs-v222 (courseLoadGeneration missing from its extracted test context), and tennessee-catalog-v255 (old v269 asset-query expectation). systemwide-static-v182 is blocked in this workspace by unavailable binary image assets, starting with parfolio-app-icon.png. Those failures were not changed or suppressed in this focused patch. No npm build/lint package is defined in the repository.

Not verified during the pre-publication checks: a real iPhone, Add to Home Screen/standalone mode, Safari's GPU/compositor after physical auto-lock, live Google Maps imagery, actual on-course GPS, production deployment, or deployed CI. Google Maps' tilesloaded event is a readiness signal, not visual proof that an iPhone's compositor drew the map.

Reference: https://developers.google.com/maps/documentation/javascript/reference/map#Map.tilesloaded

## Device acceptance checklist after an authorized release

Keep saved app data intact. Do not clear Safari website data, uninstall the Home Screen app, or delete rounds to run this checklist.

1. Open the existing ParFolio Home Screen icon. Record iPhone/iOS version and confirm whether this is standalone mode or a Safari tab. Confirm the v358 release has loaded before judging the result.
2. Use a practice round on Hemet or another previously working mapped course. Note the current hole, score, putts and a planner aim before each interruption. Keep any unsynced real round safe.
3. Outdoors with location permission enabled, verify real map imagery and an updating GPS position/yardage. A green panel or only overlay markers does not count as success.
4. Let auto-lock occur for at least one minute. Unlock directly into ParFolio. Verify imagery and GPS return, then tap Next Hole immediately. Repeat through several holes, including a longer five-minute lock.
5. Repeat with rapid lock/unlock, switching away and back, and a Safari back/forward restore where applicable. Confirm there is no duplicate map surface and the current hole remains correct.
6. Repeat while connectivity is briefly unavailable, then restore it. Verify bounded failure and Retry map recovery when imagery cannot load. Confirm GPS acquisition and scoring remain independent.
7. Open the scorecard or leave the round during recovery. A late map result must not cover the scorecard or navigate back into the round.
8. After every scenario, compare saved scores, putts, hole selection and planner aims. Record visible failures, timing and any diagnostic error text without clearing app data.
9. Stop and report if the map remains green, GPS fails to resume, or any saved state changes unexpectedly. A passing simulated test suite is not a substitute for these device checks.
