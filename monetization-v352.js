/* ParFolio v352 — single-pass monetization render */
(function(){
  const VERSION='352';
  const DEFAULT_SETTINGS={
    ads_enabled:false,
    direct_sponsors_enabled:true,
    adsense_enabled:false,
    premium_remove_ads_enabled:false,
    gps_round_ads_enabled:false,
    adsense_client_id:null,
    adsense_slot_ids:{},
    slot_config:{
      home_banner:true,
      course_search:true,
      course_preview:true,
      scorecard:true,
      round_complete:true,
      play_screen:false
    }
  };
  let settings={...DEFAULT_SETTINGS};
  let campaigns=[];
  let loaded=false;
  let loading=false;
  let observer=null;

  const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{
    try{
      const url=new URL(String(value||''),location.href);
      return /^https?:$/.test(url.protocol)?url.href:'';
    }catch{return''}
  };
  const currentView=()=>typeof s!=='undefined'?String(s?.v||''):'';
  const isSuperAdmin=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const nowActive=campaign=>{
    const now=Date.now();
    const start=campaign.start_at?new Date(campaign.start_at).getTime():null;
    const end=campaign.end_at?new Date(campaign.end_at).getTime():null;
    return !!campaign.active&&(!start||start<=now)&&(!end||end>=now);
  };
  const slotEnabled=placement=>!!settings?.slot_config?.[placement];

  async function loadMonetization(force=false){
    if(loading||typeof db==='undefined')return;
    if(loaded&&!force){decorate();return}
    loading=true;
    try{
      const settingsRes=await db.from('monetization_settings').select('*').eq('id',1).maybeSingle();
      if(!settingsRes.error&&settingsRes.data){
        settings={...DEFAULT_SETTINGS,...settingsRes.data,slot_config:{...DEFAULT_SETTINGS.slot_config,...(settingsRes.data.slot_config||{})},adsense_slot_ids:settingsRes.data.adsense_slot_ids||{}};
      }
      const campaignsRes=await db.from('monetization_campaigns').select('*').order('priority',{ascending:true}).order('created_at',{ascending:false});
      if(!campaignsRes.error)campaigns=campaignsRes.data||[];
      loaded=true;
    }catch(error){
      console.warn('[ParFolio Monetization]',error?.message||error);
    }finally{
      loading=false;
      decorate();
    }
  }

  function eligibleCampaign(placement){
    if(!settings.ads_enabled||!settings.direct_sponsors_enabled||!slotEnabled(placement))return null;
    return campaigns.filter(c=>c.placement===placement&&nowActive(c)).sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100))[0]||null;
  }

  function sponsorMarkup(campaign,placement){
    const click=safeUrl(campaign.click_url);
    const image=safeUrl(campaign.image_url);
    const body=campaign.body?'<p>'+safe(campaign.body)+'</p>':'';
    const imageHtml=image?'<img class="pf-ad-image" src="'+safe(image)+'" alt="" loading="lazy">':'';
    const cta=click?'<a class="pf-ad-cta" href="'+safe(click)+'" target="_blank" rel="noopener sponsored">'+safe(campaign.cta_label||'Learn more')+'</a>':'';
    return '<section class="pf-ad-card pf-ad-'+safe(placement)+'" data-pf-campaign="'+safe(campaign.id)+'">'+
      '<div class="pf-ad-badge">SPONSORED</div>'+
      '<div class="pf-ad-content">'+imageHtml+
        '<div class="pf-ad-copy"><small>'+safe(campaign.sponsor_name)+'</small><strong>'+safe(campaign.headline)+'</strong>'+body+'</div>'+
        cta+
      '</div>'+
    '</section>';
  }

  function ensureAdsenseScript(){
    const client=String(settings.adsense_client_id||'').trim();
    if(!/^ca-pub-\d+$/.test(client))return false;
    if(document.querySelector('script[data-pf-adsense]'))return true;
    const script=document.createElement('script');
    script.async=true;
    script.crossOrigin='anonymous';
    script.dataset.pfAdsense='1';
    script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(client);
    document.head.appendChild(script);
    return true;
  }

  function adsenseMarkup(placement){
    if(!settings.ads_enabled||!settings.adsense_enabled||!slotEnabled(placement))return'';
    const client=String(settings.adsense_client_id||'').trim();
    const slot=String(settings.adsense_slot_ids?.[placement]||'').trim();
    if(!/^ca-pub-\d+$/.test(client)||!/^\d+$/.test(slot))return'';
    ensureAdsenseScript();
    return '<section class="pf-ad-card pf-ad-network" data-pf-adsense-slot="'+safe(placement)+'">'+
      '<div class="pf-ad-badge">ADVERTISEMENT</div>'+
      '<ins class="adsbygoogle" style="display:block" data-ad-client="'+safe(client)+'" data-ad-slot="'+safe(slot)+'" data-ad-format="auto" data-full-width-responsive="true"></ins>'+
    '</section>';
  }

  function hydrateAdsense(host){
    const ad=host?.querySelector('ins.adsbygoogle:not([data-pf-loaded])');
    if(!ad)return;
    ad.dataset.pfLoaded='1';
    try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(error){console.warn('[ParFolio AdSense]',error?.message||error)}
  }

  function slotMarkup(placement){
    const campaign=eligibleCampaign(placement);
    if(campaign)return sponsorMarkup(campaign,placement);
    return adsenseMarkup(placement);
  }

  function findExistingSlot(placement,target,mode){
    const selector='[data-pf-monetization-slot="'+placement+'"]';
    if(mode==='after'){
      const next=target?.nextElementSibling;
      if(next?.matches?.(selector))return next;
    }else if(mode==='before'){
      const prev=target?.previousElementSibling;
      if(prev?.matches?.(selector))return prev;
    }else{
      const inside=target?.querySelector?.(selector);
      if(inside)return inside;
    }
    return document.querySelector(selector);
  }

  function addSlot(placement,target,mode='append'){
    if(!target||findExistingSlot(placement,target,mode))return;
    const markup=slotMarkup(placement);
    if(!markup)return;
    const wrap=document.createElement('div');
    wrap.className='pf-monetization-slot';
    wrap.dataset.pfMonetizationSlot=placement;
    wrap.innerHTML=markup;
    if(mode==='after')target.insertAdjacentElement('afterend',wrap);
    else if(mode==='before')target.insertAdjacentElement('beforebegin',wrap);
    else target.appendChild(wrap);
    hydrateAdsense(wrap);
  }

  function clearSlots(){
    document.querySelectorAll('[data-pf-monetization-slot]').forEach(node=>node.remove());
  }

  let decoratingSlots=false;
  function removeUnexpectedSlots(allowed){
    document.querySelectorAll('[data-pf-monetization-slot]').forEach(node=>{
      if(!allowed.has(node.dataset.pfMonetizationSlot))node.remove();
    });
  }

  function decorateSlots(){
    if(!loaded||decoratingSlots)return;
    const appNode=document.getElementById('app');
    if(!appNode)return;

    decoratingSlots=true;
    try{
      if(!settings.ads_enabled){clearSlots();return}
      const view=currentView();
      const allowed=new Set();

      if(appNode.classList.contains('home-page')){
        const hero=appNode.querySelector('.home-hero');
        if(hero){allowed.add('home_banner');addSlot('home_banner',hero,'after')}
      }

      if(view==='coursesView'){
        allowed.add('course_search');
        addSlot('course_search',appNode,'append');
      }

      if(view==='setup'){
        const info=appNode.querySelector('.round-facility-info');
        if(info){allowed.add('course_preview');addSlot('course_preview',info,'after')}
      }

      if(view==='scorecard'){
        const placement=typeof s!=='undefined'&&s?.done?'round_complete':'scorecard';
        allowed.add(placement);
        addSlot(placement,appNode,'append');
      }else if(typeof s!=='undefined'&&s?.done){
        allowed.add('round_complete');
        addSlot('round_complete',appNode,'append');
      }

      removeUnexpectedSlots(allowed);

      /* Deliberately no in-round GPS placement.
         The live map stays protected. */
    }finally{
      decoratingSlots=false;
    }
  }

  function injectAdminEntry(){
    if(!isSuperAdmin())return;
    const settingsBox=document.querySelector('.pf-page-settings');
    if(!settingsBox||settingsBox.querySelector('[data-pf-monetization-admin]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.pfMonetizationAdmin='1';
    button.textContent='Monetization & Sponsors ›';
    button.onclick=()=>window.openMonetizationAdmin?.();
    const danger=settingsBox.querySelector('.danger');
    if(danger)settingsBox.insertBefore(button,danger);else settingsBox.appendChild(button);
  }

  function decorate(){
    decorateSlots();
    injectAdminEntry();
  }

  function toggleRow(key,label,detail,disabled=false){
    const on=!!settings[key];
    return '<button type="button" class="pf-monetization-toggle '+(on?'on':'')+'" data-key="'+safe(key)+'" '+(disabled?'disabled':'')+'>'+
      '<span><b>'+safe(label)+'</b><small>'+safe(detail)+'</small></span>'+
      '<i aria-hidden="true"></i>'+
    '</button>';
  }

  function slotRow(key,label,detail){
    const on=!!settings.slot_config?.[key];
    return '<button type="button" class="pf-monetization-slot-toggle '+(on?'on':'')+'" data-slot="'+safe(key)+'">'+
      '<span><b>'+safe(label)+'</b><small>'+safe(detail)+'</small></span><i aria-hidden="true"></i>'+
    '</button>';
  }


  const fmtDate=value=>{
    if(!value)return 'Not set';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString();
  };
  const targetLabel=c=>{
    const scope=String(c.target_scope||'nationwide').replaceAll('_',' ');
    const detail=String(c.target_details||c.region_code||c.country_code||'').trim();
    return scope.charAt(0).toUpperCase()+scope.slice(1)+(detail?' · '+detail:'');
  };
  function reviewMarkup(c){
    const ad=sponsorMarkup(c,c.placement);
    const click=safeUrl(c.click_url);
    const legal=c.legal_copy?'<div class="pf-campaign-review-legal"><b>Legal / required copy</b><p>'+safe(c.legal_copy)+'</p></div>':'';
    return '<div class="pf-campaign-review-overlay" role="dialog" aria-modal="true" aria-label="Campaign review">'+
      '<section class="pf-campaign-review-panel">'+
        '<header><div><small>FINAL CAMPAIGN REVIEW</small><h3>'+safe(c.sponsor_name)+'</h3><p>'+safe(c.headline)+'</p></div><button type="button" class="pf-campaign-review-close" aria-label="Close">×</button></header>'+
        '<div class="pf-campaign-review-body">'+
          '<div class="pf-campaign-review-preview"><small>EXACT AD PREVIEW</small>'+ad+'</div>'+
          '<div class="pf-campaign-review-meta">'+
            '<div><span>Placement</span><b>'+safe(c.placement.replaceAll('_',' '))+'</b></div>'+
            '<div><span>Status</span><b>'+(c.active?(nowActive(c)?'Live':'Scheduled'):'Inactive')+'</b></div>'+
            '<div><span>Starts</span><b>'+safe(fmtDate(c.start_at))+'</b></div>'+
            '<div><span>Ends</span><b>'+safe(fmtDate(c.end_at))+'</b></div>'+
            '<div><span>Targeting</span><b>'+safe(targetLabel(c))+'</b></div>'+
            '<div><span>Priority</span><b>'+safe(c.priority)+'</b></div>'+
          '</div>'+
          '<div class="pf-campaign-review-link"><span>Destination</span>'+(click?'<a href="'+safe(click)+'" target="_blank" rel="noopener">'+safe(click)+'</a>':'<b>No destination URL</b>')+'</div>'+
          legal+
          '<div class="pf-campaign-review-safety"><span>🔒</span><p>Live GPS / hole view remains protected from advertising.</p></div>'+
        '</div>'+
        '<footer><button type="button" class="secondary pf-campaign-review-cancel">Close</button>'+
          (c.active?'<button type="button" class="danger" data-review-pause>Pause Campaign</button>':'<button type="button" class="primary" data-review-activate>Activate Campaign</button>')+
        '</footer>'+
      '</section>'+
    '</div>';
  }
  function openCampaignReview(id){
    const c=campaigns.find(x=>x.id===id);if(!c)return;
    document.querySelector('.pf-campaign-review-overlay')?.remove();
    const host=document.createElement('div');host.innerHTML=reviewMarkup(c);
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-campaign-review-close').onclick=close;
    overlay.querySelector('.pf-campaign-review-cancel').onclick=close;
    overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
    const activate=overlay.querySelector('[data-review-activate]');
    if(activate)activate.onclick=async()=>{
      activate.disabled=true;activate.textContent='Activating…';
      await toggleCampaign(c.id,true,{skipReview:true});
      close();
    };
    const pause=overlay.querySelector('[data-review-pause]');
    if(pause)pause.onclick=async()=>{
      pause.disabled=true;pause.textContent='Pausing…';
      await toggleCampaign(c.id,false,{skipReview:true});
      close();
    };
  }

  function campaignRow(c){
    const live=nowActive(c);
    return '<article class="pf-campaign-row">'+
      '<div><small>'+safe(c.placement.replaceAll('_',' ').toUpperCase())+'</small><b>'+safe(c.sponsor_name)+' · '+safe(c.headline)+'</b><span>'+(c.active?(live?'LIVE':'SCHEDULED'):'OFF')+' · '+safe(targetLabel(c))+' · Priority '+safe(c.priority)+'</span></div>'+
      '<div class="pf-campaign-actions">'+
        '<button type="button" data-review-campaign="'+safe(c.id)+'">Review</button>'+
        '<button type="button" data-toggle-campaign="'+safe(c.id)+'" data-active="'+(c.active?'1':'0')+'">'+(c.active?'Pause':'Activate')+'</button>'+
        '<button type="button" class="danger" data-delete-campaign="'+safe(c.id)+'">Delete</button>'+
      '</div>'+
    '</article>';
  }

  function adminMarkup(){
    const adsenseReady=/^ca-pub-\d+$/.test(String(settings.adsense_client_id||'').trim());
    return '<div class="pf-monetization-overlay" role="dialog" aria-modal="true" aria-label="ParFolio Monetization">'+
      '<section class="pf-monetization-panel">'+
        '<header><div><small>PARFOLIO BUSINESS</small><h2>Monetization</h2><p>Direct sponsors first. AdSense is ready when approved. Live GPS stays ad-free in this version.</p></div><button type="button" class="pf-mon-close" aria-label="Close">×</button></header>'+
        '<div class="pf-mon-status '+(settings.ads_enabled?'live':'off')+'"><span></span><b>'+(settings.ads_enabled?'Advertising is ON':'Advertising is OFF')+'</b><small>'+(settings.ads_enabled?'Eligible placements can display campaigns.':'Golfers currently see no ads.')+'</small></div>'+
        '<section class="pf-mon-section"><h3>Master Controls</h3>'+
          toggleRow('ads_enabled','Advertising','Master switch for every monetization placement.')+
          toggleRow('direct_sponsors_enabled','Direct Sponsors','Prioritize your own golf-industry campaigns.')+
          toggleRow('adsense_enabled','Google AdSense',adsenseReady?'Enabled only where a valid slot ID exists.':'Add your approved ca-pub ID before enabling.',!adsenseReady)+
          toggleRow('premium_remove_ads_enabled','Premium Removes Ads','Reserved for the future paid tier.')+
        '</section>'+
        '<section class="pf-mon-section"><div class="pf-mon-section-head"><h3>Ad Placements</h3><small>Protected by design</small></div>'+
          slotRow('home_banner','Home','Premium sponsor card below the hero.')+
          slotRow('course_search','Course Search','Sponsor placement after the course browsing experience.')+
          slotRow('course_preview','Course Preview','Sponsor card after facility information.')+
          slotRow('scorecard','Scorecard','Sponsor card below the scorecard.')+
          slotRow('round_complete','Round Complete','Highest-value post-round placement.')+
          '<div class="pf-mon-locked"><span>🔒</span><div><b>Live GPS / Hole Screen</b><small>No ads are injected into the playing map in v333.</small></div></div>'+
        '</section>'+
        '<section class="pf-mon-section"><div class="pf-mon-section-head"><div><h3>Direct Sponsors</h3><small>'+campaigns.length+' campaign'+(campaigns.length===1?'':'s')+'</small></div><button type="button" class="pf-mon-add">＋ Add Sponsor</button></div>'+
          '<div class="pf-campaign-list">'+(campaigns.length?campaigns.map(campaignRow).join(''):'<div class="pf-mon-empty">No sponsor campaigns yet.</div>')+'</div>'+
        '</section>'+
        '<section class="pf-mon-section"><h3>AdSense Setup</h3>'+
          '<label>Publisher ID<input id="pfAdsenseClient" placeholder="ca-pub-1234567890123456" value="'+safe(settings.adsense_client_id||'')+'"></label>'+
          '<p class="pf-mon-help">Leave this blank until ParFolio is approved by Google. Slot IDs can be added later without changing the golf UI.</p>'+
          '<button type="button" class="pf-mon-save-adsense">Save AdSense ID</button>'+
        '</section>'+
      '</section>'+
    '</div>';
  }

  function openAdmin(){
    if(!isSuperAdmin())return;
    document.querySelector('.pf-monetization-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML=adminMarkup();
    const overlay=host.firstElementChild;
    document.body.appendChild(overlay);
    overlay.querySelector('.pf-mon-close').onclick=()=>overlay.remove();
    overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove()});
    overlay.querySelectorAll('.pf-monetization-toggle[data-key]').forEach(button=>button.onclick=()=>updateSetting(button.dataset.key,!settings[button.dataset.key]));
    overlay.querySelectorAll('.pf-monetization-slot-toggle[data-slot]').forEach(button=>button.onclick=()=>updateSlot(button.dataset.slot,!settings.slot_config?.[button.dataset.slot]));
    overlay.querySelector('.pf-mon-add').onclick=()=>openSponsorForm();
    overlay.querySelector('.pf-mon-save-adsense').onclick=()=>{
      const value=overlay.querySelector('#pfAdsenseClient').value.trim();
      if(value&&!/^ca-pub-\d+$/.test(value)){alert('Use a valid Google AdSense publisher ID beginning with ca-pub-.');return}
      updateSetting('adsense_client_id',value||null);
    };
    overlay.querySelectorAll('[data-review-campaign]').forEach(button=>button.onclick=()=>openCampaignReview(button.dataset.reviewCampaign));
    overlay.querySelectorAll('[data-toggle-campaign]').forEach(button=>button.onclick=()=>toggleCampaign(button.dataset.toggleCampaign,button.dataset.active!=='1'));
    overlay.querySelectorAll('[data-delete-campaign]').forEach(button=>button.onclick=()=>deleteCampaign(button.dataset.deleteCampaign));
  }

  async function updateSetting(key,value){
    if(!isSuperAdmin())return;
    const patch={[key]:value,updated_at:new Date().toISOString(),updated_by:typeof currentUser!=='undefined'?currentUser?.id:null};
    const {error}=await db.from('monetization_settings').update(patch).eq('id',1);
    if(error){alert('Could not save monetization setting: '+error.message);return}
    settings={...settings,...patch};
    await loadMonetization(true);
    openAdmin();
  }

  async function updateSlot(slot,value){
    if(!isSuperAdmin())return;
    const slot_config={...settings.slot_config,[slot]:value};
    const {error}=await db.from('monetization_settings').update({slot_config,updated_at:new Date().toISOString(),updated_by:typeof currentUser!=='undefined'?currentUser?.id:null}).eq('id',1);
    if(error){alert('Could not save placement: '+error.message);return}
    settings={...settings,slot_config};
    await loadMonetization(true);
    openAdmin();
  }

  function openSponsorForm(){
    const existing=document.querySelector('.pf-sponsor-form-overlay');
    existing?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-sponsor-form-overlay" role="dialog" aria-modal="true">'+
      '<form class="pf-sponsor-form"><header><div><small>DIRECT SPONSOR</small><h3>New Campaign</h3></div><button type="button" class="pf-sponsor-close">×</button></header>'+
      '<label>Sponsor Name<input name="sponsor_name" required maxlength="120" placeholder="Example: Local Golf Shop"></label>'+
      '<label>Placement<select name="placement"><option value="round_complete">Round Complete</option><option value="home_banner">Home</option><option value="course_search">Course Search</option><option value="course_preview">Course Preview</option><option value="scorecard">Scorecard</option></select></label>'+
      '<label>Headline<input name="headline" required maxlength="160" placeholder="Save 15% on your next fitting"></label>'+
      '<label>Message<textarea name="body" maxlength="400" rows="3" placeholder="Optional short sponsor message"></textarea></label>'+
      '<label>CTA Label<input name="cta_label" maxlength="50" value="Learn more"></label>'+
      '<label>Click URL<input name="click_url" type="url" placeholder="https://..."></label>'+
      '<label>Image URL<input name="image_url" type="url" placeholder="https://... (optional)"></label>'+
      '<label>Priority<input name="priority" type="number" min="1" max="9999" value="100"><small>Lower number = higher priority.</small></label>'+
      '<label class="pf-sponsor-check"><input name="active" type="checkbox"> <span>Activate immediately</span></label>'+
      '<div class="pf-sponsor-actions"><button type="button" class="secondary pf-sponsor-cancel">Cancel</button><button type="submit" class="primary">Save Campaign</button></div>'+
      '</form></div>';
    const overlay=host.firstElementChild;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-sponsor-close').onclick=close;
    overlay.querySelector('.pf-sponsor-cancel').onclick=close;
    overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
    overlay.querySelector('form').onsubmit=async event=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget);
      const click=String(form.get('click_url')||'').trim();
      const image=String(form.get('image_url')||'').trim();
      if(click&&!safeUrl(click)){alert('Use a valid https:// or http:// click URL.');return}
      if(image&&!safeUrl(image)){alert('Use a valid https:// or http:// image URL.');return}
      const payload={
        name:String(form.get('sponsor_name')||'').trim()+' · '+new Date().toLocaleDateString(),
        sponsor_name:String(form.get('sponsor_name')||'').trim(),
        placement:String(form.get('placement')||'round_complete'),
        headline:String(form.get('headline')||'').trim(),
        body:String(form.get('body')||'').trim()||null,
        cta_label:String(form.get('cta_label')||'Learn more').trim()||'Learn more',
        click_url:click||null,
        image_url:image||null,
        priority:Number(form.get('priority'))||100,
        active:form.get('active')==='on',
        created_by:typeof currentUser!=='undefined'?currentUser?.id:null
      };
      const submit=event.currentTarget.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Saving…';
      const {error}=await db.from('monetization_campaigns').insert(payload);
      if(error){submit.disabled=false;submit.textContent='Save Campaign';alert('Could not save sponsor: '+error.message);return}
      close();await loadMonetization(true);openAdmin();
    };
  }

  async function toggleCampaign(id,active,options={}){
    if(active&&!options.skipReview){
      openCampaignReview(id);
      return;
    }
    const {error}=await db.from('monetization_campaigns').update({active,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){alert('Could not update campaign: '+error.message);return}
    await loadMonetization(true);openAdmin();
  }

  async function deleteCampaign(id){
    if(!confirm('Delete this sponsor campaign?'))return;
    const {error}=await db.from('monetization_campaigns').delete().eq('id',id);
    if(error){alert('Could not delete campaign: '+error.message);return}
    await loadMonetization(true);openAdmin();
  }

  window.openMonetizationAdmin=openAdmin;
  window.openParFolioCampaignReview=openCampaignReview;
  window.refreshParFolioMonetization=()=>loadMonetization(true);
  window.parFolioMonetizationState=()=>({settings:{...settings},campaigns:[...campaigns],version:VERSION});

  const existingRender=typeof render==='function'?render:null;
  if(existingRender){
    render=function(){
      const result=existingRender.apply(this,arguments);
      decorate();
      return result;
    };
  }

  /* v352: no monetization MutationObserver.
     App view changes already flow through render(); observing #app caused
     a second decoration pass and visible post-paint ad insertion. */
  setTimeout(async()=>{
    await loadMonetization();
    decorate();
  },0);
})();