/* ParFolio v340 — sponsor prospect CRM. */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=c=>'$'+(Number(c||0)/100).toLocaleString(undefined,{maximumFractionDigits:0});
  let prospects=[];

  async function loadProspects(){
    if(!isSuper()||typeof db==='undefined')return[];
    const {data,error}=await db.from('sponsor_prospects').select('*').order('priority',{ascending:true}).order('company_name',{ascending:true}).limit(1000);
    if(error)throw error;
    prospects=data||[];
    return prospects;
  }

  function inject(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-prospect-crm]'))return;
    const s=document.createElement('section');s.className='pf-mon-section';s.dataset.pfProspectCrm='1';
    s.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Prospect CRM</h3><small>Target brands · outreach · follow-ups</small></div><button type="button" class="pf-mon-add">Open CRM</button></div>';
    s.querySelector('button').onclick=openCRM;panel.appendChild(s);
  }

  function statusOptions(current){
    return ['research','ready','contacted','replied','qualified','won','lost','do_not_contact']
      .map(s=>'<option value="'+s+'" '+(s===current?'selected':'')+'>'+s.replaceAll('_',' ')+'</option>').join('');
  }

  function prospectRow(p){
    return '<article class="pf-prospect-row" data-row-id="'+safe(p.id)+'">'+
      '<div class="pf-prospect-main"><div class="pf-prospect-title"><span class="pf-priority p'+p.priority+'">P'+p.priority+'</span><b>'+safe(p.company_name)+'</b></div>'+
      '<small>'+safe(p.industry)+' · '+safe(p.source)+'</small>'+
      '<span>'+(p.contact_name?safe(p.contact_name)+(p.contact_title?' · '+safe(p.contact_title):''):'No contact identified yet')+'</span>'+
      '<em>'+(p.next_follow_up?'Follow up '+safe(p.next_follow_up):'No follow-up date')+(p.estimated_monthly_value_cents?' · Est. '+money(p.estimated_monthly_value_cents)+'/mo':'')+'</em></div>'+
      '<div class="pf-prospect-actions"><select data-prospect-status="'+safe(p.id)+'">'+statusOptions(p.status)+'</select><button type="button" data-prospect-details="'+safe(p.id)+'">Details</button></div>'+
    '</article>';
  }

  function filtered(search,status,priority,industry){
    return prospects.filter(p=>{
      const q=(search||'').toLowerCase();
      const hay=[p.company_name,p.industry,p.contact_name,p.contact_title,p.contact_email,p.notes,p.source].filter(Boolean).join(' ').toLowerCase();
      return (!q||hay.includes(q)) &&
        (!status||p.status===status) &&
        (!priority||String(p.priority)===String(priority)) &&
        (!industry||p.industry===industry);
    });
  }

  async function openCRM(){
    try{await loadProspects()}catch(e){alert('Could not load sponsor prospects: '+e.message);return}
    document.querySelector('.pf-prospect-overlay')?.remove();
    const industries=[...new Set(prospects.map(p=>p.industry).filter(Boolean))].sort();
    const counts={
      total:prospects.length,
      ready:prospects.filter(p=>p.status==='ready').length,
      contacted:prospects.filter(p=>['contacted','replied','qualified'].includes(p.status)).length,
      won:prospects.filter(p=>p.status==='won').length
    };
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-prospect-overlay"><section class="pf-prospect-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Prospect CRM</h2><p>Build and work a sponsor pipeline across golf and mainstream consumer categories.</p></div><button type="button" class="pf-prospect-close">×</button></header>'+
      '<div class="pf-prospect-summary"><div><small>Prospects</small><b>'+counts.total+'</b></div><div><small>Ready</small><b>'+counts.ready+'</b></div><div><small>Active Outreach</small><b>'+counts.contacted+'</b></div><div><small>Won</small><b>'+counts.won+'</b></div></div>'+
      '<section class="pf-prospect-controls"><div class="pf-prospect-search"><input type="search" placeholder="Search companies, industry, contact..." data-prospect-search></div>'+
      '<div class="pf-prospect-filters"><select data-filter-status><option value="">All statuses</option>'+['research','ready','contacted','replied','qualified','won','lost','do_not_contact'].map(x=>'<option value="'+x+'">'+x.replaceAll('_',' ')+'</option>').join('')+'</select>'+
      '<select data-filter-priority><option value="">All priorities</option><option value="1">P1</option><option value="2">P2</option><option value="3">P3</option></select>'+
      '<select data-filter-industry><option value="">All industries</option>'+industries.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join('')+'</select>'+
      '<button type="button" class="pf-prospect-add">＋ Add Prospect</button></div></section>'+
      '<section><div class="pf-prospect-head"><h3>Prospects</h3><small data-prospect-count>'+prospects.length+' shown</small></div><div class="pf-prospect-list" data-prospect-list>'+prospects.map(prospectRow).join('')+'</div></section>'+
    '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('.pf-prospect-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('.pf-prospect-add').onclick=openAddProspect;
    const rerender=()=>{
      const rows=filtered(o.querySelector('[data-prospect-search]').value,o.querySelector('[data-filter-status]').value,o.querySelector('[data-filter-priority]').value,o.querySelector('[data-filter-industry]').value);
      o.querySelector('[data-prospect-list]').innerHTML=rows.map(prospectRow).join('')||'<div class="pf-prospect-empty">No prospects match these filters.</div>';
      o.querySelector('[data-prospect-count]').textContent=rows.length+' shown';
      bindRows(o);
    };
    o.querySelector('[data-prospect-search]').oninput=rerender;
    o.querySelector('[data-filter-status]').onchange=rerender;
    o.querySelector('[data-filter-priority]').onchange=rerender;
    o.querySelector('[data-filter-industry]').onchange=rerender;
    bindRows(o);
  }

  function bindRows(root){
    root.querySelectorAll('[data-prospect-status]').forEach(sel=>sel.onchange=()=>updateStatus(sel.dataset.prospectStatus,sel.value));
    root.querySelectorAll('[data-prospect-details]').forEach(btn=>btn.onclick=()=>openDetails(btn.dataset.prospectDetails));
  }

  async function updateStatus(id,status){
    const patch={status,updated_at:new Date().toISOString()};
    if(status==='contacted')patch.last_contacted_at=new Date().toISOString();
    const {error}=await db.from('sponsor_prospects').update(patch).eq('id',id);
    if(error){alert('Could not update prospect: '+error.message);return}
    const p=prospects.find(x=>x.id===id);if(p)Object.assign(p,patch);
  }

  function openDetails(id){
    const p=prospects.find(x=>x.id===id);if(!p)return;
    document.querySelector('.pf-prospect-detail-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-prospect-detail-overlay"><form class="pf-prospect-detail">'+
      '<header><div><small>SPONSOR PROSPECT</small><h3>'+safe(p.company_name)+'</h3></div><button type="button" class="pf-detail-close">×</button></header>'+
      '<div class="pf-form-grid"><label>Company<input name="company_name" value="'+safe(p.company_name)+'" required></label><label>Industry<input name="industry" value="'+safe(p.industry)+'" required></label></div>'+
      '<div class="pf-form-grid"><label>Priority<select name="priority"><option value="1" '+(p.priority===1?'selected':'')+'>P1</option><option value="2" '+(p.priority===2?'selected':'')+'>P2</option><option value="3" '+(p.priority===3?'selected':'')+'>P3</option></select></label><label>Status<select name="status">'+statusOptions(p.status)+'</select></label></div>'+
      '<label>Website<input name="website" type="url" value="'+safe(p.website||'')+'"></label>'+
      '<div class="pf-form-grid"><label>Contact name<input name="contact_name" value="'+safe(p.contact_name||'')+'"></label><label>Contact title<input name="contact_title" value="'+safe(p.contact_title||'')+'"></label></div>'+
      '<div class="pf-form-grid"><label>Contact email<input name="contact_email" type="email" value="'+safe(p.contact_email||'')+'"></label><label>Contact phone<input name="contact_phone" value="'+safe(p.contact_phone||'')+'"></label></div>'+
      '<div class="pf-form-grid"><label>Follow-up date<input name="next_follow_up" type="date" value="'+safe(p.next_follow_up||'')+'"></label><label>Estimated monthly value ($)<input name="estimated_value" type="number" min="0" step="1" value="'+Math.round(Number(p.estimated_monthly_value_cents||0)/100)+'"></label></div>'+
      '<label>Outreach channel<input name="outreach_channel" value="'+safe(p.outreach_channel||'')+'" placeholder="Email, LinkedIn, form, phone..."></label>'+
      '<label>Notes<textarea name="notes" rows="4">'+safe(p.notes||'')+'</textarea></label>'+
      '<div class="pf-detail-links">'+(p.website?'<a href="'+safe(p.website)+'" target="_blank" rel="noopener">Open website ↗</a>':'')+(p.contact_email?'<a href="mailto:'+safe(p.contact_email)+'">Email contact</a>':'')+'</div>'+
      '<div class="pf-detail-actions"><button type="button" class="secondary pf-detail-cancel">Cancel</button><button type="submit" class="primary">Save Prospect</button></div>'+
    '</form></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-detail-close').onclick=close;o.querySelector('.pf-detail-cancel').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget);
      const patch={
        company_name:String(fd.get('company_name')||'').trim(),
        industry:String(fd.get('industry')||'').trim(),
        priority:Number(fd.get('priority')||2),
        status:String(fd.get('status')||'research'),
        website:String(fd.get('website')||'').trim()||null,
        contact_name:String(fd.get('contact_name')||'').trim()||null,
        contact_title:String(fd.get('contact_title')||'').trim()||null,
        contact_email:String(fd.get('contact_email')||'').trim()||null,
        contact_phone:String(fd.get('contact_phone')||'').trim()||null,
        next_follow_up:String(fd.get('next_follow_up')||'').trim()||null,
        estimated_monthly_value_cents:Math.round(Math.max(0,Number(fd.get('estimated_value')||0))*100),
        outreach_channel:String(fd.get('outreach_channel')||'').trim()||null,
        notes:String(fd.get('notes')||'').trim()||null,
        updated_at:new Date().toISOString()
      };
      const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Saving…';
      const {error}=await db.from('sponsor_prospects').update(patch).eq('id',id);
      if(error){btn.disabled=false;btn.textContent='Save Prospect';alert('Could not save prospect: '+error.message);return}
      Object.assign(p,patch);close();document.querySelector('.pf-prospect-overlay')?.remove();openCRM();
    };
  }

  function openAddProspect(){
    document.querySelector('.pf-add-prospect-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-add-prospect-overlay"><form class="pf-add-prospect-form"><header><div><small>SPONSOR PROSPECT</small><h3>Add Prospect</h3></div><button type="button" class="pf-add-close">×</button></header>'+
      '<div class="pf-form-grid"><label>Company<input name="company_name" required></label><label>Industry<input name="industry" required></label></div>'+
      '<label>Website<input name="website" type="url" placeholder="https://"></label>'+
      '<div class="pf-form-grid"><label>Priority<select name="priority"><option value="1">P1</option><option value="2" selected>P2</option><option value="3">P3</option></select></label><label>Estimated monthly value ($)<input name="estimated_value" type="number" min="0" value="199"></label></div>'+
      '<label>Notes<textarea name="notes" rows="3"></textarea></label>'+
      '<div class="pf-detail-actions"><button type="button" class="secondary pf-add-cancel">Cancel</button><button type="submit" class="primary">Add Prospect</button></div></form></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.pf-add-close').onclick=close;o.querySelector('.pf-add-cancel').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget);
      const payload={
        company_name:String(fd.get('company_name')||'').trim(),
        industry:String(fd.get('industry')||'').trim(),
        website:String(fd.get('website')||'').trim()||null,
        source:'manual',
        priority:Number(fd.get('priority')||2),
        status:'research',
        estimated_monthly_value_cents:Math.round(Math.max(0,Number(fd.get('estimated_value')||0))*100),
        notes:String(fd.get('notes')||'').trim()||null,
        created_by:typeof currentUser!=='undefined'?currentUser?.id:null
      };
      const {error}=await db.from('sponsor_prospects').insert(payload);
      if(error){alert('Could not add prospect: '+error.message);return}
      close();document.querySelector('.pf-prospect-overlay')?.remove();openCRM();
    };
  }

  const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});setTimeout(inject,0);
  window.openSponsorProspectCRM=openCRM;
})();