/* ParFolio v207 — localize the homepage action area when app language changes. */
(function(){
  const L={
    en:{courses:'Courses',resume:'Resume Round',end:'End Round',newRound:'Start a New Round',create:'Create a Round',join:'Join with Round Code',scan:'Scan Round QR',account:'My Account',signup:'Sign Up',forgot:'Forgot Password?',signed:'Golfer signed in',roundOptions:'ROUND OPTIONS',checking:'Checking your saved login…',signin:'Golfer Sign In',signinHint:'Sign in before creating or joining a round',email:'Email',password:'Password',emailPH:'you@example.com',passwordPH:'Enter your password',signInBtn:'Sign In'},
    es:{courses:'Campos',resume:'Reanudar ronda',end:'Finalizar ronda',newRound:'Iniciar nueva ronda',create:'Crear una ronda',join:'Unirse con código de ronda',scan:'Escanear QR de la ronda',account:'Mi cuenta',signup:'Registrarse',forgot:'¿Olvidó su contraseña?',signed:'Golfista conectado',roundOptions:'OPCIONES DE RONDA',checking:'Comprobando su sesión guardada…',signin:'Inicio de sesión',signinHint:'Inicie sesión antes de crear o unirse a una ronda',email:'Correo electrónico',password:'Contraseña',emailPH:'usted@ejemplo.com',passwordPH:'Introduzca su contraseña',signInBtn:'Iniciar sesión'},
    zh:{courses:'球场',resume:'继续球局',end:'结束球局',newRound:'开始新球局',create:'创建球局',join:'使用球局代码加入',scan:'扫描球局二维码',account:'我的账户',signup:'注册',forgot:'忘记密码？',signed:'球员已登录',roundOptions:'球局选项',checking:'正在检查已保存的登录…',signin:'球员登录',signinHint:'创建或加入球局前请先登录',email:'电子邮件',password:'密码',emailPH:'you@example.com',passwordPH:'输入密码',signInBtn:'登录'},
    id:{courses:'Lapangan',resume:'Lanjutkan Ronde',end:'Akhiri Ronde',newRound:'Mulai Ronde Baru',create:'Buat Ronde',join:'Gabung dengan Kode Ronde',scan:'Pindai QR Ronde',account:'Akun Saya',signup:'Daftar',forgot:'Lupa Kata Sandi?',signed:'Pegolf masuk',roundOptions:'PILIHAN RONDE',checking:'Memeriksa login tersimpan…',signin:'Masuk Pegolf',signinHint:'Masuk sebelum membuat atau bergabung ke ronde',email:'Email',password:'Kata Sandi',emailPH:'anda@contoh.com',passwordPH:'Masukkan kata sandi',signInBtn:'Masuk'},
    hi:{courses:'कोर्स',resume:'राउंड जारी रखें',end:'राउंड समाप्त करें',newRound:'नया राउंड शुरू करें',create:'राउंड बनाएँ',join:'राउंड कोड से जुड़ें',scan:'राउंड QR स्कैन करें',account:'मेरा खाता',signup:'साइन अप',forgot:'पासवर्ड भूल गए?',signed:'गोल्फर साइन इन है',roundOptions:'राउंड विकल्प',checking:'सहेजा गया लॉगिन जाँचा जा रहा है…',signin:'गोल्फर साइन इन',signinHint:'राउंड बनाने या जुड़ने से पहले साइन इन करें',email:'ईमेल',password:'पासवर्ड',emailPH:'you@example.com',passwordPH:'पासवर्ड दर्ज करें',signInBtn:'साइन इन'},
    fr:{courses:'Parcours',resume:'Reprendre la partie',end:'Terminer la partie',newRound:'Commencer une nouvelle partie',create:'Créer une partie',join:'Rejoindre avec un code',scan:'Scanner le QR de la partie',account:'Mon compte',signup:"S'inscrire",forgot:'Mot de passe oublié ?',signed:'Golfeur connecté',roundOptions:'OPTIONS DE PARTIE',checking:'Vérification de votre connexion enregistrée…',signin:'Connexion golfeur',signinHint:'Connectez-vous avant de créer ou rejoindre une partie',email:'E-mail',password:'Mot de passe',emailPH:'vous@exemple.com',passwordPH:'Entrez votre mot de passe',signInBtn:'Se connecter'}
  };
  const lang=()=>L[typeof appLanguage!=='undefined'?appLanguage:'en']||L.en;
  const text=(el,value)=>{if(el&&value!=null)el.textContent=value};
  const buttonLabel=(el,value,arrow=false)=>{if(!el)return;el.innerHTML=`${value}${arrow?' <b>→</b>':''}`};
  function apply(){
    const root=document.querySelector('#app.home-page');if(!root)return;const x=lang();
    buttonLabel(root.querySelector('.home-courses-link'),`⛳ ${x.courses}`);
    const buttons=[...root.querySelectorAll('.home-actions button')];
    const byOnclick=s=>buttons.find(b=>(b.getAttribute('onclick')||'').includes(s));
    const resume=byOnclick('resumeRound()');if(resume)buttonLabel(resume,x.resume,true);
    const end=byOnclick('endCurrentRoundFromHome()');if(end)end.innerHTML=x.end.replace(' ','<br>');
    const starts=buttons.filter(b=>(b.getAttribute('onclick')||'').includes('start()'));
    starts.forEach(b=>buttonLabel(b,b.classList.contains('home-primary')?x.create:x.newRound,b.classList.contains('home-primary')));
    buttonLabel(byOnclick('joinRound()'),x.join);
    buttonLabel(byOnclick('showQrScanner()'),`▣ ${x.scan}`);
    buttonLabel(byOnclick('accountAction()'),x.account);
    buttonLabel(byOnclick('createAccount()'),x.signup);
    buttonLabel(byOnclick('forgotPassword()'),x.forgot);
    text(root.querySelector('.home-action-divider span'),x.roundOptions);
    text(root.querySelector('.home-auth-loading'),x.checking);
    const form=root.querySelector('.home-signin');if(form){
      text(form.querySelector('.home-signin-heading b'),x.signin);text(form.querySelector('.home-signin-heading small'),x.signinHint);
      const labels=form.querySelectorAll('label');if(labels[0])text(labels[0],x.email);if(labels[1])text(labels[1],x.password);
      const email=form.querySelector('#homeEmail'),password=form.querySelector('#homePassword'),submit=form.querySelector('#homeSignInButton');if(email)email.placeholder=x.emailPH;if(password)password.placeholder=x.passwordPH;text(submit,x.signInBtn);
    }
    const status=root.querySelector('.account-status');if(status&&status.textContent.trim().toLowerCase().includes('golfer')){const dot=status.querySelector('i');status.textContent=x.signed;if(dot)status.prepend(dot)}
  }
  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[onclick*="showLanguageMenu"], [data-language], .language-option'))setTimeout(queue,0)},true);
  setTimeout(apply,0);setTimeout(apply,350);
  window.applyParFolioHomeLanguage=apply;
})();

/* v208 bootstrap: keep social feature modular and load it after the existing menu/home layers. */
(function(){
  if(!document.querySelector('link[data-parfolio-social]')){const css=document.createElement('link');css.rel='stylesheet';css.href='social-v208.css?v=208';css.dataset.parfolioSocial='1';document.head.appendChild(css)}
  if(!document.querySelector('script[data-parfolio-social]')){const js=document.createElement('script');js.src='social-v208.js?v=208';js.defer=true;js.dataset.parfolioSocial='1';document.body.appendChild(js)}
})();
