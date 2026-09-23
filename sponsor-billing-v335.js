/* ParFolio v335 — sponsor conversion, billing records, and campaign activation workflow. */
(function(){
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  let orders=[];

  async function loadOrders(){
    if(!isSuper()||typeof db==='undefined')return;
    const {data,error}=await db.from('sponsor_orders').select('*').order('created_at',{ascending:false}).limit(250);
    if(!error)orders=data||[];
  }

  function cents(n){return '$'+(Number(n||0)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function fmtDate(v){if(!v)return'';try{return new Date(v+'T12:00:00').toLocaleDateString()}catch{return v}}
  function labelStatus(s){return String(s||'').replaceAll('_',' ').toUpperCase()}

  function injectBillingButton(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-billing-admin]'))return;
    const section=document.createElement('section');
    section.className='pf-mon-section';
    section.dataset.pfBillingAdmin='1';
    section.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Billing</h3><small>Orders · payment status · activation</small></div><button type="button" class="pf-mon-add">Open Billing</button></div>';
    section.querySelector('button').onclick=openBillingAdmin;
    panel.appendChild(section);
  }

  function orderRow(o){
    return '<article class="pf-order-row">'+
      '<div class="pf-order-main"><small>'+safe(o.order_number)+' · '+safe(labelStatus(o.status))+'</small><b>'+safe(o.company_name)+'</b><span>'+safe(o.package_name)+' · '+cents(o.amount_cents)+' / '+safe(o.billing_interval)+'</span>'+
      '<em>'+(o.campaign_start?fmtDate(o.campaign_start):'No start date')+(o.campaign_end?' → '+fmtDate(o.campaign_end):'')+'</em></div>'+
      '<div class="pf-order-actions"><select data-order-status="'+safe(o.id)+'">'+['draft','sent','accepted','payment_pending','paid','active','past_due','cancelled','completed'].map(s=>'<option value="'+s+'" '+(s===o.status?'selected':'')+'>'+s.replaceAll('_',' ')+'</option>').join('')+'</select><button type="button" data-order-details="'+safe(o.id)+'">Details</button></div>'+
    '</article>';
  }

  async function openBillingAdmin(){
    if(!isSuper())return;
    await loadOrders();
    document.querySelector('.pf-billing-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-billing-overlay" role="dialog" aria-modal="true"><section class="pf-billing-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Billing</h2><p>Create sponsor orders, track payment, and activate campaigns without mixing ParFolio with another business account.</p></div><button type="button" class="pf-billing-close">×</button></header>'+
      '<section><div class="pf-billing-head"><div><h3>Orders</h3><small>'+orders.length+' total</small></div><button type="button" class="pf-billing-new">＋ New Order</button></div>'+
      '<div class="pf-order-list">'+(orders.length?orders.map(orderRow).join(''):'<div class="pf-billing-empty">No sponsor orders yet.</div>')+'</div></section>'+
      '<section class="pf-payment-provider-note"><b>Payment provider</b><p>ParFolio does not yet have its own connected Stripe account. Payment URLs can be added manually now, then automated once ParFolio Stripe is connected.</p></section>'+
    '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-billing-close').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('.pf-billing-new').onclick=()=>openOrderForm();
    overlay.querySelectorAll('[data-order-status]').forEach(sel=>sel.onchange=()=>updateOrderStatus(sel.dataset.orderStatus,sel.value));
    overlay.querySelectorAll('[data-order-details]').forEach(btn=>btn.onclick=()=>openOrderDetails(btn.dataset.orderDetails));
  }

  async function openOrderForm(){
    let packages=[],leads=[];
    const [p,l]=await Promise.all([
      db.from('sponsor_packages').select('*').eq('active',true).order('sort_order',{ascending:true}),
      db.from('sponsor_inquiries').select('*').in('status',['qualified','won','contacted']).order('created_at',{ascending:false}).limit(100)
    ]);
    if(!p.error)packages=p.data||[];
    if(!l.error)leads=l.data||[];
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-order-form-overlay" role="dialog" aria-modal="true"><form class="pf-order-form">'+
      '<header><div><small>SPONSOR ORDER</small><h3>New Order</h3></div><button type="button" class="pf-order-close">×</button></header>'+
      '<label>Lead<select name="inquiry_id"><option value="">Manual order</option>'+leads.map(x=>'<option value="'+safe(x.id)+'">'+safe(x.company_name)+' — '+safe(x.contact_name)+'</option>').join('')+'</select></label>'+
      '<div class="pf-form-grid"><label>Company<input name="company_name" required maxlength="160"></label><label>Contact<input name="contact_name" required maxlength="160"></label></div>'+
      '<label>Email<input name="contact_email" type="email" required maxlength="254"></label>'+
      '<div class="pf-form-grid"><label>Package<select name="package_id" required><option value="">Choose package</option>'+packages.map(p=>'<option value="'+safe(p.id)+'" data-name="'+safe(p.name)+'" data-price="'+safe(p.price_monthly)+'">'+safe(p.name)+' — $'+safe(p.price_monthly)+'/mo</option>').join('')+'</select></label><label>Amount (USD)<input name="amount" type="number" min="0" step="0.01" required></label></div>'+
      '<div class="pf-form-grid"><label>Billing interval<select name="billing_interval"><option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="year">Yearly</option><option value="one_time">One-time</option></select></label><label>Status<select name="status"><option value="draft">Draft</option><option value="sent">Sent</option><option value="payment_pending">Payment pending</option><option value="paid">Paid</option></select></label></div>'+
      '<div class="pf-form-grid"><label>Campaign start<input name="campaign_start" type="date"></label><label>Campaign end<input name="campaign_end" type="date"></label></div>'+
      '<label>Payment URL<input name="payment_url" type="url" placeholder="https://... (optional)"></label>'+
      '<label>Internal notes<textarea name="internal_notes" rows="3" maxlength="1000"></textarea></label>'+
      '<div class="pf-order-form-actions"><button type="button" class="secondary pf-order-cancel">Cancel</button><button type="submit" class="primary">Create Order</button></div>'+
    '</form></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const form=overlay.querySelector('form'),close=()=>overlay.remove();
    overlay.querySelector('.pf-order-close').onclick=close;overlay.querySelector('.pf-order-cancel').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    const leadSelect=form.querySelector('[name=inquiry_id]'),pkgSelect=form.querySelector('[name=package_id]'),amount=form.querySelector('[name=amount]');
    leadSelect.onchange=()=>{
      const lead=leads.find(x=>x.id===leadSelect.value);if(!lead)return;
      form.company_name.value=lead.company_name||'';form.contact_name.value=lead.contact_name||'';form.contact_email.value=lead.email||'';
      if(lead.package_id){pkgSelect.value=lead.package_id;pkgSelect.dispatchEvent(new Event('change'))}
    };
    pkgSelect.onchange=()=>{const opt=pkgSelect.selectedOptions[0];if(opt?.dataset?.price)amount.value=Number(opt.dataset.price).toFixed(2)};
    form.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(form),opt=pkgSelect.selectedOptions[0];
      const usd=Math.max(0,Number(fd.get('amount')||0));
      if(!Number.isFinite(usd)){alert('Enter a valid amount.');return}
      const payload={
        inquiry_id:String(fd.get('inquiry_id')||'').trim()||null,
        company_name:String(fd.get('company_name')||'').trim(),
        contact_name:String(fd.get('contact_name')||'').trim(),
        contact_email:String(fd.get('contact_email')||'').trim(),
        package_id:String(fd.get('package_id')||'').trim()||null,
        package_name:opt?.dataset?.name||opt?.textContent?.split(' — ')[0]||'Custom Sponsor Package',
        amount_cents:Math.round(usd*100),
        billing_interval:String(fd.get('billing_interval')||'month'),
        campaign_start:String(fd.get('campaign_start')||'').trim()||null,
        campaign_end:String(fd.get('campaign_end')||'').trim()||null,
        status:String(fd.get('status')||'draft'),
        payment_provider:String(fd.get('payment_url')||'').trim()?'manual_link':null,
        payment_url:String(fd.get('payment_url')||'').trim()||null,
        internal_notes:String(fd.get('internal_notes')||'').trim()||null,
        created_by:typeof currentUser!=='undefined'?currentUser?.id:null
      };
      const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Creating…';
      const {error}=await db.from('sponsor_orders').insert(payload);
      if(error){btn.disabled=false;btn.textContent='Create Order';alert('Could not create order: '+error.message);return}
      if(payload.inquiry_id)await db.from('sponsor_inquiries').update({status:'won',updated_at:new Date().toISOString()}).eq('id',payload.inquiry_id);
      close();await loadOrders();openBillingAdmin();
    };
  }

  async function updateOrderStatus(id,status){
    const patch={status,updated_at:new Date().toISOString()};
    if(status==='paid')patch.paid_at=new Date().toISOString();
    if(status==='active')patch.activated_at=new Date().toISOString();
    const {error}=await db.from('sponsor_orders').update(patch).eq('id',id);
    if(error){alert('Could not update order: '+error.message);return}
    const order=orders.find(x=>x.id===id);if(order)Object.assign(order,patch);
  }

  async function openOrderDetails(id){
    const o=orders.find(x=>x.id===id);if(!o)return;
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-order-detail-overlay" role="dialog" aria-modal="true"><section class="pf-order-detail">'+
      '<header><div><small>'+safe(o.order_number)+'</small><h3>'+safe(o.company_name)+'</h3></div><button type="button" class="pf-order-detail-close">×</button></header>'+
      '<div class="pf-order-detail-grid"><div><small>Package</small><b>'+safe(o.package_name)+'</b></div><div><small>Amount</small><b>'+cents(o.amount_cents)+'</b></div><div><small>Status</small><b>'+safe(labelStatus(o.status))+'</b></div><div><small>Billing</small><b>'+safe(o.billing_interval)+'</b></div></div>'+
      '<div class="pf-order-contact"><b>'+safe(o.contact_name)+'</b><span>'+safe(o.contact_email)+'</span></div>'+
      '<div class="pf-order-dates"><span>Campaign: '+safe(o.campaign_start?fmtDate(o.campaign_start):'Not set')+(o.campaign_end?' → '+safe(fmtDate(o.campaign_end)):'')+'</span></div>'+
      (o.payment_url?'<a class="pf-order-payment-link" href="'+safe(o.payment_url)+'" target="_blank" rel="noopener">Open Payment Link ↗</a>':'<div class="pf-order-no-payment">No payment link attached yet.</div>')+
      '<div class="pf-order-detail-actions"><button type="button" data-edit-payment>Edit Payment Link</button><button type="button" data-activate-campaign>Create Campaign from Order</button></div>'+
      '<label>Internal notes<textarea rows="4" data-order-notes>'+safe(o.internal_notes||'')+'</textarea></label><button type="button" class="pf-order-save-notes">Save Notes</button>'+
    '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();overlay.querySelector('.pf-order-detail-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('[data-edit-payment]').onclick=()=>editPaymentLink(o);
    overlay.querySelector('[data-activate-campaign]').onclick=()=>createCampaignFromOrder(o);
    overlay.querySelector('.pf-order-save-notes').onclick=async()=>{
      const notes=overlay.querySelector('[data-order-notes]').value.trim()||null;
      const {error}=await db.from('sponsor_orders').update({internal_notes:notes,updated_at:new Date().toISOString()}).eq('id',o.id);
      if(error){alert('Could not save notes: '+error.message);return}o.internal_notes=notes;alert('Notes saved.');
    };
  }

  async function editPaymentLink(o){
    const value=prompt('Payment URL for '+o.company_name+':',o.payment_url||'');
    if(value===null)return;
    const url=value.trim();
    if(url&&!/^https?:\/\//i.test(url)){alert('Use a complete http:// or https:// URL.');return}
    const patch={payment_url:url||null,payment_provider:url?'manual_link':null,status:url&&o.status==='draft'?'payment_pending':o.status,updated_at:new Date().toISOString()};
    const {error}=await db.from('sponsor_orders').update(patch).eq('id',o.id);
    if(error){alert('Could not save payment link: '+error.message);return}
    Object.assign(o,patch);document.querySelector('.pf-order-detail-overlay')?.remove();openOrderDetails(o.id);
  }

  async function createCampaignFromOrder(o){
    if(!['paid','active'].includes(o.status)){
      if(!confirm('This order is not marked paid. Create the sponsor campaign anyway?'))return;
    }
    let packageRow=null;
    if(o.package_id){
      const {data}=await db.from('sponsor_packages').select('*').eq('id',o.package_id).maybeSingle();packageRow=data||null;
    }
    const placementMap={Home:'home_banner','Course Search':'course_search','Course Preview':'course_preview',Scorecard:'scorecard','Round Complete':'round_complete'};
    const placements=(packageRow?.placements||['round_complete']).map(x=>placementMap[x]).filter(Boolean);
    if(!placements.length)placements.push('round_complete');
    let created=0;
    for(const placement of placements){
      const payload={
        name:o.order_number+' · '+o.company_name+' · '+placement,
        sponsor_name:o.company_name,
        placement,
        headline:o.company_name,
        body:'Sponsored partner of ParFolio',
        cta_label:'Learn more',
        click_url:null,
        active:false,
        priority:o.package_id==='exclusive'?10:o.package_id==='featured'?50:100,
        start_at:o.campaign_start?new Date(o.campaign_start+'T00:00:00').toISOString():null,
        end_at:o.campaign_end?new Date(o.campaign_end+'T23:59:59').toISOString():null,
        created_by:typeof currentUser!=='undefined'?currentUser?.id:null
      };
      const {error}=await db.from('monetization_campaigns').insert(payload);if(!error)created++;
    }
    if(created){
      const patch={status:'active',activated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await db.from('sponsor_orders').update(patch).eq('id',o.id);Object.assign(o,patch);
      alert(created+' sponsor placement'+(created===1?'':'s')+' created. They are OFF by default so you can add final creative before activating them.');
    }else alert('No campaign placements were created.');
  }

  const observer=new MutationObserver(()=>injectBillingButton());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(injectBillingButton,0);
  window.openSponsorBillingAdmin=openBillingAdmin;
})();