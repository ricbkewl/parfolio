/* ParFolio v170 — Smart Golf Data Check, available on every admin course editor. */
(()=>{
  const VERSION=170;
  let busy=false;

  const SOURCES={
    parfolio:{name:'Existing ParFolio / Shared Mapping',kind:'protected',rank:0,url:''},
    stateGis:{name:'Official / State GIS',kind:'independent',rank:1,url:''},
    osm:{name:'OpenStreetMap',kind:'independent',rank:2,url:'https://www.openstreetmap.org/'},
    overpass:{name:'Overpass API',kind:'osm-access',rank:3,url:'https://overpass-api.de/'},
    qlever:{name:'QLever OSM Planet',kind:'osm-access',rank:4,url:'https://qlever.dev/osm-planet/'},
    opengolf:{name:'OpenGolfAPI',kind:'independent',rank:5,url:'https://courses.opengolfapi.org/'},
    opengolfGithub:{name:'OpenGolfAPI GitHub Dataset',kind:'same-dataset',rank:6,url:'https://github.com/opengolfapi/data'},
    usgs:{name:'USGS The National Map / GNIS',kind:'independent',rank:7,url:'https://apps.nationalmap.gov/'},
    naip:{name:'USDA NAIP / USGS Aerial Imagery',kind:'imagery',rank:8,url:'https://www.usgs.gov/the-national-map-data-delivery/gis-data-download'},
    oam:{name:'OpenAerialMap',kind:'imagery',rank:9,url:'https://openaerialmap.org/'},
    dataGov:{name:'Data.gov Open Data Discovery',kind:'discovery',rank:10,url:'https://data.gov/'},
    localGis:{name:'County / City Open GIS Portals',kind:'discovery',rank:11,url:''},
    geofabrik:{name:'Geofabrik OSM Extracts',kind:'osm-mirror',rank:12,url:'https://download.geofabrik.de/'},
    bbbike:{name:'BBBike OSM Extracts',kind:'osm-mirror',rank:13,url:'https://extract.bbbike.org/'}
  };
  const ORDER=Object.keys(SOURCES).sort((a,b)=>SOURCES[a].rank-SOURCES[b].rank);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=s=>String(s||'').replace(/\s*[·|–—-]\s*(North|South|West)(?:\s*9)?\s*$/i,'').replace(/Golf Club|Golf Course|Country Club/ig,' ').replace(/\s+/g,' ').trim();
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function similarity(a,b){const A=new Set(norm(a).split(' ').filter(Boolean)),B=new Set(norm(b).split(' ').filter(Boolean));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(A.size,B.size)}
  function finite(v){const n=Number(v);return Number.isFinite(n)?n:null}
  function coursePoint(){
    if(typeof draft==='undefined'||!draft)return null;
    for(const p of[draft.catalog_point,draft.mapView,draft.location,draft.center]){const lat=finite(p?.lat??p?.latitude),lng=finite(p?.lng??p?.lon??p?.longitude);if(lat!==null&&lng!==null)return{lat,lng}}
    for(const g of(Array.isArray(draft.greens)?draft.greens:[])){for(const p of[g?.center,g?.tee,g?.tees?.black,g?.tees?.blue,g?.front,g?.back]){const lat=finite(p?.lat),lng=finite(p?.lng);if(lat!==null&&lng!==null)return{lat,lng}}}
    return null;
  }
  function courseRegion(){
    const state=String(draft?.state||draft?._openGolfImport?.state||'').toUpperCase().trim(),country=String(draft?.country||draft?.country_code||'').toUpperCase().trim(),city=String(draft?.city||draft?._openGolfImport?.city||'').trim();
    const us=country==='US'||country==='USA'||country==='UNITED STATES'||['CA','NY'].includes(state);return{state,country,city,us};
  }
  function mapSummary(){const gs=Array.isArray(draft?.greens)?draft.greens:[];let mapped=0;gs.forEach(g=>{const tee=g?.tee||g?.tees?.black||g?.tees?.blue||g?.tees?.white||g?.tees?.red;if(tee&&g?.center)mapped++});return{mapped,total:Number(draft?.holes)||gs.length||0}}
  function sourceUrl(key){
    const p=coursePoint(),r=courseRegion();
    if(key==='osm'&&p)return`https://www.openstreetmap.org/#map=16/${p.lat}/${p.lng}`;
    if(key==='stateGis'){
      if(r.state==='CA')return'https://gis.lcf.ca.gov/arcgis/rest/services/PointsOfInterest/MapServer/5';
      if(r.state==='NY')return'https://data.ny.gov/';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://data.go.id/';
    }
    if(key==='localGis'){
      if(r.state==='CA')return'https://data.ca.gov/';
      if(r.state==='NY')return'https://data.ny.gov/';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://data.go.id/';
    }
    if(key==='geofabrik'){
      if(r.state==='CA')return'https://download.geofabrik.de/north-america/us/california.html';
      if(r.state==='NY')return'https://download.geofabrik.de/north-america/us/new-york.html';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://download.geofabrik.de/asia/indonesia.html';
    }
    return SOURCES[key]?.url||'';
  }
  const make=(state,detail,url='')=>({state,detail,url});
  function initialResults(){
    const ms=mapSummary(),out={};ORDER.forEach(k=>out[k]=make('pending','Waiting to check.',sourceUrl(k)));
    out.parfolio=make(ms.mapped?'verified':'reference',ms.mapped?`${ms.mapped} of ${ms.total} holes already have tee + center data. Existing points are protected from lower-priority sources.`:'No tee + center mapping is present yet.','');
    return out;
  }
  const badge=s=>({verified:'VERIFIED',found:'FOUND',checking:'CHECKING',reference:'REFERENCE',conflict:'NO MATCH',error:'UNAVAILABLE','not-applicable':'N/A',pending:'PENDING'})[s]||String(s).toUpperCase();
  const rowClass=s=>['verified','found'].includes(s)?'good':s==='checking'?'checking':['conflict','error'].includes(s)?'warn':['reference','not-applicable'].includes(s)?'muted':'';
  function panelMarkup(results){
    const rows=ORDER.map(key=>{const m=SOURCES[key],r=results[key]||make('pending','Waiting to check.'),url=r.url||sourceUrl(key)||m.url,kind=m.kind==='osm-access'?'OSM access / same dataset':m.kind==='osm-mirror'?'OSM bulk mirror / same dataset':m.kind==='same-dataset'?'same OpenGolfAPI dataset':m.kind;return`<li class="smart-source-row ${rowClass(r.state)}"><div><b>${esc(m.name)}</b><small>${esc(kind)}</small></div><div class="smart-source-result"><strong>${badge(r.state)}</strong><span>${esc(r.detail)}</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}</div></li>`}).join('');
    return`<div class="smart-source-copy"><small>OPEN GOLF DATA SOURCES</small><b>Smart Golf Data Check</b><span>Checks the strongest available sources in order. Missing data may be filled, but existing mapped tee/green points are never overwritten by a lower-priority source.</span></div><button id="smartGolfDataButton" class="primary" type="button" onclick="smartGolfDataCheck()" ${busy?'disabled':''}>${busy?'Checking Sources…':'Check All Sources'}</button><details class="smart-source-details" ${draft?._smartGolfDataCheck?'open':''}><summary>Source ladder & results</summary><ol>${rows}</ol></details>`;
  }
  function ensurePanel(){
    if(typeof draft==='undefined'||!draft||typeof adminRole==='undefined'||!adminRole||!document.getElementById('courseMap'))return;
    let panel=document.getElementById('smartGolfDataPanel');
    if(!panel){panel=document.createElement('section');panel.id='smartGolfDataPanel';panel.className='smart-golf-data-panel';const anchor=document.querySelector('.course-search')||document.querySelector('.map-layer-toggle')||document.getElementById('courseMap');anchor?.parentNode?.insertBefore(panel,anchor)}
    const results=draft._smartGolfDataCheck?.results||initialResults(),signature=JSON.stringify(results)+'|'+busy;
    if(panel.dataset.signature!==signature){panel.innerHTML=panelMarkup(results);panel.dataset.signature=signature}
    const legacy=document.getElementById('osmGolfImport');if(legacy)legacy.classList.add('smart-source-legacy-hidden');
  }
  function setResult(results,key,state,detail,url=''){results[key]=make(state,detail,url||sourceUrl(key));if(draft){draft._smartGolfDataCheck={...(draft._smartGolfDataCheck||{}),version:VERSION,results}}ensurePanel()}
  async function quiet(fn){const notes=[],old=window.alert;window.alert=x=>notes.push(String(x||''));try{await fn();return{notes,error:null}}catch(error){return{notes,error}}finally{window.alert=old}}

  async function checkOfficialGis(results){
    const r=courseRegion(),p=coursePoint();
    if(r.state!=='CA'){
      const detail=r.state==='NY'?'New York open-data portals are included as a reference; no single statewide hole-by-hole golf geometry API is available.':(r.country==='ID'||r.country==='INDONESIA')?'Indonesia open-data portals are included as a reference; no standardized national golf-hole API is available.':'No standardized official golf-course GIS endpoint is configured for this region.';
      setResult(results,'stateGis','reference',detail,sourceUrl('stateGis'));return;
    }
    if(!p){setResult(results,'stateGis','not-applicable','A course center is needed before the California GIS proximity check can run.',sourceUrl('stateGis'));return}
    setResult(results,'stateGis','checking','Checking California official GIS golf-course points near this course…');
    try{
      const q=new URLSearchParams({geometry:`${p.lng},${p.lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',distance:'8000',units:'esriSRUnit_Meter',outFields:'NAME,FULLADDR,MUNICIPALITY,STATE,CAPTUREMETH',returnGeometry:'true',outSR:'4326',f:'geojson'});
      const res=await fetch(`https://gis.lcf.ca.gov/arcgis/rest/services/PointsOfInterest/MapServer/5/query?${q}`);if(!res.ok)throw new Error(`California GIS returned ${res.status}`);const data=await res.json(),features=data?.features||[];
      const best=features.map(f=>({f,score:similarity(f?.properties?.NAME,draft.name)})).sort((a,b)=>b.score-a.score)[0];
      if(best&&best.score>=.34){const a=best.f.properties||{};setResult(results,'stateGis','verified',`Official GIS match: ${a.NAME||draft.name}${a.MUNICIPALITY?` · ${a.MUNICIPALITY}`:''}${a.CAPTUREMETH?` · ${a.CAPTUREMETH}`:''}.`)}else setResult(results,'stateGis','reference',`${features.length} nearby official golf-course point${features.length===1?'':'s'} returned, but no strong name match.`);
    }catch(e){setResult(results,'stateGis','error',e.message||String(e))}
  }
  async function checkOsm(results){
    setResult(results,'osm','checking','Using OSM as the primary open hole-geometry dataset.');setResult(results,'overpass','checking','Querying golf=hole, tee, green and pin features…');
    if(typeof window.importOsmGolfData!=='function'){setResult(results,'overpass','error','OSM importer is unavailable.');return}
    const before=draft?._osmImport?.at,{notes,error}=await quiet(()=>window.importOsmGolfData()),o=draft?._osmImport;
    if(o&&o.at!==before){setResult(results,'overpass','found',`${o.holesFound||0} numbered holes matched; ${o.markersAdded||0} missing marker points added.`);setResult(results,'osm','found',`${o.holesFound||0} numbered OSM holes matched. Existing ParFolio points were preserved.`)}
    else if(error){setResult(results,'overpass','error',error.message||String(error));setResult(results,'osm','reference','OSM could not be read through Overpass for this check.')}
    else{setResult(results,'overpass','conflict',notes[0]||'No safely numbered OSM golf-hole geometry was matched.');setResult(results,'osm','reference','No usable numbered OSM hole geometry was returned for this course.')}
  }
  async function checkQlever(results){
    const p=coursePoint();if(!p){setResult(results,'qlever','not-applicable','A course center is needed for the OSM Planet proximity query.');return}
    setResult(results,'qlever','checking','Cross-checking the same OSM dataset through QLever…');
    const query=`PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>\nPREFIX geo: <http://www.opengis.net/ont/geosparql#>\nPREFIX geof: <http://www.opengis.net/def/function/geosparql/>\nSELECT ?element ?golf ?geometry WHERE { VALUES ?golf { "hole" "tee" "green" "pin" } ?element osmkey:golf ?golf ; geo:hasGeometry/geo:asWKT ?geometry . FILTER(geof:metricDistance(?geometry, "POINT(${p.lng} ${p.lat})"^^geo:wktLiteral) < 1900) } LIMIT 700`;
    try{const res=await fetch('https://qlever.dev/api/osm-planet',{method:'POST',headers:{Accept:'application/sparql-results+json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({query})});if(!res.ok)throw new Error(`QLever returned ${res.status}`);const json=await res.json(),rows=json?.results?.bindings||[],n=t=>rows.filter(x=>x.golf?.value===t).length;setResult(results,'qlever',rows.length?'found':'reference',rows.length?`${n('hole')} holes, ${n('tee')} tees, ${n('green')} greens and ${n('pin')} pins found. Same OSM data; cross-check only.`:'No nearby golf features returned. Same OSM data; not independent confirmation.')}catch(e){setResult(results,'qlever','error',`${e.message||e}. Overpass data, if found, remains valid.`)}
  }
  async function checkOpenGolf(results){
    setResult(results,'opengolf','checking','Checking course identity, center coordinates and scorecard metadata…');
    if(typeof window.importOpenGolfApiData!=='function'){setResult(results,'opengolf','error','OpenGolfAPI importer is unavailable.');return}
    const before=draft?._openGolfImport?.at,{notes,error}=await quiet(()=>window.importOpenGolfApiData()),o=draft?._openGolfImport;
    if(o&&o.at!==before)setResult(results,'opengolf','found',`${o.name||draft.name}: ${o.holesFound||0} hole records; ${o.parsAdded||0} missing/default pars filled.`);else if(error)setResult(results,'opengolf','error',error.message||String(error));else setResult(results,'opengolf','reference',notes[0]||'No safe OpenGolfAPI match was found.');
    if(!courseRegion().us){setResult(results,'opengolfGithub','not-applicable','The current OpenGolfAPI bulk dataset is U.S.-focused.');return}
    setResult(results,'opengolfGithub','checking','Checking the public bulk mirror…');
    try{const res=await fetch('https://raw.githubusercontent.com/opengolfapi/data/main/opengolfapi-us.csv',{method:'HEAD',cache:'no-store'});if(!res.ok)throw new Error(`GitHub mirror returned ${res.status}`);setResult(results,'opengolfGithub','verified','Bulk mirror available. It is the same OpenGolfAPI dataset, so it is not counted as independent confirmation.')}catch(e){setResult(results,'opengolfGithub','error',e.message||String(e))}
  }
  async function checkUsgs(results){
    if(!courseRegion().us){setResult(results,'usgs','not-applicable','USGS The National Map applies to U.S. courses.');return}
    setResult(results,'usgs','checking','Checking the federal geographic-name/map service…');
    try{const q=new URLSearchParams({searchText:clean(draft.name),contains:'true',layers:'all',returnGeometry:'true',sr:'4326',f:'json'}),res=await fetch(`https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/find?${q}`);if(!res.ok)throw new Error(`USGS returned ${res.status}`);const json=await res.json(),rows=json?.results||[];setResult(results,'usgs',rows.length?'found':'reference',rows.length?`${rows.length} federal name match${rows.length===1?'':'es'} returned; useful for location cross-checking, not hole geometry.`:'No matching federal geographic-name feature returned.')}catch(e){setResult(results,'usgs','error',e.message||String(e))}
  }
  async function checkImagery(results){
    const r=courseRegion(),p=coursePoint();setResult(results,'naip',r.us?'reference':'not-applicable',r.us?'NAIP/USGS imagery is available for visual tee/green verification; it is not a hole-number source.':'NAIP is U.S.-only; use OpenAerialMap/local imagery for this course.');
    if(!p){setResult(results,'oam','not-applicable','A course center is needed to search aerial coverage.');return}
    setResult(results,'oam','checking','Checking open aerial imagery coverage…');
    try{const d=.02,bbox=[p.lng-d,p.lat-d,p.lng+d,p.lat+d].join(','),res=await fetch(`https://api.openaerialmap.org/meta?bbox=${encodeURIComponent(bbox)}&limit=5`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`OpenAerialMap returned ${res.status}`);const json=await res.json(),rows=Array.isArray(json)?json:(json?.results||json?.meta||[]);setResult(results,'oam',rows.length?'found':'reference',rows.length?`${rows.length} open aerial image record${rows.length===1?'':'s'} found near the course.`:'No open aerial imagery returned for this small area.')}catch(e){setResult(results,'oam','error',e.message||String(e))}
  }
  async function checkDiscovery(results){
    const r=courseRegion(),q=[draft?.name,r.city,r.state||r.country,'golf course GIS'].filter(Boolean).join(' ');setResult(results,'dataGov','checking','Searching public government dataset metadata…');
    try{const res=await fetch(`https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=5`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`Data.gov returned ${res.status}`);const json=await res.json(),count=Number(json?.result?.count)||0;setResult(results,'dataGov',count?'found':'reference',count?`${count} potentially related public dataset${count===1?'':'s'} found; no coordinate is auto-applied without a compatible GIS layer.`:'No directly related Data.gov dataset found.')}catch(e){setResult(results,'dataGov','error',e.message||String(e))}
    setResult(results,'localGis','reference',`County/city portals do not share one universal API. The applicable regional portal is linked for manual cross-checking${r.city?` around ${r.city}`:''}.`,sourceUrl('localGis'));
  }
  function checkMirrors(results){const geo=sourceUrl('geofabrik');setResult(results,'geofabrik',geo?'reference':'not-applicable',geo?'Regional bulk OSM extract available. Same OSM data; use when live query services are incomplete or unavailable.':'No region-specific Geofabrik shortcut is configured.',geo||SOURCES.geofabrik.url);setResult(results,'bbbike','reference','Custom/bulk OSM extracts are available. Same underlying OSM data; not independent confirmation.',SOURCES.bbbike.url)}

  window.smartGolfDataCheck=async function(){
    if(busy||typeof draft==='undefined'||!draft||typeof adminRole==='undefined'||!adminRole)return;busy=true;const results=initialResults();draft._smartGolfDataCheck={version:VERSION,startedAt:new Date().toISOString(),results};ensurePanel();
    try{await checkOfficialGis(results);await checkOsm(results);await checkQlever(results);await checkOpenGolf(results);await checkUsgs(results);await checkImagery(results);await checkDiscovery(results);checkMirrors(results);const ms=mapSummary();setResult(results,'parfolio',ms.mapped?'verified':'reference',ms.mapped?`${ms.mapped} of ${ms.total} holes now have tee + center data. Lower-priority sources did not overwrite existing mapped points.`:'Source ladder completed, but no complete tee + center mapping was added automatically.');draft._smartGolfDataCheck.completedAt=new Date().toISOString()}finally{busy=false;ensurePanel()}
  };

  /* All course editor paths eventually call mapCourse(). Attach directly there instead of depending on a provider-specific panel. */
  if(typeof mapCourse==='function'){const prior=mapCourse;mapCourse=function(){prior();setTimeout(ensurePanel,0)}}
  window.PARFOLIO_SMART_GOLF_DATA={version:VERSION,sources:SOURCES,ensurePanel};
})();
