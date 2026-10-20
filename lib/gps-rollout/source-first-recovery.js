/* Report-only orchestration. Caller supplies its configured visual reporter. */
const {fetchNumberedRefreshReport}=require('./numbered-osm-refresh');
async function runSourceFirstRecovery(input,{refresh=fetchNumberedRefreshReport,visualReport}={}){
  const numbered=await refresh(input);
  if(numbered.status!=='incomplete'||typeof visualReport!=='function')return {report_only:true,promotable:false,numbered,visual:null};
  // An unresolved identity/count/source error is review, never an AI fallback.
  const missing=numbered.missing_before.filter(n=>!numbered.proposals.some(p=>p.hole_number===n));
  if(!missing.length)return {report_only:true,promotable:false,numbered,visual:null};
  const visual=await visualReport({...input,report_only:true,missing_holes:missing,existingRows:input.existingRows,numbered_candidates:numbered.proposals});
  return {report_only:true,promotable:false,numbered,visual};
}
module.exports={runSourceFirstRecovery};
