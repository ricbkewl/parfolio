/* ParFolio Vision v251 — model-ready golf vision orchestration. */
(function(){
 const providers={body:new Map(),club:new Map(),ball:new Map()};
 const active={body:null,club:null,ball:null};
 const state={phase:'idle',events:[],quality:null};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function register(kind,name,provider,meta={}){if(!providers[kind])throw new Error('Unknown detector kind');providers[kind].set(name,{provider,meta});if(!active[kind])active[kind]=name}
 function use(kind,name){if(!providers[kind]?.has(name))throw new Error('Detector unavailable: '+kind+'/'+name);active[kind]=name}
 function get(kind){const name=active[kind],entry=providers[kind]?.get(name);return entry?{name,...entry}:null}
 function emit(type,data={}){const e={type,t:performance.now(),...data};state.events.push(e);if(state.events.length>200)state.events.shift();window.dispatchEvent(new CustomEvent('parfolio:vision-event',{detail:e}));return e}
 function assessVideo(video){const w=video.videoWidth||0,h=video.videoHeight||0,d=video.duration||0,pixels=w*h;let score=100,notes=[];if(Math.min(w,h)<720){score-=25;notes.push('Low resolution may reduce clubhead and ball detection.')}if(d>18){score-=10;notes.push('Shorter clips isolate the swing more reliably.')}if(d&&d<1){score-=20;notes.push('Clip may be too short for a full swing and ball launch.')}if(!pixels){score=0;notes=['Video metadata is not ready.']}state.quality={score:clamp(score,0,100),width:w,height:h,duration:d,notes};return state.quality}
 function classifySwing(samples,address){if(!samples?.length||!address)return null;const out=[];let topIndex=0,maxAway=0,impactIndex=-1,peakSpeed=0;for(let i=0;i<samples.length;i++){const s=samples[i],away=Math.hypot(s.x-address.x,s.y-address.y);if(away>maxAway){maxAway=away;topIndex=i}if(i>topIndex&&s.speed>peakSpeed&&away<.14){peakSpeed=s.speed;impactIndex=i}}for(let i=0;i<samples.length;i++){let phase='Address';if(i<Math.max(1,Math.floor(topIndex*.75)))phase='Takeaway';else if(i<=topIndex)phase='Top';else if(impactIndex>0&&i<impactIndex-2)phase='Downswing';else if(impactIndex>0&&i<=impactIndex+1)phase='Impact';else if(impactIndex>0&&i<impactIndex+Math.max(3,Math.floor((samples.length-impactIndex)*.55)))phase='Release';else if(impactIndex>0)phase='Finish';out.push(phase)}return{phases:out,topIndex,impactIndex,peakSpeed}}
 window.ParFolioVision={version:251,register,use,get,emit,assessVideo,classifySwing,getState:()=>JSON.parse(JSON.stringify(state)),providers};
})();