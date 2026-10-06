/*
 * ParFolio Level-2 recovery confidence gate.
 *
 * This module does not reconstruct geometry itself. It evaluates a completed
 * weak-source tee/green/fairway reconstruction and decides whether the result
 * is strong enough to enter the normal transactional promotion path or must
 * remain hidden for Level-3 imagery/review.
 *
 * IMPORTANT: every signal consumed here must be observable before promotion.
 * Protected/known-good answer-key geometry is never required.
 */
const DEFAULTS={
  max_assignment_score:10,
  max_average_assignment_score:3,
  max_score_gt_8:1,
  max_weak_fairway_pairs:0,
  max_unresolved_surplus_features:0
};

function finite(v){return Number.isFinite(Number(v));}
function uniqueCount(values=[]){return new Set(values.filter(v=>v!==null&&v!==undefined)).size;}

function summarizeLevel2({course,assignment,cleanup={},thresholds={}}={}){
  const cfg={...DEFAULTS,...thresholds};
  const declared=Number(course?.holes);
  const pairs=Array.isArray(assignment?.pairs)?assignment.pairs:[];
  const scores=pairs.map(p=>Number(p.global_score)).filter(Number.isFinite);
  const weakFairwayPairs=pairs.filter(p=>!finite(p.green_fairway_m)||Number(p.green_fairway_m)>50).length;
  const maxScore=scores.length?Math.max(...scores):Infinity;
  const avgScore=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:Infinity;
  const scoreGt8=scores.filter(x=>x>8).length;
  const scoreGt10=scores.filter(x=>x>10).length;
  const uniqueTees=uniqueCount(pairs.map(p=>p.tee_index));
  const uniqueGreens=uniqueCount(pairs.map(p=>p.green_index));
  const unmatchedGreens=Array.isArray(assignment?.unmatched_green_indices)?assignment.unmatched_green_indices.length:0;
  const unresolvedSurplus=Number(cleanup.unresolved_surplus_features||0);

  return {
    declared_holes:declared,
    pair_count:pairs.length,
    unique_tee_assignments:uniqueTees,
    unique_green_assignments:uniqueGreens,
    unmatched_green_count:unmatchedGreens,
    max_assignment_score:maxScore,
    average_assignment_score:avgScore,
    score_gt_8:scoreGt8,
    score_gt_10:scoreGt10,
    weak_fairway_pairs:weakFairwayPairs,
    unresolved_surplus_features:unresolvedSurplus,
    cleanup_applied:Boolean(cleanup.applied),
    cleanup_reason:cleanup.reason||null,
    thresholds:cfg
  };
}

function level2RecoveryDecision(input={}){
  const summary=summarizeLevel2(input);
  const cfg=summary.thresholds;
  const reasons=[];

  if(![9,18].includes(summary.declared_holes))reasons.push('declared_holes_not_9_or_18');
  if(summary.pair_count!==summary.declared_holes)reasons.push('incomplete_pair_count');
  if(summary.unique_tee_assignments!==summary.declared_holes)reasons.push('tee_assignment_not_one_to_one');
  if(summary.unique_green_assignments!==summary.declared_holes)reasons.push('green_assignment_not_one_to_one');
  if(summary.unmatched_green_count!==0)reasons.push('unmatched_greens');
  if(summary.unresolved_surplus_features>cfg.max_unresolved_surplus_features)reasons.push('unresolved_surplus_features');
  if(!Number.isFinite(summary.max_assignment_score)||summary.max_assignment_score>cfg.max_assignment_score)reasons.push('assignment_score_outlier');
  if(!Number.isFinite(summary.average_assignment_score)||summary.average_assignment_score>cfg.max_average_assignment_score)reasons.push('average_assignment_score_too_high');
  if(summary.score_gt_8>cfg.max_score_gt_8)reasons.push('too_many_borderline_assignments');
  if(summary.score_gt_10>0)reasons.push('high_cost_assignment_present');
  if(summary.weak_fairway_pairs>cfg.max_weak_fairway_pairs)reasons.push('weak_fairway_support');

  if(reasons.length){
    return {
      ok:false,
      tier:2,
      action:'level3_hold',
      reason:reasons[0],
      reasons,
      summary,
      visible_to_normal_users:false,
      requires_level3:true,
      requires_final_geometry_validation:true
    };
  }

  return {
    ok:true,
    tier:2,
    action:'promote_level2',
    reason:'level2_confidence_gate_passed',
    reasons:[],
    summary,
    visible_to_normal_users:false,
    requires_level3:false,
    requires_final_geometry_validation:true
  };
}

module.exports={DEFAULTS,summarizeLevel2,level2RecoveryDecision};
