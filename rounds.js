(() => {
  const library = window.parfolioClients.courseLibrary;

  const style = document.createElement('style');
  style.textContent = `
    .round-form{display:grid;gap:14px;margin-top:18px}.round-form label{display:grid;gap:7px;color:#052d25;font-size:12px;font-weight:600}.round-form input,.round-form select{width:100%;min-height:48px;border:1px solid rgba(12,91,67,.18);border-radius:14px;background:#fff;padding:0 14px;color:#14221d;font-size:16px}.round-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.round-choice button{min-height:46px;border:1px solid rgba(12,91,67,.16);border-radius:13px;background:#fff;color:#0a4a39;cursor:pointer}.round-choice button.active{background:#073e31;color:#fff;border-color:#073e31}.round-course-results{display:grid;gap:8px;max-height:250px;overflow:auto}.round-course-result{border:1px solid rgba(12,91,67,.12);border-radius:14px;background:#fffdf7;text-align:left;padding:12px 13px;cursor:pointer;color:#14221d}.round-course-result.selected{border-color:#c9a45b;box-shadow:0 0 0 2px rgba(201,164,91,.18)}.round-course-result strong{display:block;color:#052d25;font-size:14px}.round-course-result span{display:block;margin-top:4px;color:#65746e;font-size:11px}.round-selected{padding:13px 14px;border-radius:14px;background:#e8f1ed;color:#0a4a39;font-size:13px}.round-code-card{text-align:center;padding:22px;border:1px solid rgba(201,164,91,.3);border-radius:20px;background:linear-gradient(145deg,rgba(236,217,162,.16),rgba(232,241,237,.45));margin:18px 0}.round-code-card small{display:block;color:#65746e;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.round-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:.16em;color:#052d25;font-weight:700;margin:8px 0 12px}.round-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.round-actions button{min-height:44px;border:0;border-radius:13px;cursor:pointer}.round-actions .primary{background:#073e31;color:#fff}.round-actions .secondary{background:#dfc484;color:#052d25}.round-summary{display:grid;gap:8px;margin:16px 0}.round-summary div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(9,71,53,.08);font-size:13px}.round-summary span{color:#65746e}.round-summary strong{color:#052d25;text-align:right}.round-join-code{text-transform:uppercase;letter-spacing:.16em;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px!important}.round-error{color:#9b3128!important}.round-success{color:#0c5b43!important}
    .live-round{display:grid;gap:12px}.live-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-right:48px}.live-head h2{margin-right:0!important;font-size:25px!important}.live-hole-meta{margin:4px 0 0!important;color:#0c5b43!important;font-weight:650}.map-toggle{display:flex;border:1px solid rgba(201,164,91,.35);border-radius:999px;padding:3px;background:#fff}.map-toggle button{border:0;border-radius:999px;padding:7px 10px;background:transparent;color:#486058;font-size:11px;cursor:pointer}.map-toggle button.active{background:#073e31;color:#fff}.play-map{height:min(55vh,470px);min-height:330px;border:1px solid rgba(201,164,91,.35);border-radius:20px;overflow:hidden;background:#dce7df;box-shadow:0 10px 28px rgba(5,45,37,.12)}.live-status{margin:0!important;min-height:18px;color:#65746e!important;font-size:12px!important}.hole-nav{display:grid;grid-template-columns:48px 1fr 48px;gap:9px;align-items:center}.hole-nav button{height:44px;border:0;border-radius:13px;background:#073e31;color:#fff;font-size:20px;cursor:pointer}.hole-nav button:disabled{opacity:.35}.hole-nav-label{text-align:center;color:#052d25;font-size:13px;font-weight:650}.score-foundation{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:13px 15px;border-radius:17px;background:linear-gradient(135deg,#f9f4e7,#e8f1ed);border:1px solid rgba(201,164,91,.22)}.score-copy strong{display:block;color:#052d25}.score-copy small{display:block;margin-top:3px;color:#65746e}.score-stepper{display:grid;grid-template-columns:38px 48px 38px;align-items:center}.score-stepper button{height:38px;border:0;border-radius:11px;background:#073e31;color:#fff;font-size:20px;cursor:pointer}.score-stepper output{text-align:center;color:#052d25;font-size:22px;font-weight:700}.live-share{border:0;background:transparent;color:#0c5b43;cursor:pointer;font-size:12px;text-decoration:underline}.map-pin{display:grid;place-items:center;width:28px;height:28px;border:2px solid #fff;border-radius:50%;background:#073e31;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font:700 11px/1 sans-serif}.map-pin.aim{background:#c7a24e;color:#052d25}.map-pin.green{background:#0c7a55}.map-pin.gps{width:18px;height:18px;background:#2775d7;border-width:3px}
    dialog.live-round-dialog{position:fixed;inset:0;width:100%;max-width:none;height:100dvh;max-height:none;margin:0;border:0;border-radius:0;background:#173c2b;overflow:hidden}.live-round-dialog .dialog-close{display:none}.live-round-dialog #dialogContent{height:100%;padding:0}.live-round-shell{position:relative;width:100%;height:100%;overflow:hidden;background:#173c2b}.live-round-shell .play-map{position:absolute;inset:0;width:100%;height:100%;min-height:0;border:0;border-radius:0;box-shadow:none}.live-map-summary{position:absolute;z-index:20;top:max(8px,calc(env(safe-area-inset-top) + 4px));left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));display:grid;grid-template-columns:.48fr .78fr .48fr 1.08fr .6fr;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(12,20,16,.48);box-shadow:0 8px 24px rgba(0,0,0,.3);color:#fff;backdrop-filter:blur(9px)}.live-map-summary>div,.live-map-summary>button{display:flex;min-width:0;min-height:60px;flex-direction:column;align-items:center;justify-content:center;padding:6px 3px;border:0;border-right:1px solid rgba(255,255,255,.12);background:transparent;color:#fff}.live-map-summary>button{border-right:0;cursor:pointer}.live-map-summary small{color:#c8d9d0;font-size:7px;font-weight:850;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap}.live-map-summary b{margin-top:2px;color:#fff;font-size:23px;line-height:1}.live-map-summary i{color:#d9e7df;font-size:8px;font-style:normal}.live-course-strip{position:absolute;z-index:19;top:max(69px,calc(env(safe-area-inset-top) + 65px));left:50%;max-width:76vw;transform:translateX(-50%);overflow:hidden;padding:4px 13px;border-radius:0 0 11px 11px;background:rgba(12,20,16,.52);color:#f5dfa8;font-size:10px;font-weight:750;text-overflow:ellipsis;white-space:nowrap;backdrop-filter:blur(8px)}.live-menu-lines{display:flex;gap:4px}.live-menu-lines i{display:block;width:20px;height:2px;border-radius:2px;background:#fff}.live-map-toggle{position:absolute;z-index:22;right:max(8px,env(safe-area-inset-right));bottom:calc(9px + env(safe-area-inset-bottom));display:flex;width:78px;height:84px;flex-direction:column;gap:3px;padding:4px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(12,20,16,.38);box-shadow:0 7px 20px rgba(0,0,0,.25);backdrop-filter:blur(7px)}.live-map-toggle button{flex:1;border:0;border-radius:10px;background:transparent;color:#fff;font:inherit;font-size:9px;font-weight:750;text-shadow:0 1px 3px rgba(0,0,0,.65);cursor:pointer}.live-map-toggle button.active{border:1px solid rgba(245,207,104,.42);background:rgba(245,207,104,.22)}.live-map-toggle button:disabled{opacity:.45;cursor:not-allowed}.live-weather-card{position:absolute;z-index:22;top:max(82px,calc(env(safe-area-inset-top) + 78px));right:max(8px,env(safe-area-inset-right));display:flex;width:70px;flex-direction:column;align-items:center;padding:8px 6px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(12,20,16,.38);color:#fff;box-shadow:0 7px 20px rgba(0,0,0,.22);backdrop-filter:blur(7px)}.live-weather-card span{font-size:22px}.live-weather-card b{color:#fff;font-size:17px}.live-weather-card small,.live-weather-card em{color:#d6e1db;font-size:7px;font-style:normal;text-align:center}.live-map-recenter{position:absolute;z-index:22;top:max(222px,calc(env(safe-area-inset-top) + 218px));right:max(20px,calc(env(safe-area-inset-right) + 20px));display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(12,20,16,.42);color:#fff;font-size:24px;box-shadow:0 6px 18px rgba(0,0,0,.25);backdrop-filter:blur(7px);cursor:pointer}.live-zoom-controls{position:absolute;z-index:22;right:max(10px,env(safe-area-inset-right));bottom:calc(102px + env(safe-area-inset-bottom));display:grid;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(12,20,16,.38);backdrop-filter:blur(7px)}.live-zoom-controls button{width:42px;height:38px;border:0;border-bottom:1px solid rgba(255,255,255,.13);background:transparent;color:#fff;font-size:23px}.live-zoom-controls button:last-child{border-bottom:0}.live-yard-card{position:absolute;z-index:22;display:flex;min-width:78px;flex-direction:column;align-items:center;padding:7px 9px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(12,20,16,.38);color:#fff;box-shadow:0 5px 16px rgba(0,0,0,.24);backdrop-filter:blur(7px);pointer-events:none}.live-yard-card b{color:#f5cf68;font-size:18px}.live-yard-card small{color:#d6e1db;font-size:7px;font-weight:850;letter-spacing:.08em}.live-to-hit{left:14%;top:42%}.live-to-go{right:14%;top:56%}.hole-edge-arrow{position:absolute;z-index:23;top:50%;display:grid;width:38px;height:66px;place-items:center;transform:translateY(-50%);border:1px solid rgba(255,255,255,.35);background:rgba(9,24,16,.48);color:#fff;font:inherit;font-size:42px;box-shadow:0 5px 17px rgba(0,0,0,.2);backdrop-filter:blur(5px);cursor:pointer}.hole-edge-arrow.previous{left:0;border-radius:0 15px 15px 0}.hole-edge-arrow.next{right:0;border-radius:15px 0 0 15px}.hole-edge-arrow:disabled{opacity:.22}.live-score-controls{position:absolute;z-index:24;left:39%;bottom:calc(9px + env(safe-area-inset-bottom));display:grid;width:min(230px,62vw);height:46px;grid-template-columns:48px minmax(104px,1fr) 48px;gap:5px;transform:translateX(-50%)}.live-score-controls button{height:46px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(12,20,16,.38);color:#f5cf68;font:inherit;font-size:29px;font-weight:800;box-shadow:0 7px 18px rgba(0,0,0,.3);backdrop-filter:blur(7px);cursor:pointer}.live-score-controls button:nth-child(2){display:flex;flex-direction:column;align-items:center;justify-content:center;border-color:rgba(245,207,104,.45);font-size:initial}.live-score-controls b{color:#f5cf68;font-size:23px;line-height:1}.live-score-controls small{margin-top:2px;color:#e3eee8;font-size:8px}.live-status-line{position:absolute;z-index:18;left:8px;bottom:calc(98px + env(safe-area-inset-bottom));max-width:55vw;margin:0!important;padding:3px 6px;border-radius:5px;background:rgba(12,20,16,.38);color:#d8e7df!important;font-size:8px!important;backdrop-filter:blur(5px)}
    @media(max-width:390px){.live-map-summary small{font-size:6px}.live-map-summary b{font-size:20px}.live-score-controls{left:38%;width:min(218px,64vw);grid-template-columns:44px minmax(96px,1fr) 44px}.live-to-hit{left:11%}.live-to-go{right:11%}}
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

  function yardsBetween(a,b){
    if (!a || !b) return 0;
    const rad = value => value * Math.PI / 180;
    const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng), lat1 = rad(a.lat), lat2 = rad(b.lat);
    const hav = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return Math.round(2*6371000*Math.asin(Math.sqrt(hav))*1.0936133);
  }

  function bearingBetween(a,b){
    if (!a || !b) return 0;
    const rad = value => value*Math.PI/180, deg = value => value*180/Math.PI;
    const dLng=rad(b.lng-a.lng), lat1=rad(a.lat), lat2=rad(b.lat);
    return (deg(Math.atan2(Math.sin(dLng)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng)))+360)%360;
  }

  async function updateLiveWeather(point){
    if (!point) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lng}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      const response = await fetch(url);
      const current = (await response.json()).current || {};
      const icon = current.weather_code <= 1 ? '☀' : current.weather_code <= 3 ? '☁' : current.weather_code <= 67 ? '☂' : '◌';
      document.getElementById('liveWeatherIcon').textContent = icon;
      document.getElementById('liveTemperature').textContent = Number.isFinite(Number(current.temperature_2m)) ? `${Math.round(Number(current.temperature_2m))}°` : '—°';
      document.getElementById('liveWindArrow').style.transform = `rotate(${Number(current.wind_direction_10m)||0}deg)`;
      document.getElementById('liveWindSpeed').textContent = Number.isFinite(Number(current.wind_speed_10m)) ? `${Math.round(Number(current.wind_speed_10m))} mph` : '—';
    } catch { /* Weather is supplemental; the play view remains fully usable. */ }
  }

  async function openLiveRound(round){
    open('<div class="live-round"><p class="lead">Loading your live round…</p></div>');
    let payload;
    try { payload = await loadCoursePayload(round); }
    catch (error) { return open(`<h2>Live Round</h2><div class="gold-rule"></div><p class="round-error">The shared course map could not be loaded: ${esc(error.message)}</p>`); }
    const holeCount = Math.min(Number(round?.holes) || Number(payload?.holes) || 18, payload?.greens?.length || Number(round?.holes) || 18);
    const scores = await loadScores(round);
    let holeIndex = 0;
    let map, routeLine, gpsMarker, watchId, gpsPoint, activePoints=[];
    let mapMarkers = [];

    const terrainReady = Boolean(window.PARFOLIO_CONFIG?.mapTilerKey);
    open(`<div class="live-round-shell">
      <div class="play-map" id="playMap" role="region" aria-label="Forward-facing live hole map"></div>
      <div class="live-map-summary">
        <div><small>Hole</small><b id="roundMapHole">1</b></div>
        <div><small>Distance</small><b><span id="roundMapDistance">—</span> <i>YDS</i></b></div>
        <div><small>Par</small><b id="roundMapPar">—</b></div>
        <div><small>Route Remaining</small><b><span id="centerYards">—</span> <i>YDS</i></b></div>
        <button type="button" id="liveMenuButton" aria-label="Open round menu"><span class="live-menu-lines"><i></i><i></i><i></i></span><small>Menu</small></button>
      </div>
      <div class="live-course-strip">${esc(round?.course_name || payload?.name || 'ParFolio Live Round')}</div>
      <div class="live-map-toggle" aria-label="Map style"><button type="button" data-map-type="terrain" ${terrainReady?'':'disabled title="Requires a separate ParFolio MapTiler key"'}>Terrain</button><button type="button" data-map-type="satellite" class="active">Satellite</button></div>
      <div class="live-weather-card"><span id="liveWeatherIcon">◌</span><b id="liveTemperature">—°</b><small>WIND</small><span id="liveWindArrow">↑</span><em id="liveWindSpeed">—</em></div>
      <button class="live-map-recenter" type="button" id="liveMapRecenter" aria-label="Restore complete hole view">⌖</button><div class="live-zoom-controls"><button type="button" id="liveZoomIn" aria-label="Zoom in">+</button><button type="button" id="liveZoomOut" aria-label="Zoom out">−</button></div>
      <div class="live-yard-card live-to-hit"><b id="yardsToHit">—</b><small>TO HIT</small></div>
      <div class="live-yard-card live-to-go"><b id="yardsToGo">—</b><small>TO GO</small></div>
      <button class="hole-edge-arrow previous" type="button" id="previousHole" aria-label="Previous hole">‹</button><button class="hole-edge-arrow next" type="button" id="nextHole" aria-label="Next hole">›</button>
      <div class="live-score-controls"><button type="button" id="scoreMinus" aria-label="Subtract stroke">−</button><button type="button" id="scoreDisplay" aria-label="Current hole score"><b id="holeScore">–</b><small id="scoreToPar">Tap · Total 0</small></button><button type="button" id="scorePlus" aria-label="Add stroke">+</button></div>
      <p class="live-status-line" id="liveRoundStatus" aria-live="polite">Requesting your GPS location…</p>
    </div>`);
    dialog.classList.add('live-round-dialog');

    const renderScore = () => {
      const number = holeIndex + 1, par = Number(payload?.pars?.[holeIndex]) || null, score = scores[number];
      const total = Object.values(scores).reduce((sum,value) => sum + (Number(value)||0), 0);
      document.getElementById('holeScore').textContent = score || par || '–';
      document.getElementById('scoreToPar').textContent = `Tap · Total ${total}`;
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
    const updateDistanceReadouts = (points=activePoints) => {
      const origin = gpsPoint || points[0], target = points.find((point,index) => index > 0 && yardsBetween(origin,point) > 25) || points[points.length-1];
      const targetIndex = Math.max(0, points.indexOf(target));
      const toHit = yardsBetween(origin,target);
      const toGo = toHit + points.slice(targetIndex).reduce((sum,point,index,array) => index ? sum + yardsBetween(array[index-1],point) : sum,0);
      document.getElementById('roundMapDistance').textContent = points.length > 1 ? points.slice(1).reduce((sum,point,index) => sum+yardsBetween(points[index],point),0) : '—';
      document.getElementById('centerYards').textContent = toGo || '—';
      document.getElementById('yardsToHit').textContent = toHit || '—';
      document.getElementById('yardsToGo').textContent = toGo || '—';
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
      activePoints = points;
      stops.forEach(stop => addMarker(stop.point, stop.label, stop.kind));
      if (points.length) {
        routeLine = new google.maps.Polyline({ path:points, map, strokeColor:'#d6b765', strokeOpacity:.96, strokeWeight:4, geodesic:true });
        const bounds = new google.maps.LatLngBounds(); points.forEach(point => bounds.extend(point));
        if (gpsMarker?.getPosition()) bounds.extend(gpsMarker.getPosition());
        map.fitBounds(bounds, {top:145,right:48,bottom:72,left:48});
        const heading = bearingBetween(points[0], points[1] || points[points.length-1]);
        setTimeout(() => { try { map.moveCamera({heading,tilt:67.5}); } catch {} }, 120);
      } else if (payload?.lat && payload?.lng) map.setCenter({lat:Number(payload.lat),lng:Number(payload.lng)});
      const par = payload?.pars?.[holeIndex];
      document.getElementById('roundMapHole').textContent = holeIndex+1;
      document.getElementById('roundMapPar').textContent = par || '—';
      updateDistanceReadouts(points);
      document.getElementById('previousHole').disabled = holeIndex === 0;
      document.getElementById('nextHole').disabled = holeIndex >= holeCount-1;
      document.getElementById('liveRoundStatus').textContent = points.length ? 'Tee → aim → green route from the shared Golf Course Library.' : 'This hole is awaiting approved GPS mapping in the shared library.';
      renderScore();
    };

    try {
      await loadGoogleMaps();
      map = new google.maps.Map(document.getElementById('playMap'), { center:{lat:Number(payload?.lat)||37.5,lng:Number(payload?.lng)||-119.5}, zoom:17, mapTypeId:'satellite', heading:0, tilt:67.5, disableDefaultUI:true, clickableIcons:false, gestureHandling:'greedy', headingInteractionEnabled:true, tiltInteractionEnabled:true, backgroundColor:'#173c2b' });
      drawHole();
      const weatherPoint = toPoint(payload) || toPoint(payload?.greens?.[0]?.center); updateLiveWeather(weatherPoint);
      document.querySelectorAll('[data-map-type]').forEach(button => button.addEventListener('click', () => { if(button.disabled)return; map.setMapTypeId(button.dataset.mapType==='satellite'?'satellite':'terrain'); document.querySelectorAll('[data-map-type]').forEach(b => b.classList.toggle('active', b===button)); }));
      if (navigator.geolocation) watchId = navigator.geolocation.watchPosition(position => {
        gpsPoint = {lat:position.coords.latitude,lng:position.coords.longitude};
        if (!gpsMarker) gpsMarker = new google.maps.Marker({position:gpsPoint,map,title:'Your GPS location',icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:'#2775d7',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3,scale:8},zIndex:9}); else gpsMarker.setPosition(gpsPoint);
        updateDistanceReadouts();
      }, () => { document.getElementById('liveRoundStatus').textContent = 'Location is off. Enable GPS to show your position on the hole.'; }, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    } catch (error) { document.getElementById('playMap').innerHTML = `<div class="course-empty">${esc(error.message)}</div>`; document.getElementById('liveRoundStatus').textContent = 'The map is unavailable, but hole navigation and scoring still work.'; renderScore(); }

    document.getElementById('previousHole').addEventListener('click', () => { if (holeIndex) { holeIndex--; if(map) drawHole(); else renderScore(); } });
    document.getElementById('nextHole').addEventListener('click', () => { if (holeIndex < holeCount-1) { holeIndex++; if(map) drawHole(); else renderScore(); } });
    document.getElementById('scoreMinus').addEventListener('click', () => setScore(-1));
    document.getElementById('scorePlus').addEventListener('click', () => setScore(1));
    document.getElementById('scoreDisplay').addEventListener('click', () => setScore(0));
    document.getElementById('liveMenuButton').addEventListener('click', () => { dialog.close(); setDrawer(true); });
    document.getElementById('liveMapRecenter').addEventListener('click', drawHole);
    document.getElementById('liveZoomIn').addEventListener('click', () => map?.setZoom((map.getZoom()||17)+1));
    document.getElementById('liveZoomOut').addEventListener('click', () => map?.setZoom((map.getZoom()||17)-1));
    dialog.addEventListener('close', () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); dialog.classList.remove('live-round-dialog'); }, {once:true});
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
