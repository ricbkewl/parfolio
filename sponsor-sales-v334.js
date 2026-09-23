/* ParFolio v334 — sponsor sales packages, public intake, and admin lead pipeline. */
(function(){
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  let packages=[],leads=[],loaded=false;

  async function loadData(force=false){
    if(loaded&&!force)return;
    if(typeof db==='undefined')return;
    const p=await db.from('sponsor_packages').select('*').order('sort_order',{ascending:true});
    if(!p.error)packages=p.data||[];
    if(isSuper()){
      const l=await db.from('sponsor_inquiries').select('*').order('created_at',{ascending:false}).limit(250);
      if(!l.error)leads=l.data||[];
    }
    loaded=true;
  }

  function money(n){return '$'+Number(n||0).toLocaleString()+'/mo'}
  function packageCard(p){
    return '<article class="pf-sponsor-package '+(p.highlighted?'featured':'')+'">'+
      (p.highlighted?'<div class="pf-sponsor-ribbon">MOST POPULAR</div>':'')+
      '<small>'+safe(p.name)+'</small><strong>'+money(p.price_monthly)+'</strong><p>'+safe(p.description)+'</p>'+
      '<div class="pf-sponsor-placements">'+(p.placements||[]).map(x=>'<span>'+safe(x)+'</span>').join('')+'</div>'+
      '<ul>'+(p.features||[]).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>'+
      '<button type="button" data-package="'+safe(p.id)+'">Choose '+safe(p.name)+'</button>'+
    '</article>';
  }

  async function openAdvertise(){
    await loadData(true);
    document.querySelector('.pf-advertise-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-advertise-overlay" role="dialog" aria-modal="true" aria-label="Advertise on ParFolio">'+
      '<section class="pf-advertise-panel">'+
        '<header><div><small>REACH GOLFERS INSIDE PARFOLIO</small><h2>Advertise on ParFolio</h2><p>Place your business in front of golfers while they search courses, preview facilities and finish rounds.</p></div><button class="pf-adv-close" type="button">×</button></header>'+
        '<div class="pf-sponsor-package-grid">'+packages.filter(p=>p.active).map(packageCard).join('')+'</div>'+
        '<div class="pf-adv-proof"><b>Built for golf businesses</b><span>Golf shops · instructors · fitters · travel · courses · equipment · local services</span></div>'+
        '<form class="pf-sponsor-inquiry-form">'+
          '<div class="pf-inquiry-head"><small>SPONSOR INQUIRY</small><h3>Tell us about your business</h3><p>No payment is collected here. We will review your request and follow up directly.</p></div>'+
          '<input type="text" name="fax_number" class="pf-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">'+
          '<div class="pf-form-grid"><label>Company<input name="company_name" required maxlength="160"></label><label>Contact name<input name="contact_name" required maxlength="160"></label></div>'+
          '<div class="pf-form-grid"><label>Email<input name="email" type="email" required maxlength="254"></label><label>Phone<input name="phone" type="tel" maxlength="40"></label></div>'+
          '<div class="pf-form-grid"><label>Website<input name="website" type="url" placeholder="https://"></label><label>Business type<input name="business_type" maxlength="120" placeholder="Golf shop, instructor, course..."></label></div>'+
          '<div class="pf-form-grid"><label>Primary market<input name="market" maxlength="120" placeholder="Southern California, nationwide..."></label><label>Package<select name="package_id"><option value="">Not sure yet</option>'+packages.filter(p=>p.active).map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+' — '+money(p.price_monthly)+'</option>').join('')+'</select></label></div>'+
          '<label>Monthly budget<select name="monthly_budget"><option value="">Prefer not to say</option><option>Under $100</option><option>$100–$249</option><option>$250–$499</option><option>$500+</option></select></label>'+
          '<label>What would you like to promote?<textarea name="message" rows="4" maxlength="1000"></textarea></label>'+
          '<div class="pf-inquiry-actions"><button type="button" class="secondary pf-adv-cancel">Cancel</button><button type="submit" class="primary">Send Sponsor Inquiry</button></div>'+
        '</form>'+
      '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-adv-close').onclick=close;overlay.querySelector('.pf-adv-cancel').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelectorAll('[data-package]').forEach(btn=>btn.onclick=()=>{overlay.querySelector('[name=package_id]').value=btn.dataset.package;overlay.querySelector('.pf-sponsor-inquiry-form').scrollIntoView({behavior:'smooth',block:'start'})});
    overlay.querySelector('form').onsubmit=submitInquiry;
  }

  async function submitInquiry(e){
    e.preventDefault();
    const form=e.currentTarget,fd=new FormData(form);
    if(String(fd.get('fax_number')||'').trim())return;
    const payload={
      company_name:String(fd.get('company_name')||'').trim(),
      contact_name:String(fd.get('contact_name')||'').trim(),
      email:String(fd.get('email')||'').trim(),
      phone:String(fd.get('phone')||'').trim()||null,
      website:String(fd.get('website')||'').trim()||null,
      business_type:String(fd.get('business_type')||'').trim()||null,
      market:String(fd.get('market')||'').trim()||null,
      package_id:String(fd.get('package_id')||'').trim()||null,
      monthly_budget:String(fd.get('monthly_budget')||'').trim()||null,
      message:String(fd.get('message')||'').trim()||null,
      status:'new',internal_notes:null,source:'parfolio'
    };
    const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='Sending…';
    const {error}=await db.from('sponsor_inquiries').insert(payload);
    if(error){submit.disabled=false;submit.textContent='Send Sponsor Inquiry';alert('Your inquiry could not be sent. Please try again.');return}
    form.innerHTML='<div class="pf-inquiry-success"><span>✓</span><h3>Thank you.</h3><p>Your sponsor inquiry has been received. We will review it and follow up directly.</p><button type="button" onclick="this.closest(\'.pf-advertise-overlay\').remove()">Close</button></div>';
  }

  function injectPublicEntry(){
    const app=document.getElementById('app');if(!app||!app.classList.contains('home-page'))return;
    if(app.querySelector('[data-pf-advertise-entry]'))return;
    const entry=document.createElement('section');entry.dataset.pfAdvertiseEntry='1';entry.className='pf-advertise-entry';
    entry.innerHTML='<div><small>FOR GOLF BUSINESSES</small><b>Reach golfers with ParFolio</b><span>Direct sponsorship opportunities are now available.</span></div><button type="button">Advertise with us</button>';
    entry.querySelector('button').onclick=openAdvertise;
    const hero=app.querySelector('.home-hero');if(hero)hero.insertAdjacentElement('afterend',entry);else app.prepend(entry);
  }

  function leadRow(l){
    const pkg=packages.find(p=>p.id===l.package_id);
    return '<article class="pf-lead-row">'+
      '<div><small>'+safe(new Date(l.created_at).toLocaleDateString())+' · '+safe(l.status.toUpperCase())+'</small><b>'+safe(l.company_name)+'</b><span>'+safe(l.contact_name)+' · '+safe(l.email)+(l.phone?' · '+safe(l.phone):'')+'</span><em>'+safe(pkg?.name||'No package selected')+(l.market?' · '+safe(l.market):'')+'</em></div>'+
      '<div class="pf-lead-actions"><select data-lead-status="'+safe(l.id)+'">'+['new','contacted','qualified','won','lost'].map(s=>'<option value="'+s+'" '+(s===l.status?'selected':'')+'>'+s+'</option>').join('')+'</select><button type="button" data-lead="'+safe(l.id)+'">Details</button></div>'+
    '</article>';
  }

  function packageAdminRow(p){
    return '<article class="pf-package-admin-row"><div><b>'+safe(p.name)+'</b><small>'+money(p.price_monthly)+' · '+safe((p.placements||[]).join(', '))+'</small></div><button type="button" data-edit-package="'+safe(p.id)+'">Edit</button></article>';
  }

  async function openSalesAdmin(){
    if(!isSuper())return;
    await loadData(true);
    document.querySelector('.pf-sponsor-admin-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-sponsor-admin-overlay" role="dialog" aria-modal="true"><section class="pf-sponsor-admin-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Sales</h2><p>Manage pricing and incoming advertiser leads.</p></div><button type="button" class="pf-sales-close">×</button></header>'+
      '<section><div class="pf-sales-head"><h3>Packages</h3><small>Edit pricing without touching code.</small></div><div class="pf-package-admin-list">'+packages.map(packageAdminRow).join('')+'</div></section>'+
      '<section><div class="pf-sales-head"><h3>Sponsor Leads</h3><small>'+leads.length+' total</small></div><div class="pf-lead-list">'+(leads.length?leads.map(leadRow).join(''):'<div class="pf-sales-empty">No sponsor inquiries yet.</div>')+'</div></section>'+
    '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();overlay.querySelector('.pf-sales-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelectorAll('[data-lead-status]').forEach(sel=>sel.onchange=()=>updateLeadStatus(sel.dataset.leadStatus,sel.value));
    overlay.querySelectorAll('[data-lead]').forEach(btn=>btn.onclick=()=>leadDetails(btn.dataset.lead));
    overlay.querySelectorAll('[data-edit-package]').forEach(btn=>btn.onclick=()=>editPackage(btn.dataset.editPackage));
  }

  async function updateLeadStatus(id,status){
    const {error}=await db.from('sponsor_inquiries').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){alert('Could not update lead: '+error.message);return}
    const lead=leads.find(x=>x.id===id);if(lead)lead.status=status;
  }

  function leadDetails(id){
    const l=leads.find(x=>x.id===id);if(!l)return;
    const pkg=packages.find(p=>p.id===l.package_id);
    const text=[
      l.company_name,
      l.contact_name,
      l.email,
      l.phone||'',
      l.website||'',
      l.business_type||'',
      l.market||'',
      pkg?.name||'',
      l.monthly_budget||'',
      l.message||''
    ].filter(Boolean).join('\n\n');
    alert(text);
  }

  function editPackage(id){
    const p=packages.find(x=>x.id===id);if(!p)return;
    const price=prompt('Monthly price for '+p.name+' (USD):',String(p.price_monthly));
    if(price===null)return;
    const n=Math.max(0,Math.round(Number(price)));if(!Number.isFinite(n)){alert('Enter a valid price.');return}
    db.from('sponsor_packages').update({price_monthly:n,updated_at:new Date().toISOString()}).eq('id',id).then(async({error})=>{
      if(error){alert('Could not update package: '+error.message);return}
      loaded=false;await loadData(true);openSalesAdmin();
    });
  }

  function injectAdminButton(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');if(!panel||panel.querySelector('[data-pf-sales-admin]'))return;
    const section=document.createElement('section');section.className='pf-mon-section';section.dataset.pfSalesAdmin='1';
    section.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Sales</h3><small>Packages + incoming advertiser leads</small></div><button type="button" class="pf-mon-add">Open Sales</button></div>';
    section.querySelector('button').onclick=openSalesAdmin;
    panel.appendChild(section);
  }

  window.openParFolioAdvertise=openAdvertise;
  window.openSponsorSalesAdmin=openSalesAdmin;
  const observer=new MutationObserver(()=>{injectPublicEntry();injectAdminButton()});
  const app=document.getElementById('app');if(app)observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{loadData();injectPublicEntry();injectAdminButton()},0);
})();