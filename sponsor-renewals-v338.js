/* ParFolio v338 — sponsor renewal management. */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{if(!v)return'';try{return new Date(v+'T12:00:00').toLocaleDateString()}catch{return v}};
  const addMonths=(dateStr,months)=>{
    const d=new Date(dateStr+'T12:00:00'); d.setMonth(d.getMonth()+months);
    return d.toISOString().slice(0,10);
  };
  function daysUntil(dateStr){
    if(!dateStr)return null;
    const end=new Date(dateStr+'T23:59:59').getTime();
    const now=new Date(); now.setHours(0,0,0,0);
    return Math.ceil((end-now.getTime())/86400000);
  }
  function bucket(order){
    const d=daysUntil(order.campaign_end);
    if(d===null)return'none';
    if(d<0)return'expired';
    if(d<=7)return'7';
    if(d<=14)return'14';
    return'later';
  }
  async function load(){
    const {data,error}=await db.from('sponsor_orders').select('*').in('status',['paid','active','completed']).order('campaign_end',{ascending:true});
    if(error)throw error;
    return data||[];
  }
  function inject(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-renewals-admin]'))return;
    const s=document.createElement('section');s.className='pf-mon-section';s.dataset.pfRenewalsAdmin='1';
    s.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Renewals</h3><small>14-day · 7-day · expired alerts</small></div><button type="button" class="pf-mon-add">Open Renewals</button></div>';
    s.querySelector('button').onclick=openRenewals;panel.appendChild(s);
  }
  function row(o){
    const d=daysUntil(o.campaign_end),b=bucket(o);
    const label=b==='expired'?'EXPIRED '+Math.abs(d)+' DAY'+(Math.abs(d)===1?'':'S')+' AGO':d+' DAY'+(d===1?'':'S')+' LEFT';
    return '<article class="pf-renewal-row '+b+'"><div><small>'+safe(label)+'</small><b>'+safe(o.company_name)+'</b><span>'+safe(o.package_name)+' · $'+(Number(o.amount_cents||0)/100).toFixed(2)+' / '+safe(o.billing_interval)+'</span><em>'+fmt(o.campaign_start)+' → '+fmt(o.campaign_end)+'</em></div><div class="pf-renewal-actions"><button type="button" data-renew="'+safe(o.id)+'">Create Renewal</button><button type="button" class="secondary" data-note="'+safe(o.id)+'">Add Note</button></div></article>';
  }
  async function openRenewals(){
    if(!isSuper())return;
    let orders=[];try{orders=await load()}catch(e){alert('Could not load renewals: '+e.message);return}
    const groups={14:[],7:[],expired:[],later:[],none:[]};
    orders.forEach(o=>groups[bucket(o)].push(o));
    document.querySelector('.pf-renewal-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-renewal-overlay"><section class="pf-renewal-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Renewals</h2><p>Protect recurring revenue before campaigns expire.</p></div><button type="button" class="pf-renewal-close">×</button></header>'+
      '<div class="pf-renewal-summary"><div><small>14 Days</small><b>'+groups[14].length+'</b></div><div><small>7 Days</small><b>'+groups[7].length+'</b></div><div><small>Expired</small><b>'+groups.expired.length+'</b></div></div>'+
      section('Renewal due within 7 days',groups[7])+
      section('Renewal due within 14 days',groups[14])+
      section('Expired campaigns',groups.expired)+
      '<section class="pf-renewal-later"><details><summary>Later renewals ('+groups.later.length+')</summary><div class="pf-renewal-list">'+groups.later.map(row).join('')+'</div></details></section>'+
    '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.pf-renewal-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelectorAll('[data-renew]').forEach(btn=>btn.onclick=()=>createRenewal(orders.find(x=>x.id===btn.dataset.renew)));
    o.querySelectorAll('[data-note]').forEach(btn=>btn.onclick=()=>addNote(orders.find(x=>x.id===btn.dataset.note)));
  }
  function section(title,rows){
    return '<section><div class="pf-renewal-head"><h3>'+safe(title)+'</h3><small>'+rows.length+'</small></div><div class="pf-renewal-list">'+(rows.length?rows.map(row).join(''):'<div class="pf-renewal-empty">Nothing due here.</div>')+'</div></section>';
  }
  async function createRenewal(o){
    if(!o)return;
    const months=o.billing_interval==='year'?12:o.billing_interval==='quarter'?3:1;
    const start=o.campaign_end?addMonths(o.campaign_end,0):new Date().toISOString().slice(0,10);
    const startDate=new Date(start+'T12:00:00');startDate.setDate(startDate.getDate()+1);
    const renewalStart=startDate.toISOString().slice(0,10);
    const renewalEnd=addMonths(renewalStart,months);
    const confirmText='Create renewal for '+o.company_name+'\n\n'+o.package_name+'\n$'+(Number(o.amount_cents||0)/100).toFixed(2)+' / '+o.billing_interval+'\n'+fmt(renewalStart)+' → '+fmt(renewalEnd);
    if(!confirm(confirmText))return;
    const payload={
      inquiry_id:o.inquiry_id||null,
      company_name:o.company_name,
      contact_name:o.contact_name,
      contact_email:o.contact_email,
      package_id:o.package_id||null,
      package_name:o.package_name,
      amount_cents:o.amount_cents,
      billing_interval:o.billing_interval,
      campaign_start:renewalStart,
      campaign_end:renewalEnd,
      status:'draft',
      renewal_of_order_id:o.id,
      renewal_created_at:new Date().toISOString(),
      internal_notes:'Renewal of '+o.order_number,
      created_by:typeof currentUser!=='undefined'?currentUser?.id:null
    };
    const {data,error}=await db.from('sponsor_orders').insert(payload).select().single();
    if(error){alert('Could not create renewal: '+error.message);return}
    alert('Renewal order '+data.order_number+' created as DRAFT. Review the dates and payment link before sending.');
    document.querySelector('.pf-renewal-overlay')?.remove();openRenewals();
  }
  async function addNote(o){
    if(!o)return;
    const note=prompt('Renewal note for '+o.company_name+':');
    if(!note?.trim())return;
    const {error}=await db.from('sponsor_renewal_notes').insert({order_id:o.id,note:note.trim(),created_by:typeof currentUser!=='undefined'?currentUser?.id:null});
    if(error){alert('Could not save renewal note: '+error.message);return}
    alert('Renewal note saved.');
  }
  const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});setTimeout(inject,0);
  window.openSponsorRenewals=openRenewals;
})();