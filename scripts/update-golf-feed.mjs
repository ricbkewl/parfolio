import fs from 'node:fs/promises';

const OUT='data/golf-feed.json';
const now=new Date();
const year=now.getUTCFullYear();
const queries=[
  ['Swing',`golf swing tips when:7d`],
  ['Short Game',`golf putting chipping tips when:7d`],
  ['Courses',`best golf courses ${year} when:30d`],
  ['Trends',`golf technology equipment trends when:14d`],
  ['Travel',`golf travel destination courses when:14d`]
];

const decode=s=>String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const strip=s=>decode(String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const tag=(xml,name)=>{const m=xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decode(m[1].trim()):''};
const attr=(xml,name,attribute)=>{const m=xml.match(new RegExp(`<${name}[^>]*\\s${attribute}=["']([^"']+)["']`,'i'));return m?decode(m[1]):''};
const imageFrom=s=>{const m=String(s||'').match(/<img[^>]+src=["']([^"']+)["']/i);return m?decode(m[1]):''};
const canonicalTitle=s=>strip(s).toLowerCase().replace(/\s+-\s+[^-]+$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const summary=s=>{const t=strip(s);return t.length>180?t.slice(0,177)+'…':t};

async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'ParFolioGolfFeed/1.0'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text();}

async function newsItems(){
  const items=[];
  for(const [category,q] of queries){
    const url=`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    try{
      const xml=await fetchText(url);
      for(const block of xml.match(/<item>[\s\S]*?<\/item>/gi)||[]){
        const title=strip(tag(block,'title')),link=strip(tag(block,'link')),description=tag(block,'description'),publishedAt=tag(block,'pubDate'),source=strip(tag(block,'source'))||'Golf News';
        if(!title||!link)continue;
        items.push({type:'article',category,title,summary:summary(description),source,url:link,publishedAt:new Date(publishedAt||Date.now()).toISOString(),thumbnail:imageFrom(description)});
      }
    }catch(e){console.warn('News feed skipped:',q,e.message)}
  }
  return items;
}

async function youtubeItems(){
  const key=process.env.YOUTUBE_API_KEY;if(!key)return[];
  const publishedAfter=new Date(Date.now()-14*86400000).toISOString(),qs=['golf swing tips','golf short game tips','golf tips tricks'];
  const out=[];
  for(const q of qs){
    const params=new URLSearchParams({part:'snippet',type:'video',maxResults:'5',order:'date',q,publishedAfter,videoDuration:'short',videoEmbeddable:'true',relevanceLanguage:'en',topicId:'/m/037hz',key});
    try{
      const r=await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);if(!r.ok)throw new Error(`YouTube ${r.status}`);const data=await r.json();
      for(const item of data.items||[]){const id=item?.id?.videoId,s=item?.snippet;if(!id||!s)continue;out.push({type:'video',category:'Tips & Tricks',title:strip(s.title),summary:summary(s.description),source:strip(s.channelTitle)||'YouTube',url:`https://www.youtube.com/watch?v=${id}`,publishedAt:new Date(s.publishedAt).toISOString(),thumbnail:s.thumbnails?.high?.url||s.thumbnails?.medium?.url||''});}
    }catch(e){console.warn('YouTube feed skipped:',q,e.message)}
  }
  return out;
}

const [news,videos]=await Promise.all([newsItems(),youtubeItems()]);
let prior={items:[]};try{prior=JSON.parse(await fs.readFile(OUT,'utf8'))}catch{}
const preservedVideos=videos.length?[]:(prior.items||[]).filter(x=>x.type==='video').slice(0,4);
const seen=new Set(),combined=[...videos,...preservedVideos,...news].filter(item=>{const k=canonicalTitle(item.title);if(!k||seen.has(k))return false;seen.add(k);return true;});
combined.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
const result={generatedAt:new Date().toISOString(),youtubeEnabled:Boolean(process.env.YOUTUBE_API_KEY),items:combined.slice(0,30)};
await fs.mkdir('data',{recursive:true});await fs.writeFile(OUT,JSON.stringify(result,null,2)+'\n');
console.log(`Golf Feed: ${result.items.length} items (${videos.length} new videos, ${news.length} news candidates)`);