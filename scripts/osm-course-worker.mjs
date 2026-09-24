import fs from "node:fs/promises";

const inputPath = process.argv[2] || "data/fl-osm-worker-input.json";
const outputPath = process.argv[3] || "data/fl-osm-worker-output.json";
const reportPath = process.argv[4] || "FL-OSM-WORKER-REPORT.md";

const courses = JSON.parse(await fs.readFile(inputPath, "utf8"));
const mirrors = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rad = d => d * Math.PI / 180;
function yards(aLat,aLng,bLat,bLng){
  const R=6371008.8;
  const dLat=rad(bLat-aLat), dLng=rad(bLng-aLng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x))*1.0936133;
}
async function overpass(query){
  let last;
  for (const base of mirrors){
    for(let attempt=1; attempt<=3; attempt++){
      try{
        const ctl=new AbortController();
        const timer=setTimeout(()=>ctl.abort(), 45000);
        const res=await fetch(base+"?data="+encodeURIComponent(query),{
          headers:{"User-Agent":"ParFolio-GPS-Course-Validator/1.0"},
          signal:ctl.signal
        });
        clearTimeout(timer);
        if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
      }catch(e){
        last=e;
        await sleep(1000*attempt);
      }
    }
  }
  throw last || new Error("Overpass failed");
}

const results=[];
for(const course of courses){
  const delta=course.delta ?? 0.018;
  const bbox=`${course.latitude-delta},${course.longitude-delta},${course.latitude+delta},${course.longitude+delta}`;
  const query=`[out:json][timeout:35];way["golf"="hole"](${bbox});out tags geom;`;
  let data;
  try { data=await overpass(query); }
  catch(e){
    results.push({...course,status:"fetch_error",reason:String(e?.message||e),holes:[]});
    continue;
  }
  const ways=(data.elements||[]).filter(x=>x.type==="way" && Array.isArray(x.geometry) && x.geometry.length>=2);
  const holes=ways.map(w=>{
    const ref=Number.parseInt(w.tags?.ref,10);
    const par=Number.parseInt(w.tags?.par,10);
    const first=w.geometry[0], last=w.geometry[w.geometry.length-1];
    return {
      osm_way_id:w.id,
      hole_number:Number.isInteger(ref)?ref:null,
      par:Number.isInteger(par)&&par>=2&&par<=7?par:null,
      tee_lat:first.lat, tee_lng:first.lon,
      green_center_lat:last.lat, green_center_lng:last.lon,
      hole_yards:yards(first.lat,first.lon,last.lat,last.lon),
      route_geojson:{type:"LineString",coordinates:w.geometry.map(p=>[p.lon,p.lat])},
      osm_hole_uri:`https://www.openstreetmap.org/way/${w.id}`
    };
  }).filter(h=>h.hole_number>=1 && h.hole_number<=18);

  const byNum=new Map();
  for(const h of holes){
    if(!byNum.has(h.hole_number)) byNum.set(h.hole_number,[]);
    byNum.get(h.hole_number).push(h);
  }
  const expected=course.holes;
  const nums=[...byNum.keys()].sort((a,b)=>a-b);
  const duplicates=nums.filter(n=>byNum.get(n).length!==1);
  const selected=nums.filter(n=>byNum.get(n).length===1).map(n=>byNum.get(n)[0]);
  const sequential=nums.length===expected && nums[0]===1 && nums[nums.length-1]===expected &&
    Array.from({length:expected},(_,i)=>i+1).every((n,i)=>nums[i]===n);
  const plausible=selected.length===expected && selected.every(h=>h.hole_yards>=20 && h.hole_yards<=1000);
  const ok=sequential && duplicates.length===0 && plausible && ways.length===expected;

  results.push({
    ...course,
    status: ok ? "validated" : "rejected",
    reason: ok ? null : JSON.stringify({
      total_osm_hole_ways:ways.length,
      numbered_unique:nums.length,
      duplicates,
      sequential,
      plausible
    }),
    holes: ok ? selected : []
  });
  await sleep(800);
}

await fs.writeFile(outputPath, JSON.stringify({
  generated_at:new Date().toISOString(),
  source:"OpenStreetMap Overpass API",
  license:"ODbL 1.0",
  attribution:"© OpenStreetMap contributors",
  courses:results
},null,2));

const good=results.filter(r=>r.status==="validated");
const rejected=results.filter(r=>r.status==="rejected");
const errors=results.filter(r=>r.status==="fetch_error");
let report=`# Florida OSM Geometry Worker Report

Generated: ${new Date().toISOString()}

- Input courses: **${results.length}**
- Validated: **${good.length}**
- Rejected: **${rejected.length}**
- Fetch errors: **${errors.length}**
- Validated hole rows: **${good.reduce((n,c)=>n+c.holes.length,0)}**

## Validated courses
`;
report += good.length ? good.map(c=>`- ${c.name} (${c.city}) — ${c.holes.length} holes`).join("\n") : "- None";
report += `

## Rejected / unresolved
`;
report += [...rejected,...errors].length ? [...rejected,...errors].map(c=>`- ${c.name}: ${c.status} — ${c.reason}`).join("\n") : "- None";
report += `

Attribution: © OpenStreetMap contributors (ODbL 1.0).
`;
await fs.writeFile(reportPath, report);
console.log(report);
