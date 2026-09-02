/* ParFolio v169 — Smart Golf Data Check across the full open-data source ladder. */
(()=>{
  const VERSION=169;
  let busy=false;

  const SOURCE_META={
    parfolio:{name:'Existing ParFolio / Shared Mapping',kind:'protected',rank:0,url:''},
    osm:{name:'OpenStreetMap',kind:'independent',rank:1,url:'https://www.openstreetmap.org/'},
    overpass:{name:'Overpass API',kind:'osm-mirror',rank:2,url:'https://overpass-api.de/'},
    qlever:{name:'QLever OSM Planet',kind:'osm-mirror',rank:3,url:'https://qlever.dev/osm-planet/'},
    opengolf:{name:'OpenGolfAPI',kind:'independent',rank:4,url:'https://courses.opengolfapi.org/'},
    opengolfGithub:{name:'OpenGolfAPI GitHub Dataset',kind:'same-dataset',rank:5,url:'https://github.com/opengolfapi/data'},
    stateGis:{name:'State / Official GIS',kind:'independent',rank:6,url:''},
    usgs:{name:'USGS The National Map / GNIS',kind:'independent',rank:7,url:'https://apps.nationalmap.gov/'},
    naip:{name:'USDA NAIP / USGS Aerial Imagery',kind:'imagery',rank:8,url:'https://www.usgs.gov/the-national-map-data-delivery/gis-data-download'},
    oam:{name:'OpenAerialMap',kind:'imagery',rank:9,url:'https://openaerialmap.org/'},
    dataGov:{name:'Data.gov Open Data Discovery',kind:'discovery',rank:10,url:'https://data.gov/'},
    localGis:{name:'County / City Open GIS Portals',kind:'discovery',rank:11,url:''},
    geofabrik:{name:'Geofabrik OSM Extracts',kind:'osm-mirror',rank:12,url:'https://download.geofabrik.de/'},
    bbbike:{name:'BBBike OSM Extracts',kind:'osm-mirror',rank:13,url:'https://extract.bbbike.org/'}
  };

  const orderedKeys=Object.keys(SOURCE_META).sort((a,b)=>SOURCE_META[a].rank-SOURCE_META[b].rank);

  function cleanName(name=''){
    return String(name).replace(/\s*[·|–—-]\s*(North|South|West)(?:\s*9)?\s*$/i,'').replace(/Golf Club|Golf Course|Country Club/ig,' ').replace(/\s+/g,' ').trim();
  }
  function norm(s=''){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function similarity(a,b){
    const aa=new Set(norm(a).split(' ').filter(Boolean)),bb=new Set(norm(b).split(' ').filter(Boolean));
    if(!aa.size||!bb.size)return 0;let hits=0;aa.forEach(w=>{if(bb.has(w))hits++});return hits/Math.max(aa.size,bb.size);
  }
  function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
  function point(){
    if(typeof draft==='undefined'||!draft)return null;
    const candidates=[draft.catalog_point,draft.mapView,draft.location,draft.center];
    for(const p of candidates){const lat=num(p?.lat??p?.latitude),lng=num(p?.lng??p?.lon??p?.longitude);if(lat!==null&&lng!==null)return{lat,lng};}
    const gs=Array.isArray(draft.greens)?draft.greens:[];
    for(const g of gs){for(const p of[g?.center,g?.tee,g?.tees?.black,g?.front,g?.back]){const lat=num(p?.lat),lng=num(p?.lng);if(lat!==null&&lng!==null)return{lat,lng};}}
    return null;
  }
  function region(){
    const state=String(draft?.state||draft?._openGolfImport?.state||'').toUpperCase().trim();
    const country=String(draft?.country||draft?.country_code||'').toUpperCase().trim();
    const city=String(draft?.city||draft?._openGolfImport?.city||'').trim();
    const us=country==='US'||country==='USA'||country==='UNITED STATES'||['CA','NY'].includes(state);
    return{state,country,city,us};
  }
  function status(state,detail,url=''){return{state,detail,url}}
  function resultClass(state){return state==='found'||state==='verified'?'good':state==='checking'?'checking':state==='conflict'||state==='error'?'warn':state==='not-applicable'||state==='reference'?'muted':''}
  function stateLabel(state){return({found:'FOUND',verified:'VERIFIED',checking:'CHECKING',conflict:'CONFLICT',error:'UNAVAILABLE','not-applicable':'N/A',reference:'REFERENCE',pending:'PENDING'})[state]||String(state||'').toUpperCase()}
  function safe(text=''){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function sourceUrl(key){
    const p=point(),r=region(),name=encodeURIComponent(draft?.name||'golf course');
    if(key==='osm'&&p)return`https://www.openstreetmap.org/#map=16/${p.lat}/${p.lng}`;
    if(key==='stateGis'){
      if(r.state==='CA')return'https://gis.lcf.ca.gov/arcgis/rest/services/PointsOfInterest/MapServer/5';
      if(r.state==='NY')return'https://data.ny.gov/';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://data.go.id/';
      return'';
    }
    if(key==='localGis'){
      if(r.state==='CA')return'https://data.ca.gov/';
      if(r.state==='NY')return'https://data.ny.gov/';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://data.go.id/';
      return SOURCE_META.dataGov.url;
    }
    if(key==='geofabrik'){
      if(r.state==='CA')return'https://download.geofabrik.de/north-america/us/california.html';
      if(r.state==='NY')return'https://download.geofabrik.de/north-america/us/new-york.html';
      if(r.country==='ID'||r.country==='INDONESIA')return'https://download.geofabrik.de/asia/indonesia.html';
    }
    if(key==='dataGov')return`https://catalog.data.gov/dataset/?q=${name}`;
    return SOURCE_META[key]?.url||'';
  }

  function existingMapSummary(){
    const gs=Array.isArray(draft?.greens)?draft.greens:[];
    let teeCenter=0,complete=0;
    gs.forEach(g=>{
      const tee=g?.tee||g?.tees?.black||g?.tees?.blue||g?.tees?.white||g?.tees?.red;
      if(tee&&g?.center)teeCenter++;
      if(tee&&g?.front&&g?.center&&g?.back)complete++;
    });
    return{teeCenter,complete,total:Number(draft?.holes)||gs.length||0};
  }

  function initialResults(){
    const map=existingMapSummary(),r={};
    orderedKeys.forEach(k=>r[k]=status('pending','Waiting to check.',sourceUrl(k)));
    r.parfolio=status(map.teeCenter? 'verified':'reference',map.teeCenter?`${map.teeCenter} of ${map.total} holes already have tee + center data. Existing points are protected and will not be overwritten.`:'No existing tee + center mapping to protect yet.','');
    r.osm=status('reference','Primary open golf geometry dataset. Queried through Overpass and cross-checked through QLever.',sourceUrl('osm'));
    return r;
  }

  function panelHtml(results){
    const rows=orderedKeys.map(key=>{
      const meta=SOURCE_META[key],r=results?.[key]||status('pending','Waiting to check.',sourceUrl(key));
      const link=r.url||sourceUrl(key)||meta.url;
      return`<li class="smart-source-row ${resultClass(r.state)}"><div><b>${safe(meta.name)}</b><small>${meta.kind==='osm-mirror'?'OSM mirror / access method':meta.kind==='same-dataset'?'same dataset mirror':meta.kind}</small></div><div class="smart-source-result"><strong>${stateLabel(r.state)}</strong><span>${safe(r.detail)}</span>${link?`<a href="${safe(link)}" target="_blank" rel="noopener">Open source ↗</a>`:''}</div></li>`;
    }).join('');
    return`<div class="smart-source-copy"><small>OPEN GOLF DATA SOURCES</small><b>Smart Golf Data Check</b><span>Checks the strongest available sources in order, fills only missing data, protects existing mapped points, and identifies mirrors so duplicate OSM data is not treated as independent confirmation.</span></div><button id="smartGolfDataButton" class="primary" type="button" onclick="smartGolfDataCheck()" ${busy?'disabled':''}>${busy?'Checking Sources…':'Check All Sources'}</button><details class="smart-source-details" ${draft?._smartGolfDataCheck?'open':''}><summary>Source ladder & results</summary><ol>${rows}</ol></details>`;
  }

  function ensurePanel(){
    if(typeof draft==='undefined'||!draft||typeof adminRole==='undefined'||!adminRole||!document.getElementById('courseMap'))return;
    let panel=document.getElementById('smartGolfDataPanel');
    if(!panel){
      panel=document.createElement('section');panel.id='smartGolfDataPanel';panel.className='smart-golf-data-panel';
      const anchor=document.querySelector('.course-search')||document.querySelector('.map-layer-toggle')||document.getElementById('courseMap');
      anchor?.parentNode?.insertBefore(panel,anchor);
    }
    const results=draft._smartGolfDataCheck?.results||initialResults();
    panel.innerHTML=panelHtml(results);
    /* The legacy OSM/OpenGolf panel is source-engine plumbing now; keep it in DOM for old importers but do not show duplicate controls. */
    const legacy=document.getElementById('osmGolfImport');if(legacy)legacy.classList.add('smart-source-legacy-hidden');
  }

  function update(results,key,stateValue,detail,url=''){
    results[key]=status(stateValue,detail,url||sourceUrl(key));
    const current=draft?._smartGolfDataCheck||{};
    if(draft)draft._smartGolfDataCheck={...current,version:VERSION,at:current.at||new Date().toISOString(),results};
    ensurePanel();
  }

  async function quietCall(fn){
    const notes=[],oldAlert=window.alert;window.alert=m=>notes.push(String(m||''));
    try{await fn();return{notes,error:null}}catch(error){return{notes,error}}finally{window.alert=oldAlert}
  }

  async function runOsm(results){
    update(results,'overpass','checking','Querying nearby golf=hole, tee, green and pin geometry…');
    if(typeof window.importOsmGolfData!=='function'){update(results,'overpass','error','OSM importer is unavailable in this build.');return;}
    const before=draft?._osmImport?.at;
    const {notes,error}=await quietCall(()=>window.importOsmGolfData());
    const o=draft?._osmImport;
    if(o&&o.at!==before){
      update(results,'overpass','found',`${o.holesFound||0} numbered holes matched; ${o.markersAdded||0} missing marker points added. Existing mapped points were preserved.`);
      update(results,'osm','found',`OSM golf geometry found through Overpass: ${o.holesFound||0} numbered holes matched.`,sourceUrl('osm'));
    }else if(error){
      update(results,'overpass','error',error.message||String(error));
      update(results,'osm','reference','OSM remains the underlying dataset; Overpass could not complete this request.',sourceUrl('osm'));
    }else{
      update(results,'overpass','conflict',notes[0]||'No safely numbered OSM golf-hole geometry was matched near this course.');
      update(results,'osm','reference','No usable numbered hole geometry was returned through Overpass for this course.',sourceUrl('osm'));
    }
  }

  async function runQLever(results){
    const p=point();if(!p){update(results,'qlever','not-applicable','Course center is not known yet, so a proximity query cannot be made.');return;}
    update(results,'qlever','checking','Cross-checking the OSM Planet index near this course…');
    const query=`PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>\nPREFIX geo: <http://www.opengis.net/ont/geosparql#>\nPREFIX geof: <http://www.opengis.net/def/function/geosparql/>\nSELECT ?element ?golf ?ref ?name ?par ?geometry WHERE {\n  VALUES ?golf { "hole" "tee" "green" "pin" }\n  ?element osmkey:golf ?golf ; geo:hasGeometry/geo:asWKT ?geometry .\n  OPTIONAL { ?element osmkey:ref ?ref . }\n  OPTIONAL { ?element osmkey:name ?name . }\n  OPTIONAL { ?element osmkey:par ?par . }\n  FILTER(geof:metricDistance(?geometry, "POINT(${p.lng} ${p.lat})"^^geo:wktLiteral) < 1900)\n}\nLIMIT 700`;
    try{
      const body=new URLSearchParams({query});
      const response=await fetch('https://qlever.dev/api/osm-planet',{method:'POST',headers:{Accept:'application/sparql-results+json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
      if(!response.ok)throw new Error(`QLever returned ${response.status}`);
      const json=await response.json(),rows=json?.results?.bindings||[];
      const count=type=>rows.filter(x=>x.golf?.value===type).length;
      if(rows.length)update(results,'qlever','found',`${count('hole')} hole features, ${count('tee')} tees, ${count('green')} greens and ${count('pin')} pins found. Same OSM dataset as Overpass; used only as fallback/cross-check.`);
      else update(results,'qlever','reference','No nearby golf features returned. QLever is an OSM mirror/cross-check, not independent confirmation.');
    }catch(error){update(results,'qlever','error',`${error.message||error}. Overpass results, if any, remain unchanged.`)}
  }

  async function runOpenGolf(results){
    update(results,'opengolf','checking','Checking course identity, location and scorecard metadata…');
    if(typeof window.importOpenGolfApiData!=='function'){update(results,'opengolf','error','OpenGolfAPI importer is unavailable in this build.');return;}
    const before=draft?._openGolfImport?.at;
    const {notes,error}=await quietCall(()=>window.importOpenGolfApiData());
    const o=draft?._openGolfImport;
    if(o&&o.at!==before)update(results,'opengolf','found',`${o.name||draft.name}: ${o.holesFound||0} hole records; ${o.parsAdded||0} missing/default pars filled.`);
    else if(error)update(results,'opengolf','error',error.message||String(error));
    else update(results,'opengolf','reference',notes[0]||'No safe OpenGolfAPI course match was found.');

    const r=region();
    if(!r.us){update(results,'opengolfGithub','not-applicable','The current OpenGolfAPI bulk dataset is U.S.-focused; no duplicate download is used for this course.');return;}
    update(results,'opengolfGithub','checking','Checking the public bulk-data mirror…');
    try{
      const response=await fetch('https://raw.githubusercontent.com/opengolfapi/data/main/opengolfapi-us.csv',{method:'HEAD',cache:'no-store'});
      if(!response.ok)throw new Error(`GitHub mirror returned ${response.status}`);
      update(results,'opengolfGithub','verified','Bulk CSV mirror is available. It mirrors OpenGolfAPI, so it is not counted as an independent coordinate confirmation.');
    }catch(error){update(results,'opengolfGithub','error',`${error.message||error}. The live OpenGolfAPI result is unaffected.`)}
  }

  async function runCaliforniaGis(results){
    const r=region(),p=point();
    if(r.state!=='CA'){update(results,'stateGis','reference',r.state==='NY'?'New York open-data portals are available, but there is no single statewide hole-by-hole golf geometry service to query automatically.':(r.country==='ID'||r.country==='INDONESIA')?'Indonesia open-data portals are available, but there is no single standardized national golf-hole geometry API.':'No standardized state golf-course GIS endpoint is configured for this region.',sourceUrl('stateGis'));return;}
    if(!p){update(results,'stateGis','not-applicable','California GIS can be queried once the course has a center location.',sourceUrl('stateGis'));return;}
    update(results,'stateGis','checking','Checking California official GIS golf-course points near this location…',sourceUrl('stateGis'));
    try{
      const endpoint='https://gis.lcf.ca.gov/arcgis/rest/services/PointsOfInterest/MapServer/5/query';
      const params=new URLSearchParams({geometry:`${p.lng},${p.lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',distance:'8000',units:'esriSRUnit_Meter',outFields:'NAME,FULLADDR,MUNICIPALITY,STATE,CAPTUREMETH',returnGeometry:'true',outSR:'4326',f:'geojson'});
      const response=await fetch(`${endpoint}?${params}`);if(!response.ok)throw new Error(`California GIS returned ${response.status}`);
      const json=await response.json(),features=json?.features||[];
      const sorted=features.map(f=>({f,score:similarity(f?.properties?.NAME,draft.name)})).sort((a,b)=>b.score-a.score);
      const best=sorted[0];
      if(best&&best.score>=.34){const props=best.f.properties||{};update(results,'stateGis','verified',`California GIS match: ${props.NAME||draft.name}${props.MUNICIPALITY?` · ${props.MUNICIPALITY}`:''}${props.CAPTUREMETH?` · captured by ${props.CAPTUREMETH}`:''}.`,sourceUrl('stateGis'));}
      else update(results,'stateGis','reference',`California GIS returned ${features.length} nearby golf-course point${features.length===1?'':'s'}, but none was a strong name match.`,sourceUrl('stateGis'));
    }catch(error){update(results,'stateGis','error',error.message||String(error),sourceUrl('stateGis'))}
  }

  async function runUsgs(results){
    const r=region();if(!r.us){update(results,'usgs','not-applicable','USGS The National Map applies to U.S. courses.',sourceUrl('usgs'));return;}
    update(results,'usgs','checking','Checking the federal geographic-name/map service for a matching place…');
    try{
      const params=new URLSearchParams({searchText:cleanName(draft.name),contains:'true',layers:'all',returnGeometry:'true',sr:'4326',f:'json'});
      const response=await fetch(`https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/find?${params}`);if(!response.ok)throw new Error(`USGS returned ${response.status}`);
      const json=await response.json(),rows=json?.results||[];
      if(rows.length){const best=[...rows].sort((a,b)=>similarity(b.value,draft.name)-similarity(a.value,draft.name))[0];update(results,'usgs','found',`Federal map service returned ${rows.length} name match${rows.length===1?'':'es'}; best match: ${best?.value||'available'}. Use as a location cross-check, not hole geometry.`);}
      else update(results,'usgs','reference','No matching federal geographic-name feature was returned. USGS remains useful for imagery/elevation verification.');
    }catch(error){update(results,'usgs','error',error.message||String(error))}
  }

  async function runAerial(results){
    const r=region(),p=point();
    if(r.us)update(results,'naip','reference','NAIP / USGS imagery is a visual verification source for tees, greens and hazards; it is not treated as an authoritative hole-number database.',sourceUrl('naip'));
    else update(results,'naip','not-applicable','NAIP is U.S. aerial imagery; use OpenAerialMap or local imagery sources here.',sourceUrl('naip'));
    if(!p){update(results,'oam','not-applicable','Course center is not known yet, so aerial-image coverage cannot be searched.',sourceUrl('oam'));return;}
    update(results,'oam','checking','Checking for open aerial imagery near the course…');
    try{
      const d=.02,bbox=[p.lng-d,p.lat-d,p.lng+d,p.lat+d].join(',');
      const response=await fetch(`https://api.openaerialmap.org/meta?bbox=${encodeURIComponent(bbox)}&limit=5`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`OpenAerialMap returned ${response.status}`);
      const json=await response.json(),rows=Array.isArray(json)?json:(json?.results||json?.meta||[]);
      update(results,'oam',rows.length?'found':'reference',rows.length?`${rows.length} open aerial image record${rows.length===1?'':'s'} found near the course for visual verification.`:'No OpenAerialMap imagery was returned for this small course area.',sourceUrl('oam'));
    }catch(error){update(results,'oam','error',error.message||String(error),sourceUrl('oam'))}
  }

  async function runDiscovery(results){
    const r=region(),q=[draft?.name,r.city,r.state||r.country,'golf course GIS'].filter(Boolean).join(' ');
    update(results,'dataGov','checking','Searching government open-data catalog metadata…');
    try{
      const response=await fetch(`https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=5`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Data.gov returned ${response.status}`);
      const json=await response.json(),count=Number(json?.result?.count)||0;
      update(results,'dataGov',count?'found':'reference',count?`${count} potentially related open-data dataset${count===1?'':'s'} found. Dataset discovery is advisory; no coordinate is auto-applied without a compatible GIS layer.`:'No directly related Data.gov dataset was found for this course.');
    }catch(error){update(results,'dataGov','error',error.message||String(error))}
    const local=sourceUrl('localGis');
    update(results,'localGis','reference',`Local/county/city GIS portals do not share one universal API. The checker surfaces the applicable regional portal for manual cross-checking${r.city?` around ${r.city}`:''}.`,local);
  }

  function runBulkMirrors(results){
    const r=region();
    const geo=sourceUrl('geofabrik');
    update(results,'geofabrik',geo?'reference':'not-applicable',geo?'Regional Geofabrik extract is available as a bulk OSM fallback. It contains the same underlying OSM data and is not counted as independent confirmation.':'No region-specific Geofabrik shortcut is configured for this course.',geo||SOURCE_META.geofabrik.url);
    update(results,'bbbike','reference','BBBike provides custom/bulk OSM extracts when Overpass/QLever access is insufficient. Same underlying OSM data; not independent confirmation.',SOURCE_META.bbbike.url);
  }

  window.smartGolfDataCheck=async function(){
    if(busy||typeof draft==='undefined'||!draft||typeof adminRole==='undefined'||!adminRole)return;
    busy=true;
    const results=initialResults();
    draft._smartGolfDataCheck={version:VERSION,at:new Date().toISOString(),results};ensurePanel();
    try{
      await runCaliforniaGis(results);
      await runOsm(results);
      await runQLever(results);
      await runOpenGolf(results);
      await runUsgs(results);
      await runAerial(results);
      await runDiscovery(results);
      runBulkMirrors(results);
      const map=existingMapSummary();
      update(results,'parfolio',map.teeCenter?'verified':'reference',map.teeCenter?`${map.teeCenter} of ${map.total} holes now have tee + center data. Existing points were never overwritten by lower-priority sources.`:'Source check completed, but no complete tee + center hole mapping was added automatically.');
      draft._smartGolfDataCheck.completedAt=new Date().toISOString();
    }finally{busy=false;ensurePanel();}
  };

  /* Attach to every mapping editor, regardless of whether the legacy provider/source panel exists. */
  if(typeof mapCourse==='function'){
    const prior=mapCourse;
    mapCourse=function(){prior();setTimeout(ensurePanel,0)};
  }
  const observer=new MutationObserver(()=>{if(document.getElementById('courseMap'))ensurePanel()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.PARFOLIO_SMART_GOLF_DATA={version:VERSION,ensurePanel,sources:SOURCE_META};
})();
