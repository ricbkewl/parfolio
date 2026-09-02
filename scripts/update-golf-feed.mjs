import fs from 'node:fs/promises';

const OUT='data/golf-feed.json';
const year=new Date().getUTCFullYear();
const TRUSTED='(site:golfdigest.com OR site:golf.com OR site:golfmonthly.com OR site:golfpass.com OR site:mygolfspy.com OR site:golfweek.usatoday.com)';
const queries=[
  ['Swing',`${TRUSTED} golf swing instruction tips when:14d`],
  ['Short Game',`${TRUSTED} golf putting chipping bunker tips when:14d`],
  ['Courses',`${TRUSTED} best golf courses ${year} rankings when:60d`],
  ['Trends',`${TRUSTED} golf equipment technology trends when:21d`],
  ['Travel',`${TRUSTED} golf travel resort destination course when:30d`]
];
const BLOCKED=/\b(betting|odds|prediction|sportsbook|casino|cowboys|football|mini golf|miniature golf|fantasy picks?|parlay)\b/i;

const decode=s=>String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const strip=s=>decode(String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const tag=(xml,name)=>{const m=xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decode(m[1].trim()):''};
const imageFrom=s=>{const m=String(s||'').match(/<img[^>]+src=["']([^"']+)["']/i);return m?decode(m[1]):''};
const canonicalTitle=s=>strip(s).toLowerCase().replace(/\s+-\s+[^-]+$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const cleanTitle=(title,source)=>{const t=strip(title),suffix=source?new RegExp(`\\s+-\\s+${String(source).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i'):null;return suffix?t.replace(suffix,'').trim():t};
const summary=s=>{const t=strip(s);return t.length>180?t.slice(0,177)+'…':t};

async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'ParFolioGolfFeed/1.0'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text();}

async function newsItems(){
  const items=[];
  for(const [category,q] of queries){
    const url=`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    try{
      const xml=await fetchText(url);
      for(const block of xml.match(/<item>[\s\S]*?<\/item>/gi)||[]){
        const source=strip(tag(block,'source'))||'Golf News',title=cleanTitle(tag(block,'title'),source),link=strip(tag(block,'link')),description=tag(block,'description'),publishedAt=tag(block,'pubDate');
        if(!title||!link||BLOCKED.test(title+' '+strip(description)))continue;
        items.push({type:'article',category,title,summary:summary(description),source,url:link,publishedAt:new Date(publishedAt||Date.now()).toISOString(),thumbnail:imageFrom(description)});
      }
    }catch(e){console.warn('News feed skipped:',category,e.message)}
  }
  return items;
}

async function youtubeItems(){
  const key=process.env.YOUTUBE_API_KEY;if(!key)return[];
  const publishedAfter=new Date(Date.now()-14*86400000).toISOString(),qs=['golf swing instruction tips','golf short game putting chipping tips','golf tips tricks'];
  const out=[];
  for(const q of qs){
    const params=new URLSearchParams({part:'snippet',type:'video',maxResults:'6',order:'date',q,publishedAfter,videoDuration:'short',videoEmbeddable:'true',relevanceLanguage:'en',topicId:'/m/037hz',key});
    try{
      const r=await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);if(!r.ok)throw new Error(`YouTube ${r.status}`);const data=await r.json();
      for(const item of data.items||[]){const id=item?.id?.videoId,s=item?.snippet;if(!id||!s||BLOCKED.test(s.title+' '+s.description))continue;out.push({type:'video',category:'Tips & Tricks',title:strip(s.title),summary:summary(s.description),source:strip(s.channelTitle)||'YouTube',url:`https://www.youtube.com/watch?v=${id}`,publishedAt:new Date(s.publishedAt).toISOString(),thumbnail:s.thumbnails?.high?.url||s.thumbnails?.medium?.url||''});}
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
console.log(`Golf Feed: ${result.items.length} items (${videos.length} new videos, ${news.length} trusted news candidates)`);