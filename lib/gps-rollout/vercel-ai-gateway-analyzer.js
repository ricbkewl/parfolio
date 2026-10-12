/*
 * Vercel AI Gateway multimodal implementation.
 * Server-only. Uses AI_GATEWAY_API_KEY because direct REST OIDC auth is not
 * documented; AI SDK OIDC can replace this if/when this repo gains packages.
 */
function extractJson(text){
  const s=String(text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  return JSON.parse(s);
}
function createGatewayAnalyzeImage({fetchImpl=globalThis.fetch,settings=process.env}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  return async ({system_instructions,image_bytes,layout_assets=[],context,response_contract})=>{
    const key=String(settings.AI_GATEWAY_API_KEY||'').trim();
    if(!key)throw new Error('AI_GATEWAY_API_KEY is not configured');
    const model=String(settings.PARFOLIO_VISION_MODEL||'').trim();
    if(!model)throw new Error('PARFOLIO_VISION_MODEL is not configured');
    const prompt=system_instructions+' Return JSON only matching this contract: '+JSON.stringify(response_contract)+'. Context: '+JSON.stringify(context);
    const response=await fetchImpl('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({model,stream:false,max_tokens:8192,messages:[{role:'user',content:[
        {type:'text',text:prompt},
        {type:'text',text:'Georeferenced aerial image:'},
        {type:'image_url',image_url:{url:'data:image/jpeg;base64,'+image_bytes.toString('base64'),detail:'auto'}},
        ...layout_assets.flatMap(asset=>[
          {type:'text',text:'Candidate official layout reference (not georeferenced): '+asset.source_url},
          asset.mime_type==='application/pdf'
            ?{type:'file',file:{filename:'official-course-reference.pdf',file_data:'data:application/pdf;base64,'+asset.bytes.toString('base64')}}
            :{type:'image_url',image_url:{url:'data:'+asset.mime_type+';base64,'+asset.bytes.toString('base64'),detail:'auto'}}
        ])
      ]}]})
    });
    if(!response.ok){
      const error=new Error('AI Gateway request failed');error.code='AI_GATEWAY_HTTP_ERROR';error.status=response.status;
      // Expose only recognized machine codes, never raw provider text/headers.
      const known=new Set(['access_denied','invalid_api_key','authentication_error','insufficient_credits','insufficient_quota','model_not_available_on_plan','model_not_found','permission_denied','rate_limit_exceeded']);
      try{const body=await response.json();const code=body?.error?.code||body?.error?.type;if(known.has(code))error.gatewayReason=code;}catch{}
      throw error;
    }
    const json=await response.json();
    return extractJson(json?.choices?.[0]?.message?.content);
  };
}
module.exports={extractJson,createGatewayAnalyzeImage};
