/* Free web-discovery fallback for scorecards. Official course website remains first. */
const {normalizeScorecard}=require('./gps-rollout-scorecard-numbering');
const {lookupOfficial,parseAnyScorecard,cleanText,slugify}=require('./gps-rollout-scorecard-lookup');

const ALLOWED_PUBLIC_DOMAINS=['zommagolf.com','fsga.org','bluegolf.com','golfgenius.com','golfusainfo.com','golfify.io','ghin.com','usga.org','pgatour.com','golfpass.com','18birdies.com'];
function allowedPublic(url){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');return ALLOWED_PUBLIC_DOMAINS.some(d=>h===d||h.endsWith('.'+d));}catch{return false;}}
function decodeDdg(href){try{const u=new URL(href,'https://html.duckduckgo.com');const uddg=u.searchParams.get('uddg');return uddg?decodeURIComponent(uddg):u.toString();}catch{return null;}}
async function fetchHtml(url,timeout=9000){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; ParFolioGPS/1.2)','accept':'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error('HTTP_'+r.status);return {url:r.url||url,html:await r.text()};}

async function lookupGolfUSAInfo(course){
  const state=String(course?.state_code||'').toLowerCase();
  const city=slugify(course?.city),name=slugify(course?.name);
  if(!/^[a-z]{2}$/.test(state)||!city||!name)return null;
  const url=`https://www.golfusainfo.com/clubs/${name}-${city}-${state}/`;
  try{
    const page=await fetchHtml(url,9000);
    const holes=parseAnyScorecard(page.html,course.holes);if(!holes)return null;
    const source={tier:'reputable_public',provider:'golfusainfo',url:page.url};
    const normalized=normalizeScorecard({course,source,holes});
    if(!normalized.ok)return null;
    return {ok:true,source:normalized.source,holes:normalized.holes,lookup_path:'golfusainfo'};
  }catch{return null;}
}
async function lookupGolfify(course){
  const base=slugify(course?.name);if(!base)return null;
  const slugs=[base,base.replace(/-golf-course$/,''),base.replace(/-course$/,'')].filter((v,i,a)=>v&&a.indexOf(v)===i);
  for(const slug of slugs){
    const url=`https://www.golfify.io/courses/${slug}`;
    try{
      const page=await fetchHtml(url,9000);
      const holes=parseAnyScorecard(page.html,course.holes);if(!holes)continue;
      const source={tier:'reputable_public',provider:'golfify',url:page.url};
      const normalized=normalizeScorecard({course,source,holes});
      if(normalized.ok)return {ok:true,source:normalized.source,holes:normalized.holes,lookup_path:'golfify'};
    }catch{}
  }
  return null;
}
async function discoverCandidates(course){
  const q=`${course.name||''} ${course.city||''} ${course.state_code||''} golf scorecard hole yardage`;
  const urls=[];
  for(const endpoint of ['https://html.duckduckgo.com/html/?q=','https://lite.duckduckgo.com/lite/?q=']){
    try{
      const page=await fetchHtml(endpoint+encodeURIComponent(q),8000);
      const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
      while((m=re.exec(page.html))){
        const url=decodeDdg(m[1]),label=cleanText(m[2]);
        if(!url||!allowedPublic(url))continue;
        if(!/scorecard|course|golf|yard|hole/i.test(url+' '+label))continue;
        if(!urls.includes(url))urls.push(url);
        if(urls.length>=8)break;
      }
      if(urls.length)break;
    }catch{}
  }
  return urls;
}
async function lookupPublicDiscovered(course){
  const urls=await discoverCandidates(course);
  for(const url of urls){
    try{
      const page=await fetchHtml(url,9000);
      const holes=parseAnyScorecard(page.html,course.holes);if(!holes)continue;
      const source={tier:'reputable_public',provider:new URL(page.url).hostname.replace(/^www\./,''),url:page.url};
      const normalized=normalizeScorecard({course,source,holes});
      if(normalized.ok)return {ok:true,source:normalized.source,holes:normalized.holes,lookup_path:'web_discovered_public',discovered_candidates:urls.length};
    }catch{}
  }
  return {ok:false,reason:'public_scorecard_not_found_or_incomplete',discovered_candidates:urls.length,holes:[]};
}
async function lookupScorecardWeb(course){
  const official=await lookupOfficial(course);if(official)return official;
  const golfusa=await lookupGolfUSAInfo(course);if(golfusa)return golfusa;
  const golfify=await lookupGolfify(course);if(golfify)return golfify;
  return lookupPublicDiscovered(course);
}
module.exports={ALLOWED_PUBLIC_DOMAINS,allowedPublic,lookupGolfUSAInfo,lookupGolfify,discoverCandidates,lookupPublicDiscovered,lookupScorecardWeb};
