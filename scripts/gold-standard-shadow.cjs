'use strict';
const {mkdirSync,writeFileSync,readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runSierraShadow,reconstruct,markdown}=require('../lib/gps-rollout/gold-standard-shadow');
async function main(){
  const replay=process.argv[2]==='--evidence';
  if((replay&&process.argv.length!==5)||(!replay&&process.argv.length!==3))throw new Error('Usage: node scripts/gold-standard-shadow.cjs [--evidence <snapshot-directory>] <new-report-directory>');
  const directory=resolve(process.argv[replay?4:2]);
  // Exclusive directory creation prevents accidental overwrites of earlier evidence.
  mkdirSync(directory,{recursive:false});
  let options;
  if(replay){
    const evidence=resolve(process.argv[3]);
    const load=name=>JSON.parse(readFileSync(resolve(evidence,name),'utf8'));
    const reads={};
    options={read:async table=>{
      if(!['course_catalog','course_hole_geometry'].includes(table))throw new Error('unexpected_read');
      const phase=reads[table]?'after':'before';reads[table]=true;
      return load((table==='course_catalog'?'catalog':'geometry')+'-'+phase+'.json');
    },recover:course=>reconstruct(course,{fetchOsm:async()=>load('recovery.json').raw})};
  }
  const report=await runSierraShadow(options);
  report.execution=replay?'replay_of_captured_read_only_snapshots':'live_read_only';
  writeFileSync(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  writeFileSync(resolve(directory,'report.md'),markdown(report),{flag:'wx'});
  console.log(JSON.stringify({status:report.status,coverage:report.coverage,metrics:report.metrics,production_integrity:report.production_integrity,directory},null,2));
  if(report.status==='failed')process.exitCode=1;
}
main().catch(e=>{console.error(e.code||'SHADOW_RUN_FAILED');process.exitCode=1;});
