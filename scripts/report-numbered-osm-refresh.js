/* Usage: node scripts/report-numbered-osm-refresh.js input.json
 * Input: {course, existingRows, holeCountEvidence?}. Read-only public OSM calls.
 */
const fs=require('node:fs');
const {fetchNumberedRefreshReport}=require('../lib/gps-rollout/numbered-osm-refresh');
async function main(){
  if(process.argv.length!==3)throw new Error('Provide one course snapshot JSON file');
  const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const report=await fetchNumberedRefreshReport(input);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.status==='review')process.exitCode=1;
}
main().catch(()=>{process.stderr.write('Refresh failed; check the input snapshot and source access.\n');process.exitCode=1;});
