/*
 * Server-only multimodal satellite analyzer adapter.
 * Provider-neutral: caller supplies analyzeImage(). This module only defines
 * the structured golf-observation contract; it has no DB/write capability.
 */
const SYSTEM_INSTRUCTIONS=[
  'Analyze satellite golf-course imagery for mapping evidence only.',
  'Never invent or interpolate coordinates that are not supported by visible evidence.',
  'Return observations only for requested missing holes.',
  'Allowed point types: tee, aim1, aim2, green_front, green_center, green_back.',
  'Every point requires latitude, longitude, confidence 0..1, and a short evidence note.',
  'If hole identity or point location is ambiguous, omit it rather than guess.',
  'Tee and green_center are the minimum useful pair; optional points may be omitted.',
  'This is report-only. Do not claim a course is GPS Ready.'
].join(' ');

function validateRaw(result={}){
  const holes=Array.isArray(result.holes)?result.holes:[];
  return {holes:holes.map(h=>({
    hole_number:Number(h.hole_number),
    points:(Array.isArray(h.points)?h.points:[]).map(p=>({
      type:String(p.type||''),lat:Number(p.lat),lng:Number(p.lng),
      confidence:Number(p.confidence),evidence:String(p.evidence||'')
    }))
  }))};
}
function createSatelliteAnalyzer({analyzeImage}={}){
  if(typeof analyzeImage!=='function')throw new Error('multimodal analyzeImage implementation required');
  return async function analyze({image_bytes,imagery_source,course,missing_holes,authoritative_rows,report_only}){
    if(report_only!==true)throw new Error('satellite analyzer may only run report-only');
    const result=await analyzeImage({
      system_instructions:SYSTEM_INSTRUCTIONS,
      image_bytes,
      context:{
        imagery_source,
        course:{id:course?.id,name:course?.name,holes:course?.holes,latitude:course?.latitude,longitude:course?.longitude},
        missing_holes:Array.isArray(missing_holes)?missing_holes:[],
        authoritative_rows:Array.isArray(authoritative_rows)?authoritative_rows:[]
      },
      response_contract:{holes:[{hole_number:'integer',points:[{type:'string',lat:'number',lng:'number',confidence:'number',evidence:'string'}]}]}
    });
    return validateRaw(result);
  };
}
module.exports={SYSTEM_INSTRUCTIONS,validateRaw,createSatelliteAnalyzer};
