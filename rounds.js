(() => {
  const COURSE_LIBRARY_URL = 'https://qziemwgcjkohjchxdvnv.supabase.co';
  const COURSE_LIBRARY_KEY = 'sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const library = window.supabase.createClient(COURSE_LIBRARY_URL, COURSE_LIBRARY_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const style = document.createElement('style');
  style.textContent = `
    .round-form{display:grid;gap:14px;margin-top:18px}.round-form label{display:grid;gap:7px;color:#052d25;font-size:12px;font-weight:600}.round-form input,.round-form select{width:100%;min-height:48px;border:1px solid rgba(12,91,67,.18);border-radius:14px;background:#fff;padding:0 14px;color:#14221d;font-size:16px}.round-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.round-choice button{min-height:46px;border:1px solid rgba(12,91,67,.16);border-radius:13px;background:#fff;color:#0a4a39;cursor:pointer}.round-choice button.active{background:#073e31;color:#fff;border-color:#073e31}.round-course-results{display:grid;gap:8px;max-height:250px;overflow:auto}.round-course-result{border:1px solid rgba(12,91,67,.12);border-radius:14px;background:#fffdf7;text-align:left;padding:12px 13px;cursor:pointer;color:#14221d}.round-course-result.selected{border-color:#c9a45b;box-shadow:0 0 0 2px rgba(201,164,91,.18)}.round-course-result strong{display:block;color:#052d25;font-size:14px}.round-course-result span{display:block;margin-top:4px;color:#65746e;font-size:11px}.round-selected{padding:13px 14px;border-radius:14px;background:#e8f1ed;color:#0a4a39;font-size:13px}.round-code-card{text-align:center;padding:22px;border:1px solid rgba(201,164,91,.3);border-radius:20px;background:linear-gradient(145deg,rgba(236,217,162,.16),rgba(232,241,237,.45));margin:18px 0}.round-code-card small{display:block;color:#65746e;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.round-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:.16em;color:#052d25;font-weight:700;margin:8px 0 12px}.round-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.round-actions button{min-height:44px;border:0;border-radius:13px;cursor:pointer}.round-actions .primary{background:#073e31;color:#fff}.round-actions .secondary{background:#dfc484;color:#052d25}.round-summary{display:grid;gap:8px;margin:16px 0}.round-summary div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(9,71,53,.08);font-size:13px}.round-summary span{color:#65746e}.round-summary strong{color:#052d25;text-align:right}.round-join-code{text-transform:uppercase;letter-spacing:.16em;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px!important}.round-error{color:#9b3128!important}.round-success{color:#0c5b43!important}
    .live-round{display:grid;gap:12px}.live-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-right:48px}.live-head h2{margin-right:0!important;font-size:25px!important}.live-hole-meta{margin:4px 0 0!important;color:#0c5b43!important;font-weight:650}.map-toggle{display:flex;border:1px solid rgba(201,164,91,.35);border-radius:999px;padding:3px;background:#fff}.map-toggle button{border:0;border-radius:999px;padding:7px 10px;background:transparent;color:#486058;font-size:11px;cursor:pointer}.map-toggle button.active{background:#073e31;color:#fff}.play-map{height:min(55vh,470px);min-height:330px;border:1px solid rgba(201,164,91,.35);border-radius:20px;overflow:hidden;background:#dce7df;box-shadow:0 10px 28px rgba(5,45,37,.12)}.live-status{margin:0!important;min-height:18px;color:#65746e!important;font-size:12px!important}.hole-nav{display:grid;grid-template-columns:48px 1fr 48px;gap:9px;align-items:center}.hole-nav button{height:44px;border:0;border-radius:13px;background:#073e31;color:#fff;font-size:20px;cursor:pointer}.hole-nav button:disabled{opacity:.35}.hole-nav-label{text-align:center;color:#052d25;font-size:13px;font-weight:650}.score-foundation{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:13px 15px;border-radius:17px;background:linear-gradient(135deg,#f9f4e7,#e8f1ed);border:1px solid rgba(201,164,91,.22)}.score-copy strong{display:block;color:#052d25}.score-copy small{display:block;margin-top:3px;color:#65746e}.score-stepper{display:grid;grid-template-columns:38px 48px 38px;align-items:center}.score-stepper button{height:38px;border:0;border-radius:11px;background:#073e31;color:#fff;font-size:20px;cursor:pointer}.score-stepper output{text-align:center;color:#052d25;font-size:22px;font-weight:700}.live-share{border:0;background:transparent;color:#0c5b43;cursor:pointer;font-size:12px;text-decoration:underline}.map-pin{display:grid;place-items:center;width:28px;height:28px;border:2px solid #fff;border-radius:50%;background:#073e31;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font:700 11px/1 sans-serif}.map-pin.aim{background:#c7a24e;color:#052d25}.map-pin.green{background:#0c7a55}.map-pin.gps{width:18px;height:18px;background:#2775d7;border-width:3px}
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

  const normalizeCourseName = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const toPoint = value => {
    if (!value) return null;
    if (Array.isArray(value) && value.length >= 2) return { lat:Number(value[0]), lng:Number(value[1]) };
    const lat = Number(value.lat ?? value.latitude);
    const lng = Number(value.lng ?? value.lon ?? value.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  let mapsPromise;
  function loadGoogleMaps(){
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (mapsPromise) return mapsPromise;
    const key = window.PARFOLIO_CONFIG?.mapsBrowserKey;
    if (!key) return Promise.reject(new Error('Google Maps is not configured.'));
    mapsPromise = new Promise((resolve, reject) => {
      const callback = `parfolioMapsReady${Date.now()}`;
      window[callback] = () => { delete window[callback]; resolve(window.google.maps); };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}&v=weekly`;
      script.async = true; script.defer = true;
      script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
      document.head.appendChild(script);
    });
    return mapsPromise;
  }

  async function loadCoursePayload(round){
    const normalized = normalizeCourseName(round?.course_name);
    const { data, error } = await library.rpc('shared_course_payload', { p_normalized_name:normalized });
    if (error) throw error;
    if (data) return data;
    const { data:catalog } = await library.rpc('shared_course_catalog_search', { p_query:round?.course_name || '', p_limit:10 });
    const match = (catalog || []).find(c => c.shared_course_id === round?.course_library_id) || catalog?.[0];
    return match ? { ...match, pars:[], greens:[] } : null;
  }

  function teePoint(hole, playingTee){
    const tees = hole?.tees || {};
    const wanted = String(playingTee || '').toLowerCase();
    const key = Object.keys(tees).find(name => name.toLowerCase() === wanted);
    return toPoint(key ? tees[key] : hole?.tee) || toPoint(hole?.tee);
  }

  async function loadScores(round){
    if (!currentUser || !round?.id) return {};
    const { data, error } = await sb.from('hole_scores').select('hole_number, strokes').eq('round_id', round.id).eq('user_id', currentUser.id);
    if (error) { console.warn('Score load:', error.message); return {}; }
    return Object.fromEntries((data || []).map(row => [row.hole_number, row.strokes]));
  }

  async function saveScore(round, holeNumber, strokes){
    if (!currentUser || !round?.id) return;
    const { error } = await sb.from('hole_scores').upsert({ round_id:round.id, user_id:currentUser.id, hole_number:holeNumber, strokes }, { onConflict:'round_id,user_id,hole_number' });
    const status = document.getElementById('liveRoundStatus');
    if (status) status.textContent = error ? `Score not saved: ${error.message}` : 'Score saved privately to your ParFolio round.';
  }

  async function openLiveRound(round){
    open('<div class="live-round"><p class="lead">Loading your live round…</p></div>');
    let payload;
    try { payload = await loadCoursePayload(round); }
    catch (error) { return open(`<h2>Live Round</h2><div class="gold-rule"></div><p class="round-error">The shared course map could not be loaded: ${esc(error.message)}</p>`); }
    const holeCount = Math.min(Number(round?.holes) || Number(payload?.holes) || 18, payload?.greens?.length || Number(round?.holes) || 18);
    const scores = await loadScores(round);
    let holeIndex = 0;
    let map, routeLine, gpsMarker, watchId;
    let mapMarkers = [];

    open(`<div class="live-round">
      <div class="live-head"><div><h2>${esc(round?.course_name || payload?.name || 'Live Round')}</h2><p class="live-hole-meta" id="liveHoleMeta"></p></div><div class="map-toggle" aria-label="Map style"><button type="button" data-map-type="roadmap">Map</button><button type="button" data-map-type="satellite" class="active">Satellite</button></div></div>
      <div class="play-map" id="playMap" role="region" aria-label="Live hole map"></div>
      <p class="live-status" id="liveRoundStatus" aria-live="polite">Requesting your GPS location…</p>
      <div class="hole-nav"><button type="button" id="previousHole" aria-label="Previous hole">‹</button><div class="hole-nav-label" id="holeNavLabel"></div><button type="button" id="nextHole" aria-label="Next hole">›</button></div>
      <div class="score-foundation"><div class="score-copy"><strong>Your score</strong><small id="scoreToPar">Tap + or − after the hole</small></div><div class="score-stepper"><button type="button" id="scoreMinus" aria-label="Subtract stroke">−</button><output id="holeScore">–</output><button type="button" id="scorePlus" aria-label="Add stroke">+</button></div></div>
      <button class="live-share" type="button" id="liveShareRound">Share Round Code ${esc(round?.round_code || '')}</button>
    </div>`);

    const renderScore = () => {
      const number = holeIndex + 1, par = Number(payload?.pars?.[holeIndex]) || null, score = scores[number];
      document.getElementById('holeScore').textContent = score || '–';
      document.getElementById('scoreToPar').textContent = score && par ? `${score - par === 0 ? 'Even' : score - par > 0 ? `+${score-par}` : score-par} on this hole` : 'Tap + or − after the hole';
    };
    const setScore = delta => {
      const number = holeIndex + 1, par = Number(payload?.pars?.[holeIndex]) || 4;
      scores[number] = Math.max(1, (Number(scores[number]) || par) + delta);
      renderScore(); saveScore(round, number, scores[number]);
    };
    const addMarker = (position, label, kind='') => {
      const marker = new google.maps.Marker({ position, map, label:{ text:label, color:'#ffffff', fontSize:'11px', fontWeight:'700' }, icon:{ path:google.maps.SymbolPath.CIRCLE, fillColor:kind==='green'?'#0c7a55':kind==='aim'?'#c7a24e':'#073e31', fillOpacity:1, strokeColor:'#ffffff', strokeWeight:2, scale:11 }, zIndex:kind==='green'?4:3 });
      mapMarkers.push(marker);
    };
    const drawHole = () => {
      mapMarkers.forEach(marker => marker.setMap(null)); mapMarkers = [];
      routeLine?.setMap(null);
      const hole = payload?.greens?.[holeIndex] || {};
      const stops = [
        { point:teePoint(hole, round?.playing_tee), label:'T', kind:'' },
        { point:toPoint(hole.aim1), label:'1', kind:'aim' },
        { point:toPoint(hole.aim2), label:'2', kind:'aim' },
        { point:toPoint(hole.center), label:'G', kind:'green' }
      ].filter(stop => stop.point);
      const points = stops.map(stop => stop.point);
      stops.forEach(stop => addMarker(stop.point, stop.label, stop.kind));
      if (points.length) {
        routeLine = new google.maps.Polyline({ path:points, map, strokeColor:'#d6b765', strokeOpacity:.96, strokeWeight:4, geodesic:true });
        const bounds = new google.maps.LatLngBounds(); points.forEach(point => bounds.extend(point));
        if (gpsMarker?.getPosition()) bounds.extend(gpsMarker.getPosition());
        map.fitBounds(bounds, 42);
      } else if (payload?.lat && payload?.lng) map.setCenter({lat:Number(payload.lat),lng:Number(payload.lng)});
      const par = payload?.pars?.[holeIndex];
      document.getElementById('liveHoleMeta').textContent = `Hole ${holeIndex+1}${par ? ` · Par ${par}` : ''}`;
      document.getElementById('holeNavLabel').textContent = `${holeIndex+1} of ${holeCount}`;
      document.getElementById('previousHole').disabled = holeIndex === 0;
      document.getElementById('nextHole').disabled = holeIndex >= holeCount-1;
      document.getElementById('liveRoundStatus').textContent = points.length ? 'Tee → aim → green route from the shared Golf Course Library.' : 'This hole is awaiting approved GPS mapping in the shared library.';
      renderScore();
    };

    try {
      await loadGoogleMaps();
      map = new google.maps.Map(document.getElementById('playMap'), { center:{lat:Number(payload?.lat)||37.5,lng:Number(payload?.lng)||-119.5}, zoom:16, mapTypeId:'satellite', disableDefaultUI:true, zoomControl:true, gestureHandling:'greedy' });
      drawHole();
      document.querySelectorAll('[data-map-type]').forEach(button => button.addEventListener('click', () => { map.setMapTypeId(button.dataset.mapType); document.querySelectorAll('[data-map-type]').forEach(b => b.classList.toggle('active', b===button)); }));
      if (navigator.geolocation) watchId = navigator.geolocation.watchPosition(position => {
        const point = {lat:position.coords.latitude,lng:position.coords.longitude};
        if (!gpsMarker) gpsMarker = new google.maps.Marker({position:point,map,title:'Your GPS location',icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:'#2775d7',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3,scale:8},zIndex:9}); else gpsMarker.setPosition(point);
      }, () => { document.getElementById('liveRoundStatus').textContent = 'Location is off. Enable GPS to show your position on the hole.'; }, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    } catch (error) { document.getElementById('playMap').innerHTML = `<div class="course-empty">${esc(error.message)}</div>`; document.getElementById('liveRoundStatus').textContent = 'The map is unavailable, but hole navigation and scoring still work.'; renderScore(); }

    document.getElementById('previousHole').addEventListener('click', () => { if (holeIndex) { holeIndex--; if(map) drawHole(); else renderScore(); } });
    document.getElementById('nextHole').addEventListener('click', () => { if (holeIndex < holeCount-1) { holeIndex++; if(map) drawHole(); else renderScore(); } });
    document.getElementById('scoreMinus').addEventListener('click', () => setScore(-1));
    document.getElementById('scorePlus').addEventListener('click', () => setScore(1));
    document.getElementById('liveShareRound').addEventListener('click', async () => { const text=`Join my ParFolio round. Code: ${round?.round_code || ''}`; if(navigator.share) await navigator.share({title:'Join my ParFolio round',text,url:`${location.origin}${location.pathname}?round=${encodeURIComponent(round?.round_code || '')}`}); else await navigator.clipboard?.writeText(text); });
    dialog.addEventListener('close', () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); }, {once:true});
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
      <button class="form-primary" id="beginLiveRound" type="button">Open Live Round</button>
      <p class="form-message round-success">Your round is active and ready to play.</p>`);
    document.getElementById('copyRoundCode')?.addEventListener('click', async () => { await navigator.clipboard?.writeText(code); document.getElementById('copyRoundCode').textContent='Copied'; });
    document.getElementById('shareRound')?.addEventListener('click', async () => {
      const data = { title:'Join my ParFolio round', text:`Join my ParFolio round. Code: ${code}`, url:shareUrl };
      if (navigator.share) await navigator.share(data); else { await navigator.clipboard?.writeText(`${data.text} ${shareUrl}`); document.getElementById('shareRound').textContent='Copied Link'; }
    });
    document.getElementById('beginLiveRound')?.addEventListener('click', () => openLiveRound(round));
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
    openLiveRound(data);
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
