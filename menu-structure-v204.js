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
      .app-side-menu.menu-v204{padding-bottom:max(12px,env(safe-area-inset-bottom));overflow-y:auto}
      .app-side-menu.menu-v204>.menu-section-label{margin:9px 20px 3px;color:rgba(240,203,91,.86);font-size:10px;font-weight:750;letter-spacing:.14em;line-height:1.15}
      .app-side-menu.menu-v204>button{min-height:47px;margin:0 12px;padding:6px 14px;border-radius:14px;line-height:1.08}
      .app-side-menu.menu-v204>button.menu-home-v204{margin-top:4px}
      .app-side-menu.menu-v204>button.menu-start-round{margin-top:5px;border:1px solid rgba(231,190,76,.52);background:rgba(223,184,74,.08)}
      .app-side-menu.menu-v204>button .menu-line-icon{display:inline-grid;place-items:center;width:32px;min-width:32px;color:#e1bd58;font-size:24px;line-height:1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:400}
      .app-side-menu.menu-v204>button>div{display:flex;flex-direction:column;align-items:flex-start;gap:0;line-height:1.08}
      .app-side-menu.menu-v204>button>div small{font-size:.60em;line-height:1.05;opacity:.68;margin-top:1px}
      .app-side-menu.menu-v204 .menu-divider-v204{height:1px;margin:5px 18px;background:rgba(255,255,255,.12)}
      .app-side-menu.menu-v204 header{margin-bottom:2px;min-height:64px}
      .app-side-menu.menu-v204 .pf-social-menu-section.menu-section-label{margin-top:9px!important;margin-bottom:3px!important}
      .app-side-menu.menu-v204>button.pf-social-menu-section{min-height:47px!important;margin-top:0!important;margin-bottom:0!important;padding-top:6px!important;padding-bottom:6px!important}
      @media(max-height:760px){.app-side-menu.menu-v204>button{min-height:44px;padding-top:5px;padding-bottom:5px}.app-side-menu.menu-v204>.menu-section-label{margin-top:7px}.app-side-menu.menu-v204 header{min-height:58px}}
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

/* v205 bootstrap — automatic homepage Golf Feed. */
(function(){
  if(!document.querySelector('link[data-parfolio-golf-feed-v205]')){const link=document.createElement('link');link.rel='stylesheet';link.href='golf-feed-v205.css?v=205';link.dataset.parfolioGolfFeedV205='1';document.head.appendChild(link)}
  if(!document.querySelector('script[data-parfolio-golf-feed-v205]')){const script=document.createElement('script');script.src='golf-feed-v205.js?v=205';script.async=false;script.dataset.parfolioGolfFeedV205='1';document.head.appendChild(script)}
})();
