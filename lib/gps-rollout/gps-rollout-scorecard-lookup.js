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
function cleanText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();}
function absolute(base,href){try{return new URL(href,base).toString();}catch{return null;}}
function sameOrigin(a,b){try{return new URL(a).origin===new URL(b).origin;}catch{return false;}}
function likelyScorecardLink(href,text=''){
  const s=(String(href)+' '+String(text)).toLowerCase();
  return /scorecard|course[-_ ]?map|hole[-_ ]?by[-_ ]?hole|golf|course/.test(s);
}
async function fetchText(url,{timeout_ms=9000}={}){
  const r=await fetch(url,{headers:{'user-agent':'ParFolio-GPS-Scorecard/1.1','accept':'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(timeout_ms)});
  if(!r.ok)throw new Error('HTTP_'+r.status);
  return {url:r.url||url,html:await r.text(),content_type:r.headers.get('content-type')||''};
}
function extractLinks(html,base){
  const out=[];const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(String(html||'')))){const url=absolute(base,m[1]);if(url)out.push({url,text:cleanText(m[2])});}
  return out;
}
function tableRows(html){
  const tables=[];const tre=/<table\b[^>]*>([\s\S]*?)<\/table>/gi;let tm;
  while((tm=tre.exec(String(html||'')))){
    const rows=[];const rre=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;let rm;
    while((rm=rre.exec(tm[1]))){
      const cells=[];const cre=/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;let cm;
      while((cm=cre.exec(rm[1])))cells.push(cleanText(cm[1]));
      if(cells.length)rows.push(cells);
    }
    if(rows.length)tables.push(rows);
  }
  return tables;
}
function numericCells(row,{min=0,max=9999}={}){
  return (row||[]).map(x=>Number(String(x).replace(/[^0-9.]/g,''))).filter(x=>Number.isFinite(x)&&x>=min&&x<=max);
}

function parseScorecardTable(html,declared){
  const count=Number(declared);if(![9,18].includes(count))return null;
  for(const rows of tableRows(html)){
    let parRow=null,holeRow=null;
    for(const row of rows){
      const label=String(row[0]||'').trim().toLowerCase();
      if(label==='hole'||label.startsWith('hole '))holeRow=row;
      if(label==='par'||label.startsWith('par '))parRow=row;
    }
    if(!parRow)continue;
    const pars=numericCells(parRow.slice(1),{min:3,max:6}).slice(0,count);
    if(pars.length!==count)continue;
    if(holeRow){
      const nums=numericCells(holeRow.slice(1),{min:1,max:18}).slice(0,count);
      if(nums.length===count&&!nums.every((n,i)=>n===i+1))continue;
    }
    const yardRows=[];
    for(const row of rows){
      const label=String(row[0]||'').trim();
      if(!label||/^(hole|par|hcp|handicap|si|index|out|in|total|tot)$/i.test(label))continue;
      const ys=numericCells(row.slice(1),{min:50,max:800}).slice(0,count);
      if(ys.length===count)yardRows.push(ys);
    }
    if(!yardRows.length)continue;
    const holes=Array.from({length:count},(_,i)=>({
      hole_number:i+1,par:pars[i],yardages:[...new Set(yardRows.map(r=>r[i]).filter(Number.isFinite))].sort((a,b)=>a-b)
    }));
    if(holes.every(h=>h.yardages.length))return holes;
  }
  return null;
}

// Fallback text parser for pages that do not use semantic HTML tables.
function parseScorecardText(text,declared){
  text=String(text||'').replace(/,/g,' ');
  const count=Number(declared);if(![9,18].includes(count))return null;
  const nums=s=>String(s||'').match(/\b\d{1,3}\b/g)?.map(Number)||[];
  const parMatch=text.match(/\bPar\b\s*[:|\-]?\s*((?:\d{1,2}\s+){8,40})/i);
  const pars=parMatch?nums(parMatch[1]).filter(x=>x>=3&&x<=6).slice(0,count):[];
  const yardRows=[];
  const rowRe=/(?:^|\s)([A-Za-z][A-Za-z0-9\-/ ]{0,24})\s+((?:\d{2,3}\s+){8,40})/g;let m;
  while((m=rowRe.exec(text))){
    const label=m[1].trim();if(/^(par|hole|hcp|handicap|out|in|total)$/i.test(label))continue;
    const ys=nums(m[2]).filter(x=>x>=50&&x<=800).slice(0,count);
    if(ys.length===count)yardRows.push(ys);
  }
  if(yardRows.length===0)return null;
  const holes=Array.from({length:count},(_,i)=>({hole_number:i+1,par:pars[i]||null,yardages:yardRows.map(r=>r[i]).filter(Number.isFinite)}));
  return holes.every(h=>h.yardages.length)?holes:null;
}
function parseAnyScorecard(html,declared){return parseScorecardTable(html,declared)||parseScorecardText(cleanText(html),declared);}
function parseZomma(html,declared){return parseScorecardTable(html,declared)||parseScorecardText(cleanText(html),declared);}

async function lookupOfficial(course){
  const website=String(course?.website||'').trim();if(!/^https?:\/\//i.test(website))return null;
  let home;try{home=await fetchText(website);}catch{return null;}
  const candidates=[home.url];
  for(const l of extractLinks(home.html,home.url)){
    if(sameOrigin(home.url,l.url)&&likelyScorecardLink(l.url,l.text)&&!candidates.includes(l.url))candidates.push(l.url);
    if(candidates.length>=8)break;
  }
  for(const url of candidates){
    try{
      const page=url===home.url?home:await fetchText(url);
      const holes=parseAnyScorecard(page.html,course.holes);if(!holes)continue;
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
module.exports={slugify,cleanText,extractLinks,tableRows,parseScorecardTable,parseScorecardText,parseAnyScorecard,parseZomma,lookupOfficial,lookupZomma,lookupScorecard};
