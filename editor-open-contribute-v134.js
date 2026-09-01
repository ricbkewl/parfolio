/* Version 134: review/export workflow for contributing verified ATG course data back to open golf sources. */
(function(){
  const OSM_EDIT_BASE='https://www.openstreetmap.org/edit?editor=id';
  const OPENGOLF_CONTRIBUTE='https://courses.opengolfapi.org/contact';

  function validPoint(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
  function referenceTee(g){return g?.tees?.black||g?.tee||null}
  function holeReady(g){return validPoint(referenceTee(g))&&validPoint(g?.front)&&validPoint(g?.center)&&validPoint(g?.back)}
  function completeCount(){return Array.isArray(draft?.greens)?draft.greens.filter(holeReady).length:0}
  function courseCenter(){
    const points=[];
    for(const g of draft?.greens||[])for(const p of [referenceTee(g),g?.aim1,g?.aim2,g?.center])if(validPoint(p))points.push(p);
    if(!points.length&&validPoint(draft?.catalog_point))points.push(draft.catalog_point);
    if(!points.length)return null;
    return{lat:points.reduce((n,p)=>n+Number(p.lat),0)/points.length,lng:points.reduce((n,p)=>n+Number(p.lng),0)/points.length};
  }
  function lineCoords(g){return[referenceTee(g),g?.aim1,g?.aim2,g?.center].filter(validPoint).map(p=>[Number(p.lng),Number(p.lat)])}
  function geojson(){
    const features=[];
    (draft?.greens||[]).forEach((g,index)=>{
      const hole=index+1,par=Number(draft?.pars?.[index])||null,route=lineCoords(g);
      if(route.length>=2)features.push({type:'Feature',properties:{golf:'hole',ref:String(hole),par,source:'ATG user-verified mapping'},geometry:{type:'LineString',coordinates:route}});
      const tee=referenceTee(g);if(validPoint(tee))features.push({type:'Feature',properties:{golf:'tee',ref:String(hole),tee:'black',source:'ATG user-verified mapping'},geometry:{type:'Point',coordinates:[Number(tee.lng),Number(tee.lat)]}});
      for(const color of ['blue','white','red']){const p=g?.tees?.[color];if(validPoint(p))features.push({type:'Feature',properties:{golf:'tee',ref:String(hole),tee:color,source:'ATG user-verified mapping'},geometry:{type:'Point',coordinates:[Number(p.lng),Number(p.lat)]}})}
      if(validPoint(g?.center))features.push({type:'Feature',properties:{golf:'pin',ref:String(hole),source:'ATG user-verified mapping'},geometry:{type:'Point',coordinates:[Number(g.center.lng),Number(g.center.lat)]}});
    });
    return{type:'FeatureCollection',properties:{name:draft?.name||'Golf Course',holes:draft?.holes||draft?.greens?.length||0,generated_by:'ParFolio',generated_at:new Date().toISOString(),license_note:'Only contribute factual data you personally verified or are legally permitted to share.'},features};
  }
  function scorecardText(){
    const lines=[draft?.name||'Golf Course',`${draft?.holes||draft?.greens?.length||0} holes`];
    if(draft?.address)lines.push(draft.address);
    lines.push('');
    (draft?.pars||[]).forEach((par,i)=>lines.push(`Hole ${i+1}: Par ${par||'—'}`));
    lines.push('','Prepared from user-verified ATG course mapping. No golfer, round, score, chat, account, or other private ATG data is included.');
    return lines.join('\n');
  }
  function download(name,content,type){
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function safeSlug(value){return String(value||'golf-course').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'golf-course'}
  function exportBundle(){
    if(!draft)return;
    download(`${safeSlug(draft.name)}-osm.geojson`,JSON.stringify(geojson(),null,2),'application/geo+json');
    setTimeout(()=>download(`${safeSlug(draft.name)}-opengolf.txt`,scorecardText(),'text/plain'),250);
  }
  function openOsm(){
    const c=courseCenter();let url=OSM_EDIT_BASE;
    if(c)url+=`#map=17/${c.lat.toFixed(6)}/${c.lng.toFixed(6)}`;
    window.open(url,'_blank','noopener');
  }
  async function copyOpenGolf(){
    const text=scorecardText();
    try{await navigator.clipboard.writeText(text)}catch{}
    window.open(OPENGOLF_CONTRIBUTE,'_blank','noopener');
  }
  function closeModal(){document.querySelector('.open-contribute-overlay')?.remove()}
  function showReview(){
    if(!draft)return;
    const ready=completeCount(),holes=Number(draft.holes)||draft.greens?.length||0,allReady=holes>0&&ready===holes;
    const overlay=document.createElement('div');overlay.className='open-contribute-overlay';overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});
    overlay.innerHTML=`<section class="open-contribute-modal" role="dialog" aria-modal="true" aria-label="Open-source contribution review">
      <header><div><small>OPEN-SOURCE CONTRIBUTION</small><h2>${esc(draft.name||'Course')}</h2></div><button type="button" class="open-contribute-close" aria-label="Close">×</button></header>
      <div class="open-contribute-status ${allReady?'ready':'warn'}"><b>${ready}/${holes} holes GPS-ready</b><span>${allReady?'Course is ready for a contribution review.':'Complete and verify the remaining holes before contributing a full course.'}</span></div>
      <p>ATG will prepare only factual course data: hole numbers, pars, tee locations, route points and green/pin locations. Private golfer, account, round, score and chat data are never included.</p>
      <label class="open-contribute-confirm"><input type="checkbox" id="openContributeVerified"> <span>I personally verified these course points on satellite/GPS and I have the right to share them as open data.</span></label>
      <div class="open-contribute-preview"><b>What happens next</b><span><strong>OpenStreetMap:</strong> ATG exports GeoJSON and opens the official iD editor centered on this course. Review the data and make the corresponding edits under your OSM account.</span><span><strong>OpenGolfAPI:</strong> ATG copies a clean scorecard/course summary and opens its contribution/correction page.</span></div>
      <div class="open-contribute-actions"><button type="button" data-action="bundle">Export Contribution Files</button><button type="button" data-action="osm">Open OSM Editor</button><button type="button" data-action="opengolf">Open OpenGolfAPI</button></div>
      <small class="open-contribute-note">Direct one-click publishing is intentionally not enabled yet. OSM requires an OAuth application/account authorization, and OpenGolfAPI does not expose a general public write API for course submissions. This review step prevents accidental or unlicensed uploads.</small>
    </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.open-contribute-close').addEventListener('click',closeModal);
    const confirm=overlay.querySelector('#openContributeVerified');
    const guard=fn=>()=>{if(!confirm.checked){alert('Please confirm that you personally verified the course data and have the right to share it first.');return}fn()};
    overlay.querySelector('[data-action="bundle"]').addEventListener('click',guard(exportBundle));
    overlay.querySelector('[data-action="osm"]').addEventListener('click',guard(openOsm));
    overlay.querySelector('[data-action="opengolf"]').addEventListener('click',guard(copyOpenGolf));
  }
  window.showOpenSourceContributionReview=showReview;

  function installPanel(){
    if(!draft||!adminRole||document.getElementById('openSourceContribution'))return;
    const actions=document.querySelector('.editor-hole-actions')||document.querySelector('.marker-groups');if(!actions)return;
    const ready=completeCount(),holes=Number(draft.holes)||draft.greens?.length||0;
    const panel=document.createElement('section');panel.id='openSourceContribution';panel.className='open-source-contribution';
    panel.innerHTML=`<div><small>GIVE BACK TO OPEN DATA</small><b>Contribute Verified Course</b><span>${ready}/${holes} holes currently GPS-ready. Review before sharing anything publicly.</span></div><button type="button">Review Contribution</button>`;
    panel.querySelector('button').addEventListener('click',showReview);actions.insertAdjacentElement('afterend',panel);
  }
  const priorMapCourse134=mapCourse;
  mapCourse=function(){priorMapCourse134();installPanel()};
})();
