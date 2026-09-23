/* ParFolio v337 — sponsor report snapshots and printable branded reports. */
(function(){
 const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pct=n=>Number(n||0).toFixed(2)+'%';
 const date=v=>{try{return new Date(v+'T12:00:00').toLocaleDateString()}catch{return v||''}};
 function inject(){
   if(!isSuper())return;
   const panel=document.querySelector('.pf-monetization-panel');
   if(!panel||panel.querySelector('[data-pf-reports-admin]'))return;
   const s=document.createElement('section');s.className='pf-mon-section';s.dataset.pfReportsAdmin='1';
   s.innerHTML='<div class="pf-mon-section-head"><div><h3>Sponsor Reports</h3><small>Monthly snapshots · print / save PDF</small></div><button type="button" class="pf-mon-add">Open Reports</button></div>';
   s.querySelector('button').onclick=openCenter;panel.appendChild(s);
 }
 async function openCenter(){
   const [c,r]=await Promise.all([
     db.from('monetization_campaigns').select('id,sponsor_name,headline,placement,active').order('created_at',{ascending:false}),
     db.from('sponsor_reports').select('*').order('created_at',{ascending:false}).limit(200)
   ]);
   const campaigns=c.data||[],reports=r.data||[];
   const host=document.createElement('div');
   host.innerHTML='<div class="pf-report-overlay"><section class="pf-report-panel"><header><div><small>PARFOLIO BUSINESS</small><h2>Sponsor Reports</h2><p>Create locked performance snapshots you can print or save as PDF for advertisers.</p></div><button class="pf-report-close" type="button">×</button></header><section><div class="pf-report-head"><h3>Create Report</h3></div><div class="pf-report-form"><label>Campaign<select name="campaign"><option value="">Choose campaign</option>'+campaigns.map(x=>'<option value="'+safe(x.id)+'">'+safe(x.sponsor_name)+' — '+safe(x.placement)+'</option>').join('')+'</select></label><div class="pf-form-grid"><label>Start<input name="start" type="date"></label><label>End<input name="end" type="date"></label></div><label>Notes<textarea name="notes" rows="3" placeholder="Optional summary for the sponsor"></textarea></label><button type="button" class="pf-report-generate">Generate Snapshot</button></div></section><section><div class="pf-report-head"><h3>Saved Reports</h3><small>'+reports.length+'</small></div><div class="pf-report-list">'+(reports.length?reports.map(x=>'<article><div><small>'+safe(x.sponsor_name)+' · '+safe(x.placement||'')+'</small><b>'+date(x.period_start)+' – '+date(x.period_end)+'</b><span>'+x.impressions+' impressions · '+x.clicks+' clicks · '+pct(x.ctr)+'</span></div><button data-report="'+safe(x.id)+'">View</button></article>').join(''):'<div class="pf-report-empty">No saved reports yet.</div>')+'</div></section></section></div>';
   const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.pf-report-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
   o.querySelector('.pf-report-generate').onclick=()=>generate(o,campaigns);
   o.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>viewReport(reports.find(x=>x.id===b.dataset.report)));
 }
 async function generate(o,campaigns){
   const id=o.querySelector('[name=campaign]').value,start=o.querySelector('[name=start]').value,end=o.querySelector('[name=end]').value,notes=o.querySelector('[name=notes]').value.trim()||null;
   if(!id||!start||!end){alert('Choose a campaign and report dates.');return}
   const c=campaigns.find(x=>x.id===id);if(!c)return;
   const from=new Date(start+'T00:00:00').toISOString(),to=new Date(end+'T23:59:59').toISOString();
   const {data,error}=await db.from('sponsor_ad_events').select('event_type').eq('campaign_id',id).gte('occurred_at',from).lte('occurred_at',to).limit(10000);
   if(error){alert(error.message);return}
   const impressions=(data||[]).filter(x=>x.event_type==='impression').length,clicks=(data||[]).filter(x=>x.event_type==='click').length,ctr=impressions?clicks/impressions*100:0;
   const payload={campaign_id:id,sponsor_name:c.sponsor_name,headline:c.headline,placement:c.placement,period_start:start,period_end:end,impressions,clicks,ctr,report_notes:notes,created_by:typeof currentUser!=='undefined'?currentUser?.id:null};
   const ins=await db.from('sponsor_reports').insert(payload).select().single();
   if(ins.error){alert(ins.error.message);return}
   document.querySelector('.pf-report-overlay')?.remove();viewReport(ins.data);
 }
 function viewReport(r){
   if(!r)return;
   document.querySelector('.pf-report-view-overlay')?.remove();
   const host=document.createElement('div');
   host.innerHTML='<div class="pf-report-view-overlay"><section class="pf-report-sheet"><header><div><small>PARFOLIO SPONSOR PERFORMANCE REPORT</small><h1>'+safe(r.sponsor_name)+'</h1><p>'+date(r.period_start)+' – '+date(r.period_end)+'</p></div><div class="pf-report-brand">PARFOLIO</div></header><div class="pf-report-campaign"><small>CAMPAIGN</small><b>'+safe(r.headline||r.sponsor_name)+'</b><span>'+safe(String(r.placement||'').replaceAll('_',' '))+'</span></div><div class="pf-report-kpis"><div><small>Impressions</small><b>'+Number(r.impressions).toLocaleString()+'</b></div><div><small>Clicks</small><b>'+Number(r.clicks).toLocaleString()+'</b></div><div><small>CTR</small><b>'+pct(r.ctr)+'</b></div></div>'+(r.report_notes?'<div class="pf-report-notes"><small>SUMMARY</small><p>'+safe(r.report_notes)+'</p></div>':'')+'<footer><b>ParFolio</b><span>Your Game. Your Score. Your Story.</span></footer><div class="pf-report-toolbar"><button type="button" class="pf-report-back">Close</button><button type="button" class="pf-report-print">Print / Save PDF</button></div></section></div>';
   const o=host.firstElementChild;document.body.appendChild(o);o.querySelector('.pf-report-back').onclick=()=>o.remove();o.querySelector('.pf-report-print').onclick=()=>window.print();
 }
 const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});setTimeout(inject,0);window.openSponsorReports=openCenter;
})();