"""Build the audited Tennessee ParFolio catalog and OSM hole geometry.

OpenGolf supplies stable course references and course-level locations. Named
OpenStreetMap golf-course boundaries expand the catalog where OpenGolf is
incomplete and supply source geometry. Every point is checked against the
official U.S. Census Tennessee boundary. Incomplete or ambiguous layouts are
never promoted to GPS Ready.
"""

import csv
import datetime
import io
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

from scripts import map_ny_osm_v2 as osm


ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL = "https://raw.githubusercontent.com/opengolfapi/data/main/opengolfapi-us.csv"
CENSUS_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0/query"
OUT = ROOT / "data/tn-osm-gps-v255.json"
REPORT = ROOT / "TN-GPS-MAPPING-REPORT.md"
STATE = "TN"
STATE_FIPS = "47"
VERSION = 255


def fetch_bytes(url, *, timeout=120):
    request = urllib.request.Request(url, headers={"User-Agent": "ParFolio-TN-Mapper/255"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def norm(value):
    value = str(value or "").lower().replace("&", " and ")
    value = re.sub(r"\b(golf|course|club|country|links|the|at)\b", " ", value)
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def exact_norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def integer(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def valid_point(point):
    return bool(
        point
        and number(point.get("lat")) is not None
        and number(point.get("lng")) is not None
        and -90 <= number(point["lat"]) <= 90
        and -180 <= number(point["lng"]) <= 180
        and not (number(point["lat"]) == 0 and number(point["lng"]) == 0)
    )


def point_in_ring(point, ring):
    x, y = point["lng"], point["lat"]
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def point_in_polygon(point, polygon):
    return bool(polygon and point_in_ring(point, polygon[0]) and not any(point_in_ring(point, hole) for hole in polygon[1:]))


def state_polygons():
    query = urllib.parse.urlencode(
        {
            "where": f"STATE='{STATE_FIPS}'",
            "outFields": "STATE,NAME",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
        }
    )
    payload = json.loads(fetch_bytes(f"{CENSUS_URL}?{query}", timeout=90))
    geometry = payload["features"][0]["geometry"]
    return geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]


def inside_state(point, polygons):
    return valid_point(point) and any(point_in_polygon(point, polygon) for polygon in polygons)


def source_osm_id(row):
    value = str(row.get("osm_id") or "").strip()
    match = re.search(r"(\d+)$", value)
    return int(match.group(1)) if match else None


def catalog_score(row):
    pars = sum(bool(row.get(f"hole_{hole}_par")) for hole in range(1, 19))
    holes = integer(row.get("holes"))
    metadata = sum(bool(row.get(field)) for field in ("address", "postal_code", "website", "phone", "osm_id"))
    return (holes in (9, 18), pars, metadata, row.get("updated_at") or "")


def duplicate_key(row):
    return exact_norm(row.get("name")), exact_norm(row.get("city"))


def load_opengolf(polygons):
    rows = list(csv.DictReader(io.StringIO(fetch_bytes(CATALOG_URL).decode("utf-8-sig"))))
    raw = [row for row in rows if str(row.get("state") or "").strip().upper() == STATE]
    candidates, rejected = [], []
    for row in raw:
        point = {"lat": number(row.get("latitude")), "lng": number(row.get("longitude"))}
        if not valid_point(point):
            rejected.append({"sourceId": row.get("id"), "name": row.get("name"), "reason": "invalid coordinates"})
        elif not inside_state(point, polygons):
            rejected.append({"sourceId": row.get("id"), "name": row.get("name"), "city": row.get("city"), "reason": "outside official Tennessee boundary"})
        else:
            row["_point"] = point
            candidates.append(row)

    groups = defaultdict(list)
    for row in candidates:
        groups[duplicate_key(row)].append(row)
    selected, duplicates = [], []
    for group in groups.values():
        winner = max(group, key=catalog_score)
        selected.append(winner)
        for row in group:
            if row is not winner:
                duplicates.append(
                    {
                        "sourceId": row.get("id"),
                        "name": row.get("name"),
                        "city": row.get("city"),
                        "keptSourceId": winner.get("id"),
                        "reason": "duplicate OpenGolf name/city row",
                    }
                )
    selected.sort(key=lambda row: (exact_norm(row.get("name")), exact_norm(row.get("city"))))
    return raw, selected, rejected, duplicates


def download_osm():
    # Tennessee envelope divided into bounded Overpass requests.
    south, north, west, east = 34.90, 36.75, -90.40, -81.55
    lat_step, lon_step = 0.62, 0.82
    dedup, failed_tiles = {}, []
    tile = 0
    lat = south
    while lat < north:
        next_lat = min(north, lat + lat_step)
        lon = west
        while lon < east:
            next_lon = min(east, lon + lon_step)
            tile += 1
            elements = osm.fetch_tile(lat, lon, next_lat, next_lon, tile)
            if not elements:
                failed_tiles.append({"tile": tile, "bbox": [lat, lon, next_lat, next_lon]})
            for element in elements:
                dedup[(element.get("type"), element.get("id"))] = element
            print(f"TN tile {tile}: {len(elements)} objects; unique {len(dedup)}", flush=True)
            time.sleep(0.25)
            lon = next_lon
        lat = next_lat
    return list(dedup.values()), tile, failed_tiles


def featureize(elements, polygons):
    boundaries, features, outside = [], [], 0
    for element in elements:
        points = osm.element_points(element)
        center = osm.centroid(points)
        tags = element.get("tags") or {}
        if not points or not center or not valid_point(center):
            continue
        item = {
            "id": element.get("id"),
            "type": element.get("type"),
            "tags": tags,
            "points": points,
            "center": center,
            "bbox": osm.bbox(points),
        }
        if tags.get("leisure") == "golf_course":
            if inside_state(center, polygons):
                boundaries.append(item)
            else:
                outside += 1
        elif tags.get("golf") in ("hole", "tee", "green", "pin") and inside_state(center, polygons):
            features.append(item)
    return boundaries, features, outside


def bbox_area(boundary):
    bounds = boundary.get("bbox")
    return 0 if not bounds else abs((bounds[2] - bounds[0]) * (bounds[3] - bounds[1]))


def dedupe_boundaries(boundaries):
    named = [boundary for boundary in boundaries if exact_norm(boundary["tags"].get("name"))]
    groups, duplicates = [], []
    for boundary in sorted(named, key=lambda item: (exact_norm(item["tags"].get("name")), item["type"], item["id"])):
        match = None
        for group in groups:
            kept = group[0]
            if exact_norm(kept["tags"].get("name")) == exact_norm(boundary["tags"].get("name")) and osm.dist_m(kept["center"], boundary["center"]) <= 350:
                match = group
                break
        if match is None:
            groups.append([boundary])
        else:
            match.append(boundary)
    kept = []
    for group in groups:
        winner = max(group, key=bbox_area)
        kept.append(winner)
        for boundary in group:
            if boundary is not winner:
                duplicates.append(
                    {
                        "sourceId": f"osm-{boundary['type']}-{boundary['id']}",
                        "name": boundary["tags"].get("name"),
                        "keptSourceId": f"osm-{winner['type']}-{winner['id']}",
                        "reason": "duplicate named OSM course boundary",
                    }
                )
    return kept, duplicates


def pick_boundary(course, boundaries):
    point = course["_point"]
    stable_id = source_osm_id(course)
    if stable_id:
        exact = [boundary for boundary in boundaries if boundary["id"] == stable_id]
        if len(exact) == 1:
            return exact[0], 1.0, False, "stable_osm_id"

    candidates = []
    for boundary in boundaries:
        distance = osm.dist_m(point, boundary["center"])
        if distance > 3000:
            continue
        similarity = osm.similarity(course.get("name"), boundary["tags"].get("name"))
        exact = bool(norm(course.get("name"))) and norm(course.get("name")) == norm(boundary["tags"].get("name"))
        score = (1.0 if exact else similarity) * 0.82 + max(0, 1 - distance / 3000) * 0.18
        if exact or similarity >= 0.42:
            candidates.append((score, distance, boundary))
    candidates.sort(key=lambda item: (-item[0], item[1]))
    if not candidates or candidates[0][0] < 0.43:
        return None, 0, False, None
    ambiguous = len(candidates) > 1 and candidates[1][0] >= candidates[0][0] - 0.07
    return candidates[0][2], candidates[0][0], ambiguous, "name_city_proximity"


def selected_features(boundary, features):
    polygon, bounds = boundary["points"], boundary["bbox"]
    closed = len(polygon) >= 4 and osm.dist_m(polygon[0], polygon[-1]) < 25
    return [
        feature
        for feature in features
        if osm.in_bbox(feature["center"], bounds, 150)
        and (not closed or osm.point_in_poly(feature["center"], polygon) or osm.dist_m(feature["center"], boundary["center"]) <= 1800)
    ]


def map_holes(selected):
    holes = [feature for feature in selected if feature["tags"].get("golf") == "hole"]
    tees = [feature for feature in selected if feature["tags"].get("golf") == "tee"]
    greens = [feature for feature in selected if feature["tags"].get("golf") == "green"]
    pins = [feature for feature in selected if feature["tags"].get("golf") == "pin"]
    numbered = defaultdict(list)
    for hole in holes:
        hole_number = osm.hole_num(hole["tags"])
        if hole_number and hole_number <= 36:
            numbered[hole_number].append(hole)

    issues = [f"hole {number} has {len(group)} competing route features" for number, group in numbered.items() if len(group) > 1]
    rows = []
    for hole_number in sorted(numbered):
        hole = max(numbered[hole_number], key=lambda item: osm.route_length(item["points"]))
        route = hole["points"][:]
        if len(route) < 2:
            issues.append(f"hole {hole_number} lacks route endpoints")
            continue
        start, end = route[0], route[-1]
        start_tee, end_tee = osm.nearest(tees, start, 180), osm.nearest(tees, end, 180)
        start_green = osm.nearest(pins, start, 150) or osm.nearest(greens, start, 190)
        end_green = osm.nearest(pins, end, 150) or osm.nearest(greens, end, 190)
        forward = (osm.dist_m(start_tee["center"], start) if start_tee else 120) + (osm.dist_m(end_green["center"], end) if end_green else 120)
        reverse = (osm.dist_m(end_tee["center"], end) if end_tee else 120) + (osm.dist_m(start_green["center"], start) if start_green else 120)
        if reverse + 35 < forward:
            route.reverse()
            start, end = route[0], route[-1]

        tee_feature = osm.nearest(tees, start, 180)
        green_feature = osm.nearest(greens, end, 200)
        pin_feature = osm.nearest(pins, end, 150)
        tee = (tee_feature or {"center": start})["center"]
        center = (pin_feature or green_feature or {"center": end})["center"]
        yards = osm.dist_m(tee, center) * 1.0936133
        if not valid_point(tee) or not valid_point(center) or yards < 45 or yards > 850:
            issues.append(f"hole {hole_number} has invalid or implausible tee/center geometry")
            continue

        front = back = None
        if green_feature:
            front, back = osm.green_edges(tee, center, green_feature["points"])
        par = integer(hole["tags"].get("par"))
        par = par if par is not None and 3 <= par <= 6 else None
        aim1 = aim2 = None
        if len(route) > 2 and par != 3:
            aim1 = osm.point_fraction(route, 0.34 if par == 5 else 0.5)
            if par == 5:
                aim2 = osm.point_fraction(route, 0.68)
        rows.append(
            {
                "hole": hole_number,
                "tee": tee,
                "center": center,
                "front": front,
                "back": back,
                "aim1": aim1,
                "aim2": aim2,
                "par": par,
                "yards": round(yards),
                "route": {"type": "LineString", "coordinates": [[point["lng"], point["lat"]] for point in route]},
                "osmHoleUri": f"https://www.openstreetmap.org/{hole['type']}/{hole['id']}",
                "teeSource": "tagged_tee" if tee_feature else "numbered_hole_endpoint",
                "greenSource": "tagged_pin" if pin_feature else ("tagged_green" if green_feature else "numbered_hole_endpoint"),
            }
        )
    return rows, issues


def declared_holes(course, boundary, numbers):
    boundary_holes = integer(boundary["tags"].get("holes")) if boundary else None
    source_holes = integer(course.get("holes")) if course else None
    if boundary_holes in (9, 18):
        return boundary_holes, "osm_boundary"
    if source_holes in (9, 18):
        return source_holes, "opengolf"
    if numbers == list(range(1, 19)):
        return 18, "complete_numbered_geometry"
    return None, None


def course_payload(course, boundary, rows, issues, boundary_score, ambiguous, match_method, shared_boundary):
    numbers = sorted(row["hole"] for row in rows)
    expected, expected_source = declared_holes(course, boundary, numbers)
    complete = bool(expected in (9, 18) and numbers == list(range(1, expected + 1)))
    unsafe = ambiguous or shared_boundary or any("competing route" in issue for issue in issues)
    mapping_class = "course_located"
    if rows:
        mapping_class = "quarantined" if unsafe else ("gps_ready" if complete and not issues else "partial_gps")
    point = course["_point"] if course else boundary["center"]
    name = course.get("name") if course else boundary["tags"].get("name")
    city = course.get("city") if course else boundary["tags"].get("addr:city", "")
    source_id = course.get("id") if course else f"osm-{boundary['type']}-{boundary['id']}"
    osm_uri = f"https://www.openstreetmap.org/{boundary['type']}/{boundary['id']}" if boundary else None
    source_holes = integer(course.get("holes")) if course else None
    return {
        "sourceId": source_id,
        "sourceName": "opengolfapi+openstreetmap" if course and boundary else ("opengolfapi" if course else "openstreetmap"),
        "name": name,
        "city": city or "",
        "state": STATE,
        "postalCode": (course.get("postal_code") if course else boundary["tags"].get("addr:postcode")) or "",
        "address": (course.get("address") if course else "") or "",
        "latitude": point["lat"],
        "longitude": point["lng"],
        "courseType": (course.get("type") if course else boundary["tags"].get("access")) or "",
        "phone": (course.get("phone") if course else boundary["tags"].get("phone")) or "",
        "website": (course.get("website") if course else boundary["tags"].get("website")) or "",
        "sourcePar": number(course.get("par")) if course else None,
        "sourceHoles": source_holes,
        "declaredHoles": expected,
        "declaredHolesSource": expected_source,
        "mappingClass": mapping_class,
        "playableHoles": expected if mapping_class == "gps_ready" else None,
        "mappedHoleCount": len(rows),
        "numberedHoles": numbers,
        "boundaryMatch": boundary["tags"].get("name") if boundary else None,
        "boundaryScore": round(boundary_score, 3),
        "boundaryMatchMethod": match_method,
        "ambiguousBoundary": ambiguous,
        "sharedBoundary": shared_boundary,
        "osmCourseUri": osm_uri,
        "issues": issues[:20],
        "greens": rows,
    }


def payload_distance(a, b):
    return osm.dist_m(
        {"lat": a["latitude"], "lng": a["longitude"]},
        {"lat": b["latitude"], "lng": b["longitude"]},
    )


def geometry_rank(course):
    rank = {"gps_ready": 5, "quarantined": 4, "partial_gps": 3, "course_located": 2, "location_pending": 1}
    return rank.get(course["mappingClass"], 0), course["mappedHoleCount"]


def adopt_geometry(target, source, issue=None):
    """Attach source-backed OSM data to the stable OpenGolf record."""
    for key in (
        "mappingClass", "playableHoles", "mappedHoleCount", "numberedHoles",
        "declaredHoles", "declaredHolesSource", "boundaryMatch", "boundaryScore",
        "boundaryMatchMethod", "ambiguousBoundary", "sharedBoundary", "osmCourseUri", "greens",
    ):
        target[key] = source[key]
    target["sourceName"] = "opengolfapi+openstreetmap"
    target["issues"] = list(dict.fromkeys(target.get("issues", []) + source.get("issues", []) + ([issue] if issue else [])))[:20]


def reconcile_payloads(mapped, duplicate_records):
    # Merge identical named OSM boundary fragments within one facility. Multiple
    # fragments with geometry are quarantined because their routing/loop identity
    # cannot safely be inferred.
    osm_only = [course for course in mapped.values() if course["sourceName"] == "openstreetmap"]
    consumed = set()
    for index, course in enumerate(osm_only):
        if course["sourceId"] in consumed:
            continue
        group = [course]
        for other in osm_only[index + 1 :]:
            if other["sourceId"] in consumed:
                continue
            if exact_norm(other["name"]) == exact_norm(course["name"]) and payload_distance(course, other) <= 1000:
                group.append(other)
        if len(group) == 1:
            continue
        winner = max(group, key=geometry_rank)
        geometry_fragments = sum(item["mappedHoleCount"] > 0 for item in group)
        if geometry_fragments > 1:
            winner["mappingClass"] = "quarantined"
            winner["playableHoles"] = None
            winner["issues"] = list(dict.fromkeys(winner.get("issues", []) + ["multiple same-name OSM boundary fragments; loop identity is ambiguous"]))[:20]
        for other in group:
            if other is winner:
                continue
            consumed.add(other["sourceId"])
            mapped.pop(other["sourceId"], None)
            duplicate_records.append(
                {
                    "sourceId": other["sourceId"],
                    "name": other["name"],
                    "keptSourceId": winner["sourceId"],
                    "reason": "duplicate or fragmented same-name OSM facility boundary",
                }
            )

    # Prefer stable OpenGolf identity when an unmatched OSM record is the same
    # named facility. Keep the OSM geometry and attribution on that record.
    opengolf = [course for course in mapped.values() if course["sourceName"].startswith("opengolfapi")]
    osm_only = [course for course in mapped.values() if course["sourceName"] == "openstreetmap"]
    for course in opengolf:
        matches = [
            other for other in osm_only
            if other["sourceId"] in mapped
            and exact_norm(other["name"]) == exact_norm(course["name"])
            and payload_distance(course, other) <= 1500
        ]
        if len(matches) != 1:
            continue
        other = matches[0]
        adopt_geometry(course, other)
        mapped.pop(other["sourceId"], None)
        duplicate_records.append(
            {
                "sourceId": other["sourceId"],
                "name": other["name"],
                "keptSourceId": course["sourceId"],
                "reason": "exact-name OpenGolf/OSM duplicate",
            }
        )

    # Confirmed historical/current facility aliases sharing the same property.
    alias_pairs = [("Falcon Pointe Golf Club", "Waterville Golf Course (Cherokee Springs)")]
    for preferred_name, alternate_name in alias_pairs:
        preferred = next((course for course in mapped.values() if exact_norm(course["name"]) == exact_norm(preferred_name)), None)
        alternate = next((course for course in mapped.values() if exact_norm(course["name"]) == exact_norm(alternate_name)), None)
        if not preferred or not alternate or payload_distance(preferred, alternate) > 100:
            continue
        adopt_geometry(preferred, alternate, f"alternate source name: {alternate['name']}")
        mapped.pop(alternate["sourceId"], None)
        duplicate_records.append(
            {
                "sourceId": alternate["sourceId"],
                "name": alternate["name"],
                "keptSourceId": preferred["sourceId"],
                "reason": "alternate name at the same verified facility location",
            }
        )
    return mapped


def statistics(mapped):
    stats = Counter(course["mappingClass"] for course in mapped.values())
    stats["mapped_holes"] = sum(course["mappedHoleCount"] for course in mapped.values())
    stats["valid_locations"] = sum(valid_point({"lat": course["latitude"], "lng": course["longitude"]}) for course in mapped.values())
    stats["opengolf_courses"] = sum(course["sourceName"].startswith("opengolfapi") for course in mapped.values())
    stats["osm_only_courses"] = sum(course["sourceName"] == "openstreetmap" for course in mapped.values())
    stats["matched_opengolf_osm"] = sum(course["sourceName"] == "opengolfapi+openstreetmap" for course in mapped.values())
    stats["courses_with_geometry"] = sum(course["mappedHoleCount"] > 0 for course in mapped.values())
    stats["courses_with_geometry_issues"] = sum(bool(course["issues"]) for course in mapped.values())
    return stats


def write_outputs(payload):
    stats = Counter(payload["stats"])
    lines = [
        "# Tennessee GPS Mapping Report",
        "",
        f"Generated: {payload['generatedAt']}",
        "",
        f"- Raw OpenGolf Tennessee rows: **{payload['rawTennesseeRows']}**",
        f"- Audited unique Tennessee courses: **{payload['auditedCourses']}**",
        f"- OpenGolf-backed unique courses: **{stats['opengolf_courses']}**",
        f"- OSM-only named courses: **{stats['osm_only_courses']}**",
        f"- Valid course locations: **{stats['valid_locations']}**",
        f"- Rejected source records: **{len(payload['rejectedRecords'])}**",
        f"- Duplicate or alternate-name records: **{len(payload['duplicateRecords'])}**",
        f"- Failed Overpass tiles: **{len(payload['failedTiles'])}**",
        f"- OSM course boundaries scanned: **{payload['osmCourseBoundaries']}**",
        f"- OSM golf features scanned: **{payload['osmGolfFeatures']}**",
        f"- GPS Ready: **{stats['gps_ready']}**",
        f"- Partial GPS: **{stats['partial_gps']}**",
        f"- Course Located: **{stats['course_located']}**",
        f"- Location Pending: **{stats['location_pending']}**",
        f"- Quarantined: **{stats['quarantined']}**",
        f"- Validated hole rows: **{stats['mapped_holes']}**",
        "",
        "Only complete, unambiguous 9-hole or 18-hole layouts are GPS Ready. Partial and ambiguous geometry is retained for review and never promoted to playable GPS.",
    ]
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines), flush=True)


def build():
    polygons = state_polygons()
    raw, opengolf_courses, rejected, duplicate_records = load_opengolf(polygons)
    elements, tiles, failed_tiles = download_osm()
    boundaries, features, outside_boundaries = featureize(elements, polygons)
    boundaries, osm_duplicates = dedupe_boundaries(boundaries)
    duplicate_records.extend(osm_duplicates)

    matches = {}
    boundary_uses = Counter()
    for course in opengolf_courses:
        boundary, score, ambiguous, method = pick_boundary(course, boundaries)
        matches[course["id"]] = (boundary, score, ambiguous, method)
        if boundary:
            boundary_uses[(boundary["type"], boundary["id"])] += 1

    mapped, matched_boundaries = {}, set()
    for index, course in enumerate(opengolf_courses, 1):
        boundary, score, ambiguous, method = matches[course["id"]]
        rows, issues = map_holes(selected_features(boundary, features)) if boundary else ([], [])
        shared = bool(boundary and boundary_uses[(boundary["type"], boundary["id"])] > 1)
        payload = course_payload(course, boundary, rows, issues, score, ambiguous, method, shared)
        mapped[payload["sourceId"]] = payload
        if boundary:
            matched_boundaries.add((boundary["type"], boundary["id"]))
        if index % 25 == 0:
            print(f"Mapped {index}/{len(opengolf_courses)} OpenGolf Tennessee courses", flush=True)

    for boundary in boundaries:
        key = (boundary["type"], boundary["id"])
        if key in matched_boundaries:
            continue
        rows, issues = map_holes(selected_features(boundary, features))
        payload = course_payload(None, boundary, rows, issues, 1.0, False, "stable_osm_boundary", False)
        mapped[payload["sourceId"]] = payload

    mapped = reconcile_payloads(mapped, duplicate_records)
    stats = statistics(mapped)

    generated = datetime.datetime.now(datetime.timezone.utc).isoformat()
    payload = {
        "version": VERSION,
        "generatedAt": generated,
        "catalogSource": CATALOG_URL,
        "boundarySource": CENSUS_URL,
        "geometrySource": "OpenStreetMap via tiled Overpass",
        "sourceLicenses": {"OpenGolf": "ODbL 1.0 / DbCL 1.0 contents", "OpenStreetMap": "ODbL 1.0", "US Census boundary": "U.S. public domain"},
        "rawTennesseeRows": len(raw),
        "auditedCourses": len(mapped),
        "rejectedRecords": rejected,
        "duplicateRecords": duplicate_records,
        "tilesQueried": tiles,
        "failedTiles": failed_tiles,
        "osmCourseBoundaries": len(boundaries),
        "osmGolfFeatures": len(features),
        "outsideStateOsmBoundaries": outside_boundaries,
        "stats": dict(stats),
        "courses": mapped,
    }
    OUT.parent.mkdir(exist_ok=True)
    write_outputs(payload)


def reconcile_existing():
    payload = json.loads(OUT.read_text(encoding="utf-8"))
    payload["sourceLicenses"] = {"OpenGolf": "ODbL 1.0 / DbCL 1.0 contents", "OpenStreetMap": "ODbL 1.0", "US Census boundary": "U.S. public domain"}
    for course in payload["courses"].values():
        course["issues"] = [issue for issue in course.get("issues", []) if issue != "reconciled exact-name OSM facility boundary"]
    payload["courses"] = reconcile_payloads(payload["courses"], payload["duplicateRecords"])
    payload["stats"] = dict(statistics(payload["courses"]))
    payload["auditedCourses"] = len(payload["courses"])
    write_outputs(payload)


if __name__ == "__main__":
    reconcile_existing() if "--reconcile-existing" in sys.argv else build()
