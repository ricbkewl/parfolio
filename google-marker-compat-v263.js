/* ParFolio v263 — keep Google rendering even when Advanced Markers are unavailable. */
(function(){
  const priorCreate=typeof createGoogleMarker==='function'?createGoogleMarker:null;
  createGoogleMarker=function(options){
    if(typeof window.google?.maps?.marker?.AdvancedMarkerElement==='function'&&priorCreate)return priorCreate(options);
    if(typeof window.google?.maps?.Marker!=='function')throw new Error('Google marker constructors unavailable');
    const icon=options.icon||null;
    const marker=new google.maps.Marker({
      map:options.map,
      position:options.position,
      title:options.title||'',
      clickable:!!options.clickable,
      draggable:!!options.draggable,
      zIndex:options.zIndex,
      ...(icon?{icon}:{}),
      ...(options.label?{label:options.label}:{}),
      optimized:true
    });
    return{
      raw:marker,
      addListener:(name,callback)=>marker.addListener(name,callback),
      setPosition:value=>marker.setPosition(value),
      getPosition:()=>marker.getPosition(),
      setMap:value=>marker.setMap(value),
      setVisible:value=>marker.setVisible(value),
      setIcon:value=>marker.setIcon(value)
    };
  };
})();
