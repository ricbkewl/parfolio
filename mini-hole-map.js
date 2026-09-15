(function(){
  const status=document.getElementById('status'),container=document.getElementById('map')
  const params=new URLSearchParams(location.search)
  const num=name=>{const value=Number(params.get(name));return Number.isFinite(value)?value:null}
  const point=(latName,lngName)=>{const lat=num(latName),lng=num(lngName);return lat===null||lng===null?null:{lat,lng}}
  const tee=point('teeLat','teeLng'),aim1=point('aim1Lat','aim1Lng'),aim2=point('aim2Lat','aim2Lng'),front=point('frontLat','frontLng'),center=point('centerLat','centerLng'),back=point('backLat','backLng')
  const valid=p=>p&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&!(p.lat===0&&p.lng===0)
  const points=[tee,aim1,aim2,front,center,back].filter(valid)
  function fail(message){status.textContent=message;status.classList.remove('hidden')}
  if(!valid(tee)||!valid(center)){fail('This hole is missing validated tee or green geometry.');return}
  const key=String(window.PARFOLIO_GOOGLE_MAPS_API_KEY||'').trim()
  if(!key){fail('Google Maps configuration is unavailable.');return}
  const callback='__parfolioMiniHoleReady'
  window[callback]=()=>{
    try{
      const map=new google.maps.Map(container,{mapTypeId:'satellite',disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy',keyboardShortcuts:false,tilt:0,heading:0,backgroundColor:'#10251e'})
      const route=[tee,aim1,aim2,center].filter(valid)
      if(route.length>=2)new google.maps.Polyline({map,path:route,strokeColor:'#f2d675',strokeOpacity:.95,strokeWeight:3,zIndex:800})
      new google.maps.Marker({map,position:tee,title:'Tee',icon:{path:google.maps.SymbolPath.CIRCLE,scale:6,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#173c2b',strokeWeight:2}})
      new google.maps.Marker({map,position:center,title:'Green center',icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#f2d675',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2}})
      const bounds=new google.maps.LatLngBounds();points.forEach(p=>bounds.extend(p));map.fitBounds(bounds,{top:64,right:54,bottom:64,left:54})
      google.maps.event.addListenerOnce(map,'idle',()=>{const z=Number(map.getZoom()||17);if(z>19)map.setZoom(19)})
      status.classList.add('hidden')
      parent.postMessage({type:'parfolio-mini-map-ready'},'*')
    }catch(error){fail('ParFolio satellite map could not initialize.')}
  }
  const script=document.createElement('script')
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callback}`
  script.async=true;script.defer=true;script.onerror=()=>fail('Google Maps failed to load.')
  document.head.appendChild(script)
})()
