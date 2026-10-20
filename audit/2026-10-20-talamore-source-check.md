# Talamore source check

Checked October 20 UTC (October 19 Pacific). CoachMe remains deferred.

## Read-only database findings

- Course catalog ID: `7d40f020-3a44-4581-b7a6-f9bb584b7f17`, Talamore Golf Resort, Southern Pines, NC, US.
- Mapping class: `partial_gps`; catalog `holes` is null. No catalog correction made.
- `course_hole_geometry` contains 17 rows for holes 1-11 and 13-18, all with non-null tee and green-center coordinates. This is a completeness observation, not independent positional validation. Hole 12 is absent.
- Initial query against `courses` failed because `city` is not a column; the correct catalog read succeeded. No database writes occurred.

## Official document inspected

Source: https://talamoregolfresort.com/wp-content/uploads/2019/06/In-Room-Dir-2019-Maps-1.pdf

Standard public download succeeded. PDF metadata: six pages, 5,068,357 bytes, created June 27, 2019. Rendered and visually inspected page 1 at 1800px: schematic course/community layout with reservoir, clubhouse, fairways and neighborhood names, but no visible golf hole numbers. The page footer 12 is a document page number, not hole identity. This cannot establish the missing hole's number. Current routing correspondence and reuse permissions remain unverified.

The PDF also exceeds the existing 4 MiB ingestion limit. The limit was deliberately retained; this unnumbered reference does not warrant increasing it or paying for model analysis.

## Implementation and verification

Added direct operator-configured PDF support to official-source retrieval. It uses the existing HTTPS configuration check, redirect rejection, shared deadline, byte cap and source hashing. It requires a PDF header and labels successful retrieval only as a candidate, never verified routing. Added direct-PDF success, invalid-header, size, HTTP-denial and redirect tests.

All 24 focused tests passed:

`node --test tests/official-course-layout.test.js tests/eastpointe-vision-report.test.js tests/gps-rollout-safety.test.js`

No new course allowlist entry, AI request, geometry write, promotion, production deployment or billing change. No new GPS holes recovered. Next source lead: official Talamore hole-by-hole flyovers; establish numbered visual evidence before a recovery run. The null catalog hole count also requires verified resolution before the existing diagnostic can accept this course.
