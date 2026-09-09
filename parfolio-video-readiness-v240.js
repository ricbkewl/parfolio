/* ParFolio v242 — lightweight cross-platform video readiness guard. */
(function(){
  const IDS=['pf-ai-swing-record','pf-ai-swing-choose','pf-ai-shot-record','pf-ai-shot-choose'];
  function statusFor(input){const root=input.closest('.pf-ai-shell');if(!root)return null;return input.id.includes('swing')?root.querySelector('#pf-ai-swing-phase'):root.querySelector('#pf-ai-shot-status')}
  function videoFor(input){const root=input.closest('.pf-ai-shell');if(!root)return null;return input.id.includes('swing')?root.querySelector('#pf-ai-swing-video'):root.querySelector('#pf-ai-shot-video')}
  function setStatus(input,text){const s=statusFor(input);if(s)s.textContent=text}
  function prepare(input){
    const file=input.files&&input.files[0],video=videoFor(input);if(!file||!video)return;
    video.playsInline=true;video.setAttribute('playsinline','');video.preload='metadata';
    let settled=false,timer=null;
    const cleanup=()=>{if(timer)clearTimeout(timer);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('canplay',ready);video.removeEventListener('error',failed)};
    const ready=()=>{if(settled)return;settled=true;cleanup();setStatus(input,'Video ready. Press Play. Analysis stays off until you choose an analysis mode.');};
    const failed=()=>{if(settled)return;settled=true;cleanup();setStatus(input,'The selected video could not be loaded on this device. Please choose the clip again or export a standard H.264/HEVC .mp4 or .mov.');};
    video.addEventListener('loadedmetadata',ready);
    video.addEventListener('canplay',ready);
    video.addEventListener('error',failed);
    setStatus(input,'Loading video…');
    timer=setTimeout(()=>{if(settled)return;if(video.readyState>=1)ready();else setStatus(input,'Still preparing this video. If it remains unavailable, choose the clip again.');},6000);
  }
  function attach(){IDS.forEach(id=>{const input=document.getElementById(id);if(!input||input.dataset.videoReady242)return;input.dataset.videoReady242='1';input.addEventListener('change',()=>setTimeout(()=>prepare(input),0));});}
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
  window.ParFolioVideoReadiness={version:242};
})();
