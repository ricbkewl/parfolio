/* ParFolio v354 — sponsor CRM + Follow-Up Command Center. */
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
      '<div class="pf-prospect-actions"><select data-prospect-status="'+safe(p.id)+'">'+statusOptions(p.status)+'</select><button type="button" data-prospect-timeline="'+safe(p.id)+'">Timeline</button><button type="button" data-prospect-details="'+safe(p.id)+'">Details</button></div>'+
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
      '<button type="button" class="pf-prospect-command">Follow-Up Command Center</button><button type="button" class="pf-prospect-add">＋ Add Prospect</button></div></section>'+
      '<section><div class="pf-prospect-head"><h3>Prospects</h3><small data-prospect-count>'+prospects.length+' shown</small></div><div class="pf-prospect-list" data-prospect-list>'+prospects.map(prospectRow).join('')+'</div></section>'+
    '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('.pf-prospect-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('.pf-prospect-add').onclick=openAddProspect;
    o.querySelector('.pf-prospect-command').onclick=openFollowUpCommandCenter;
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
    root.querySelectorAll('[data-prospect-timeline]').forEach(btn=>btn.onclick=()=>openTimeline(btn.dataset.prospectTimeline));
    root.querySelectorAll('[data-prospect-details]').forEach(btn=>btn.onclick=()=>openDetails(btn.dataset.prospectDetails));
  }

  async function addActivity(prospectId,payload){
    const row={
      prospect_id:prospectId,
      activity_type:payload.activity_type,
      direction:payload.direction||'internal',
      channel:payload.channel||null,
      subject:payload.subject||null,
      outcome:payload.outcome||null,
      gmail_message_id:payload.gmail_message_id||null,
      gmail_thread_id:payload.gmail_thread_id||null,
      external_reference:payload.external_reference||null,
      notes:payload.notes||null,
      occurred_at:payload.occurred_at||new Date().toISOString(),
      created_by:typeof currentUser!=='undefined'?currentUser?.id:null
    };
    const {error}=await db.from('sponsor_prospect_activities').insert(row);
    if(error)throw error;
  }

  async function updateStatus(id,status){
    const p=prospects.find(x=>x.id===id);
    const previous=p?.status||null;
    const patch={status,updated_at:new Date().toISOString()};
    if(status==='contacted'&&!p?.last_contacted_at)patch.last_contacted_at=new Date().toISOString();
    const {error}=await db.from('sponsor_prospects').update(patch).eq('id',id);
    if(error){alert('Could not update prospect: '+error.message);return}
    if(p)Object.assign(p,patch);
    if(previous&&previous!==status){
      try{
        await addActivity(id,{
          activity_type:'status_change',
          direction:'internal',
          channel:'CRM',
          subject:'Status changed',
          outcome:status,
          notes:'Status changed from '+previous.replaceAll('_',' ')+' to '+status.replaceAll('_',' ')+'.'
        });
      }catch(e){console.warn('Could not log sponsor status change',e)}
    }
  }

  const activityLabels={
    email_sent:'Email sent',
    email_reply:'Human reply',
    email_bounce:'Bounce',
    auto_reply:'Auto reply',
    form_submitted:'Form submitted',
    call:'Call',
    voicemail:'Voicemail',
    meeting:'Meeting',
    follow_up:'Follow-up',
    status_change:'Status change',
    note:'Note',
    do_not_contact:'Do not contact'
  };

  const activityIcons={
    email_sent:'✉',email_reply:'↩',email_bounce:'!',auto_reply:'↻',form_submitted:'✓',
    call:'☎',voicemail:'◉',meeting:'●',follow_up:'→',status_change:'⇄',note:'✎',do_not_contact:'×'
  };

  function fmtDate(v){
    if(!v)return '';
    const d=new Date(v);
    return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function activityCard(a){
    return '<article class="pf-activity-card type-'+safe(a.activity_type)+'">'+
      '<div class="pf-activity-icon">'+safe(activityIcons[a.activity_type]||'•')+'</div>'+
      '<div class="pf-activity-copy"><div class="pf-activity-top"><b>'+safe(activityLabels[a.activity_type]||a.activity_type)+'</b><time>'+safe(fmtDate(a.occurred_at))+'</time></div>'+
      (a.subject?'<strong>'+safe(a.subject)+'</strong>':'')+
      '<small>'+safe([a.direction,a.channel,a.outcome].filter(Boolean).join(' · '))+'</small>'+
      (a.notes?'<p>'+safe(a.notes)+'</p>':'')+
      ((a.gmail_message_id||a.gmail_thread_id||a.external_reference)?'<em>'+safe([
        a.gmail_message_id?'Gmail '+a.gmail_message_id:'',
        a.gmail_thread_id?'Thread '+a.gmail_thread_id:'',
        a.external_reference||''
      ].filter(Boolean).join(' · '))+'</em>':'')+
      '</div></article>';
  }

  async function openTimeline(id){
    const p=prospects.find(x=>x.id===id);if(!p)return;
    document.querySelector('.pf-activity-overlay')?.remove();
    const {data,error}=await db.from('sponsor_prospect_activities').select('*').eq('prospect_id',id).order('occurred_at',{ascending:false}).limit(250);
    if(error){alert('Could not load activity timeline: '+error.message);return}
    const activities=data||[];
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-activity-overlay"><section class="pf-activity-panel">'+
      '<header><div><small>SPONSOR ACTIVITY</small><h2>'+safe(p.company_name)+'</h2><p>'+activities.length+' recorded touch'+(activities.length===1?'':'es')+'</p></div><button type="button" class="pf-activity-close">×</button></header>'+
      '<div class="pf-activity-toolbar"><button type="button" class="primary" data-add-activity>＋ Add Activity</button>'+
      (p.contact_email?'<a href="mailto:'+safe(p.contact_email)+'">Email '+safe(p.contact_name||p.company_name)+'</a>':'')+
      (p.contact_url?'<a href="'+safe(p.contact_url)+'" target="_blank" rel="noopener">Open contact route ↗</a>':'')+'</div>'+
      '<div class="pf-activity-list">'+(activities.length?activities.map(activityCard).join(''):'<div class="pf-prospect-empty">No activity recorded yet.</div>')+'</div>'+
      '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-activity-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('[data-add-activity]').onclick=()=>openAddActivity(p,()=>{close();openTimeline(id)});
  }

  function openAddActivity(p,onSaved){
    document.querySelector('.pf-add-activity-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-add-activity-overlay"><form class="pf-add-activity-form">'+
      '<header><div><small>LOG ACTIVITY</small><h3>'+safe(p.company_name)+'</h3></div><button type="button" class="pf-add-activity-close">×</button></header>'+
      '<div class="pf-form-grid"><label>Activity type<select name="activity_type">'+
      Object.keys(activityLabels).filter(x=>x!=='status_change').map(x=>'<option value="'+x+'">'+safe(activityLabels[x])+'</option>').join('')+
      '</select></label><label>Direction<select name="direction"><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="internal">Internal</option></select></label></div>'+
      '<div class="pf-form-grid"><label>Channel<input name="channel" placeholder="Email, form, phone, CRM..."></label><label>Outcome<input name="outcome" placeholder="sent, replied, bounced, scheduled..."></label></div>'+
      '<label>Subject<input name="subject" placeholder="What happened?"></label>'+
      '<div class="pf-form-grid"><label>Gmail message ID<input name="gmail_message_id"></label><label>Gmail thread ID<input name="gmail_thread_id"></label></div>'+
      '<label>External reference<input name="external_reference" placeholder="Confirmation #, form reference, URL..."></label>'+
      '<label>Notes<textarea name="notes" rows="4"></textarea></label>'+
      '<div class="pf-detail-actions"><button type="button" class="secondary pf-add-activity-cancel">Cancel</button><button type="submit" class="primary">Save Activity</button></div>'+
      '</form></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-add-activity-close').onclick=close;o.querySelector('.pf-add-activity-cancel').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    const type=o.querySelector('[name=activity_type]'),dir=o.querySelector('[name=direction]'),channel=o.querySelector('[name=channel]'),outcome=o.querySelector('[name=outcome]');
    const applyDefaults=()=>{
      const t=type.value;
      dir.value=['email_reply','email_bounce','auto_reply'].includes(t)?'inbound':(t==='note'?'internal':'outbound');
      channel.value=t.startsWith('email_')?'Email':t==='form_submitted'?'Web form':t==='call'||t==='voicemail'?'Phone':t==='meeting'?'Meeting':t==='note'?'CRM':'';
      outcome.value=t==='email_sent'?'sent':t==='email_reply'?'replied':t==='email_bounce'?'bounced':t==='auto_reply'?'auto_reply':t==='form_submitted'?'submitted':t==='do_not_contact'?'suppressed':'';
    };
    type.onchange=applyDefaults;applyDefaults();
    o.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget);
      const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Saving…';
      try{
        await addActivity(p.id,{
          activity_type:String(fd.get('activity_type')),
          direction:String(fd.get('direction')),
          channel:String(fd.get('channel')||'').trim()||null,
          subject:String(fd.get('subject')||'').trim()||null,
          outcome:String(fd.get('outcome')||'').trim()||null,
          gmail_message_id:String(fd.get('gmail_message_id')||'').trim()||null,
          gmail_thread_id:String(fd.get('gmail_thread_id')||'').trim()||null,
          external_reference:String(fd.get('external_reference')||'').trim()||null,
          notes:String(fd.get('notes')||'').trim()||null
        });
        const t=String(fd.get('activity_type'));
        const patch={updated_at:new Date().toISOString()};
        if(t==='email_reply')patch.status='replied';
        if(t==='email_bounce'){patch.status='ready';patch.next_follow_up=null}
        if(t==='do_not_contact'){patch.status='do_not_contact';patch.next_follow_up=null}
        if(t==='email_sent'){patch.status='contacted';patch.last_contacted_at=new Date().toISOString()}
        if(Object.keys(patch).length>1||t==='email_sent'){
          const {error}=await db.from('sponsor_prospects').update(patch).eq('id',p.id);
          if(!error)Object.assign(p,patch);
        }
        close();onSaved?.();
      }catch(err){btn.disabled=false;btn.textContent='Save Activity';alert('Could not save activity: '+err.message)}
    };
  }


  async function loadRecentActivities(){
    if(!isSuper()||typeof db==='undefined')return[];
    const since=new Date(Date.now()-45*86400000).toISOString();
    const {data,error}=await db.from('sponsor_prospect_activities')
      .select('id,prospect_id,activity_type,direction,channel,subject,outcome,notes,occurred_at,gmail_message_id,gmail_thread_id')
      .gte('occurred_at',since)
      .order('occurred_at',{ascending:false})
      .limit(2500);
    if(error)throw error;
    return data||[];
  }

  function latestActivityMap(activities){
    const map=new Map();
    activities.forEach(a=>{if(!map.has(a.prospect_id))map.set(a.prospect_id,a)});
    return map;
  }

  function latestTypeMap(activities,type){
    const map=new Map();
    activities.filter(a=>a.activity_type===type).forEach(a=>{if(!map.has(a.prospect_id))map.set(a.prospect_id,a)});
    return map;
  }

  function dateOnlyLocal(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }

  function commandBuckets(activities){
    const today=dateOnlyLocal();
    const latest=latestActivityMap(activities);
    const latestBounce=latestTypeMap(activities,'email_bounce');
    const latestReply=latestTypeMap(activities,'email_reply');
    const latestSent=latestTypeMap(activities,'email_sent');

    const active=p=>!['won','lost','do_not_contact'].includes(p.status);
    const dueToday=prospects.filter(p=>active(p)&&p.next_follow_up===today);
    const overdue=prospects.filter(p=>active(p)&&p.next_follow_up&&p.next_follow_up<today);
    const humanReplies=prospects.filter(p=>p.status==='replied'||latestReply.has(p.id));
    const doNotContact=prospects.filter(p=>p.status==='do_not_contact');

    const bounced=prospects.filter(p=>{
      if(!active(p))return false;
      const b=latestBounce.get(p.id),s=latestSent.get(p.id);
      if(!b)return false;
      return !s || new Date(b.occurred_at)>=new Date(s.occurred_at) || p.status==='ready';
    });

    const awaiting=prospects.filter(p=>{
      if(p.status!=='contacted')return false;
      const last=latest.get(p.id);
      if(!last)return true;
      return !['email_reply','email_bounce','do_not_contact'].includes(last.activity_type);
    });

    return {dueToday,overdue,awaiting,bounced,humanReplies,doNotContact,latest};
  }

  function commandProspectRow(p,last){
    return '<article class="pf-command-row">'+
      '<div><div class="pf-command-name"><span class="pf-priority p'+p.priority+'">P'+p.priority+'</span><b>'+safe(p.company_name)+'</b></div>'+
      '<small>'+safe(p.industry||'')+(p.contact_name?' · '+safe(p.contact_name):'')+'</small>'+
      '<em>'+(p.next_follow_up?'Follow up '+safe(p.next_follow_up):'No follow-up date')+
      (last?' · Last: '+safe(activityLabels[last.activity_type]||last.activity_type)+' '+safe(fmtDate(last.occurred_at)):'')+'</em></div>'+
      '<div class="pf-command-actions">'+
      (p.contact_email?'<a href="mailto:'+safe(p.contact_email)+'">Email</a>':'')+
      (p.contact_url?'<a href="'+safe(p.contact_url)+'" target="_blank" rel="noopener">Route ↗</a>':'')+
      '<button type="button" data-command-timeline="'+safe(p.id)+'">Timeline</button>'+
      '<button type="button" data-command-details="'+safe(p.id)+'">Details</button></div>'+
    '</article>';
  }

  function bucketCard(key,label,items,latest,description){
    return '<section class="pf-command-bucket" data-command-bucket="'+safe(key)+'">'+
      '<button class="pf-command-bucket-head" type="button" data-command-toggle="'+safe(key)+'">'+
        '<div><small>'+safe(description)+'</small><h3>'+safe(label)+'</h3></div><b>'+items.length+'</b>'+
      '</button>'+
      '<div class="pf-command-bucket-body" data-command-body="'+safe(key)+'">'+
        (items.length?items.map(p=>commandProspectRow(p,latest.get(p.id))).join(''):'<div class="pf-prospect-empty">Nothing in this bucket.</div>')+
      '</div></section>';
  }

  async function openFollowUpCommandCenter(){
    try{await loadProspects()}catch(e){alert('Could not load prospects: '+e.message);return}
    let activities=[];
    try{activities=await loadRecentActivities()}catch(e){alert('Could not load sponsor activity: '+e.message);return}
    const b=commandBuckets(activities);
    document.querySelector('.pf-command-overlay')?.remove();
    const host=document.createElement('div');
    host.innerHTML='<div class="pf-command-overlay"><section class="pf-command-panel">'+
      '<header><div><small>PARFOLIO SPONSOR OPS</small><h2>Follow-Up Command Center</h2><p>Work what needs attention now without digging through the full CRM.</p></div><button type="button" class="pf-command-close">×</button></header>'+
      '<div class="pf-command-summary">'+
        '<div><small>Due Today</small><b>'+b.dueToday.length+'</b></div>'+
        '<div><small>Overdue</small><b>'+b.overdue.length+'</b></div>'+
        '<div><small>Awaiting Reply</small><b>'+b.awaiting.length+'</b></div>'+
        '<div><small>Needs New Route</small><b>'+b.bounced.length+'</b></div>'+
        '<div><small>Human Replies</small><b>'+b.humanReplies.length+'</b></div>'+
        '<div><small>Do Not Contact</small><b>'+b.doNotContact.length+'</b></div>'+
      '</div>'+
      '<div class="pf-command-buckets">'+
        bucketCard('due','Due Today',b.dueToday,b.latest,'ACTION NOW')+
        bucketCard('overdue','Overdue',b.overdue,b.latest,'PAST DUE')+
        bucketCard('bounced','Bounced / Needs New Route',b.bounced,b.latest,'DELIVERY ISSUE')+
        bucketCard('replies','Human Replies',b.humanReplies,b.latest,'RESPONSES')+
        bucketCard('awaiting','Awaiting Reply',b.awaiting,b.latest,'OPEN OUTREACH')+
        bucketCard('dnc','Do Not Contact',b.doNotContact,b.latest,'SUPPRESSED')+
      '</div>'+
      '</section></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-command-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelectorAll('[data-command-toggle]').forEach(btn=>btn.onclick=()=>{
      const body=o.querySelector('[data-command-body="'+btn.dataset.commandToggle+'"]');
      body?.classList.toggle('collapsed');
    });
    o.querySelectorAll('[data-command-timeline]').forEach(btn=>btn.onclick=()=>openTimeline(btn.dataset.commandTimeline));
    o.querySelectorAll('[data-command-details]').forEach(btn=>btn.onclick=()=>openDetails(btn.dataset.commandDetails));
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
      '<div class="pf-detail-links">'+(p.website?'<a href="'+safe(p.website)+'" target="_blank" rel="noopener">Open website ↗</a>':'')+(p.contact_email?'<a href="mailto:'+safe(p.contact_email)+'">Email contact</a>':'')+(p.contact_url?'<a href="'+safe(p.contact_url)+'" target="_blank" rel="noopener">Contact route ↗</a>':'')+'<button type="button" data-detail-timeline>Activity Timeline</button></div>'+
      '<div class="pf-detail-actions"><button type="button" class="secondary pf-detail-cancel">Cancel</button><button type="submit" class="primary">Save Prospect</button></div>'+
    '</form></div>';
    const o=host.firstElementChild;document.body.appendChild(o);const close=()=>o.remove();
    o.querySelector('.pf-detail-close').onclick=close;o.querySelector('.pf-detail-cancel').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('[data-detail-timeline]').onclick=()=>openTimeline(id);
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
  window.openSponsorFollowUpCommandCenter=openFollowUpCommandCenter;
})();