/* ParFolio v240 — iOS/Safari video readiness guard for local Swing AI and Shot Vision clips. */
(function(){
  const IDS=['pf-ai-swing-record','pf-ai-swing-choose','pf-ai-shot-record','pf-ai-shot-choose'];
  function statusFor(input){const root=input.closest('.pf-ai-shell');if(!root)return null;return input.id.includes('swing')?root.querySelector('#pf-ai-swing-phase'):root.querySelector('#pf-ai-shot-status')}
  function videoFor(input){const root=input.closest('.pf-ai-shell');if(!root)return null;return input.id.includes('swing')?root.querySelector('#pf-ai-swing-video'):root.querySelector('#pf-ai-shot-video')}
  function setStatus(input,text){const s=statusFor(input);if(s)s.textContent=text}
  function prepare(input){
    const file=input.files&&input.files[0],video=videoFor(input);if(!file||!video)return;
    video.playsInline=true;video.setAttribute('playsinline','');video.preload='auto';
    let settled=false,timer=null;
    const cleanup=()=>{if(timer)clearTimeout(timer);video.removeEventListener('loadedmetadata',metadata);video.removeEventListener('loadeddata',ready);video.removeEventListener('canplay',ready);video.removeEventListener('error',failed)};
    const ready=()=>{if(settled)return;settled=true;cleanup();setStatus(input,'Video ready. Press Play. AI stays paused until you choose an analysis mode.');};
    const metadata=()=>{
      try{if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime===0)video.currentTime=Math.min(.06,Math.max(.01,video.duration/200));}catch{}
      if(video.readyState>=2)ready();
    };
    const failed=()=>{if(settled)return;settled=true;cleanup();const code=video.error&&video.error.code;setStatus(input,code===4?'This video format could not be decoded by Safari. Try an H.264/HEVC .mov or .mp4 exported from Photos.':'The selected video could not be loaded. Please choose it again.');};
    video.addEventListener('loadedmetadata',metadata);
    video.addEventListener('loadeddata',ready);
    video.addEventListener('canplay',ready);
    video.addEventListener('error',failed);
    setStatus(input,'Loading video from Photos…');
    try{video.load()}catch{}
    timer=setTimeout(()=>{if(settled)return;if(video.readyState>=2)ready();else setStatus(input,'Still preparing this video. If it remains black, choose the clip again or export a standard .mp4 from Photos.');},8000);
  }
  function attach(){
    IDS.forEach(id=>{const input=document.getElementById(id);if(!input||input.dataset.videoReady240)return;input.dataset.videoReady240='1';input.addEventListener('change',()=>setTimeout(()=>prepare(input),0));});
  }
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
  window.ParFolioVideoReadiness={version:240};
})();