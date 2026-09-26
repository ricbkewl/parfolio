/*
 * ParFolio GPS Rollout Engine — controller contract
 *
 * This module is intentionally independent of the playing/map UI.
 * It defines the state-neutral rules every regional rollout must obey.
 */

const COMPLETE_COURSE_SIZES = new Set([9, 18]);

function finitePoint(lat, lng) {
  lat = Number(lat); lng = Number(lng);
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0);
}

function radians(v) { return Number(v) * Math.PI / 180; }
function yardsBetween(a, b) {
  const lat1=radians(a.lat), lat2=radians(b.lat);
  const dLat=lat2-lat1, dLng=radians(b.lng)-radians(a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.0936133;
}

/* Pass 2 contract: tee + green center is sufficient. Front/back/aim/route are optional. */
function validateTeeCenterCourse(rows, declaredHoles) {
  const holes = Number(declaredHoles);
  if (!COMPLETE_COURSE_SIZES.has(holes) || !Array.isArray(rows) || rows.length !== holes)
    return { ok:false, reason:'course must contain exactly 9 or 18 complete holes' };

  const seen = new Set();
  for (const row of rows) {
    const n=Number(row.hole_number ?? row.hole);
    if (!Number.isInteger(n) || n < 1 || n > holes || seen.has(n))
      return { ok:false, reason:'hole numbers must be unique and sequential' };
    seen.add(n);
    if (!finitePoint(row.tee_lat, row.tee_lng) || !finitePoint(row.green_center_lat ?? row.green_lat, row.green_center_lng ?? row.green_lng))
      return { ok:false, reason:`hole ${n} is missing tee or green center` };
    const y=yardsBetween(
      {lat:Number(row.tee_lat),lng:Number(row.tee_lng)},
      {lat:Number(row.green_center_lat ?? row.green_lat),lng:Number(row.green_center_lng ?? row.green_lng)}
    );
    if (y < 20 || y > 1000) return { ok:false, reason:`hole ${n} has implausible tee-to-center distance` };
  }
  for (let n=1;n<=holes;n++) if (!seen.has(n)) return {ok:false,reason:`missing hole ${n}`};
  return {ok:true,holes};
}

/*
 * Sierra Lakes invariant:
 * A weaker import can never demote or erase already verified GPS geometry.
 * Enrichment is allowed; replacement/demotion requires geometry that passes
 * the same authoritative 9/18-hole gate.
 */
function protectVerifiedGeometry(existing, incomingValidation) {
  const existingVerified = ['gps_ready','verified_gps','published'].includes(String(existing?.mapping_class || '').toLowerCase());
  if (existingVerified && !incomingValidation?.ok) {
    return { preserve:true, mapping_class:existing.mapping_class, reason:'protected_verified_geometry' };
  }
  return { preserve:false };
}

function newestOsmEdit(a,b) {
  const ta=Date.parse(a?.osm_timestamp||0)||0, tb=Date.parse(b?.osm_timestamp||0)||0;
  if (ta!==tb) return ta>tb?a:b;
  return Number(a?.osm_version||0)>=Number(b?.osm_version||0)?a:b;
}

function dedupeNewestHoleEdits(rows) {
  const byHole=new Map();
  for (const row of rows||[]) {
    const n=Number(row.hole_number);
    if (!Number.isInteger(n)) continue;
    byHole.set(n, byHole.has(n)?newestOsmEdit(byHole.get(n),row):row);
  }
  return [...byHole.values()].sort((a,b)=>Number(a.hole_number)-Number(b.hole_number));
}

module.exports = {
  COMPLETE_COURSE_SIZES,
  validateTeeCenterCourse,
  protectVerifiedGeometry,
  dedupeNewestHoleEdits
};
