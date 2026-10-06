/*
 * Scorecard-first hole numbering resolver for ParFolio Level-2 GPS recovery.
 * Full numbering may satisfy the production numbering gate. Partial numbering
 * is diagnostic only and is used to target Level-3 recovery; it never promotes.
 */
const M_PER_YARD=0.9144;
function validHoleNumber(n,declared){n=Number(n);return Number.isInteger(n)&&n>=1&&n<=declared;}
function normalizeScorecard({course,source,holes=[]}={}){
  const declared=Number(course?.holes);
  if(![9,18].includes(declared))return{ok:false,reason:'declared_holes_not_9_or_18'};
  const clean=[];
  for(const h of holes){
    const hole=Number(h.hole_number??h.hole??h.number);if(!validHoleNumber(hole,declared))continue;
    const par=Number(h.par),ys=[];const add=v=>{const y=Number(v);if(Number.isFinite(y)&&y>=50&&y<=800)ys.push(y);};
    if(Array.isArray(h.yardages))for(const y of h.yardages)add(y);
    if(Array.isArray(h.tees))for(const t of h.tees)add(t?.yards??t?.yardage);
    add(h.yards);add(h.yardage);
    clean.push({hole_number:hole,par:Number.isInteger(par)&&par>=3&&par<=6?par:null,yardages:[...new Set(ys)].sort((a,b)=>a-b)});
  }
  clean.sort((a,b)=>a.hole_number-b.hole_number);
  const unique=[...new Set(clean.map(h=>h.hole_number))];
  if(unique.length!==declared||unique.some((n,i)=>n!==i+1))return{ok:false,reason:'scorecard_not_complete_sequential'};
  const knownPars=clean.filter(h=>Number.isInteger(h.par));
  const expectedPar=Number(course?.par);
  if(knownPars.length===declared&&Number.isFinite(expectedPar)&&expectedPar>0){
    const totalPar=knownPars.reduce((s,h)=>s+h.par,0);
    if(totalPar!==expectedPar)return{ok:false,reason:'scorecard_total_par_conflicts_with_catalog',scorecard_par:totalPar,catalog_par:expectedPar};
  }
  const sourceTier=String(source?.tier||'').toLowerCase();
  const sourceConfidence=sourceTier==='official'?1:sourceTier==='reputable_public'?0.9:sourceTier==='osm_numbered'?0.85:0.6;
  return{ok:true,declared,source:{...source,tier:sourceTier||'unknown',confidence:sourceConfidence},holes:clean};
}
function pairLengthYards(pair){const m=Number(pair?.hole_m);return Number.isFinite(m)?m/M_PER_YARD:null;}
function holeCost(pair,hole){
  const y=pairLengthYards(pair);if(!Number.isFinite(y)||!hole.yardages?.length)return 1e6;
  let yd=Infinity;for(const published of hole.yardages)yd=Math.min(yd,Math.abs(y-published));
  let cost=yd/35;if(yd>120)cost+=4+(yd-120)/40;
  const inferredPar=Number(pair?.par);if(Number.isInteger(inferredPar)&&hole.par&&inferredPar!==hole.par)cost+=3;
  return cost;
}
function hungarian(cost){
  const n=cost.length,m=cost[0]?.length||0;if(!n||!m||n>m)return null;
  const u=new Array(n+1).fill(0),v=new Array(m+1).fill(0),p=new Array(m+1).fill(0),way=new Array(m+1).fill(0);
  for(let i=1;i<=n;i++){
    p[0]=i;let j0=0;const minv=new Array(m+1).fill(Infinity),used=new Array(m+1).fill(false);
    do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
      for(let j=1;j<=m;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}if(minv[j]<delta){delta=minv[j];j1=j;}}
      for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;j0=j1;
    }while(p[j0]!==0);
    do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
  }
  const assignment=new Array(n).fill(-1);for(let j=1;j<=m;j++)if(p[j]>0)assignment[p[j]-1]=j-1;return assignment;
}
function matchPairs(norm,pairs){
  const C=pairs.map(p=>norm.holes.map(h=>holeCost(p,h))),map=hungarian(C);if(!map)return null;
  const numbered=pairs.map((pair,i)=>{const h=norm.holes[map[i]],cost=C[i][map[i]];return{...pair,hole_number:h.hole_number,published_par:h.par,published_yardages:h.yardages,numbering_cost:+cost.toFixed(3),numbering_source:norm.source};}).sort((a,b)=>a.hole_number-b.hole_number);
  return numbered;
}
function summaryFor(numbered,norm){
  const costs=numbered.map(x=>x.numbering_cost),max=costs.length?Math.max(...costs):Infinity,avg=costs.length?costs.reduce((a,b)=>a+b,0)/costs.length:Infinity;
  const used=new Set(numbered.map(x=>x.hole_number));
  const missing=norm.holes.map(h=>h.hole_number).filter(n=>!used.has(n));
  return{pair_count:numbered.length,max_numbering_cost:+max.toFixed(3),average_numbering_cost:+avg.toFixed(3),source_confidence:norm.source.confidence,missing_hole_numbers:missing};
}
function numberByScorecard({course,assignment,scorecard,max_pair_cost=3.5,max_average_cost=1.8}={}){
  const norm=normalizeScorecard({course,source:scorecard?.source,holes:scorecard?.holes});
  if(!norm.ok)return{ok:false,reason:norm.reason,numbering_verified:false};
  const pairs=Array.isArray(assignment?.pairs)?assignment.pairs:[];
  if(pairs.length!==norm.declared)return{ok:false,reason:'pair_count_does_not_match_scorecard',numbering_verified:false};
  const numbered=matchPairs(norm,pairs);if(!numbered)return{ok:false,reason:'numbering_assignment_failed',numbering_verified:false};
  const summary=summaryFor(numbered,norm),sequential=numbered.every((x,i)=>x.hole_number===i+1),sourceStrong=norm.source.confidence>=0.85;
  summary.sequential=sequential;
  const ok=sequential&&sourceStrong&&summary.max_numbering_cost<=max_pair_cost&&summary.average_numbering_cost<=max_average_cost;
  return{ok,numbering_verified:ok,reason:ok?'scorecard_numbering_verified':'scorecard_match_low_confidence',source:norm.source,numbered_pairs:numbered,summary};
}
function numberPartialByScorecard({course,assignment,scorecard,max_pair_cost=3.5,max_average_cost=1.8,min_pairs}={}){
  const norm=normalizeScorecard({course,source:scorecard?.source,holes:scorecard?.holes});
  if(!norm.ok)return{ok:false,reason:norm.reason,partial:true};
  const pairs=Array.isArray(assignment?.pairs)?assignment.pairs:[];
  const minimum=Number.isInteger(Number(min_pairs))?Number(min_pairs):Math.max(1,norm.declared-2);
  if(pairs.length<minimum||pairs.length>=norm.declared)return{ok:false,reason:'partial_pair_count_outside_target_range',partial:true};
  const numbered=matchPairs(norm,pairs);if(!numbered)return{ok:false,reason:'partial_numbering_assignment_failed',partial:true};
  const summary=summaryFor(numbered,norm),sourceStrong=norm.source.confidence>=0.85;
  const ok=sourceStrong&&summary.max_numbering_cost<=max_pair_cost&&summary.average_numbering_cost<=max_average_cost&&summary.missing_hole_numbers.length===norm.declared-pairs.length;
  return{ok,partial:true,numbering_verified:false,reason:ok?'partial_scorecard_match_strong':'partial_scorecard_match_low_confidence',source:norm.source,numbered_pairs:numbered,missing_hole_numbers:summary.missing_hole_numbers,summary};
}
function geoMeters(a,b){
  const lat1=Number(a?.lat),lng1=Number(a?.lng),lat2=Number(b?.lat),lng2=Number(b?.lng);
  if(![lat1,lng1,lat2,lng2].every(Number.isFinite))return Infinity;
  const rr=6371008.8,r=x=>x*Math.PI/180,d1=r(lat2-lat1),d2=r(lng2-lng1),p1=r(lat1),p2=r(lat2),h=Math.sin(d1/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(d2/2)**2;
  return rr*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function numberByScorecardRouteAware({course,assignment,scorecard,max_pair_cost=3.5,max_average_cost=1.8,beam_width=20000,max_over_400=2,max_median_walk=250,max_walk=500}={}){
  const norm=normalizeScorecard({course,source:scorecard?.source,holes:scorecard?.holes});
  if(!norm.ok)return{ok:false,reason:norm.reason,numbering_verified:false,route_aware:true};
  const pairs=Array.isArray(assignment?.pairs)?assignment.pairs:[];
  if(pairs.length!==norm.declared)return{ok:false,reason:'pair_count_does_not_match_scorecard',numbering_verified:false,route_aware:true};
  const n=pairs.length,C=pairs.map(p=>norm.holes.map(h=>holeCost(p,h))),W=Array.from({length:n},()=>Array(n).fill(Infinity));
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j)W[i][j]=geoMeters(pairs[i]?.green,pairs[j]?.tee);
  let beam=[];
  for(let j=0;j<n;j++)if(C[j][0]<=max_pair_cost)beam.push({mask:(1<<j),last:j,path:[j],over400:0,walk:0,score:C[j][0]});
  const rank=(a,b)=>a.over400-b.over400||a.walk-b.walk||a.score-b.score;
  beam.sort(rank);beam=beam.slice(0,beam_width);
  for(let h=1;h<n;h++){
    const next=[];
    for(const s of beam){
      for(let j=0;j<n;j++){
        if((s.mask&(1<<j))||C[j][h]>max_pair_cost)continue;
        const w=W[s.last][j];if(!Number.isFinite(w))continue;
        next.push({mask:s.mask|(1<<j),last:j,path:[...s.path,j],over400:s.over400+(w>400?1:0),walk:s.walk+w,score:s.score+C[j][h]});
      }
    }
    if(!next.length)return{ok:false,reason:'route_aware_numbering_no_complete_path',numbering_verified:false,route_aware:true,hole_index:h+1};
    next.sort(rank);beam=next.slice(0,beam_width);
  }
  const best=beam[0];
  const numbered=best.path.map((pairIndex,h)=>{const pair=pairs[pairIndex],hole=norm.holes[h],cost=C[pairIndex][h];return{...pair,hole_number:hole.hole_number,published_par:hole.par,published_yardages:hole.yardages,numbering_cost:+cost.toFixed(3),numbering_source:norm.source};});
  const base=summaryFor(numbered,norm),walks=[];
  for(let i=0;i<numbered.length-1;i++)walks.push(geoMeters(numbered[i]?.green,numbered[i+1]?.tee));
  const sorted=[...walks].sort((a,b)=>a-b),median=sorted.length?sorted[Math.floor(sorted.length/2)]:Infinity,avgWalk=walks.length?walks.reduce((s,x)=>s+x,0)/walks.length:Infinity,maxW=walks.length?Math.max(...walks):Infinity,over400=walks.filter(x=>x>400).length;
  const sourceStrong=norm.source.confidence>=0.85,sequential=numbered.every((x,i)=>x.hole_number===i+1);
  const ok=sourceStrong&&sequential&&base.max_numbering_cost<=max_pair_cost&&base.average_numbering_cost<=max_average_cost&&over400<=max_over_400&&median<=max_median_walk&&maxW<=max_walk;
  return{ok,numbering_verified:ok,route_aware:true,reason:ok?'scorecard_route_numbering_verified':'scorecard_route_match_low_confidence',source:norm.source,numbered_pairs:numbered,summary:{...base,sequential,route_over_400:over400,route_median_m:+median.toFixed(1),route_average_m:+avgWalk.toFixed(1),route_max_m:+maxW.toFixed(1),route_total_m:+best.walk.toFixed(1),beam_width},walks_m:walks.map(x=>+x.toFixed(1))};
}

module.exports={M_PER_YARD,normalizeScorecard,numberByScorecard,numberPartialByScorecard,numberByScorecardRouteAware,holeCost};
