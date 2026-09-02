/* ParFolio v204 — streamlined grouped side menu. */
(function(){
  const LABELS={
    en:{current:'CURRENT ROUND',invite:'Invite Players',history:'Round History',golf:'GOLF',settings:'SETTINGS'},
    es:{current:'RONDA ACTUAL',invite:'Invitar jugadores',history:'Historial de rondas',golf:'GOLF',settings:'AJUSTES'},
    zh:{current:'当前球局',invite:'邀请球员',history:'球局记录',golf:'高尔夫',settings:'设置'},
    id:{current:'RONDE SAAT INI',invite:'Undang Pemain',history:'Riwayat Ronde',golf:'GOLF',settings:'PENGATURAN'},
    hi:{current:'मौजूदा राउंड',invite:'खिलाड़ियों को बुलाएँ',history:'राउंड इतिहास',golf:'गोल्फ',settings:'सेटिंग्स'},
    fr:{current:'PARTIE EN COURS',invite:'Inviter des joueurs',history:'Historique des parties',golf:'GOLF',settings:'RÉGLAGES'}
  };
  const labels=()=>LABELS[typeof appLanguage!=='undefined'?appLanguage:'en']||LABELS.en;
  const icon=(glyph)=>`<span class="menu-line-icon" aria-hidden="true">${glyph}</span>`;
  const section=(text)=>`<div class="menu-section-label">${esc(text)}</div>`;
  const closeAnd=(action)=>`closeRoundQuickMenu();${action}`;

  function injectStyle(){
    if(document.getElementById('parfolio-menu-v204-style'))return;
    const style=document.createElement('style');style.id='parfolio-menu-v204-style';style.textContent=`
      .app-side-menu.menu-v204{padding-bottom:max(18px,env(safe-area-inset-bottom));overflow-y:auto}
      .app-side-menu.menu-v204>.menu-section-label{margin:15px 24px 6px;color:rgba(240,203,91,.82);font-size:11px;font-weight:700;letter-spacing:.15em}
      .app-side-menu.menu-v204>button{min-height:58px;margin:0 14px;padding:10px 16px;border-radius:16px}
      .app-side-menu.menu-v204>button.menu-home-v204{margin-top:8px}
      .app-side-menu.menu-v204>button.menu-start-round{margin-top:8px;border:1px solid rgba(231,190,76,.52);background:rgba(223,184,74,.08)}
      .app-side-menu.menu-v204>button .menu-line-icon{display:inline-grid;place-items:center;width:38px;min-width:38px;color:#e1bd58;font-size:29px;line-height:1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:400}
      .app-side-menu.menu-v204>button>div{display:flex;flex-direction:column;align-items:flex-start;gap:1px}
      .app-side-menu.menu-v204>button>div small{font-size:.58em;opacity:.66}
      .app-side-menu.menu-v204 .menu-divider-v204{height:1px;margin:9px 20px;background:rgba(255,255,255,.12)}
      .app-side-menu.menu-v204 header{margin-bottom:5px}
      @media(max-height:760px){.app-side-menu.menu-v204>button{min-height:52px;padding-top:8px;padding-bottom:8px}.app-side-menu.menu-v204>.menu-section-label{margin-top:10px}}
    `;document.head.appendChild(style);
  }

  showAppMenu=function(){
    injectStyle();closeRoundQuickMenu();
    const L=labels(),active=!!s.sharedRoundId,courseLabel=adminRole==='super_admin'?t('coursesPlayers'):t('courses');
    const overlay=document.createElement('div');overlay.className='app-menu-overlay';overlay.onclick=event=>{if(event.target===overlay)closeRoundQuickMenu()};
    const currentRound=active?`${section(L.current)}
      <button onclick="${closeAnd("showTeePicker()")}">${icon('◎')}<div>${esc(t('playingTee'))}<small>${esc(teeSetLabel())}</small></div></button>
      <button onclick="${closeAnd("openScorecard()")}">${icon('▦')}<div>${esc(t('scorecard'))}</div></button>
      <button onclick="${closeAnd("openRoundChat()")}">${icon('◌')}<div>${esc(t('chat'))}</div></button>
      <button onclick="${closeAnd("showRoundQr()")}">${icon('▣')}<div>${esc(L.invite)}${s.joinCode?`<small>${esc(s.joinCode)}</small>`:''}</div></button>`:'';
    overlay.innerHTML=`<section class="app-side-menu menu-v204" role="dialog" aria-modal="true" aria-label="${esc(t('menu'))}">
      <header><button class="menu-about-logo" onclick="openAboutFromMenu()" aria-label="${esc(t('about'))}"><img src="parfolio-app-icon.png" alt="ParFolio"><small>${esc(t('about'))}</small></button><button class="menu-close" onclick="closeRoundQuickMenu()" aria-label="${esc(t('close'))}">×</button></header>
      <button class="menu-home-v204" onclick="${closeAnd("goHome()")}">${icon('⌂')}<div>${esc(t('home'))}</div></button>
      ${currentRound}
      <button class="menu-start-round" onclick="${closeAnd("start()")}">${icon('＋')}<div>${esc(startNewRoundLabel())}</div></button>
      ${section(L.golf)}
      <button onclick="${closeAnd("openCoursesFromNav()")}">${icon('◫')}<div>${esc(courseLabel)}</div></button>
      <button onclick="${closeAnd("openClubs('round')")}" ${currentUser?'':'disabled'}>${icon('♧')}<div>${esc(menuExtraLabel('clubs'))}</div></button>
      <button onclick="${closeAnd("openHistory()")}">${icon('↶')}<div>${esc(L.history)}</div></button>
      ${section(L.settings)}
      <button onclick="${closeAnd("showLanguageMenu()")}">${icon('文')}<div>${esc(t('language'))}<small>${esc(APP_LANGUAGES[appLanguage])}</small></div></button>
      <button onclick="${closeAnd("accountAction()")}">${icon('●')}<div>${esc(t('myAccount'))}</div></button>
    </section>`;
    document.body.appendChild(overlay);
  };
})();
