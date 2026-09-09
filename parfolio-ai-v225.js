/* ParFolio v225 — Swing AI + Shot Vision premium feature shell. */
(function(){
  const AI_STATE={shot:null,swing:null};
  const AI_ALLOWED_ROLES=new Set(['course_admin','super_admin']);
  const escHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const hasAIAccess=()=>typeof adminRole!=='undefined'&&AI_ALLOWED_ROLES.has(adminRole);

  function ensureStyles(){
    if(document.querySelector('link[data-parfolio-ai-v225]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='parfolio-ai-v225.css?v=225';link.dataset.parfolioAiV225='1';document.head.appendChild(link);
  }

  function closeAI(){document.querySelector('.pf-ai-shell')?.remove();}
  window.closeParFolioAI=closeAI;

  function shell(title,subtitle,body){
    ensureStyles();closeAI();
    const el=document.createElement('section');el.className='pf-ai-shell';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
    el.innerHTML=`<header class="pf-ai-top"><button class="pf-ai-back" aria-label="Back">‹</button><div><div class="pf-ai-kicker">PARFOLIO AI</div><h2>${escHtml(title)}</h2><p>${escHtml(subtitle)}</p></div><span class="pf-ai-pro">ADMIN PREVIEW</span></header><div class="pf-ai-body">${body}</div>`;
    el.querySelector('.pf-ai-back').onclick=()=>{if(title==='Swing AI'||title==='Shot Vision')openParFolioAI();else closeAI()};
    document.body.appendChild(el);return el;
  }

  window.openParFolioAI=function(){
    if(!hasAIAccess())return false;
    const el=shell('Improve Your Game','Two premium tools built around your swing and your ball flight.',`
      <div class="pf-ai-hero"><div class="pf-ai-mark">PF</div><div><strong>ParFolio AI</strong><span>Analyze. Trace. Improve.</span></div></div>
      <div class="pf-ai-grid">
        <button class="pf-ai-card" data-open="swing"><span class="pf-ai-card-icon">◎</span><div><strong>Swing AI</strong><small>Record or import a swing, review key positions and prepare it for automated analysis.</small></div><b>›</b></button>
        <button class="pf-ai-card" data-open="shot"><span class="pf-ai-card-icon">↗</span><div><strong>Shot Vision</strong><small>Record or import a golf shot and create a ball-flight tracer over the video.</small></div><b>›</b></button>
      </div>
      <div class="pf-ai-note"><strong>Admin preview</strong><span>For now, ParFolio AI is available only to course admins and super admins while the capture, tracing and analysis workflows are validated.</span></div>`);
    el.querySelector('[data-open="swing"]').onclick=openSwingAI;el.querySelector('[data-open="shot"]').onclick=openShotVision;return true;
  };

  function videoPicker(kind){return `<label class="pf-ai-upload"><input id="pf-ai-${kind}-file" type="file" accept="video/*" capture="environment"><span class="pf-ai-upload-icon">＋</span><strong>Record or choose video</strong><small>Use a stable camera position. Landscape video is recommended when practical.</small></label>`;}

  window.openSwingAI=function(){
    if(!hasAIAccess())return false;
    const el=shell('Swing AI','Capture a face-on or down-the-line swing for analysis.',`
      <div class="pf-ai-form-row"><label>Camera view<select id="pf-ai-swing-view"><option value="dtl">Down the line</option><option value="face">Face on</option></select></label><label>Club<select id="pf-ai-swing-club"><option>Driver</option><option>3 Wood</option><option>Hybrid</option><option>7 Iron</option><option>Wedge</option><option>Putter</option></select></label></div>
      ${videoPicker('swing')}
      <div id="pf-ai-swing-editor" class="pf-ai-editor" hidden><video id="pf-ai-swing-video" controls playsinline preload="metadata"></video><div class="pf-ai-phase-row"><button data-phase="Address">Address</button><button data-phase="Top">Top</button><button data-phase="Impact">Impact</button><button data-phase="Finish">Finish</button></div><div id="pf-ai-swing-phase" class="pf-ai-status">Choose a key position while reviewing the video.</div><button id="pf-ai-swing-save" class="pf-ai-primary">Save swing draft</button></div>
      <div class="pf-ai-next"><strong>Next engine step</strong><span>Automatic pose tracking, swing-phase detection, body angles and coaching recommendations will plug into this same workflow.</span></div>`);
    const input=el.querySelector('#pf-ai-swing-file'),editor=el.querySelector('#pf-ai-swing-editor'),video=el.querySelector('#pf-ai-swing-video'),status=el.querySelector('#pf-ai-swing-phase');
    input.onchange=()=>{const f=input.files?.[0];if(!f)return;if(AI_STATE.swing?.url)URL.revokeObjectURL(AI_STATE.swing.url);AI_STATE.swing={file:f,url:URL.createObjectURL(f),marks:{}};video.src=AI_STATE.swing.url;editor.hidden=false};
    editor.querySelectorAll('[data-phase]').forEach(btn=>btn.onclick=()=>{if(!AI_STATE.swing)return;const phase=btn.dataset.phase;AI_STATE.swing.marks[phase]=video.currentTime;status.textContent=`${phase} marked at ${video.currentTime.toFixed(2)}s`;});
    el.querySelector('#pf-ai-swing-save').onclick=()=>{status.textContent='Swing draft saved on this device for this preview session.'};return true;
  };

  function drawTracer(canvas,video,points){
    const ctx=canvas.getContext('2d'),rect=video.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.clearRect(0,0,w,h);if(!points.length)return;
    ctx.lineWidth=Math.max(4,w*.012);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f0cb5b';ctx.shadowColor='rgba(240,203,91,.75)';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(points[0].x*w,points[0].y*h);
    if(points.length===3)ctx.quadraticCurveTo(points[1].x*w,points[1].y*h,points[2].x*w,points[2].y*h);else points.slice(1).forEach(p=>ctx.lineTo(p.x*w,p.y*h));ctx.stroke();ctx.shadowBlur=0;
    points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*w,p.y*h,7,0,Math.PI*2);ctx.fillStyle=i===1?'#fff4bf':'#f0cb5b';ctx.fill()});
  }

  window.openShotVision=function(){
    if(!hasAIAccess())return false;
    const el=shell('Shot Vision','Create a tracer now; automatic ball tracking comes next.',`
      ${videoPicker('shot')}
      <div id="pf-ai-shot-editor" class="pf-ai-editor" hidden><div class="pf-ai-video-wrap"><video id="pf-ai-shot-video" controls playsinline preload="metadata"></video><canvas id="pf-ai-shot-canvas"></canvas></div><div class="pf-ai-instructions">Tap three points on the video: <b>ball/impact</b>, <b>apex</b>, then <b>landing direction</b>. Tap again to restart the tracer.</div><div class="pf-ai-actions"><button id="pf-ai-shot-clear">Clear</button><button id="pf-ai-shot-save" class="pf-ai-primary">Save tracer draft</button></div><div id="pf-ai-shot-status" class="pf-ai-status">Ready to trace.</div></div>
      <div class="pf-ai-next"><strong>Built for the feature you showed me</strong><span>The next computer-vision layer will attempt the tracer automatically and keep this manual correction path as a fallback.</span></div>`);
    const input=el.querySelector('#pf-ai-shot-file'),editor=el.querySelector('#pf-ai-shot-editor'),video=el.querySelector('#pf-ai-shot-video'),canvas=el.querySelector('#pf-ai-shot-canvas'),status=el.querySelector('#pf-ai-shot-status');
    input.onchange=()=>{const f=input.files?.[0];if(!f)return;if(AI_STATE.shot?.url)URL.revokeObjectURL(AI_STATE.shot.url);AI_STATE.shot={file:f,url:URL.createObjectURL(f),points:[]};video.src=AI_STATE.shot.url;editor.hidden=false;video.onloadedmetadata=()=>requestAnimationFrame(()=>drawTracer(canvas,video,AI_STATE.shot.points))};
    const pointFromEvent=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}};
    canvas.onclick=e=>{if(!AI_STATE.shot)return;if(AI_STATE.shot.points.length>=3)AI_STATE.shot.points=[];AI_STATE.shot.points.push(pointFromEvent(e));drawTracer(canvas,video,AI_STATE.shot.points);status.textContent=AI_STATE.shot.points.length<3?`Point ${AI_STATE.shot.points.length} set. Add ${3-AI_STATE.shot.points.length} more.`:'Tracer ready. Tap the video again to redraw.'};
    window.addEventListener('resize',()=>AI_STATE.shot&&drawTracer(canvas,video,AI_STATE.shot.points),{once:true});
    el.querySelector('#pf-ai-shot-clear').onclick=()=>{if(!AI_STATE.shot)return;AI_STATE.shot.points=[];drawTracer(canvas,video,[]);status.textContent='Tracer cleared.'};
    el.querySelector('#pf-ai-shot-save').onclick=()=>{status.textContent=AI_STATE.shot?.points?.length===3?'Tracer draft saved on this device for this preview session.':'Add all three tracer points before saving.'};return true;
  };

  function decorateMenu(){
    document.querySelectorAll('.app-side-menu.menu-v204').forEach(menu=>{
      if(!hasAIAccess()){menu.querySelectorAll('[data-parfolio-ai-menu]').forEach(node=>node.remove());closeAI();return;}
      if(menu.querySelector('[data-parfolio-ai-menu]'))return;
      const settings=[...menu.querySelectorAll('.menu-section-label')].find(x=>/SETTINGS|AJUSTES|设置|PENGATURAN|सेटिंग्स|RÉGLAGES/i.test(x.textContent));
      const label=document.createElement('div');label.className='menu-section-label';label.dataset.parfolioAiMenu='1';label.textContent='PARFOLIO AI';
      const button=document.createElement('button');button.className='pf-ai-menu-button';button.dataset.parfolioAiMenu='1';button.innerHTML='<span class="menu-line-icon" aria-hidden="true">✦</span><div>Swing AI + Shot Vision<small>Admin preview</small></div>';button.onclick=()=>{closeRoundQuickMenu();openParFolioAI()};
      if(settings){menu.insertBefore(label,settings);menu.insertBefore(button,settings)}else{menu.append(label,button)};
    });
  }

  const observer=new MutationObserver(decorateMenu);observer.observe(document.body,{childList:true,subtree:true});decorateMenu();
  window.ParFolioAI={open:openParFolioAI,openSwing:openSwingAI,openShot:openShotVision,hasAccess:hasAIAccess,version:225};
})();
