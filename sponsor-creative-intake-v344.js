/* ParFolio v344 — Sponsor Creative Intake + external approval */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let orders=[], intakes=[];

  async function load(){
    if(!isSuper()||typeof db==='undefined') return;
    const [o,i]=await Promise.all([
      db.from('sponsor_orders').select('*').order('created_at',{ascending:false}).limit(500),
      db.from('sponsor_creative_intakes').select('*').order('updated_at',{ascending:false}).limit(500)
    ]);
    if(o.error) throw o.error;
    if(i.error) throw i.error;
    orders=o.data||[]; intakes=i.data||[];
  }

  function missing(x){
    const m=[];
    if(!x.logo_url)m.push('Logo');
    if(!x.primary_image_url)m.push('Main image');
    if(!x.headline)m.push('Headline');
    if(!x.body_copy)m.push('Body copy');
    if(!x.cta_label)m.push('CTA');
    if(!x.destination_url)m.push('Destination URL');
    if(!x.campaign_start)m.push('Start date');
    if(!x.campaign_end)m.push('End date');
    if(!x.approval_contact_email)m.push('Approval contact');
    return m;
  }

  function inject(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-creative-intake]'))return;
    const s=document.createElement('section');
    s.className='pf-mon-section';
    s.dataset.pfCreativeIntake='1';
    s.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Creative Intake</h3><small>Assets · copy · targeting · approval</small></div><button type="button" class="pf-mon-add">Open Intake</button></div>';
    s.querySelector('button').onclick=openDashboard;
    panel.appendChild(s);
  }

  function badge(status){
    return '<span class="pf-ci-badge s-'+esc(status)+'">'+esc(status.replaceAll('_',' '))+'</span>';
  }

  function card(x){
    const m=missing(x);
    return '<article class="pf-ci-card"><div><div class="pf-ci-title"><b>'+esc(x.company_name)+'</b>'+badge(x.status)+'</div>'+
      '<small>'+esc(x.sponsor_name||'')+(x.order_id?' · linked order':'')+'</small>'+
      '<p>'+(m.length?m.length+' missing: '+esc(m.slice(0,4).join(', '))+(m.length>4?'…':''):'Creative package complete')+'</p></div>'+
      '<button type="button" data-ci-open="'+esc(x.id)+'">Open</button></article>';
  }

  async function openDashboard(){
    try{await load()}catch(e){alert('Could not load creative intake: '+e.message);return}
    document.querySelector('.pf-ci-overlay')?.remove();
    const host=document.createElement('div');
    const eligible=orders.filter(o=>['won','paid','active','accepted','payment_pending'].includes(o.status));
    host.innerHTML='<div class="pf-ci-overlay"><section class="pf-ci-panel"><header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Creative Intake</h2><p>Collect everything needed before a campaign goes live.</p></div><button type="button" class="pf-ci-close">×</button></header>'+
      '<div class="pf-ci-summary"><div><small>Total</small><b>'+intakes.length+'</b></div><div><small>Waiting</small><b>'+intakes.filter(x=>['draft','awaiting_assets'].includes(x.status)).length+'</b></div><div><small>Ready</small><b>'+intakes.filter(x=>x.status==='ready_for_review').length+'</b></div><div><small>Approved</small><b>'+intakes.filter(x=>x.status==='approved').length+'</b></div></div>'+
      '<section class="pf-ci-create"><h3>Start from Sponsor Order</h3><div class="pf-ci-create-row"><select data-ci-order><option value="">Choose an eligible order…</option>'+eligible.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.company_name||o.sponsor_name||o.order_number)+' · '+esc(o.status)+'</option>').join('')+'</select><button type="button" data-ci-create>Create Intake</button></div></section>'+
      '<section><div class="pf-ci-head"><h3>Creative Packages</h3><button type="button" data-ci-refresh>Refresh</button></div><div class="pf-ci-list">'+(intakes.length?intakes.map(card).join(''):'<div class="pf-ci-empty">No creative intakes yet.</div>')+'</div></section>'+
    '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('.pf-ci-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('[data-ci-refresh]').onclick=()=>{close();openDashboard()};
    o.querySelector('[data-ci-create]').onclick=async()=>{
      const id=o.querySelector('[data-ci-order]').value;
      if(!id){alert('Choose a sponsor order first.');return}
      const order=orders.find(x=>x.id===id); if(!order)return;
      if(intakes.some(x=>x.order_id===id)){alert('This order already has a creative intake.');return}
      const payload={
        order_id:order.id,
        inquiry_id:order.inquiry_id||null,
        company_name:order.company_name||order.sponsor_name||'Sponsor',
        sponsor_name:order.company_name||order.sponsor_name||null,
        campaign_start:order.campaign_start||null,
        campaign_end:order.campaign_end||null,
        preferred_placements:[],
        status:'awaiting_assets',
        missing_items:['Logo','Main image','Headline','Body copy','CTA','Destination URL','Approval contact'],
        created_by:typeof currentUser!=='undefined'?currentUser?.id:null
      };
      const {error}=await db.from('sponsor_creative_intakes').insert(payload);
      if(error){alert('Could not create intake: '+error.message);return}
      close();openDashboard();
    };
    o.querySelectorAll('[data-ci-open]').forEach(btn=>btn.onclick=()=>openEditor(btn.dataset.ciOpen));
  }

  function placementChecks(selected){
    const all=['home_banner','course_search','course_preview','scorecard','round_complete'];
    return all.map(p=>'<label class="pf-ci-check"><input type="checkbox" name="placement" value="'+p+'" '+((selected||[]).includes(p)?'checked':'')+'><span>'+p.replaceAll('_',' ')+'</span></label>').join('');
  }



  const APPROVAL_FN='https://unsysuuhykdmbsasdhzg.supabase.co/functions/v1/sponsor-creative-approval';
  const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function sha256Hex(value){
    const data=new TextEncoder().encode(value);
    const hash=await crypto.subtle.digest('SHA-256',data);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function createSponsorApprovalLink(x){
    const p=missing(x);
    if(p.length){alert('Complete the creative package before sending it for sponsor approval. Missing: '+p.join(', '));return null}
    if(!['ready_for_review','approved'].includes(x.status)){
      alert('Mark the creative Ready for Review before generating a sponsor approval link.');
      return null;
    }
    const token=b64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash=await sha256Hex(token);
    const now=new Date();
    const expires=new Date(now.getTime()+7*24*60*60*1000).toISOString();

    await db.from('sponsor_creative_approval_links')
      .update({status:'revoked'})
      .eq('creative_intake_id',x.id)
      .eq('status','pending');

    const {error}=await db.from('sponsor_creative_approval_links').insert({
      creative_intake_id:x.id,
      token_hash:tokenHash,
      expires_at:expires,
      status:'pending',
      sponsor_email:x.approval_contact_email||null,
      created_by:typeof currentUser!=='undefined'?currentUser?.id:null
    });
    if(error){alert('Could not create sponsor approval link: '+error.message);return null}

    const stamp=new Date().toISOString();
    const {error:uerr}=await db.from('sponsor_creative_intakes').update({
      sponsor_approval_status:'pending',
      sponsor_approved_at:null,
      sponsor_feedback:null,
      updated_at:stamp
    }).eq('id',x.id);
    if(uerr){alert('Approval link was created, but the intake status could not be updated: '+uerr.message)}

    x.sponsor_approval_status='pending';
    x.sponsor_approved_at=null;
    x.sponsor_feedback=null;
    return APPROVAL_FN+'?token='+encodeURIComponent(token);
  }
  function sponsorApprovalBox(x){
    const status=String(x.sponsor_approval_status||'not_sent');
    const label={not_sent:'Not sent',pending:'Awaiting sponsor',approved:'Sponsor approved',changes_requested:'Changes requested'}[status]||status;
    const feedback=x.sponsor_feedback?'<p><b>Sponsor note:</b> '+esc(x.sponsor_feedback)+'</p>':'';
    const date=x.sponsor_approved_at?'<small>Approved '+esc(new Date(x.sponsor_approved_at).toLocaleString())+'</small>':'';
    return '<section class="pf-ci-sponsor-approval s-'+esc(status)+'"><div><small>SPONSOR APPROVAL</small><b>'+esc(label)+'</b>'+date+feedback+'</div><button type="button" data-ci-sponsor-link>'+(status==='pending'?'Generate New Link':'Generate Approval Link')+'</button></section>';
  }
  function showApprovalLink(url){
    document.querySelector('.pf-ci-link-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-ci-link-overlay"><section class="pf-ci-link-card"><small>SPONSOR REVIEW LINK</small><h3>Creative approval link created</h3><p>Send this secure link to the sponsor. It expires in 7 days and can be used once.</p><textarea readonly>'+esc(url)+'</textarea><div><button type="button" class="secondary" data-link-close>Close</button><button type="button" class="primary" data-link-copy>Copy Link</button></div></section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('[data-link-close]').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('[data-link-copy]').onclick=async e=>{
      try{await navigator.clipboard.writeText(url);e.currentTarget.textContent='Copied ✓'}catch{alert('Copy this link manually:\n'+url)}
    };
  }

  function campaignTargetFields(x){
    const scope=String(x.target_scope||'nationwide');
    const details=String(x.target_details||'').trim();
    let country_code='US', region_code=null;
    if(scope==='state'&&/^[A-Za-z]{2}$/.test(details)) region_code=details.toUpperCase();
    return {country_code,region_code,target_scope:scope,target_details:details||null};
  }

  async function createCampaignsFromIntake(x){
    if(!isSuper())return false;
    if(x.status!=='approved'){
      alert('Approve the creative package before creating campaigns.');
      return false;
    }
    const existing=Array.isArray(x.generated_campaign_ids)?x.generated_campaign_ids.filter(Boolean):[];
    if(existing.length){
      alert(existing.length+' campaign'+(existing.length===1?' has':'s have')+' already been created from this intake. Opening Monetization for review.');
      window.openMonetizationAdmin?.();
      return false;
    }
    const allowed=['home_banner','course_search','course_preview','scorecard','round_complete'];
    const placements=(Array.isArray(x.preferred_placements)?x.preferred_placements:[]).filter(p=>allowed.includes(p));
    if(!placements.length){
      alert('Choose at least one approved placement before creating campaigns.');
      return false;
    }
    const m=missing(x);
    if(m.length){
      alert('Campaigns cannot be created yet. Missing: '+m.join(', '));
      return false;
    }

    const target=campaignTargetFields(x);
    const start=x.campaign_start?new Date(x.campaign_start+'T00:00:00').toISOString():null;
    const end=x.campaign_end?new Date(x.campaign_end+'T23:59:59').toISOString():null;
    const clickUrl=x.tracking_url||x.destination_url||null;
    const imageUrl=x.primary_image_url||x.square_image_url||x.logo_url||null;
    const sponsor=x.sponsor_name||x.company_name;
    const createdBy=typeof currentUser!=='undefined'?currentUser?.id:null;

    const rows=placements.map(placement=>({
      name:sponsor+' · '+placement.replaceAll('_',' ')+' · '+(x.campaign_start||new Date().toISOString().slice(0,10)),
      sponsor_name:sponsor,
      placement,
      headline:x.headline,
      body:x.body_copy||null,
      image_url:imageUrl,
      click_url:clickUrl,
      cta_label:x.cta_label||'Learn more',
      active:false,
      priority:100,
      start_at:start,
      end_at:end,
      country_code:target.country_code,
      region_code:target.region_code,
      target_scope:target.target_scope,
      target_details:target.target_details,
      legal_copy:x.legal_copy||null,
      creative_intake_id:x.id,
      sponsor_order_id:x.order_id||null,
      created_by:createdBy,
      updated_at:new Date().toISOString()
    }));

    const {data,error}=await db.from('monetization_campaigns').insert(rows).select('id,placement');
    if(error){
      alert('Could not create sponsor campaigns: '+error.message);
      return false;
    }

    const ids=(data||[]).map(r=>r.id);
    const stamp=new Date().toISOString();
    const {error:linkError}=await db.from('sponsor_creative_intakes').update({
      generated_campaign_ids:ids,
      campaign_created_at:stamp,
      updated_at:stamp
    }).eq('id',x.id);
    if(linkError){
      alert('Campaigns were created, but the intake link could not be saved: '+linkError.message);
      return false;
    }

    x.generated_campaign_ids=ids;
    x.campaign_created_at=stamp;
    await window.refreshParFolioMonetization?.();
    alert(ids.length+' inactive campaign'+(ids.length===1?' was':'s were')+' created. Review them in Monetization, then activate when ready.');
    return true;
  }

  function openEditor(id){
    const x=intakes.find(v=>v.id===id);if(!x)return;
    document.querySelector('.pf-ci-editor-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-ci-editor-overlay"><form class="pf-ci-editor"><header><div><small>CREATIVE INTAKE</small><h3>'+esc(x.company_name)+'</h3></div><button type="button" class="pf-ci-editor-close">×</button></header>'+
      '<div class="pf-ci-grid"><label>Company<input name="company_name" value="'+esc(x.company_name)+'" required></label><label>Sponsor display name<input name="sponsor_name" value="'+esc(x.sponsor_name||'')+'"></label></div>'+
      '<div class="pf-ci-grid"><label>Logo URL<input name="logo_url" type="url" value="'+esc(x.logo_url||'')+'"></label><label>Main image URL<input name="primary_image_url" type="url" value="'+esc(x.primary_image_url||'')+'"></label></div>'+
      '<label>Square image URL<input name="square_image_url" type="url" value="'+esc(x.square_image_url||'')+'"></label>'+
      '<label>Headline<input name="headline" value="'+esc(x.headline||'')+'" maxlength="90"></label>'+
      '<label>Body copy<textarea name="body_copy" rows="3">'+esc(x.body_copy||'')+'</textarea></label>'+
      '<div class="pf-ci-grid"><label>CTA label<input name="cta_label" value="'+esc(x.cta_label||'')+'" placeholder="Learn More"></label><label>Destination URL<input name="destination_url" type="url" value="'+esc(x.destination_url||'')+'"></label></div>'+
      '<div class="pf-ci-grid"><label>Promo code<input name="promo_code" value="'+esc(x.promo_code||'')+'"></label><label>Promo expires<input name="promo_expires_on" type="date" value="'+esc(x.promo_expires_on||'')+'"></label></div>'+
      '<div class="pf-ci-grid"><label>Campaign start<input name="campaign_start" type="date" value="'+esc(x.campaign_start||'')+'"></label><label>Campaign end<input name="campaign_end" type="date" value="'+esc(x.campaign_end||'')+'"></label></div>'+
      '<div class="pf-ci-grid"><label>Target scope<select name="target_scope">'+['nationwide','state','region','course_specific','custom'].map(v=>'<option value="'+v+'" '+(x.target_scope===v?'selected':'')+'>'+v.replaceAll('_',' ')+'</option>').join('')+'</select></label><label>Target details<input name="target_details" value="'+esc(x.target_details||'')+'" placeholder="California, Inland Empire, specific course..."></label></div>'+
      '<fieldset><legend>Preferred placements</legend><div class="pf-ci-checks">'+placementChecks(x.preferred_placements)+'</div></fieldset>'+
      '<label>Legal / required copy<textarea name="legal_copy" rows="2">'+esc(x.legal_copy||'')+'</textarea></label>'+
      '<div class="pf-ci-grid"><label>Approval contact<input name="approval_contact_name" value="'+esc(x.approval_contact_name||'')+'"></label><label>Approval email<input name="approval_contact_email" type="email" value="'+esc(x.approval_contact_email||'')+'"></label></div>'+
      '<div class="pf-ci-grid"><label>Tracking URL<input name="tracking_url" type="url" value="'+esc(x.tracking_url||'')+'"></label><label>UTM / tracking notes<input name="utm_notes" value="'+esc(x.utm_notes||'')+'"></label></div>'+
      '<label>Internal notes<textarea name="internal_notes" rows="3">'+esc(x.internal_notes||'')+'</textarea></label>'+
      sponsorApprovalBox(x)+
      '<div class="pf-ci-preview" data-ci-preview></div>'+
      '<div class="pf-ci-actions"><button type="button" class="secondary" data-ci-preview-btn>Preview</button><button type="button" class="secondary" data-ci-ready>Mark Ready for Review</button><button type="button" class="approve" data-ci-approve>Approve</button>'+(x.status==='approved'?'<button type="button" class="primary" data-ci-campaign>'+((x.generated_campaign_ids||[]).length?'View Campaigns':'Create Campaign')+'</button>':'')+'<button type="submit" class="primary">Save</button></div>'+
    '</form></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-ci-editor-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});

    function payload(){
      const fd=new FormData(o.querySelector('form'));
      return {
        company_name:String(fd.get('company_name')||'').trim(),
        sponsor_name:String(fd.get('sponsor_name')||'').trim()||null,
        logo_url:String(fd.get('logo_url')||'').trim()||null,
        primary_image_url:String(fd.get('primary_image_url')||'').trim()||null,
        square_image_url:String(fd.get('square_image_url')||'').trim()||null,
        headline:String(fd.get('headline')||'').trim()||null,
        body_copy:String(fd.get('body_copy')||'').trim()||null,
        cta_label:String(fd.get('cta_label')||'').trim()||null,
        destination_url:String(fd.get('destination_url')||'').trim()||null,
        promo_code:String(fd.get('promo_code')||'').trim()||null,
        promo_expires_on:String(fd.get('promo_expires_on')||'').trim()||null,
        campaign_start:String(fd.get('campaign_start')||'').trim()||null,
        campaign_end:String(fd.get('campaign_end')||'').trim()||null,
        target_scope:String(fd.get('target_scope')||'nationwide'),
        target_details:String(fd.get('target_details')||'').trim()||null,
        preferred_placements:[...o.querySelectorAll('input[name=placement]:checked')].map(i=>i.value),
        legal_copy:String(fd.get('legal_copy')||'').trim()||null,
        approval_contact_name:String(fd.get('approval_contact_name')||'').trim()||null,
        approval_contact_email:String(fd.get('approval_contact_email')||'').trim()||null,
        tracking_url:String(fd.get('tracking_url')||'').trim()||null,
        utm_notes:String(fd.get('utm_notes')||'').trim()||null,
        internal_notes:String(fd.get('internal_notes')||'').trim()||null,
        updated_at:new Date().toISOString()
      };
    }

    async function save(extra={}){
      const p=Object.assign(payload(),extra);p.missing_items=missing(p);
      const {error}=await db.from('sponsor_creative_intakes').update(p).eq('id',id);
      if(error){alert('Could not save creative intake: '+error.message);return false}
      Object.assign(x,p);return true;
    }

    o.querySelector('form').onsubmit=async e=>{e.preventDefault();if(await save()){close();document.querySelector('.pf-ci-overlay')?.remove();openDashboard()}};
    const sponsorLinkBtn=o.querySelector('[data-ci-sponsor-link]');
    if(sponsorLinkBtn)sponsorLinkBtn.onclick=async()=>{
      sponsorLinkBtn.disabled=true;sponsorLinkBtn.textContent='Generating…';
      const p=payload(),m=missing(p);
      if(m.length){alert('Complete the creative package first. Missing: '+m.join(', '));sponsorLinkBtn.disabled=false;sponsorLinkBtn.textContent='Generate Approval Link';return}
      if(await save()){
        const url=await createSponsorApprovalLink(x);
        if(url){showApprovalLink(url);sponsorLinkBtn.textContent='Generate New Link'}
        else sponsorLinkBtn.textContent='Generate Approval Link';
      }
      sponsorLinkBtn.disabled=false;
    };

    o.querySelector('[data-ci-ready]').onclick=async()=>{
      const p=payload(),m=missing(p);
      if(m.length){alert('Still missing: '+m.join(', '));return}
      if(await save({status:'ready_for_review'})){alert('Creative package is ready for review.')}
    };
    o.querySelector('[data-ci-approve]').onclick=async()=>{
      const p=payload(),m=missing(p);
      if(m.length){alert('Cannot approve yet. Missing: '+m.join(', '));return}
      if(await save({status:'approved',approved_at:new Date().toISOString(),approved_by:typeof currentUser!=='undefined'?currentUser?.id:null})){
        alert('Creative approved. It can now be created as a campaign.');
        close();document.querySelector('.pf-ci-overlay')?.remove();openDashboard();
      }
    };
    const campaignBtn=o.querySelector('[data-ci-campaign]');
    if(campaignBtn)campaignBtn.onclick=async()=>{
      if((x.generated_campaign_ids||[]).length){
        close();
        document.querySelector('.pf-ci-overlay')?.remove();
        window.openMonetizationAdmin?.();
        return;
      }
      campaignBtn.disabled=true;
      campaignBtn.textContent='Creating…';
      const ok=await createCampaignsFromIntake(x);
      if(ok){
        close();
        document.querySelector('.pf-ci-overlay')?.remove();
        openDashboard();
      }else{
        campaignBtn.disabled=false;
        campaignBtn.textContent='Create Campaign';
      }
    };
    o.querySelector('[data-ci-preview-btn]').onclick=()=>{
      const p=payload();
      o.querySelector('[data-ci-preview]').innerHTML='<div class="pf-ci-ad-preview">'+
        (p.primary_image_url?'<img src="'+esc(p.primary_image_url)+'" alt="">':'<div class="pf-ci-noimg">Image preview</div>')+
        '<div><small>SPONSORED · '+esc(p.sponsor_name||p.company_name)+'</small><h4>'+esc(p.headline||'Your headline')+'</h4><p>'+esc(p.body_copy||'Your sponsor message will appear here.')+'</p><button type="button">'+esc(p.cta_label||'Learn More')+'</button></div></div>';
    };
  }

  const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});setTimeout(inject,0);
  window.openSponsorCreativeIntake=openDashboard;
})();