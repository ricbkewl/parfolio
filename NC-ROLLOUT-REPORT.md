# North Carolina course rollout (2026-09-22)

## Live ParFolio baseline and result

| Measure | Before | After |
| --- | ---: | ---: |
| North Carolina catalog records | 0 | 626 |
| GPS Ready | 0 | 48 |
| Partial GPS | 0 | 27 |
| Course Located | 0 | 87 |
| Location Pending | 0 | 450 |
| Quarantined | 0 | 14 |
| North Carolina hole rows | 0 | 1,191 |
| Validated hole rows | 0 | 837 |
| Ordinary golfer catalog results | 0 | 48 |
| Super admin catalog results | 0 | 626 |

The 626 records are a course inventory, not a claim that all 626 facilities have been independently verified or have live GPS. The 450 Location Pending records remain an admin review queue even when the source provided coordinates. Four disc-golf, putting-only, or practice-only records were excluded. Fourteen overlapping identities were quarantined pending review. No existing ParFolio course geometry was overwritten, and no ATG data was accessed.

## Sources and matching

- OpenGolfAPI live North Carolina feed: 630 IDs, ODbL 1.0. Its downloadable US snapshot contained 649 North Carolina-labeled records; 582 IDs overlapped, 48 appeared only in the live feed, and 67 appeared only in the snapshot. The snapshot-only records were not imported blindly: nearly all coincide with live course names and locations, while three examples are labeled NC despite coordinates or cities outside NC.
- OpenStreetMap North Carolina extract via Geofabrik: 310 course features and 4,316 mapped hole ways, ODbL 1.0. Matching used course identity and geography, not name alone. Of the imported courses, 162 gained one unambiguous boundary match; 75 gained usable hole rows. Complete, sequential 9 or 18 hole routes were promoted only after location, identity, route uniqueness, and distance checks.
- U.S. Census TIGERweb official NC boundary screened the live coordinates. Moore County and Cumberland County golf GIS layers were compared as regional corroboration. Facility operators were used to resolve the 18-hole count conflicts at Duke University Golf Club, Brevofield Golf Links, and Sequoyah National Golf Club. Pinehurst's own multi-course listing informed separate facility/course handling.

OpenGolfAPI and OpenStreetMap attribution: **Contains data from OpenGolfAPI (opengolfapi.org) and OpenStreetMap contributors, ODbL 1.0.**

## Verification

- Database role checks: anonymous users see 48 NC catalog records, all `gps_ready`; the super admin sees all 626. Anonymous users see only 837 validated NC hole rows; the super admin sees all 1,191.
- The catalog pagination RPC returned 48 NC results to the anonymous role, and 500 plus 126 results to the super admin role.
- Each GPS Ready course has exactly its declared 9 or 18 unique, sequential, validated hole rows. Across 837 rows, tee-to-green distances range from 54 to 619 yards and none fails the universal 20–1,000 yard validator.
- The nationwide search path now admits authoritative GPS Ready catalog rows before hydration and filters incomplete rows from location search and suggestions. The existing universal hydration and map logic remain in place.

## Remaining review work

- The 450 Location Pending rows need independent facility and coordinate verification. The 14 identity conflicts need human adjudication. The 27 Partial GPS courses need additional route review or missing holes.
- OSM route endpoints are source-backed tee and green-center approximations; course operators or administrators should refine them if an endpoint is off the playing surface. Do not treat these mappings as surveyed pin placements.
- Facility counts are not asserted: the present catalog has no dedicated facility identifier, so a reliable statewide facility count requires explicit facility reconciliation. Closed-course status, alternate names, and resorts beyond the examined sources remain ongoing catalog work.
- The current admin “Map” editor saves a separate shared course and does not automatically promote its linked catalog row. Catalog promotion requires an explicit catalog and geometry update with review. Authenticated mobile GPS play and the map camera were not field tested during this rollout. The rollout did not add NC-specific GPS play behavior.
