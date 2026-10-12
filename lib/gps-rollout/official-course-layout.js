/* Bounded public-source retrieval. Only operator-configured HTTPS origins. */
const {createHash}=require('node:crypto');
const MAX_BYTES=4*1024*1024;
async function readBounded(response){
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('source_too_large');
  const reader=response.body.getReader();const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw new Error('source_too_large');chunks.push(Buffer.from(value));}}
  finally{await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}
async function lookupOfficialLayout({pageUrl,fetchImpl=globalThis.fetch}={}){
  const sources=[];const assets=[];
  if(!pageUrl)return {status:'not_configured',sources,assets};
  const page=new URL(pageUrl);
  if(page.protocol!=='https:'||page.username||page.password)throw new Error('invalid_configured_source');
  const deadline=AbortSignal.timeout(10000);
  async function retrieve(url){
    const record={url,retrieved_at:new Date().toISOString()};sources.push(record);
    try{
      const response=await fetchImpl(url,{redirect:'error',signal:deadline,headers:{Accept:'text/html,image/jpeg,image/png,application/pdf','User-Agent':'ParFolio-GPS-Recovery/1.0'}});
      record.http_status=response.status;
      if(!response.ok){record.status='http_error';return null;}
      record.mime_type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      const bytes=await readBounded(response);record.sha256=createHash('sha256').update(bytes).digest('hex');record.bytes=bytes.length;record.status='retrieved';
      return {bytes,mime_type:record.mime_type,source_url:url};
    }catch(e){record.status=e.message==='source_too_large'?'too_large':'fetch_failed';return null;}
  }
  const html=await retrieve(page.href);
  if(!html)return {status:'requires_source_review',sources,assets};
  if(html.mime_type!=='text/html')return {status:'requires_source_review',sources,assets};
  const candidates=[];
  for(const match of html.bytes.toString('utf8').matchAll(/<(?:a|img)\b[^>]*>/gi)){
    const tag=match[0];if(!/(?:layout|routing|score.?card|course.?map|course.?tour|hole[ _-]?\d)/i.test(tag))continue;
    for(const attr of tag.matchAll(/\b(?:href|src|data-src)\s*=\s*["']([^"']+)["']/gi)){
      try{const url=new URL(attr[1].replace(/&amp;/g,'&'),page);if(url.origin!==page.origin||url.username||url.password)continue;
        if(/\.(?:jpe?g|png|pdf)$/i.test(url.pathname)&&!candidates.includes(url.href))candidates.push(url.href);
      }catch{}
    }
  }
  for(const url of candidates.slice(0,3)){
    const asset=await retrieve(url);if(!asset)continue;
    if(['image/jpeg','image/png'].includes(asset.mime_type))assets.push(asset);
    else sources[sources.length-1].status=asset.mime_type==='application/pdf'?'pdf_requires_review':'unsupported_type';
  }
  return {status:assets.length?'candidate_layouts_retrieved':'requires_source_review',sources,assets};
}
module.exports={lookupOfficialLayout};
