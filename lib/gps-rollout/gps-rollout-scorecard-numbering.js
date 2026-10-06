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
module.exports={M_PER_YARD,normalizeScorecard,numberByScorecard,numberPartialByScorecard};
