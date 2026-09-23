/* ParFolio v339 — monetization revenue dashboard. */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const money=c=>'$'+(Number(c||0)/100).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0});
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function monthlyValue(o){
    const cents=Number(o.amount_cents||0);
    if(o.billing_interval==='year')return cents/12;
    if(o.billing_interval==='quarter')return cents/3;
    if(o.billing_interval==='one_time')return 0;
    return cents;
  }
  function inject(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-revenue-admin]'))return;
    const s=document.createElement('section');s.className='pf-mon-section';s.dataset.pfRevenueAdmin='1';
    s.innerHTML='<div class="pf-mon-section-head"><div><h3>Revenue Dashboard</h3><small>MRR · pipeline · renewals · collections</small></div><button type="button" class="pf-mon-add">View Revenue</button></div>';
    s.querySelector('button').onclick=openDashboard;panel.appendChild(s);
  }
  async function openDashboard(){
    if(!isSuper())return;
    const [ordersRes,leadsRes,settingsRes]=await Promise.all([
      db.from('sponsor_orders').select('*').order('created_at',{ascending:false}).limit(1000),
      db.from('sponsor_inquiries').select('id,status,package_id,created_at').order('created_at',{ascending:false}).limit(1000),
      db.from('monetization_settings').select('monthly_sponsor_goal_cents').eq('id',1).maybeSingle()
    ]);
    if(ordersRes.error||leadsRes.error){alert('Could not load revenue data.');return}
    const orders=ordersRes.data||[],leads=leadsRes.data||[],goal=Number(settingsRes.data?.monthly_sponsor_goal_cents||0);
    const active=orders.filter(o=>o.status==='active');
    const mrr=Math.round(active.reduce((n,o)=>n+monthlyValue(o),0));
    const paid=orders.filter(o=>['paid','active','completed'].includes(o.status)).reduce((n,o)=>n+Number(o.amount_cents||0),0);
    const outstanding=orders.filter(o=>['sent','accepted','payment_pending','past_due'].includes(o.status)).reduce((n,o)=>n+Number(o.amount_cents||0),0);
    const pipeline=orders.filter(o=>['draft','sent','accepted','payment_pending'].includes(o.status)).reduce((n,o)=>n+Number(o.amount_cents||0),0);
    const qualified=leads.filter(l=>['qualified','contacted'].includes(l.status)).length;
    const won=leads.filter(l=>l.status==='won').length;
    const renewals=orders.filter(o=>o.renewal_of_order_id&&['draft','sent','accepted','payment_pending'].includes(o.status)).reduce((n,o)=>n+Number(o.amount_cents||0),0);
    const pct=goal?Math.min(100,Math.round(mrr/goal*100)):0;
    const recent=orders.slice(0,8);

    document.querySelector('.pf-revenue-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-revenue-overlay"><section class="pf-revenue-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Revenue Dashboard</h2><p>Sponsorship revenue, pipeline and renewal health.</p></div><button type="button" class="pf-revenue-close">×</button></header>'+
      '<div class="pf-revenue-goal"><div><small>MONTHLY SPONSOR GOAL</small><b>'+money(goal)+'</b><span>'+money(mrr)+' current MRR · '+pct+'%</span></div><div class="pf-revenue-progress"><i style="width:'+pct+'%"></i></div><button type="button" class="pf-revenue-goal-edit">Edit Goal</button></div>'+
      '<div class="pf-revenue-kpis">'+
        '<div><small>MRR</small><b>'+money(mrr)+'</b><span>'+active.length+' active sponsor'+(active.length===1?'':'s')+'</span></div>'+
        '<div><small>Paid Revenue</small><b>'+money(paid)+'</b><span>all recorded orders</span></div>'+
        '<div><small>Outstanding</small><b>'+money(outstanding)+'</b><span>sent / pending / past due</span></div>'+
        '<div><small>Pipeline</small><b>'+money(pipeline)+'</b><span>'+qualified+' warm lead'+(qualified===1?'':'s')+'</span></div>'+
        '<div><small>Renewal Pipeline</small><b>'+money(renewals)+'</b><span>draft + pending renewals</span></div>'+
        '<div><small>Won Leads</small><b>'+won+'</b><span>sponsor opportunities converted</span></div>'+
      '</div>'+
      '<section><div class="pf-revenue-head"><h3>Recent Orders</h3><small>'+orders.length+' total</small></div><div class="pf-revenue-orders">'+
      (recent.length?recent.map(o=>'<article><div><small>'+safe(o.order_number)+' · '+safe(o.status.toUpperCase())+'</small><b>'+safe(o.company_name)+'</b><span>'+safe(o.package_name)+'</span></div><strong>'+money(o.amount_cents)+'</strong></article>').join(''):'<div class="pf-revenue-empty">No sponsor orders yet.</div>')+
      '</div></section>'+
    '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-revenue-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('.pf-revenue-goal-edit').onclick=()=>editGoal(goal);
  }
  async function editGoal(current){
    const raw=prompt('Monthly sponsor revenue goal (USD):',String(Math.round(current/100)));
    if(raw===null)return;
    const usd=Math.max(0,Math.round(Number(raw)));
    if(!Number.isFinite(usd)){alert('Enter a valid dollar amount.');return}
    const {error}=await db.from('monetization_settings').update({monthly_sponsor_goal_cents:usd*100,updated_at:new Date().toISOString(),updated_by:typeof currentUser!=='undefined'?currentUser?.id:null}).eq('id',1);
    if(error){alert('Could not save revenue goal: '+error.message);return}
    document.querySelector('.pf-revenue-overlay')?.remove();openDashboard();
  }
  const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});setTimeout(inject,0);
  window.openParFolioRevenueDashboard=openDashboard;
})();