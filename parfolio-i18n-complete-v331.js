/* ParFolio v331 — systemwide i18n runtime. Loaded after every feature module. */
(function(){
  'use strict';
  const LANGS=['en','es','zh','id','hi','fr'];
  const phrases=window.PF_I18N_PHRASES||{};
  const reverse={};
  function rebuildReverse(){
    for(const key of Object.keys(reverse))delete reverse[key];
    for(const [en,row] of Object.entries(phrases)){
      reverse[en]=en;
      for(const code of LANGS){const value=row?.[code];if(value)reverse[value]=en;}
    }
  }
  rebuildReverse();
  function language(){
    const raw=(document.documentElement.lang||localStorage.parfolioLanguage||'en').toLowerCase();
    if(raw.startsWith('zh'))return'zh';
    return LANGS.includes(raw)?raw:'en';
  }
  function exact(value){
    const code=language(),source=reverse[value]||value;
    if(code==='en')return source;
    return phrases[source]?.[code]||value;
  }
  const patterns={
    es:[[/^(\d+) holes$/i,'$1 hoyos'],[/^Holes (\d+)–(\d+)$/,'Hoyos $1–$2'],[/^thru (\d+)$/i,'hasta $1'],[/^Open now · (.+)$/,'Abierto ahora · $1'],[/^Closed now · (.+)$/,'Cerrado ahora · $1']],
    zh:[[/^(\d+) holes$/i,'$1 洞'],[/^Holes (\d+)–(\d+)$/,'第 $1–$2 洞'],[/^thru (\d+)$/i,'打完 $1 洞'],[/^Open now · (.+)$/,'正在营业 · $1'],[/^Closed now · (.+)$/,'已打烊 · $1']],
    id:[[/^(\d+) holes$/i,'$1 hole'],[/^Holes (\d+)–(\d+)$/,'Hole $1–$2'],[/^thru (\d+)$/i,'hingga $1'],[/^Open now · (.+)$/,'Buka sekarang · $1'],[/^Closed now · (.+)$/,'Tutup sekarang · $1']],
    hi:[[/^(\d+) holes$/i,'$1 होल'],[/^Holes (\d+)–(\d+)$/,'होल $1–$2'],[/^thru (\d+)$/i,'$1 तक'],[/^Open now · (.+)$/,'अभी खुला है · $1'],[/^Closed now · (.+)$/,'अभी बंद है · $1']],
    fr:[[/^(\d+) holes$/i,'$1 trous'],[/^Holes (\d+)–(\d+)$/,'Trous $1–$2'],[/^thru (\d+)$/i,'après $1'],[/^Open now · (.+)$/,'Ouvert maintenant · $1'],[/^Closed now · (.+)$/,'Fermé maintenant · $1']]
  };
  function translate(value){
    if(typeof value!=='string'||!value)return value;
    const parts=value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const lead=parts?.[1]||'',core=parts?.[2]||value,tail=parts?.[3]||'';
    if(!core.trim())return value;
    let out=exact(core),code=language();
    if(out===core&&code!=='en'){
      for(const [re,replacement] of patterns[code]||[]){if(re.test(core)){out=core.replace(re,replacement);break;}}
    }
    return lead+out+tail;
  }
  function skip(node){
    const el=node?.nodeType===1?node:node?.parentElement;
    return !!el?.closest?.('script,style,noscript,code,pre,[data-pf-no-i18n],[contenteditable="true"]');
  }
  function translateAttrs(el){
    if(!el?.getAttribute)return;
    for(const attr of ['placeholder','title','aria-label','alt']){
      const value=el.getAttribute(attr);
      if(value){const next=translate(value);if(next!==value)el.setAttribute(attr,next);}
    }
    if(el.tagName==='INPUT'&&['button','submit','reset'].includes((el.type||'').toLowerCase())){
      const next=translate(el.value);if(next!==el.value)el.value=next;
    }
  }
  function apply(root=document.body){
    if(!root||skip(root))return;
    if(root.nodeType===3){const next=translate(root.nodeValue);if(next!==root.nodeValue)root.nodeValue=next;return;}
    if(root.nodeType===1)translateAttrs(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    let node=walker.currentNode;
    while(node){
      if(node!==root&&!skip(node)){
        if(node.nodeType===3){const next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
        else if(node.nodeType===1)translateAttrs(node);
      }
      node=walker.nextNode();
    }
    const slogan='Your Game. Your Score. Your Story.';
    const translated=translate(slogan);
    if(document.title.includes(slogan))document.title=document.title.replace(slogan,translated);
  }
  let queued=false,pendingRoot=null;
  function queue(root=document.body){
    pendingRoot=pendingRoot&&pendingRoot.contains?.(root)?pendingRoot:root||document.body;
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;const target=pendingRoot||document.body;pendingRoot=null;apply(target);});
  }
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.target===document.documentElement&&record.attributeName==='lang'){queue(document.body);return;}
      if(record.type==='childList'&&record.addedNodes.length){queue(record.target);return;}
      if(record.type==='characterData'){queue(record.target.parentElement);return;}
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang']});
  const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window),nativePrompt=window.prompt.bind(window);
  window.alert=message=>nativeAlert(translate(String(message??'')));
  window.confirm=message=>nativeConfirm(translate(String(message??'')));
  window.prompt=(message,defaultValue)=>nativePrompt(translate(String(message??'')),defaultValue);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('.language-choice,[data-language],.language-option,[onclick*="setAppLanguage"]'))setTimeout(()=>queue(document.body),0);
  },true);
  window.addEventListener('pageshow',()=>queue(document.body));
  window.addEventListener('popstate',()=>queue(document.body));
  window.ParFolioI18n={translate,apply:()=>apply(document.body),language,rebuild:()=>{rebuildReverse();queue(document.body);},phrases};
  queue(document.body);
})();