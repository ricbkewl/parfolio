/* ParFolio v336 — sponsor performance analytics. Privacy-light: no user IDs, IPs, or personal profile data. */
(function(){
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const seen=new Set();
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context=()=>{
    try{
      if(typeof s!=='undefined'&&s?.v)return String(s.v).slice(0,80);
      return location.pathname.slice(0,80);
    }catch{return'unknown'}
  };
  async function record(campaignId,eventType,placement){
    if(typeof db==='undefined'||!campaignId||!eventType||!placement)return;
    try{
      await db.from('sponsor_ad_events').insert({
        campaign_id:campaignId,
        event_type:eventType,
        placement,
        page_context:context()
      });
    }catch{}
  }
  function observeAds(){
    document.querySelectorAll('.pf-ad-card[data-pf-campaign]').forEach(card=>{
      const campaign=card.getAttribute('data-pf-campaign');
      const slot=card.closest('[data-pf-monetization-slot]')?.getAttribute('data-pf-monetization-slot')||'';
      const key=campaign+'|'+slot;
      if(!seen.has(key)){
        seen.add(key);
        const io=new IntersectionObserver(entries=>{
          for(const entry of entries){
            if(entry.isIntersecting&&entry.intersectionRatio>=0.5){
              record(campaign,'impression',slot);
              io.disconnect();
              break;
            }
          }
        },{threshold:[0.5]});
        io.observe(card);
      }
      card.querySelectorAll('.pf-ad-cta').forEach(link=>{
        if(link.dataset.pfAnalyticsBound)return;
        link.dataset.pfAnalyticsBound='1';
        link.addEventListener('click',()=>record(campaign,'click',slot),{passive:true});
      });
    });
  }
  async function openAnalytics(){
    if(!isSuper())return;
    const since=new Date(Date.now()-30*86400000).toISOString();
    const [eventsRes,campaignsRes]=await Promise.all([
      db.from('sponsor_ad_events').select('campaign_id,event_type,placement,occurred_at').gte('occurred_at',since).order('occurred_at',{ascending:false}).limit(10000),
      db.from('monetization_campaigns').select('id,sponsor_name,headline,placement,active,priority').order('created_at',{ascending:false})
    ]);
    if(eventsRes.error){alert('Could not load sponsor analytics: '+eventsRes.error.message);return}
    const events=eventsRes.data||[],campaigns=campaignsRes.data||[];
    const rows=campaigns.map(c=>{
      const mine=events.filter(e=>e.campaign_id===c.id);
      const impressions=mine.filter(e=>e.event_type==='impression').length;
      const clicks=mine.filter(e=>e.event_type==='click').length;
      const ctr=impressions?((clicks/impressions)*100):0;
      return {...c,impressions,clicks,ctr};
    }).sort((a,b)=>b.impressions-a.impressions);
    const totals=rows.reduce((a,r)=>({impressions:a.impressions+r.impressions,clicks:a.clicks+r.clicks}),{impressions:0,clicks:0});
    const totalCtr=totals.impressions?(totals.clicks/totals.impressions*100):0;
    document.querySelector('.pf-analytics-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-analytics-overlay" role="dialog" aria-modal="true"><section class="pf-analytics-panel">'+
      '<header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Analytics</h2><p>Last 30 days · direct sponsor performance</p></div><button type="button" class="pf-analytics-close">×</button></header>'+
      '<div class="pf-analytics-summary"><div><small>Impressions</small><b>'+totals.impressions.toLocaleString()+'</b></div><div><small>Clicks</small><b>'+totals.clicks.toLocaleString()+'</b></div><div><small>CTR</small><b>'+totalCtr.toFixed(2)+'%</b></div></div>'+
      '<section><div class="pf-analytics-head"><h3>Campaign Performance</h3><small>'+rows.length+' campaign'+(rows.length===1?'':'s')+'</small></div>'+
      '<div class="pf-analytics-list">'+(rows.length?rows.map(r=>'<article class="pf-analytics-row">'+
        '<div><small>'+safe(r.placement.replaceAll('_',' ').toUpperCase())+(r.active?' · LIVE':' · OFF')+'</small><b>'+safe(r.sponsor_name)+'</b><span>'+safe(r.headline)+'</span></div>'+
        '<div class="pf-analytics-metrics"><span><b>'+r.impressions.toLocaleString()+'</b><small>Impr.</small></span><span><b>'+r.clicks.toLocaleString()+'</b><small>Clicks</small></span><span><b>'+r.ctr.toFixed(2)+'%</b><small>CTR</small></span></div>'+
      '</article>').join(''):'<div class="pf-analytics-empty">No sponsor campaign data yet.</div>')+'</div></section>'+
      '<section class="pf-analytics-note"><b>Privacy-light measurement</b><p>ParFolio records campaign, placement, event type and page context only. This dashboard does not require golfer names, email addresses, profiles or precise locations.</p></section>'+
    '</section></div>';
    const overlay=host.firstElementChild;document.body.appendChild(overlay);
    const close=()=>overlay.remove();overlay.querySelector('.pf-analytics-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  }
  function injectAdmin(){
    if(!isSuper())return;
    const panel=document.querySelector('.pf-monetization-panel');
    if(!panel||panel.querySelector('[data-pf-analytics-admin]'))return;
    const section=document.createElement('section');section.className='pf-mon-section';section.dataset.pfAnalyticsAdmin='1';
    section.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Analytics</h3><small>Impressions · clicks · CTR</small></div><button type="button" class="pf-mon-add">View Analytics</button></div>';
    section.querySelector('button').onclick=openAnalytics;
    panel.appendChild(section);
  }
  const obs=new MutationObserver(()=>{observeAds();injectAdmin()});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{observeAds();injectAdmin()},0);
  window.openSponsorAnalytics=openAnalytics;
})();