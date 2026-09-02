/* ParFolio v194 — international phone entry + unified map-edit actions. */
(function(){
  const VERSION=194;
  const KNOWN_CODES=['+1','+7','+20','+27','+30','+31','+32','+33','+34','+36','+39','+40','+41','+43','+44','+45','+46','+47','+48','+49','+51','+52','+53','+54','+55','+56','+57','+58','+60','+61','+62','+63','+64','+65','+66','+81','+82','+84','+86','+90','+91','+92','+93','+94','+95','+98','+212','+213','+216','+218','+220','+221','+222','+223','+224','+225','+226','+227','+228','+229','+230','+231','+232','+233','+234','+235','+236','+237','+238','+239','+240','+241','+242','+243','+244','+245','+246','+248','+249','+250','+251','+252','+253','+254','+255','+256','+257','+258','+260','+261','+262','+263','+264','+265','+266','+267','+268','+269','+290','+291','+297','+298','+299','+350','+351','+352','+353','+354','+355','+356','+357','+358','+359','+370','+371','+372','+373','+374','+375','+376','+377','+378','+380','+381','+382','+383','+385','+386','+387','+389','+420','+421','+423','+500','+501','+502','+503','+504','+505','+506','+507','+508','+509','+590','+591','+592','+593','+594','+595','+596','+597','+598','+599','+670','+672','+673','+674','+675','+676','+677','+678','+679','+680','+681','+682','+683','+685','+686','+687','+688','+689','+690','+691','+692','+850','+852','+853','+855','+856','+880','+886','+960','+961','+962','+963','+964','+965','+966','+967','+968','+970','+971','+972','+973','+974','+975','+976','+977','+992','+993','+994','+995','+996','+998'];

  function injectStyles(){
    if(document.getElementById('parfolio-v194-ui-style'))return;
    const style=document.createElement('style');style.id='parfolio-v194-ui-style';style.textContent=`
      .parfolio-phone-row{display:grid;grid-template-columns:minmax(82px,98px) 1fr;gap:8px;align-items:center;width:100%}
      .parfolio-country-code{width:100%!important;min-width:0!important;text-align:center;font-variant-numeric:tabular-nums}
      .parfolio-phone-row>input[data-parfolio-phone-main="1"]{width:100%!important;min-width:0!important}
      .parfolio-phone-help{display:block;margin:5px 0 0;color:#6b756f;font-size:12px;line-height:1.25}
    `;document.head.appendChild(style);
  }
  function isPhoneInput(input){
    if(!(input instanceof HTMLInputElement)||input.dataset.parfolioCountryCode==='1')return false;
    const key=`${input.type} ${input.id} ${input.name} ${input.autocomplete} ${input.placeholder}`.toLowerCase();
    return input.type==='tel'||key.includes('phone')||key.includes('mobile');
  }
  function splitExisting(value){
    const raw=String(value||'').trim();
    if(!raw.startsWith('+'))return{code:'+1',local:raw};
    const compact='+'+raw.slice(1).replace(/\D/g,'');
    const code=[...KNOWN_CODES].sort((a,b)=>b.length-a.length).find(c=>compact.startsWith(c));
    return code?{code,local:compact.slice(code.length)}:{code:'',local:compact};
  }
  function normalizePhone(input){
    const wrap=input.closest('.parfolio-phone-row');if(!wrap)return;
    const codeInput=wrap.querySelector('.parfolio-country-code');
    let local=String(input.value||'').trim();if(!local)return;
    if(local.startsWith('+')){input.value='+'+local.slice(1).replace(/\D/g,'');return;}
    let code=String(codeInput?.value||'+1').trim().replace(/[^+\d]/g,'');
    if(!code.startsWith('+'))code='+'+code.replace(/\D/g,'');
    if(!/^\+\d{1,4}$/.test(code))return;
    local=local.replace(/\D/g,'');
    if(code!=='+1')local=local.replace(/^0+/,'');
    input.value=code+local;
  }
  function enhancePhone(input){
    if(!isPhoneInput(input)||input.dataset.parfolioPhoneEnhanced==='1'||input.closest('.parfolio-phone-row'))return;
    injectStyles();input.dataset.parfolioPhoneEnhanced='1';input.dataset.parfolioPhoneMain='1';
    const original=splitExisting(input.value),row=document.createElement('div');row.className='parfolio-phone-row';
    const code=document.createElement('input');code.type='tel';code.inputMode='tel';code.autocomplete='tel-country-code';code.className='parfolio-country-code';code.dataset.parfolioCountryCode='1';code.value=original.code||'+1';code.placeholder='+1';code.setAttribute('aria-label','Country code');code.maxLength=5;
    input.parentNode.insertBefore(row,input);row.append(code,input);if(original.code)input.value=original.local;
    const help=document.createElement('small');help.className='parfolio-phone-help';help.textContent='Country code + phone number (for example +1 US/Canada, +62 Indonesia).';row.insertAdjacentElement('afterend',help);
    input.addEventListener('blur',()=>normalizePhone(input));
  }
  function enhancePhones(root=document){root.querySelectorAll?.('input').forEach(enhancePhone)}

  function unifyEditActions(root=document){
    root.querySelectorAll?.('.course-map-admin-action').forEach(button=>{if(button.textContent.trim()!=='Edit')button.textContent='Edit';button.setAttribute('aria-label','Edit course map')});
    const scopes=['.course-card','.course-row','.smart-course-row','.course-map-popup','.course-list-item','.catalog-course-card'];
    root.querySelectorAll?.(scopes.join(',')).forEach(container=>{
      const buttons=[...container.querySelectorAll('button,a')];
      const edit=buttons.find(b=>b.textContent.trim().toLowerCase()==='edit');
      const map=buttons.find(b=>b.textContent.trim().toLowerCase()==='map'&&!b.classList.contains('course-map-launch'));
      if(edit&&map&&map!==edit)map.remove();
      else if(map&&(map.classList.contains('course-map-admin-action')||/mapCatalogCourse|editCourse/.test(map.getAttribute('onclick')||''))){map.textContent='Edit';map.setAttribute('aria-label','Edit course map')}
    });
  }

  function apply(root=document){enhancePhones(root);unifyEditActions(root)}
  document.addEventListener('submit',event=>{event.target?.querySelectorAll?.('input[data-parfolio-phone-main="1"]').forEach(normalizePhone)},true);
  const observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1)apply(node)});
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply(document),{once:true});else apply(document);
  window.PARFOLIO_UI_CONSISTENCY={version:VERSION,enhancePhones:()=>enhancePhones(document),unifyEditActions:()=>unifyEditActions(document)};
})();

/* v197 country-level Indonesia catalog bootstrap. */
(function(){
  if(document.querySelector('script[data-parfolio-indonesia-v197]'))return;
  const script=document.createElement('script');
  script.src='indonesia-catalog-v197.js?v=197';
  script.async=false;
  script.dataset.parfolioIndonesiaV197='1';
  document.head.appendChild(script);
})();
