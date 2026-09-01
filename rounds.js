(() => {
  const COURSE_LIBRARY_URL = 'https://qziemwgcjkohjchxdvnv.supabase.co';
  const COURSE_LIBRARY_KEY = 'sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const library = window.supabase.createClient(COURSE_LIBRARY_URL, COURSE_LIBRARY_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const style = document.createElement('style');
  style.textContent = `
    .round-form{display:grid;gap:14px;margin-top:18px}.round-form label{display:grid;gap:7px;color:#052d25;font-size:12px;font-weight:600}.round-form input,.round-form select{width:100%;min-height:48px;border:1px solid rgba(12,91,67,.18);border-radius:14px;background:#fff;padding:0 14px;color:#14221d;font-size:16px}.round-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.round-choice button{min-height:46px;border:1px solid rgba(12,91,67,.16);border-radius:13px;background:#fff;color:#0a4a39;cursor:pointer}.round-choice button.active{background:#073e31;color:#fff;border-color:#073e31}.round-course-results{display:grid;gap:8px;max-height:250px;overflow:auto}.round-course-result{border:1px solid rgba(12,91,67,.12);border-radius:14px;background:#fffdf7;text-align:left;padding:12px 13px;cursor:pointer;color:#14221d}.round-course-result.selected{border-color:#c9a45b;box-shadow:0 0 0 2px rgba(201,164,91,.18)}.round-course-result strong{display:block;color:#052d25;font-size:14px}.round-course-result span{display:block;margin-top:4px;color:#65746e;font-size:11px}.round-selected{padding:13px 14px;border-radius:14px;background:#e8f1ed;color:#0a4a39;font-size:13px}.round-code-card{text-align:center;padding:22px;border:1px solid rgba(201,164,91,.3);border-radius:20px;background:linear-gradient(145deg,rgba(236,217,162,.16),rgba(232,241,237,.45));margin:18px 0}.round-code-card small{display:block;color:#65746e;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.round-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:.16em;color:#052d25;font-weight:700;margin:8px 0 12px}.round-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.round-actions button{min-height:44px;border:0;border-radius:13px;cursor:pointer}.round-actions .primary{background:#073e31;color:#fff}.round-actions .secondary{background:#dfc484;color:#052d25}.round-summary{display:grid;gap:8px;margin:16px 0}.round-summary div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(9,71,53,.08);font-size:13px}.round-summary span{color:#65746e}.round-summary strong{color:#052d25;text-align:right}.round-join-code{text-transform:uppercase;letter-spacing:.16em;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px!important}.round-error{color:#9b3128!important}.round-success{color:#0c5b43!important}
    @media(max-width:430px){.round-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const esc = (value) => String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const dialog = document.getElementById('contentDialog');
  const content = document.getElementById('dialogContent');

  function closeDrawer(){
    document.getElementById('drawer')?.classList.remove('open');
    document.getElementById('scrim')?.classList.remove('show');
    document.getElementById('drawer')?.setAttribute('aria-hidden','true');
  }

  function open(html){ content.innerHTML = html; if (!dialog.open) dialog.showModal(); }

  async function ensureUser(){
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) return session.user;
    if (typeof showContent === 'function') showContent('profile');
    return null;
  }

  function displayName(){
    const name = [currentProfile?.first_name, currentProfile?.last_name].filter(Boolean).join(' ').trim();
    return name || currentUser?.email || 'Golfer';
  }

  function startRoundScreen(){
    open(`
      <h2>Start a Round</h2><div class="gold-rule"></div>
      <p class="lead">Choose a course and create your ParFolio round.</p>
      <form class="round-form" id="startRoundForm">
        <label>Find Course<input id="roundCourseSearch" type="search" placeholder="Course, city, state, ZIP or country" autocomplete="off"></label>
        <div class="round-course-results" id="roundCourseResults"><div class="course-loading">Start typing to find a course.</div></div>
        <div id="roundSelectedCourse"></div>
        <label>Playing Tee<input id="playingTee" name="playingTee" list="teeSuggestions" placeholder="Example: Blue" required></label>
        <datalist id="teeSuggestions"><option value="Black"><option value="Blue"><option value="White"><option value="Gold"><option value="Green"><option value="Red"></datalist>
        <label>Round Length</label>
        <div class="round-choice" id="roundHoleChoice"><button type="button" data-holes="18" class="active">18 Holes</button><button type="button" data-holes="9">9 Holes</button></div>
        <button class="form-primary" type="submit">Create Round</button>
        <p class="form-message" aria-live="polite"></p>
      </form>`);

    let selectedCourse = null;
    let holes = 18;
    let timer;
    const search = document.getElementById('roundCourseSearch');
    const results = document.getElementById('roundCourseResults');

    document.getElementById('roundHoleChoice').addEventListener('click', e => {
      const btn = e.target.closest('[data-holes]'); if (!btn) return;
      holes = Number(btn.dataset.holes);
      document.querySelectorAll('#roundHoleChoice [data-holes]').forEach(b => b.classList.toggle('active', b === btn));
    });

    search.addEventListener('input', () => {
      clearTimeout(timer);
      const q = search.value.trim();
      if (!q) { results.innerHTML = '<div class="course-loading">Start typing to find a course.</div>'; return; }
      timer = setTimeout(async () => {
        results.innerHTML = '<div class="course-loading">Searching…</div>';
        const { data, error } = await library.rpc('shared_course_catalog_search', { p_query:q, p_limit:20 });
        if (error) { results.innerHTML = '<div class="course-empty">Unable to search courses right now.</div>'; return; }
        const rows = Array.isArray(data) ? data : [];
        results.innerHTML = rows.length ? rows.map(c => `<button class="round-course-result" type="button" data-id="${esc(c.shared_course_id)}" data-name="${esc(c.name)}"><strong>${esc(c.name)}</strong><span>${esc([c.city,c.state_code||c.state,c.country].filter(Boolean).join(', '))}</span></button>`).join('') : '<div class="course-empty">No matching courses found.</div>';
        results.querySelectorAll('.round-course-result').forEach(btn => btn.addEventListener('click', () => {
          selectedCourse = { id:btn.dataset.id, name:btn.dataset.name };
          results.querySelectorAll('.round-course-result').forEach(b => b.classList.toggle('selected', b===btn));
          document.getElementById('roundSelectedCourse').innerHTML = `<div class="round-selected">Selected: <strong>${esc(selectedCourse.name)}</strong></div>`;
        }));
      },250);
    });

    document.getElementById('startRoundForm').addEventListener('submit', async e => {
      e.preventDefault();
      const msg = e.currentTarget.querySelector('.form-message');
      if (!selectedCourse) { msg.textContent='Choose a course first.'; msg.className='form-message round-error'; return; }
      const tee = document.getElementById('playingTee').value.trim();
      msg.textContent='Creating round…'; msg.className='form-message';
      const { data, error } = await sb.rpc('create_parfolio_round', {
        p_course_library_id:selectedCourse.id,
        p_course_name:selectedCourse.name,
        p_holes:holes,
        p_playing_tee:tee,
        p_display_name:displayName()
      });
      if (error) { msg.textContent=error.message; msg.className='form-message round-error'; return; }
      showRoundReady(data);
    });
  }

  function showRoundReady(round){
    const code = round?.round_code || '';
    const shareUrl = `${location.origin}${location.pathname}?round=${encodeURIComponent(code)}`;
    open(`
      <h2>Round Ready</h2><div class="gold-rule"></div>
      <p class="lead">Invite your playing partners with this Round Code.</p>
      <div class="round-code-card"><small>Round Code</small><div class="round-code">${esc(code)}</div><div class="round-actions"><button class="primary" id="copyRoundCode">Copy Code</button><button class="secondary" id="shareRound">Share Round</button></div></div>
      <div class="round-summary"><div><span>Course</span><strong>${esc(round?.course_name || '')}</strong></div><div><span>Playing Tee</span><strong>${esc(round?.playing_tee || '')}</strong></div><div><span>Round</span><strong>${esc(round?.holes || '')} Holes</strong></div></div>
      <p class="form-message round-success">Your round is active. The live play map and scorecard are the next build stage.</p>`);
    document.getElementById('copyRoundCode')?.addEventListener('click', async () => { await navigator.clipboard?.writeText(code); document.getElementById('copyRoundCode').textContent='Copied'; });
    document.getElementById('shareRound')?.addEventListener('click', async () => {
      const data = { title:'Join my ParFolio round', text:`Join my ParFolio round. Code: ${code}`, url:shareUrl };
      if (navigator.share) await navigator.share(data); else { await navigator.clipboard?.writeText(`${data.text} ${shareUrl}`); document.getElementById('shareRound').textContent='Copied Link'; }
    });
  }

  function joinRoundScreen(prefill=''){
    open(`
      <h2>Join a Round</h2><div class="gold-rule"></div>
      <p class="lead">Enter the six-character Round Code from your playing partner.</p>
      <form class="round-form" id="joinRoundForm">
        <label>Round Code<input class="round-join-code" id="joinRoundCode" maxlength="6" value="${esc(prefill.toUpperCase())}" placeholder="ABC234" autocomplete="off" required></label>
        <button class="form-primary" type="submit">Join Round</button>
        <p class="form-message" aria-live="polite"></p>
      </form>`);
    const input = document.getElementById('joinRoundCode');
    input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); });
    document.getElementById('joinRoundForm').addEventListener('submit', async e => {
      e.preventDefault();
      const msg = e.currentTarget.querySelector('.form-message');
      const code = input.value.trim();
      if (code.length !== 6) { msg.textContent='Enter the full six-character Round Code.'; msg.className='form-message round-error'; return; }
      msg.textContent='Joining round…'; msg.className='form-message';
      const { data, error } = await sb.rpc('join_parfolio_round', { p_round_code:code, p_display_name:displayName() });
      if (error) { msg.textContent=error.message; msg.className='form-message round-error'; return; }
      showRoundReady(data);
    });
  }

  async function resumeRound(){
    open('<h2>Resume Round</h2><div class="gold-rule"></div><p class="lead">Looking for your active round…</p>');
    const { data, error } = await sb.rpc('resume_parfolio_round');
    if (error) return open(`<h2>Resume Round</h2><div class="gold-rule"></div><p class="round-error">${esc(error.message)}</p>`);
    if (!data) return open('<h2>Resume Round</h2><div class="gold-rule"></div><p class="lead">You do not have an active round right now.</p><button class="form-primary" id="resumeStartNew">Start a Round</button>');
    showRoundReady(data);
  }

  async function route(action, prefill=''){
    closeDrawer();
    const user = await ensureUser(); if (!user) return;
    if (action==='start') startRoundScreen();
    if (action==='join') joinRoundScreen(prefill);
    if (action==='resume') resumeRound();
  }

  document.addEventListener('click', e => {
    const actionBtn = e.target.closest('[data-action]');
    const screenBtn = e.target.closest('[data-screen]');
    let action = actionBtn?.dataset.action;
    if (!action && screenBtn?.dataset.screen === 'new-round') action='start';
    if (!action && screenBtn?.dataset.screen === 'join-round') action='join';
    if (!action || !['start','join','resume'].includes(action)) return;
    e.preventDefault(); e.stopImmediatePropagation(); route(action);
  }, true);

  document.addEventListener('click', e => {
    if (e.target?.id === 'resumeStartNew') route('start');
  });

  const urlCode = new URLSearchParams(location.search).get('round');
  if (urlCode) setTimeout(() => route('join', urlCode), 600);
})();
