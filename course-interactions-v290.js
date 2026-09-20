/* ParFolio v321 — Google Places facility enrichment.
   This retired compatibility file now has one explicit job: enrich the selected
   course's setup card after setup() renders. It does not observe or mutate the
   course-search results. */
(function(){
  const cache=new Map();
  const escHtml=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const keyOf=course=>String(course?.id||course?.parfolioCatalogId||course?.sharedCourseId||course?.name||'');

  function fallback(course){
    const address=[course?.address,[course?.city,course?.state,course?.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const website=String(course?.website||course?.url||course?.source||'').trim();
    const phone=String(course?.phone||course?.telephone||course?.contact_phone||'').trim();
    const point=course?.catalog_point||course?.greens?.find(g=>g?.center)?.center||course?.greens?.find(g=>g?.tee)?.tee||null;
    return{address,website:/^https?:\/\//i.test(website)?website:'',phone,point};
  }

  function currentHours(place){
    const hours=place?.opening_hours;
    if(!hours)return'';
    const open=typeof hours.isOpen==='function'?hours.isOpen():hours.open_now;
    const day=new Date().getDay(),index=day===0?6:day-1;
    const today=Array.isArray(hours.weekday_text)?String(hours.weekday_text[index]||'').replace(/^[^:]+:\s*/,''):'';
    if(open===true)return today?'Open now · '+today:'Open now';
    if(open===false)return today?'Closed now · '+today:'Closed now';
    return today;
  }

  function render(course,place){
    const panel=document.getElementById('facilityInfoPanel')||document.querySelector('.round-facility-info');
    if(!panel||panel.dataset.googleEnriched==='1')return;
    const data=fallback(course),address=place?.formatted_address||data.address;
    const website=String(place?.website||data.website||'').trim(),phone=String(place?.formatted_phone_number||data.phone||'').trim();
    const point=data.point,directionsQuery=address||(point&&Number.isFinite(Number(point.lat))&&Number.isFinite(Number(point.lng))?Number(point.lat)+','+Number(point.lng):course.name);
    const directions=place?.url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(directionsQuery);
    const rating=Number(place?.rating),reviews=Number(place?.user_ratings_total),status=currentHours(place);
    const hours=Array.isArray(place?.opening_hours?.weekday_text)?place.opening_hours.weekday_text:[];
    let photo='';
    try{photo=place?.photos?.[0]?.getUrl?.({maxWidth:900,maxHeight:420})||''}catch{}
    const googleRows=[
      status?'<div class="facility-open-status '+(/^Open/i.test(status)?'open':'closed')+'"><span>◷</span><b>'+escHtml(status)+'</b></div>':'',
      photo?'<div class="facility-photo"><img src="'+escHtml(photo)+'" alt="'+escHtml(course.name)+'" loading="lazy"></div>':''
    ].join('');
    const rows=[
      address?'<div class="facility-info-row"><span class="facility-info-icon">⌖</span><div><small>LOCATION</small><b>'+escHtml(address)+'</b></div><a href="'+escHtml(directions)+'" target="_blank" rel="noopener">Directions</a></div>':'',
      website?'<div class="facility-info-row"><span class="facility-info-icon">◎</span><div><small>WEBSITE</small><b class="facility-url">'+escHtml(website.replace(/^https?:\/\//i,'').replace(/\/$/,''))+'</b></div><a href="'+escHtml(website)+'" target="_blank" rel="noopener">Visit</a></div>':'',
      phone?'<div class="facility-info-row"><span class="facility-info-icon">☎</span><div><small>PHONE</small><b>'+escHtml(phone)+'</b></div><a href="tel:'+escHtml(phone.replace(/[^+\d]/g,''))+'">Call</a></div>':'',
      Number.isFinite(rating)?'<div class="facility-info-row"><span class="facility-info-icon">★</span><div><small>GOOGLE RATING</small><b>'+rating.toFixed(1)+(Number.isFinite(reviews)?' · '+reviews.toLocaleString()+' reviews':'')+'</b></div>'+(place?.url?'<a href="'+escHtml(place.url)+'" target="_blank" rel="noopener">Reviews</a>':'')+'</div>':''
    ].join('');
    const details=hours.length?'<details class="facility-hours"><summary><span>Hours</span><b>View week</b></summary><ul>'+hours.map(line=>'<li>'+escHtml(line)+'</li>').join('')+'</ul></details>':'';

    panel.dataset.googleEnriched='1';
    const header=panel.querySelector(':scope > header');
    if(header&&!header.querySelector('.facility-google-source'))header.insertAdjacentHTML('beforeend','<span class="facility-google-source">Google</span>');
    const list=panel.querySelector('.facility-info-list');
    if(list)list.innerHTML=rows;
    if(googleRows)panel.insertAdjacentHTML('afterbegin',googleRows);
    if(details){
      const chips=panel.querySelector('.facility-course-details');
      if(chips)chips.insertAdjacentHTML('beforebegin',details);else panel.insertAdjacentHTML('beforeend',details);
    }
  }

  async function enrich(course){
    if(!course)return;
    const panel=document.querySelector('.round-facility-info');if(!panel)return;
    const key=keyOf(course);if(cache.has(key)){render(course,cache.get(key));return}
    try{
      await window.loadGoogleMaps?.();
      if(!window.google?.maps?.places?.PlacesService)return;
      const data=fallback(course),query=[course.name,data.address||[course.city,course.state].filter(Boolean).join(', ')].filter(Boolean).join(' ');
      const request={query,fields:['place_id','name','formatted_address','formatted_phone_number','website','opening_hours','rating','user_ratings_total','url','business_status','photos']};
      if(data.point&&Number.isFinite(Number(data.point.lat))&&Number.isFinite(Number(data.point.lng)))request.locationBias=new google.maps.LatLng(Number(data.point.lat),Number(data.point.lng));
      const service=new google.maps.places.PlacesService(document.createElement('div'));
      const place=await new Promise(resolve=>service.findPlaceFromQuery(request,(results,status)=>{
        if(status!==google.maps.places.PlacesServiceStatus.OK||!results?.[0]){resolve(null);return}
        service.getDetails({placeId:results[0].place_id,fields:request.fields},(details,detailStatus)=>resolve(detailStatus===google.maps.places.PlacesServiceStatus.OK?details:null));
      }));
      if(!place)return;cache.set(key,place);
      if((s?.courseId||s?.catalogCourseId)&&keyOf(selectedRoundCourse?.()||course)===key)render(course,place);
    }catch(error){console.warn('Google Places facility details unavailable',error)}
  }

  const priorSetup=window.setup||setup;
  if(typeof priorSetup==='function'){
    window.setup=setup=function(){
      const out=priorSetup.apply(this,arguments);
      const selected=typeof selectedRoundCourse==='function'?selectedRoundCourse():null;
      if(selected)setTimeout(()=>enrich(selected),0);
      return out;
    };
  }
  window.PARFOLIO_FACILITY_INFO_OWNER='google-places-v321';
})();
