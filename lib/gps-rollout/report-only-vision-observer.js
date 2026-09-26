/*
 * Provider-neutral, report-only vision observer contract.
 * The supplied analyze() implementation may inspect imagery but receives no DB
 * client and has no promotion capability.
 */
const {MIN_VISUAL_CONFIDENCE,acceptVisualPoint}=require('./gps-rollout-recovery-policy');
const ALLOWED=new Set(['tee','aim1','aim2','green_front','green_center','green_back']);
function normalize(raw={},imagerySource='unknown'){
  const holes=[];
  for(const h of raw.holes||[]){
    const n=Number(h.hole_number);
    if(!Number.isInteger(n)||n<1||n>18)continue;
    const points=[];
    for(const p of h.points||[]){
      if(!ALLOWED.has(p.type))continue;
      const point={type:p.type,lat:Number(p.lat),lng:Number(p.lng),confidence:Number(p.confidence),imagery_source:p.imagery_source||imagerySource,observed_at:p.observed_at||new Date().toISOString()};
      point.accepted=acceptVisualPoint(point);
      points.push(point);
    }
    holes.push({hole_number:n,points});
  }
  return {report_only:true,min_confidence:MIN_VISUAL_CONFIDENCE,holes};
}
function createReportOnlyVisionObserver({analyze}={}){
  if(typeof analyze!=='function')throw new Error('vision analyze implementation required');
  return {
    async observe({image_bytes,imagery_source,course,missing_holes,authoritative_rows}){
      if(!Buffer.isBuffer(image_bytes)||!image_bytes.length)throw new Error('imagery bytes required');
      const raw=await analyze({image_bytes,imagery_source,course,missing_holes,authoritative_rows,report_only:true});
      return normalize(raw,imagery_source);
    }
  };
}
module.exports={normalize,createReportOnlyVisionObserver};
