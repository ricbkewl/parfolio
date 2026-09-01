/* Version 144: mapping buttons use the exact same color identity as their map markers. */
(function(){
  const priorMarkerButtons=markerButtons;
  markerButtons=function(keys,green){
    return keys.map(key=>{
      const point=markerPoint(green,key);
      const safeKey=String(key).replace(/[^a-z0-9_-]/gi,'');
      return `<button class="marker-tab marker-color-${safeKey} ${draft.target===key?'on':''} ${point?'set':''}" data-marker-key="${safeKey}" onclick="draft.target='${key}';render()"><span class="marker-button-dot" aria-hidden="true"></span><span>${markerName(key)}</span>${point?'<b class="marker-button-check" aria-label="Set">✓</b>':''}</button>`;
    }).join('');
  };
})();
