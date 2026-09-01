/* Version 107: menu cleanup and round actions */
(function(){
  const priorShowAppMenu=showAppMenu;
  if(typeof priorShowAppMenu!=='function')return;

  window.startNewRoundFromMenu=function(){
    const active=!!(s?.sharedRoundId&&!s?.done);
    if(active&&!confirm('Start a new round? Your current round will remain available in Previous Rounds.'))return;
    closeRoundQuickMenu();
    start();
  };

  window.finishRoundFromMenu=function(){
    closeRoundQuickMenu();
    if(!s?.sharedRoundId)return;
    if(s?.createdBy!==currentUser?.id){
      alert('Only the golfer who created this round can finish it for everyone.');
      return;
    }
    setRoundStatus('complete');
  };

  showAppMenu=function(){
    priorShowAppMenu();
    const menu=document.querySelector('.app-side-menu');
    if(!menu)return;

    const buttons=[...menu.querySelectorAll(':scope > button')];
    const clubsButton=buttons.find(button=>button.getAttribute('onclick')?.includes('openClubs'));
    const manageButton=buttons.find(button=>button.getAttribute('onclick')?.includes('openRoundManagement'));
    clubsButton?.remove();
    manageButton?.remove();

    const refreshed=[...menu.querySelectorAll(':scope > button')];
    const coursesButton=refreshed.find(button=>button.getAttribute('onclick')?.includes('openCoursesFromNav'));
    const startButton=refreshed.find(button=>button.classList.contains('menu-start-round')||button.getAttribute('onclick')?.includes('start()'));
    const languageButton=refreshed.find(button=>button.getAttribute('onclick')?.includes('showLanguageMenu'));

    if(coursesButton&&appLanguage==='en'){
      const icon=coursesButton.querySelector(':scope > span');
      coursesButton.innerHTML='';
      if(icon)coursesButton.appendChild(icon);
      coursesButton.appendChild(document.createTextNode(adminRole==='super_admin'?'Course / Players':'Courses'));
    }

    if(startButton)startButton.setAttribute('onclick','startNewRoundFromMenu()');

    if(coursesButton&&s?.sharedRoundId&&!s?.done){
      const finish=document.createElement('button');
      finish.className='menu-finish-round';
      finish.setAttribute('onclick','finishRoundFromMenu()');
      finish.innerHTML='<span>✓</span>Finish Round';
      coursesButton.insertAdjacentElement('afterend',finish);
    }

    if(languageButton&&currentUser){
      const history=document.createElement('button');
      history.className='menu-previous-matches';
      history.setAttribute('onclick',"closeRoundQuickMenu();openHistory()");
      history.innerHTML='<span>↶</span>Previous Rounds';
      languageButton.insertAdjacentElement('beforebegin',history);
    }
  };
})();
