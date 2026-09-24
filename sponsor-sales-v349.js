/* ParFolio v349 — sponsor media kit, public intake, and admin lead pipeline. */
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
    const activePackages=packages.filter(p=>p.active);
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-advertise-overlay pf-media-kit-overlay" role="dialog" aria-modal="true" aria-label="ParFolio Sponsor Media Kit">'+
      '<section class="pf-advertise-panel pf-media-kit-panel">'+
        '<header class="pf-media-kit-hero"><div><small>PARFOLIO FOUNDING PARTNERS</small><h2>Reach golfers at the moments that matter.</h2><p>ParFolio helps golfers discover courses, plan shots, score rounds and share results. Founding Partners can appear around that journey while the live GPS hole screen stays clean and ad-free.</p><div class="pf-media-kit-hero-actions"><button type="button" class="primary" data-scroll-inquiry>Become a Founding Partner</button><button type="button" class="secondary" data-copy-kit>Copy Media Kit Link</button></div></div><button class="pf-adv-close" type="button" aria-label="Close">×</button></header>'+
        '<section class="pf-media-kit-value"><div><small>WHY PARFOLIO</small><h3>Golf context, not random impressions.</h3><p>Your message appears while golfers are choosing where to play, previewing a course, reviewing a scorecard or finishing a round.</p></div><div class="pf-media-kit-pill-grid"><span>Course discovery</span><span>Course previews</span><span>Scorecards</span><span>Round completion</span><span>Regional targeting</span><span>Trackable clicks</span></div></section>'+
        '<section class="pf-media-kit-placement-section"><div class="pf-media-kit-section-head"><small>AVAILABLE PLACEMENTS</small><h3>Designed around the golf journey</h3></div><div class="pf-media-kit-placement-grid">'+
          '<article><b>Home</b><p>Brand visibility before golfers begin course search or start a round.</p></article>'+
          '<article><b>Course Search</b><p>Reach golfers while they are actively deciding where to play.</p></article>'+
          '<article><b>Course Preview</b><p>Show relevant offers before a golfer starts the round.</p></article>'+
          '<article><b>Scorecard</b><p>Appear alongside post-hole and post-round scoring context.</p></article>'+
          '<article><b>Round Complete</b><p>High-intent post-round placement for offers, travel and local services.</p></article>'+
        '</div><div class="pf-media-kit-gps-lock"><span>🔒</span><div><b>Live GPS stays ad-free.</b><p>No sponsor placement interrupts the active hole map, yardages, planner or scoring experience.</p></div></div></section>'+
        '<section class="pf-media-kit-targeting"><div><small>TARGETING & MEASUREMENT</small><h3>Simple targeting. Clear reporting.</h3><p>Campaigns can be structured nationwide, by state, by region, around specific courses, or through a custom target plan. Sponsor reports can include impressions, clicks and click-through rate.</p></div><div class="pf-media-kit-metrics"><article><strong>Impressions</strong><span>Qualified on-screen views</span></article><article><strong>Clicks</strong><span>Tracked sponsor CTA engagement</span></article><article><strong>CTR</strong><span>Campaign click-through rate</span></article><article><strong>Reports</strong><span>Locked sponsor reporting periods</span></article></div></section>'+
        '<section class="pf-media-kit-partners"><div><small>WHO FITS</small><h3>Built for golf—and businesses that serve golfers.</h3></div><div class="pf-media-kit-categories"><span>Equipment</span><span>Apparel</span><span>Training aids</span><span>Golf retail</span><span>Travel</span><span>Hotels</span><span>Car rental</span><span>Beverages</span><span>Fitness</span><span>Local services</span><span>Golf courses</span><span>Instruction</span></div></section>'+
        '<section class="pf-media-kit-founder"><div><small>FOUNDING PARTNER ADVANTAGE</small><h3>Get in early.</h3><p>ParFolio is opening a limited number of Founding Partner relationships while the platform expands course-by-course and market-by-market. Early partners can help shape placements, targeting and future sponsorship packages.</p></div></section>'+
        '<section class="pf-media-kit-packages"><div class="pf-media-kit-section-head"><small>FOUNDING PACKAGES</small><h3>Start small. Scale when it works.</h3><p>No payment is collected on this page. We review fit first, then finalize the campaign together.</p></div><div class="pf-sponsor-package-grid">'+activePackages.map(packageCard).join('')+'</div></section>'+
        '<section class="pf-media-kit-process"><div class="pf-media-kit-section-head"><small>HOW IT WORKS</small><h3>From introduction to live campaign</h3></div><div class="pf-media-kit-process-grid"><article><b>1</b><span>Choose a package or describe your goal.</span></article><article><b>2</b><span>ParFolio confirms fit, placement and targeting.</span></article><article><b>3</b><span>Creative is reviewed and approved by the sponsor.</span></article><article><b>4</b><span>ParFolio performs the final review and activates.</span></article><article><b>5</b><span>Performance is measured and reported.</span></article></div></section>'+
        '<form class="pf-sponsor-inquiry-form" id="pfSponsorInquiry">'+
          '<div class="pf-inquiry-head"><small>FOUNDING PARTNER INQUIRY</small><h3>Tell us what you want to promote.</h3><p>No payment is collected here. ParFolio will review your request and follow up directly.</p></div>'+
          '<input type="text" name="fax_number" class="pf-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">'+
          '<div class="pf-form-grid"><label>Company<input name="company_name" required maxlength="160"></label><label>Contact name<input name="contact_name" required maxlength="160"></label></div>'+
          '<div class="pf-form-grid"><label>Email<input name="email" type="email" required maxlength="254"></label><label>Phone<input name="phone" type="tel" maxlength="40"></label></div>'+
          '<div class="pf-form-grid"><label>Website<input name="website" type="url" placeholder="https://"></label><label>Business type<input name="business_type" maxlength="120" placeholder="Golf brand, hotel, local business..."></label></div>'+
          '<div class="pf-form-grid"><label>Primary market<input name="market" maxlength="120" placeholder="Southern California, nationwide..."></label><label>Package<select name="package_id"><option value="">Not sure yet</option>'+activePackages.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+' — '+money(p.price_monthly)+'</option>').join('')+'</select></label></div>'+
          '<label>Monthly budget<select name="monthly_budget"><option value="">Prefer not to say</option><option>Under $100</option><option>$100–$249</option><option>$250–$499</option><option>$500+</option></select></label>'+
          '<label>What would you like to promote?<textarea name="message" rows="4" maxlength="1000" placeholder="Tell us the offer, audience or campaign goal."></textarea></label>'+
          '<div class="pf-inquiry-actions"><button type="button" class="secondary pf-adv-cancel">Cancel</button><button type="submit" class="primary">Send Founding Partner Inquiry</button></div>'+
        '</form>'+
      '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-adv-close').onclick=close;
    overlay.querySelector('.pf-adv-cancel').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelectorAll('[data-package]').forEach(btn=>btn.onclick=()=>{overlay.querySelector('[name=package_id]').value=btn.dataset.package;overlay.querySelector('#pfSponsorInquiry').scrollIntoView({behavior:'smooth',block:'start'})});
    overlay.querySelector('[data-scroll-inquiry]').onclick=()=>overlay.querySelector('#pfSponsorInquiry').scrollIntoView({behavior:'smooth',block:'start'});
    overlay.querySelector('[data-copy-kit]').onclick=async e=>{
      const url=location.origin+location.pathname+'?advertise=1';
      try{await navigator.clipboard.writeText(url);e.currentTarget.textContent='Link Copied ✓'}catch{alert(url)}
    };
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
  function maybeOpenAdvertiseDeepLink(){
    try{
      const u=new URL(location.href);
      if(u.searchParams.get('advertise')!=='1')return;
      const go=()=>{if(typeof db!=='undefined')openAdvertise();else setTimeout(go,250)};
      setTimeout(go,350);
    }catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeOpenAdvertiseDeepLink,{once:true});
  else maybeOpenAdvertiseDeepLink();
  window.openSponsorSalesAdmin=openSalesAdmin;
  const observer=new MutationObserver(()=>{injectPublicEntry();injectAdminButton()});
  const app=document.getElementById('app');if(app)observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{loadData();injectPublicEntry();injectAdminButton()},0);
})();