/*
 * Server-only MapTiler imagery provider for Tier-3 recovery.
 * This module fetches imagery; it does NOT infer golf geometry itself.
 * A separate vision observer must return confidence-scored observations.
 */
function requireKey(){
  const key=String(process.env.MAPTILER_API_KEY||'').trim();
  if(!key)throw new Error('MAPTILER_API_KEY is not configured');
  return key;
}
function staticMapUrl({lng,lat,zoom=18,width=1024,height=1024}){
  const key=requireKey();
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))throw new Error('valid map center required');
  const z=Math.min(20,Math.max(14,Number(zoom)||18));
  const w=Math.min(2048,Math.max(256,Number(width)||1024));
  const h=Math.min(2048,Math.max(256,Number(height)||1024));
  return `https://api.maptiler.com/maps/satellite/static/${Number(lng)},${Number(lat)},${z}/${w}x${h}.jpg?key=${encodeURIComponent(key)}`;
}
function createMapTilerImageryProvider({fetchImpl=globalThis.fetch,observer}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  if(!observer||typeof observer.observe!=='function')throw new Error('vision observer required');
  return {
    configured(){return Boolean(String(process.env.MAPTILER_API_KEY||'').trim());},
    async observeMissingHoles({course,missing_holes,authoritative_rows=[]}){
      requireKey();
      const lat=Number(course?.latitude??course?.lat),lng=Number(course?.longitude??course?.lng);
      const url=staticMapUrl({lat,lng});
      const response=await fetchImpl(url,{headers:{Accept:'image/jpeg'}});
      if(!response.ok)throw new Error(`MapTiler imagery request failed: ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      return observer.observe({
        image_bytes:bytes,
        imagery_source:'MapTiler satellite',
        course,
        missing_holes,
        authoritative_rows
      });
    }
  };
}
module.exports={requireKey,staticMapUrl,createMapTilerImageryProvider};
