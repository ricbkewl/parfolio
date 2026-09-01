/* Version 127: OpenGolfAPI lookup beside OSM import. Complements OSM geometry with course/scorecard data. */
(function(){
  const OPENGOLF_API='https://api.opengolfapi.org/v1';

  function cleanName(name=''){
    return String(name).replace(/\s*[·|–—-]\s*(North|South|West)(?:\s*9)?\s*$/i,'').replace(/Golf Club|Golf Course|Country Club/ig,' ').replace(/\s+/g,' ').trim();
  }
  function asArray(value){
    if(Array.isArray(value))return value;
    if(Array.isArray(value?.courses))return value.courses;
    if(Array.isArray(value?.results))return value.results;
    if(Array.isArray(value?.data))return value.data;
    return[];
  }
  function scoreName(name=''){
    return cleanName(name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function similarity(a,b){
    const aa=new Set(scoreName(a).split(' ').filter(Boolean)),bb=new Set(scoreName(b).split(' ').filter(Boolean));
    if(!aa.size||!bb.size)return 0;
    let hit=0;aa.forEach(word=>{if(bb.has(word))hit++});
    return hit/Math.max(aa.size,bb.size);
  }
  function bestMatch(items,name){
    return [...items].sort((a,b)=>similarity(b.name||b.course_name,name)-similarity(a.name||a.course_name,name))[0]||null;
  }
  function holeRows(data){
    if(Array.isArray(data))return data;
    if(Array.isArray(data?.holes))return data.holes;
    if(Array.isArray(data?.data))return data.data;
    return[];
  }
  function holeNumber(h,index){return Number(h?.hole||h?.number||h?.hole_number||index+1)}
  function holePar(h){const n=Number(h?.par);return n>=3&&n<=6?n:null}

  async function apiJson(url){
    const response=await fetch(url,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`OpenGolfAPI returned ${response.status}`);
    return response.json();
  }

  function ensureButtons(){
    const panel=document.getElementById('osmGolfImport');if(!panel)return;
    panel.classList.add('open-golf-sources');
    const copy=panel.querySelector('div');
    if(copy){
      const small=copy.querySelector('small');if(small)small.textContent='OPEN GOLF DATA SOURCES';
      const title=copy.querySelector('b');if(title)title.textContent='Check OSM + OpenGolfAPI';
      const span=copy.querySelector('span');if(span&&!draft?._osmImport&&!draft?._openGolfImport)span.textContent='OSM can supply golf geometry; OpenGolfAPI can supply course and scorecard data. Check either or both.';
    }
    let actions=panel.querySelector('.open-golf-source-actions');
    if(!actions){
      const osmButton=panel.querySelector(':scope > button');
      actions=document.createElement('div');actions.className='open-golf-source-actions';
      if(osmButton){osmButton.remove();osmButton.textContent='Check OSM';actions.appendChild(osmButton);}
      const openButton=document.createElement('button');openButton.type='button';openButton.className='opengolf-button';openButton.textContent='Check OpenGolfAPI';openButton.addEventListener('click',()=>window.importOpenGolfApiData());actions.appendChild(openButton);
      panel.appendChild(actions);
    }
  }

  window.importOpenGolfApiData=async function(){
    if(!draft||!adminRole)return;
    ensureButtons();
    const panel=document.getElementById('osmGolfImport'),button=panel?.querySelector('.opengolf-button');
    if(button){button.disabled=true;button.textContent='Searching OpenGolfAPI…';}
    try{
      const query=cleanName(draft.name);
      const search=await apiJson(`${OPENGOLF_API}/courses/search?q=${encodeURIComponent(query)}&limit=8`);
      const candidates=asArray(search);
      if(!candidates.length){alert(`OpenGolfAPI did not find a course matching “${query}”. No ATG data was changed.`);return;}
      const match=bestMatch(candidates,draft.name);
      if(!match){alert('OpenGolfAPI returned results, but ATG could not identify a safe match. No ATG data was changed.');return;}
      const id=match.id||match.course_id||match.slug;
      if(!id){alert('OpenGolfAPI found the course but did not return a usable course ID. No ATG data was changed.');return;}

      const [courseResult,holesResult]=await Promise.allSettled([
        apiJson(`${OPENGOLF_API}/courses/${encodeURIComponent(id)}`),
        apiJson(`${OPENGOLF_API}/courses/${encodeURIComponent(id)}/holes`)
      ]);
      const course=courseResult.status==='fulfilled'?courseResult.value:match;
      const holes=holesResult.status==='fulfilled'?holeRows(holesResult.value):holeRows(course);
      let parsAdded=0;
      for(let i=0;i<holes.length;i++){
        const h=holes[i],number=holeNumber(h,i),par=holePar(h);
        if(!Number.isInteger(number)||number<1||number>draft.holes||!par)continue;
        if(!Array.isArray(draft.pars))draft.pars=Array.from({length:draft.holes},()=>4);
        const current=Number(draft.pars[number-1]);
        if(!current||current===4){draft.pars[number-1]=par;parsAdded++;}
      }

      const latitude=Number(course?.latitude??course?.lat??course?.location?.lat),longitude=Number(course?.longitude??course?.lng??course?.lon??course?.location?.lng);
      if(Number.isFinite(latitude)&&Number.isFinite(longitude)&&!draft.catalog_point)draft.catalog_point={lat:latitude,lng:longitude};
      draft._openGolfImport={
        at:new Date().toISOString(),id,name:course?.name||course?.course_name||match.name||query,
        holesFound:holes.length,parsAdded,
        address:course?.address||course?.street_address||null,
        city:course?.city||null,state:course?.state||course?.state_code||null,
        website:course?.website||null
      };
      draft.mapProvider=GOOGLE_MAPS_API_KEY?'google':(draft.mapProvider||'maptiler');draft.mapStyle='satellite';
      alert(`OpenGolfAPI found “${draft._openGolfImport.name}”. ${holes.length?`${holes.length} hole records found; ${parsAdded} missing/default par values filled.`:'Course metadata found, but no hole-by-hole records were returned.'}\n\nOpenGolfAPI does not replace tee/green GPS geometry. Use OSM or manual Google Satellite mapping for the actual hole points.`);
      render();
    }catch(error){
      console.error('OpenGolfAPI lookup failed',error);
      alert(`OpenGolfAPI lookup could not be completed: ${error.message||error}. Your existing mapping was not changed.`);
    }finally{
      if(button){button.disabled=false;button.textContent='Check OpenGolfAPI';}
    }
  };

  const priorMapCourse127=mapCourse;
  mapCourse=function(){
    priorMapCourse127();ensureButtons();
    const panel=document.getElementById('osmGolfImport'),span=panel?.querySelector('span');
    if(span&&draft?._openGolfImport){
      const o=draft._openGolfImport;
      span.textContent=`OpenGolfAPI match: ${o.name}${o.holesFound?` · ${o.holesFound} hole records`:''}${draft?._osmImport?` · OSM ${draft._osmImport.holesFound} holes matched`:''}. Verify GPS points on Google Satellite.`;
    }
  };
})();
