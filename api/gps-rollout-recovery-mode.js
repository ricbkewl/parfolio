/*
 * Recovery Mode for regions already processed by ParFolio.
 * Existing GPS-ready geometry is immutable input to this pass.
 * Only unresolved courses are candidates for recovery.
 */
function recoveryCandidateQuery({country_code='US',state_code}){
  if(!state_code)throw new Error('state_code required');
  return {country_code,state_code,is_active:true,exclude_mapping_classes:['gps_ready','verified_gps','published']};
}

async function snapshotRegion(db,{country_code='US',state_code}){
  const {data,error}=await db.from('course_catalog')
    .select('id,name,mapping_class,holes')
    .eq('country_code',country_code).eq('state_code',state_code).eq('is_active',true);
  if(error)throw error;
  const protectedRows=(data||[]).filter(x=>['gps_ready','verified_gps','published'].includes(x.mapping_class));
  return {
    country_code,state_code,total_active:(data||[]).length,
    protected_ids:protectedRows.map(x=>x.id),
    protected_count:protectedRows.length,
    captured_at:new Date().toISOString()
  };
}

async function verifyRecoveryInvariant(db,before){
  const {data,error}=await db.from('course_catalog')
    .select('id,mapping_class')
    .in('id',before.protected_ids);
  if(error)throw error;
  const regressed=(data||[]).filter(x=>!['gps_ready','verified_gps','published'].includes(x.mapping_class));
  return {
    ok:regressed.length===0,
    protected_before:before.protected_count,
    protected_after:(data||[]).length-regressed.length,
    regressed_ids:regressed.map(x=>x.id)
  };
}

async function runRecoveryBatch({region,controller,db,processor,batchSize=50}){
  const before=await snapshotRegion(db,region);
  const result=await controller.runBatch({
    region:{...region,mode:'recovery'},batchSize,
    processor
  });
  const invariant=await verifyRecoveryInvariant(db,before);
  if(!invariant.ok)throw new Error('RECOVERY INVARIANT FAILED: existing GPS-ready course was demoted');
  return {mode:'recovery',before,result,invariant};
}

module.exports={recoveryCandidateQuery,snapshotRegion,verifyRecoveryInvariant,runRecoveryBatch};
