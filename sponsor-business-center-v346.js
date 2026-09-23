/* ParFolio v346 — Sponsor Business Center account-view hotfix */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const tools=[
    {key:'prospects',icon:'◎',title:'Sponsor Prospects',desc:'Research, Ready, Contacted, Qualified and Won leads.',open:'openSponsorProspectCRM'},
    {key:'sales',icon:'✦',title:'Sponsor Sales',desc:'Packages, inquiries and sponsor lead management.',open:'openSponsorSalesAdmin'},
    {key:'billing',icon:'$',title:'Orders & Billing',desc:'Create sponsor orders, track value and payment status.',open:'openSponsorBillingAdmin'},
    {key:'creative',icon:'▣',title:'Creative Intake',desc:'Collect assets, sponsor approval and create campaigns.',open:'openSponsorCreativeIntake'},
    {key:'campaigns',icon:'▶',title:'Campaigns',desc:'Review placements, targeting and activate approved ads.',open:'openMonetizationAdmin'},
    {key:'analytics',icon:'↗',title:'Sponsor Analytics',desc:'Impressions, clicks and campaign performance.',open:'openSponsorAnalytics'},
    {key:'reports',icon:'▤',title:'Reports & Renewals',desc:'Sponsor reports, upcoming renewals and follow-up.',open:'openSponsorReports',secondary:'openSponsorRenewals'},
    {key:'revenue',icon:'◆',title:'Revenue Dashboard',desc:'MRR, paid revenue, pipeline and sponsor goal.',open:'openParFolioRevenueDashboard'}
  ];

  function closeAll(){
    document.querySelector('.pf-business-center-overlay')?.remove();
  }

  function invoke(name){
    const fn=window[name];
    if(typeof fn!=='function'){
      alert('This Sponsor Business Center module is still loading. Close this message and try again.');
      return;
    }
    closeAll();
    fn();
  }

  function toolCard(t){
    const second=t.secondary?'<button type="button" class="pf-bc-secondary" data-bc-open="'+esc(t.secondary)+'">Renewals</button>':'';
    return '<article class="pf-bc-card">'+
      '<button type="button" class="pf-bc-main" data-bc-open="'+esc(t.open)+'">'+
        '<span class="pf-bc-icon">'+esc(t.icon)+'</span>'+
        '<span class="pf-bc-copy"><b>'+esc(t.title)+'</b><small>'+esc(t.desc)+'</small></span>'+
        '<span class="pf-bc-arrow">›</span>'+
      '</button>'+second+
    '</article>';
  }

  function open(){
    if(!isSuper())return;
    closeAll();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-business-center-overlay" role="dialog" aria-modal="true" aria-label="Sponsor Business Center">'+
      '<section class="pf-business-center">'+
        '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Business Center</h2><p>Run the sponsor business from prospecting through revenue and renewal.</p></div><button type="button" class="pf-bc-close" aria-label="Close">×</button></header>'+
        '<div class="pf-bc-flow"><span>Prospect</span><i>›</i><span>Sell</span><i>›</i><span>Creative</span><i>›</i><span>Campaign</span><i>›</i><span>Measure</span><i>›</i><span>Renew</span></div>'+
        '<div class="pf-bc-grid">'+tools.map(toolCard).join('')+'</div>'+
        '<section class="pf-bc-quick"><div><small>QUICK CONTROL</small><b>Advertising & placement settings</b><p>Master ad switch, direct sponsor controls, placement availability and active campaigns.</p></div><button type="button" data-bc-open="openMonetizationAdmin">Open Monetization</button></section>'+
        '<footer><span>🔒 Super Admin only</span><span>Live GPS / hole screen remains ad-free</span></footer>'+
      '</section>'+
    '</div>';
    const overlay=host.firstElementChild;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.pf-bc-close').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelectorAll('[data-bc-open]').forEach(btn=>btn.onclick=()=>invoke(btn.dataset.bcOpen));
  }

  function inject(){
    if(!isSuper())return;
    const app=document.getElementById('app');
    if(!app||app.querySelector('[data-pf-business-center]'))return;

    const title=[...app.querySelectorAll('h1')].find(el=>el.textContent.trim()==='My Account');
    if(!title)return;

    const button=document.createElement('button');
    button.type='button';
    button.dataset.pfBusinessCenter='1';
    button.className='pf-business-center-entry';
    button.innerHTML='<span><small>SUPER ADMIN</small><b>Sponsor Business Center</b><em>Prospects · Sales · Creative · Campaigns · Revenue</em></span><strong>›</strong>';
    button.onclick=open;

    const addAdmin=[...app.querySelectorAll('button')].find(el=>el.textContent.trim()==='Add Course Admin');
    const signOut=[...app.querySelectorAll('button')].find(el=>el.textContent.trim()==='Sign Out');
    const anchor=addAdmin||signOut;
    if(anchor)app.insertBefore(button,anchor);
    else app.appendChild(button);
  }

  window.openSponsorBusinessCenter=open;
  const obs=new MutationObserver(inject);
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(inject,0);
})();