/*
 * Server-only USGS National Map orthoimagery provider for U.S. Tier-3 recovery.
 * Uses public USGS/USDA imagery services; no API key required.
 * This module fetches imagery only and performs no inference or persistence.
 */
const ENDPOINT='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage';

function validCoord(value,max){return Number.isFinite(Number(value))&&Math.abs(Number(value))<=max;}

function exportUrl({lng,lat,width=2048,height=2048,spanDegrees=0.028}){
  if(!validCoord(lat,90)||!validCoord(lng,180))throw new Error('valid map center required');
  const w=Math.min(4096,Math.max(512,Number(width)||2048));
  const h=Math.min(4096,Math.max(512,Number(height)||2048));
  const span=Math.min(0.08,Math.max(0.008,Number(spanDegrees)||0.028));
  const half=span/2;
  const bbox=[Number(lng)-half,Number(lat)-half,Number(lng)+half,Number(lat)+half].join(',');
  const qs=new URLSearchParams({
    bbox,
    bboxSR:'4326',
    imageSR:'4326',
    size:`${w},${h}`,
    format:'jpg',
    interpolation:'RSP_BilinearInterpolation',
    compressionQuality:'90',
    f:'image'
  });
  return `${ENDPOINT}?${qs}`;
}

function createUsgsImageryProvider({fetchImpl=globalThis.fetch,observer}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  if(!observer||typeof observer.observe!=='function')throw new Error('vision observer required');
  return {
    configured(){return true;},
    async observeMissingHoles({course,missing_holes,authoritative_rows=[]}){
      const lat=Number(course?.latitude??course?.lat),lng=Number(course?.longitude??course?.lng);
      const url=exportUrl({lat,lng});
      const response=await fetchImpl(url,{headers:{Accept:'image/jpeg,image/*'},redirect:'error'});
      if(!response.ok){const e=new Error(`USGS imagery request failed: ${response.status}`);e.code='USGS_IMAGERY_HTTP_ERROR';e.status=response.status;throw e;}
      const type=String(response.headers.get('content-type')||'').toLowerCase();
      if(!type.includes('image')){const e=new Error('USGS imagery response was not an image');e.code='USGS_IMAGERY_INVALID_RESPONSE';throw e;}
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<10000){const e=new Error('USGS imagery response was unexpectedly small');e.code='USGS_IMAGERY_INVALID_RESPONSE';throw e;}
      return observer.observe({
        image_bytes:bytes,
        imagery_source:'USGS National Map / NAIP',
        course,
        missing_holes,
        authoritative_rows
      });
    }
  };
}
module.exports={ENDPOINT,exportUrl,createUsgsImageryProvider};
