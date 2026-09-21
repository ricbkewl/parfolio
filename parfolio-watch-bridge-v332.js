/* ParFolio v332 — Apple Watch / companion bridge foundation.
   This module is intentionally isolated from the map renderer. It reads the existing
   ParFolio round engine and delegates all mutations back to the canonical scoring /
   navigation functions so watch support cannot create a second source of truth. */
(function(){
  const VERSION=332;
  const CHANNEL_NAME='parfolio-watch-v1';
  const EVENT_NAME='parfolio:watch-state';
  let lastSignature='';
  let channel=null;

  try{if('BroadcastChannel' in window)channel=new BroadcastChannel(CHANNEL_NAME)}catch{}

  const finite=value=>Number.isFinite(Number(value));
  const point=value=>value&&finite(value.lat)&&finite(value.lng)?{lat:Number(value.lat),lng:Number(value.lng)}:null;
  const roundActive=()=>{try{return typeof s!=='undefined'&&s?.v==='round'&&!s?.done}catch{return false}};
  const playerName=()=>{try{return typeof myRoundPlayerName==='function'?myRoundPlayerName():''}catch{return''}};
  const course=()=>{try{return typeof selectedRoundCourse==='function'?selectedRoundCourse():null}catch{return null}};
  const yards=(a,b)=>{try{return point(a)&&point(b)&&typeof distanceYards==='function'?Math.round(distanceYards(a,b)):null}catch{return null}};
  const currentGreen=()=>{const c=course();try{return c?.greens?.[Number(s?.hole||1)-1]||null}catch{return null}};
  const teeFor=green=>{try{return typeof selectedTee==='function'?selectedTee(green):green?.tee||null}catch{return green?.tee||null}};
  const originFor=green=>{try{return typeof shotPlannerOrigin==='function'?shotPlannerOrigin(green):((typeof lastKnownPosition!=='undefined'&&point(lastKnownPosition))?lastKnownPosition:teeFor(green))}catch{return teeFor(green)}};
  const aimFor=green=>{try{return typeof shotPlannerAim==='function'?shotPlannerAim(green):green?.center||null}catch{return green?.center||null}};

  function scoredToPar(name,hole){
    try{
      const scores=s?.scores?.[name]||{};
      let strokes=0,pars=0,played=0;
      for(let h=1;h<=Number(hole||0);h++){
        const score=Number(scores[h]);
        if(!score)continue;
        strokes+=score;pars+=Number(s?.pars?.[h-1]||0);played++;
      }
      return played?strokes-pars:null;
    }catch{return null}
  }

  function holeStats(name,hole){
    try{
      const advanced=s?.holeStats?.[name]?.[hole]||{};
      const putts=Number.isInteger(advanced.putts)?advanced.putts:s?.putts?.[name]?.[hole];
      return{
        putts:Number.isInteger(putts)?putts:null,
        fairwayHit:typeof advanced.fairway_hit==='boolean'?advanced.fairway_hit:null,
        greenInRegulation:typeof advanced.green_in_regulation==='boolean'?advanced.green_in_regulation:null,
        chipShots:Number.isInteger(advanced.chip_shots)?advanced.chip_shots:null,
        sandShots:Number.isInteger(advanced.sand_shots)?advanced.sand_shots:null,
        penalties:Number.isInteger(advanced.penalties)?advanced.penalties:null
      };
    }catch{return{putts:null,fairwayHit:null,greenInRegulation:null,chipShots:null,sandShots:null,penalties:null}}
  }

  function distanceState(green){
    const origin=originFor(green),aim=aimFor(green),tee=teeFor(green);
    const toPlanner=yards(origin,aim),front=yards(origin,green?.front),center=yards(origin,green?.center),back=yards(origin,green?.back);
    let routeRemaining=null,mappedHole=null;
    try{
      if(origin&&aim&&green?.center&&typeof remainingRoutePoints==='function'&&typeof routeDistance==='function'){
        const remaining=remainingRoutePoints(origin,aim,green);
        routeRemaining=(toPlanner??0)+Math.round(routeDistance(remaining));
      }
    }catch{}
    try{if(typeof mappedHoleDistance==='function')mappedHole=mappedHoleDistance(green)}catch{}
    return{
      toPlanner,
      routeRemaining,
      front,
      center,
      back,
      mappedHole:finite(mappedHole)?Number(mappedHole):null,
      origin:point(origin),
      plannerTarget:point(aim),
      tee:point(tee),
      greenCenter:point(green?.center)
    };
  }

  function clubState(distance){
    try{
      if(!finite(distance)||typeof suggestedClubFor!=='function')return{club:null,note:null};
      const allowed=typeof driverAllowedForCurrentShot==='function'?driverAllowedForCurrentShot():true;
      const suggestion=suggestedClubFor(Number(distance),allowed);
      return{club:suggestion?.club||null,note:suggestion?.note||null};
    }catch{return{club:null,note:null}}
  }

  function snapshot(){
    if(!roundActive())return{
      protocol:1,
      bridgeVersion:VERSION,
      generatedAt:new Date().toISOString(),
      available:false,
      reason:'no_active_round'
    };

    const name=playerName(),green=currentGreen(),distances=distanceState(green);
    const hole=Number(s?.hole||1),par=Number(s?.pars?.[hole-1]||0),score=Number(s?.scores?.[name]?.[hole]||0)||par;
    let roundTotal=null;
    try{roundTotal=typeof total==='function'?Number(total(name,hole)):null}catch{}
    const suggestion=clubState(distances.toPlanner??distances.center);

    return{
      protocol:1,
      bridgeVersion:VERSION,
      generatedAt:new Date().toISOString(),
      available:true,
      round:{
        id:s?.sharedRoundId||null,
        courseId:s?.courseId||s?.catalogCourseId||null,
        courseName:String(s?.course||course()?.name||'').trim()||null,
        holes:Number(s?.holes||0)||null,
        teeSet:s?.teeSet||null
      },
      player:{
        name:name||null,
        userId:(typeof currentUser!=='undefined'&&currentUser?.id)||null
      },
      hole:{
        number:hole,
        par:par||null,
        score:score||null,
        roundTotal:finite(roundTotal)?roundTotal:null,
        toPar:scoredToPar(name,hole),
        stats:holeStats(name,hole)
      },
      distances,
      suggestion,
      gps:{
        accuracyYards:(typeof lastGpsAccuracyYards!=='undefined'&&finite(lastGpsAccuracyYards))?Number(lastGpsAccuracyYards):null,
        position:(typeof lastKnownPosition!=='undefined')?point(lastKnownPosition):null
      }
    };
  }

  function nativePost(state){
    try{
      const handler=window.webkit?.messageHandlers?.parfolioWatch;
      if(handler?.postMessage)handler.postMessage(state);
    }catch{}
  }

  function publish(force=false){
    const state=snapshot();
    const comparable={...state,generatedAt:undefined};
    let signature='';
    try{signature=JSON.stringify(comparable)}catch{}
    if(!force&&signature===lastSignature)return state;
    lastSignature=signature;
    try{window.dispatchEvent(new CustomEvent(EVENT_NAME,{detail:state}))}catch{}
    try{channel?.postMessage({type:'state',payload:state})}catch{}
    nativePost(state);
    return state;
  }

  async function perform(action){
    const command=typeof action==='string'?{type:action}:action||{};
    if(!roundActive()&&command.type!=='refresh')return{ok:false,error:'no_active_round',state:snapshot()};
    try{
      switch(command.type){
        case 'score_delta':{
          const name=playerName();
          if(!name||typeof changeScore!=='function')throw new Error('score_unavailable');
          const delta=Math.sign(Number(command.delta)||0);
          if(!delta)throw new Error('invalid_delta');
          await changeScore(encodeURIComponent(name),delta);
          break;
        }
        case 'set_score':{
          if(typeof setExactHoleScore!=='function')throw new Error('score_unavailable');
          const value=Math.max(1,Math.min(20,Number(command.score)||0));
          if(!value)throw new Error('invalid_score');
          setExactHoleScore(value);
          break;
        }
        case 'set_putts':{
          if(typeof setHolePutts!=='function')throw new Error('putts_unavailable');
          const value=Math.max(0,Math.min(4,Number(command.putts)||0));
          setHolePutts(value);
          break;
        }
        case 'next_hole':
          if(typeof next!=='function')throw new Error('navigation_unavailable');
          next();
          break;
        case 'previous_hole':
          if(typeof prev!=='function')throw new Error('navigation_unavailable');
          prev();
          break;
        case 'refresh':
          break;
        default:
          throw new Error('unsupported_action');
      }
      return{ok:true,state:publish(true)};
    }catch(error){
      return{ok:false,error:error?.message||String(error),state:publish(true)};
    }
  }

  if(channel){
    channel.onmessage=event=>{
      const message=event?.data;
      if(message?.type==='action')perform(message.payload).then(result=>{
        try{channel.postMessage({type:'action_result',requestId:message.requestId||null,payload:result})}catch{}
      });
    };
  }

  window.ParFolioWatchBridge={
    version:VERSION,
    protocol:1,
    getSnapshot:snapshot,
    publish:()=>publish(true),
    perform,
    subscribe(handler){
      if(typeof handler!=='function')return()=>{};
      const fn=event=>handler(event.detail);
      window.addEventListener(EVENT_NAME,fn);
      handler(snapshot());
      return()=>window.removeEventListener(EVENT_NAME,fn);
    }
  };

  window.addEventListener('online',()=>publish(true));
  window.addEventListener('offline',()=>publish(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)publish(true)});
  setInterval(()=>publish(false),1000);
  setTimeout(()=>publish(true),0);
})();