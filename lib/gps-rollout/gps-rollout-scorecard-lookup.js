/*
 * Automated scorecard lookup for ParFolio GPS rollout.
 *
 * Free-source hierarchy:
 * 1) course.website: crawl same-origin links likely to contain scorecard/hole data
 * 2) known reputable public scorecard providers with deterministic URL patterns
 * 3) caller may continue to numbered OSM / manual review
 *
 * This module never fabricates holes. It only returns a scorecard when a complete
 * sequential 9/18-hole table with useful yardage evidence can be extracted.
 */
const {normalizeScorecard}=require('./gps-rollout-scorecard-numbering');

function slugify(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function cleanText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function absolute(base,href){try{return new URL(href,base).toString();}catch{return null;}}
function sameOrigin(a,b){try{return new URL(a).origin===new URL(b).origin;}catch{return false;}}
function likelyScorecardLink(href,text=''){
  const s=(String(href)+' '+String(text)).toLowerCase();
  return /scorecard|course[-_ ]?map|hole[-_ ]?by[-_ ]?hole|golf|course/.test(s);
}
async function fetchText(url,{timeout_ms=9000}={}){
  const r=await fetch(url,{headers:{'user-agent':'ParFolio-GPS-Scorecard/1.0','accept':'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(timeout_ms)});
  if(!r.ok)throw new Error('HTTP_'+r.status);
  return {url:r.url||url,html:await r.text(),content_type:r.headers.get('content-type')||''};
}
function extractLinks(html,base){
  const out=[];const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(String(html||'')))){const url=absolute(base,m[1]);if(url)out.push({url,text:cleanText(m[2])});}
  return out;
}

// Generic row-oriented parser: recognizes visible text sequences such as
// "Hole 1 2 ... 18", "Par ...", and tee rows of per-hole yardages.
function parseScorecardText(text,declared){
  text=String(text||'').replace(/,/g,' ');
  const count=Number(declared);if(![9,18].includes(count))return null;
  const holeSeq=Array.from({length:count},(_,i)=>String(i+1));
  const nums=s=>String(s||'').match(/\b\d{1,3}\b/g)?.map(Number)||[];
  const parMatch=text.match(/\bPar\b\s*[:|\-]?\s*((?:\d{1,2}\s+){8,40})/i);
  let pars=parMatch?nums(parMatch[1]).filter(x=>x>=3&&x<=6).slice(0,count):[];
  const yardRows=[];
  const rowRe=/(?:^|\s)([A-Za-z][A-Za-z0-9\-/ ]{0,24})\s+((?:\d{2,3}\s+){8,40})/g;let m;
  while((m=rowRe.exec(text))){
    const label=m[1].trim();if(/^(par|hole|hcp|handicap|out|in|total)$/i.test(label))continue;
    const ys=nums(m[2]).filter(x=>x>=50&&x<=800).slice(0,count);
    if(ys.length===count)yardRows.push({label,ys});
  }
  if(yardRows.length===0)return null;
  const holes=holeSeq.map((_,i)=>({hole_number:i+1,par:pars[i]||null,yardages:yardRows.map(r=>r.ys[i]).filter(Number.isFinite)}));
  return holes.every(h=>h.yardages.length)?holes:null;
}

// Zomma exposes a predictable public course URL and a complete "Scorecard" table
// for many U.S. courses. This parser is intentionally strict and returns null if
// all 9/18 holes are not present.
function parseZomma(html,declared){
  const text=cleanText(html);
  const count=Number(declared);if(![9,18].includes(count))return null;
  const marker=text.toLowerCase().indexOf('scorecard');
  const scope=marker>=0?text.slice(marker,marker+24000):text;
  const parRe=/\bPar\b\s+((?:[3-6]\s+){8,24})/i;
  const pm=scope.match(parRe);if(!pm)return null;
  const pars=(pm[1].match(/[3-6]/g)||[]).map(Number).slice(0,count);if(pars.length!==count)return null;
  const yardRows=[];
  const rowRe=/\b([A-Za-z0-9][A-Za-z0-9\-/]{0,12})\s+((?:\d{2,3}\s+){8,24})/g;let m;
  while((m=rowRe.exec(scope))){
    const label=m[1];if(/^(Par|Hole|Hcp|Out|In|Total|Front|Back)$/i.test(label))continue;
    const vals=(m[2].match(/\d{2,3}/g)||[]).map(Number).filter(x=>x>=50&&x<=800).slice(0,count);
    if(vals.length===count)yardRows.push(vals);
  }
  if(!yardRows.length)return null;
  return Array.from({length:count},(_,i)=>({hole_number:i+1,par:pars[i],yardages:[...new Set(yardRows.map(r=>r[i]).filter(Number.isFinite))].sort((a,b)=>a-b)}));
}

async function lookupOfficial(course){
  const website=String(course?.website||'').trim();if(!/^https?:\/\//i.test(website))return null;
  let home;try{home=await fetchText(website);}catch{return null;}
  const candidates=[home.url];
  for(const l of extractLinks(home.html,home.url)){
    if(sameOrigin(home.url,l.url)&&likelyScorecardLink(l.url,l.text)&&!candidates.includes(l.url))candidates.push(l.url);
    if(candidates.length>=7)break;
  }
  for(const url of candidates){
    try{
      const page=url===home.url?home:await fetchText(url);
      const holes=parseScorecardText(cleanText(page.html),course.holes);
      if(!holes)continue;
      const normalized=normalizeScorecard({course,source:{tier:'official',provider:'course_website',url:page.url},holes});
      if(normalized.ok)return {ok:true,source:normalized.source,holes:normalized.holes,lookup_path:'official'};
    }catch{}
  }
  return null;
}
async function lookupZomma(course){
  const state=String(course?.state_code||'').toLowerCase();if(!/^[a-z]{2}$/.test(state))return null;
  const slug=slugify(course?.name);if(!slug)return null;
  const url=`https://zommagolf.com/courses/${state}/${slug}`;
  try{
    const page=await fetchText(url,{timeout_ms:10000});
    const holes=parseZomma(page.html,course.holes);if(!holes)return null;
    const normalized=normalizeScorecard({course,source:{tier:'reputable_public',provider:'zomma_golf',url:page.url},holes});
    if(normalized.ok)return {ok:true,source:normalized.source,holes:normalized.holes,lookup_path:'reputable_public'};
  }catch{}
  return null;
}
async function lookupScorecard(course,{allow_public=true}={}){
  const official=await lookupOfficial(course);if(official)return official;
  if(allow_public){const pub=await lookupZomma(course);if(pub)return pub;}
  return {ok:false,reason:'scorecard_not_found_or_incomplete',source:null,holes:[]};
}
module.exports={slugify,cleanText,extractLinks,parseScorecardText,parseZomma,lookupOfficial,lookupZomma,lookupScorecard};
