/*
 * Vercel AI Gateway multimodal implementation.
 * Server-only. Uses AI_GATEWAY_API_KEY because direct REST OIDC auth is not
 * documented; AI SDK OIDC can replace this if/when this repo gains packages.
 */
function extractJson(text){
  const s=String(text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  return JSON.parse(s);
}
function createGatewayAnalyzeImage({fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  return async ({system_instructions,image_bytes,context,response_contract})=>{
    const key=String(process.env.AI_GATEWAY_API_KEY||'').trim();
    if(!key)throw new Error('AI_GATEWAY_API_KEY is not configured');
    const model=String(process.env.PARFOLIO_VISION_MODEL||'anthropic/claude-opus-5').trim();
    const prompt=system_instructions+' Return JSON only matching this contract: '+JSON.stringify(response_contract)+'. Context: '+JSON.stringify(context);
    const response=await fetchImpl('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({model,stream:false,messages:[{role:'user',content:[
        {type:'text',text:prompt},
        {type:'image_url',image_url:{url:'data:image/jpeg;base64,'+image_bytes.toString('base64'),detail:'auto'}}
      ]}]})
    });
    if(!response.ok)throw new Error('AI Gateway request failed: '+response.status);
    const json=await response.json();
    return extractJson(json?.choices?.[0]?.message?.content);
  };
}
module.exports={extractJson,createGatewayAnalyzeImage};
