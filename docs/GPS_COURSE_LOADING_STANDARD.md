# ParFolio GPS Course Loading Standard

This standard applies to every course, state, province, and country added after v287.

## One production path

1. Import course metadata into `course_catalog`.
2. Store reviewed hole geometry in `course_hole_geometry`.
3. Promote a course to `gps_ready` only when all 9 or 18 sequential holes have valid tee and green-center coordinates.
4. Let `parfolio_course_catalog_page(null, offset, limit)` expose the course. Do not add a new regional browser loader.
5. Before GPS play, load the authoritative course through `parfolio_course_payload(course_id)` and pass the result through `ensureParFolioGpsCourseReady`.
6. Create Google Maps only after the universal gate succeeds.

California, Texas, Tennessee, and Indonesia browser loaders are legacy adapters. They must not be copied for a new region. New regional code may ingest or review data, but must not wrap `startCourseFromLibrary` or decide that a course is safe for GPS play.

## Required validation

A `gps_ready` payload must have:

- exactly 9 or 18 holes;
- unique, sequential hole numbers starting at 1;
- a valid, non-zero tee and green center for every hole;
- a plausible 20–1,000 yard tee-to-center distance for every hole;
- no inactive, rejected, partial, quarantined, or location-only catalog record.

Optional aim, front, back, route, source, and par fields are preserved. Failure stops GPS play with a retry message; it must never fall through to map creation.

## Cache rule

Geometry carries `parfolioGeometryVersion`. A release that changes geometry normalization or map loading must increment both this version and the service-worker cache. The app fetches the authoritative payload once per course per browser session. Offline fallback is allowed only when the stored geometry passed the current version of the validator.

## Map rule

The Google Maps renderer and camera are global and contain no state or country branches. Camera fitting is a single bounded operation per hole. Do not add recursive projection, `panBy`, zoom-correction, or idle-event feedback loops.

## Data boundary

Course names, locations, and reviewed public geometry are reference data. ParFolio must not read or copy private ATG golfers, rounds, scores, messages, profiles, credentials, or tester data. Golfer corrections enter the review queue and never overwrite published geometry directly.

## Enforcement

`tests/universal-gps-standard-v287.mjs` fails CI if a future regional JavaScript file wraps course start, if the universal gate is removed or loaded too late, if cache versions drift, or if invalid GPS-ready geometry can reach course selection.
