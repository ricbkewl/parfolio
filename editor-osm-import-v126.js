/* Version 126: import available OpenStreetMap golf geometry into the course editor as a reviewable draft. */
(function(){
  const OVERPASS_ENDPOINT='https://overpass-api.de/api/interpreter';

  function numberTag(value){
    const match=String(value||'').match(/(?:hole\s*)?(\d{1,2})/i),n=match?Number(match[1]):0;
    return n>=1&&n<=36?n:null;
  }
  function osmHoleNumber(tags={}){
    return numberTag(tags.ref)||numberTag(tags['ref:hole'])||numberTag(tags.hole)||numberTag(tags.name);
  }
  function pointsForElement(el){
    if(Array.isArray(el.geometry)&&el.geometry.length)return el.geometry.map(p=>({lat:Number(p.lat),lng:Number(p.lon)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(el.type==='node'&&Number.isFinite(Number(el.lat))&&Number.isFinite(Number(el.lon)))return[{lat:Number(el.lat),lng:Number(el.lon)}];
    if(el.center&&Number.isFinite(Number(el.center.lat))&&Number.isFinite(Number(el.center.lon)))return[{lat:Number(el.center.lat),lng:Number(el.center.lon)}];
    return[];
  }
  function centroid(points){
    if(!points?.length)return null;
    const total=points.reduce((sum,p)=>({lat:sum.lat+p.lat,lng:sum.lng+p.lng}),{lat:0,lng:0});
    return{lat:total.lat/points.length,lng:total.lng/points.length};
  }
  function distanceMeters(a,b){
    if(!a||!b)return Infinity;
    const rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
    const x=dLng*Math.cos((lat1+lat2)/2),y=dLat;
    return Math.sqrt(x*x+y*y)*6371000;
  }
  function nearestFeature(features,point,maxMeters=180){
    let best=null,bestDistance=maxMeters;
    for(const feature of features){
      const p=feature.center||centroid(feature.points),d=distanceMeters(point,p);
      if(d<bestDistance){best=feature;bestDistance=d;}
    }
    return best;
  }
  function pointAtFraction(points,fraction){
    if(!points?.length)return null;if(points.length===1)return points[0];
    const segments=[];let total=0;
    for(let i=1;i<points.length;i++){const d=distanceMeters(points[i-1],points[i]);segments.push(d);total+=d;}
    const target=total*fraction;let run=0;
    for(let i=0;i<segments.length;i++){
      if(run+segments[i]>=target){const t=segments[i]?((target-run)/segments[i]):0,a=points[i],b=points[i+1];return{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};}
      run+=segments[i];
    }
    return points[points.length-1];
  }
  function greenEdges(tee,center,polygon){
    if(!tee||!center||!polygon?.length)return{};
    const latScale=111320,lngScale=111320*Math.cos(center.lat*Math.PI/180),vx=(center.lng-tee.lng)*lngScale,vy=(center.lat-tee.lat)*latScale,len=Math.hypot(vx,vy)||1,ux=vx/len,uy=vy/len;
    let front=null,back=null,min=Infinity,max=-Infinity;
    polygon.forEach(p=>{const dx=(p.lng-center.lng)*lngScale,dy=(p.lat-center.lat)*latScale,projection=dx*ux+dy*uy;if(projection<min){min=projection;front=p}if(projection>max){max=projection;back=p}});
    return{front,back};
  }
  function teeColor(tags={}){
    const text=String(tags.colour||tags.color||tags['golf:tee']||tags.tee||'').toLowerCase();
    for(const color of['black','blue','white','red'])if(text.includes(color))return color;
    return null;
  }
  function editorCenter(){
    if(!draft)return null;
    if(draft.mapView?.lat&&draft.mapView?.lng)return{lat:Number(draft.mapView.lat),lng:Number(draft.mapView.lng)};
    const g=draft.greens?.find(g=>g?.center||g?.tee||g?.tees?.black||g?.front||g?.back);
    return g?(g.center||g.tee||g.tees?.black||g.front||g.back):(draft.catalog_point||coursePreviewPoint(draft)||null);
  }
  function classify(elements){
    const groups={holes:[],tees:[],greens:[],pins:[]};
    for(const el of elements||[]){
      const golf=el.tags?.golf,points=pointsForElement(el);if(!golf||!points.length)continue;
      const feature={el,tags:el.tags||{},points,center:centroid(points)};
      if(golf==='hole')groups.holes.push(feature);else if(golf==='tee')groups.tees.push(feature);else if(golf==='green')groups.greens.push(feature);else if(golf==='pin')groups.pins.push(feature);
    }
    return groups;
  }
  function ensureGreenShape(g){
    g.tees??={black:null,blue:null,white:null,red:null};
    for(const color of['black','blue','white','red'])if(!(color in g.tees))g.tees[color]=null;
    g.aim1??=null;g.aim2??=null;g.front??=null;g.center??=null;g.back??=null;
  }
  function applyOsm(groups){
    let holesFound=0,markersAdded=0,numbered=0;
    for(const hole of groups.holes){
      const holeNumber=osmHoleNumber(hole.tags);if(!holeNumber||holeNumber>draft.holes)continue;numbered++;
      const g=draft.greens[holeNumber-1];if(!g)continue;ensureGreenShape(g);
      const route=hole.points,start=route[0],end=route[route.length-1];if(!start||!end)continue;holesFound++;
      const teeFeature=nearestFeature(groups.tees,start,140),teePoint=teeFeature?.center||start;
      if(!g.tees.black&&!g.tee){g.tees.black={...teePoint};g.tee={...teePoint};markersAdded+=2;}
      if(teeFeature){const color=teeColor(teeFeature.tags);if(color&&!g.tees[color]){g.tees[color]={...teePoint};markersAdded++;}}
      const greenFeature=nearestFeature(groups.greens,end,170),pinFeature=nearestFeature(groups.pins,end,120),greenCenter=pinFeature?.center||greenFeature?.center||end;
      if(!g.center){g.center={...greenCenter};markersAdded++;}
      if(greenFeature){const edges=greenEdges(g.tees.black||g.tee,g.center,greenFeature.points);if(!g.front&&edges.front){g.front={...edges.front};markersAdded++;}if(!g.back&&edges.back){g.back={...edges.back};markersAdded++;}}
      const par=Number(hole.tags.par);if(Number.isFinite(par)&&par>=3&&par<=6&&(!Number(draft.pars?.[holeNumber-1])||draft.pars[holeNumber-1]===4))draft.pars[holeNumber-1]=par;
      if(route.length>2){
        if(!g.aim1&&par!==3){const p=pointAtFraction(route,par===5?.34:.5);if(p){g.aim1=p;markersAdded++;}}
        if(!g.aim2&&par===5){const p=pointAtFraction(route,.68);if(p){g.aim2=p;markersAdded++;}}
      }
      g._review=g._review==='published-gps'?g._review:'osm-draft-review';
      g._osmImportedAt=new Date().toISOString();
    }
    return{holesFound,markersAdded,numbered,totalHoles:groups.holes.length,greens:groups.greens.length,tees:groups.tees.length};
  }
  function osmPanel(){
    return `<section class="osm-golf-import" id="osmGolfImport">
      <div><small>OPEN GOLF DATA</small><b>OpenStreetMap Golf Import</b><span>Import available hole routes, tees and green geometry as a draft, then verify it on Google Satellite.</span></div>
      <button type="button" onclick="importOsmGolfData()">Import OSM Golf Data</button>
    </section>`;
  }

  window.importOsmGolfData=async function(){
    if(!draft||!adminRole)return;
    const center=editorCenter();if(!center){alert('Center the editor on the golf course first, then try the OSM import again.');return;}
    const panel=document.getElementById('osmGolfImport'),button=panel?.querySelector('button');
    if(button){button.disabled=true;button.textContent='Searching OpenStreetMap…';}
    const query=`[out:json][timeout:30];(nwr["golf"~"^(hole|tee|green|pin)$"](around:1900,${center.lat},${center.lng}););out tags center geom;`;
    try{
      const response=await fetch(OVERPASS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});
      if(!response.ok)throw new Error(`OpenStreetMap search returned ${response.status}`);
      const data=await response.json(),groups=classify(data.elements||[]);
      if(!groups.holes.length){alert('No mapped OSM golf-hole geometry was found near this course. You can continue mapping manually with Google Satellite.');return;}
      const result=applyOsm(groups);
      if(!result.holesFound){alert(`OSM has ${result.totalHoles} golf-hole features here, but ATG could not match them to numbered holes. The existing course mapping was left unchanged.`);return;}
      draft.mapProvider=GOOGLE_MAPS_API_KEY?'google':(draft.mapProvider||'maptiler');
      draft.mapStyle='satellite';
      draft._osmImport={at:new Date().toISOString(),...result};
      alert(`OSM draft imported: ${result.holesFound} numbered holes matched and ${result.markersAdded} missing marker points added. Existing ATG markers were not overwritten. Please verify each hole on ${GOOGLE_MAPS_API_KEY?'Google Satellite':'the satellite map'} before final approval.`);
      render();
    }catch(error){
      console.error('OSM golf import failed',error);
      alert(`OSM golf import could not be completed: ${error.message||error}. Your existing mapping was not changed.`);
    }finally{
      if(button){button.disabled=false;button.textContent='Import OSM Golf Data';}
    }
  };

  const priorMapCourse126=mapCourse;
  mapCourse=function(){
    priorMapCourse126();
    const provider=app.querySelector('.editor-provider-toggle');
    if(provider&&!app.querySelector('#osmGolfImport'))provider.insertAdjacentHTML('afterend',osmPanel());
    if(draft?._osmImport){
      const panel=app.querySelector('#osmGolfImport span');
      if(panel)panel.textContent=`OSM draft loaded: ${draft._osmImport.holesFound} holes matched. Verify imported points on Google Satellite; existing ATG markers were preserved.`;
    }
  };
})();
