/* Version 128: one-button open golf lookup. Checks OSM + OpenGolfAPI, preserves verified ATG data, and merges the best available source data for Google Satellite review. */
(function(){
  let combinedBusy=false;

  function sourceSummary(){
    const osm=draft?._osmImport,open=draft?._openGolfImport;
    const parts=[];
    if(osm)parts.push(`OSM: ${osm.holesFound||0} numbered holes matched, ${osm.markersAdded||0} marker points added`);
    else parts.push('OSM: no usable golf geometry found');
    if(open)parts.push(`OpenGolfAPI: ${open.holesFound||0} hole records, ${open.parsAdded||0} par values added`);
    else parts.push('OpenGolfAPI: no safe matching course record found');
    return parts.join('\n');
  }

  function ensureCombinedButton(){
    const panel=document.getElementById('osmGolfImport');if(!panel)return;
    panel.classList.add('open-golf-sources','combined-open-data');
    const copy=panel.querySelector('div');
    if(copy){
      const small=copy.querySelector('small');if(small)small.textContent='OPEN GOLF DATA SOURCES';
      const title=copy.querySelector('b');if(title)title.textContent='Smart Golf Data Check';
      const span=copy.querySelector('span');
      if(span&&!combinedBusy&&!draft?._osmImport&&!draft?._openGolfImport)span.textContent='Check OpenStreetMap and OpenGolfAPI together. ATG keeps existing verified markers, uses OSM for golf geometry, and uses OpenGolfAPI for course/scorecard data.';
    }
    let actions=panel.querySelector('.open-golf-source-actions');
    if(!actions){actions=document.createElement('div');actions.className='open-golf-source-actions';panel.appendChild(actions);}
    actions.replaceChildren();
    const button=document.createElement('button');
    button.type='button';button.className='combined-open-data-button';button.textContent='Check Both Sources';
    button.addEventListener('click',()=>window.importBestGolfData());
    actions.appendChild(button);
  }

  window.importBestGolfData=async function(){
    if(!draft||!adminRole||combinedBusy)return;
    combinedBusy=true;ensureCombinedButton();
    const panel=document.getElementById('osmGolfImport'),button=panel?.querySelector('.combined-open-data-button'),span=panel?.querySelector('span');
    if(button){button.disabled=true;button.textContent='Checking OSM + OpenGolfAPI…';}
    if(span)span.textContent='Searching both open golf sources and merging the best available data…';

    const notices=[],originalAlert=window.alert;
    window.alert=(message)=>{notices.push(String(message||''));};
    try{
      /* OSM is preferred for spatial golf geometry. Its importer only fills missing ATG points. */
      if(typeof window.importOsmGolfData==='function')await window.importOsmGolfData();
      /* OpenGolfAPI complements OSM with identity/location/scorecard data; it does not replace GPS geometry. */
      if(typeof window.importOpenGolfApiData==='function')await window.importOpenGolfApiData();

      if(draft){
        draft._openDataCombined={at:new Date().toISOString(),osm:!!draft._osmImport,openGolfApi:!!draft._openGolfImport};
        draft.mapProvider=GOOGLE_MAPS_API_KEY?'google':(draft.mapProvider||'maptiler');
        draft.mapStyle='satellite';
      }
    }catch(error){
      console.error('Combined golf data lookup failed',error);
      notices.push(`Combined lookup error: ${error.message||error}`);
    }finally{
      window.alert=originalAlert;combinedBusy=false;
    }

    if(draft)render();
    const summary=sourceSummary();
    originalAlert(`Golf data check complete.\n\n${summary}\n\nATG preserved your existing mapped points. Review the merged result on Google Satellite before approving/saving.${notices.length?'\n\nSource notes:\n'+notices.join('\n'):''}`);
  };

  const priorMapCourse128=mapCourse;
  mapCourse=function(){
    priorMapCourse128();ensureCombinedButton();
    const panel=document.getElementById('osmGolfImport'),span=panel?.querySelector('span');
    if(span&&draft?._openDataCombined)span.textContent=`Combined check complete${draft._osmImport?` · OSM ${draft._osmImport.holesFound||0} holes matched`:''}${draft._openGolfImport?` · OpenGolfAPI ${draft._openGolfImport.holesFound||0} hole records`:''}. Verify all GPS points on Google Satellite.`;
  };
})();
