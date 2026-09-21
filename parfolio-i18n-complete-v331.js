/* ParFolio v331 — systemwide UI internationalization runtime.
   This file must load after every feature module. It translates known interface copy
   without altering course names, golfer names, chat bodies, scores, or stored data. */
(function(){
'use strict';
const LANGS=['en','es','zh','id','hi','fr'];
const phrases=()=>window.PF_I18N_PHRASES||{};
let reverse={};
function rebuildReverse(){
  reverse={};
  for(const [source,row] of Object.entries(phrases())){
    reverse[source]=source;
    for(const code of LANGS){
      const value=row&&row[code];
      if(value)reverse[value]=source;
    }
  }
}
function language(){
  const raw=(document.documentElement.lang||localStorage.parfolioLanguage||'en').toLowerCase();
  if(raw.startsWith('zh'))return'zh';
  const short=raw.split('-')[0];
  return LANGS.includes(short)?short:'en';
}
function exact(value){
  const source=reverse[value]||value,code=language();
  if(code==='en')return source;
  return phrases()[source]?.[code]||value;
}
const patterns={
 es:[
  [/^(\d+) holes$/i,'$1 hoyos'],[/^Holes (\d+)–(\d+)$/,'Hoyos $1–$2'],[/^thru (\d+)$/i,'hasta $1'],
  [/^Open now · (.+)$/,'Abierto ahora · $1'],[/^Closed now · (.+)$/,'Cerrado ahora · $1'],
  [/^(\d+) holes · (.+)$/i,'$1 hoyos · $2'],[/^Par (\d+)$/i,'Par $1']
 ],
 zh:[
  [/^(\d+) holes$/i,'$1 洞'],[/^Holes (\d+)–(\d+)$/,'第 $1–$2 洞'],[/^thru (\d+)$/i,'打完 $1 洞'],
  [/^Open now · (.+)$/,'正在营业 · $1'],[/^Closed now · (.+)$/,'已打烊 · $1'],
  [/^(\d+) holes · (.+)$/i,'$1 洞 · $2'],[/^Par (\d+)$/i,'标准杆 $1']
 ],
 id:[
  [/^(\d+) holes$/i,'$1 hole'],[/^Holes (\d+)–(\d+)$/,'Hole $1–$2'],[/^thru (\d+)$/i,'hingga $1'],
  [/^Open now · (.+)$/,'Buka sekarang · $1'],[/^Closed now · (.+)$/,'Tutup sekarang · $1'],
  [/^(\d+) holes · (.+)$/i,'$1 hole · $2'],[/^Par (\d+)$/i,'Par $1']
 ],
 hi:[
  [/^(\d+) holes$/i,'$1 होल'],[/^Holes (\d+)–(\d+)$/,'होल $1–$2'],[/^thru (\d+)$/i,'$1 तक'],
  [/^Open now · (.+)$/,'अभी खुला है · $1'],[/^Closed now · (.+)$/,'अभी बंद है · $1'],
  [/^(\d+) holes · (.+)$/i,'$1 होल · $2'],[/^Par (\d+)$/i,'पार $1']
 ],
 fr:[
  [/^(\d+) holes$/i,'$1 trous'],[/^Holes (\d+)–(\d+)$/,'Trous $1–$2'],[/^thru (\d+)$/i,'après $1'],
  [/^Open now · (.+)$/,'Ouvert maintenant · $1'],[/^Closed now · (.+)$/,'Fermé maintenant · $1'],
  [/^(\d+) holes · (.+)$/i,'$1 trous · $2'],[/^Par (\d+)$/i,'Par $1']
 ]
};
function translate(value){
  if(typeof value!=='string'||!value)return value;
  const match=value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const lead=match?.[1]||'',core=match?.[2]||value,tail=match?.[3]||'';
  if(!core.trim())return value;
  let output=exact(core),code=language();
  if(output===core&&code!=='en'){
    for(const [regex,replacement] of patterns[code]||[]){
      if(regex.test(core)){output=core.replace(regex,replacement);break;}
    }
  }
  return lead+output+tail;
}
function protectedElement(node){
  const el=node?.nodeType===1?node:node?.parentElement;
  if(!el?.closest)return false;
  return !!el.closest(
    'script,style,noscript,code,pre,[contenteditable="true"],[data-pf-no-i18n],'+
    '.chat-message-body,.pf-social-message-text,.pf-social-bubble .message-text,'+
    '.course-name[data-course-name],.user-details b,.profile-card .profile-name'
  );
}
function translateAttributes(el){
  if(!el||el.nodeType!==1||protectedElement(el))return;
  for(const attr of ['placeholder','title','aria-label']){
    const value=el.getAttribute(attr);
    if(value){
      const next=translate(value);
      if(next!==value)el.setAttribute(attr,next);
    }
  }
  if(el.tagName==='INPUT'&&['button','submit','reset'].includes((el.type||'').toLowerCase())){
    const next=translate(el.value);
    if(next!==el.value)el.value=next;
  }
}
function apply(root=document.body){
  if(!root)return;
  rebuildReverse();
  if(root.nodeType===3){
    if(!protectedElement(root)){
      const next=translate(root.nodeValue);
      if(next!==root.nodeValue)root.nodeValue=next;
    }
    return;
  }
  if(root.nodeType===1)translateAttributes(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let node=walker.nextNode();
  while(node){
    if(node.nodeType===3&&!protectedElement(node)){
      const value=node.nodeValue,next=translate(value);
      if(next!==value)node.nodeValue=next;
    }else if(node.nodeType===1){
      translateAttributes(node);
    }
    node=walker.nextNode();
  }
  const sourceTagline='Your Game. Your Score. Your Story.';
  if(document.title.includes(sourceTagline)){
    document.title=document.title.replace(sourceTagline,translate(sourceTagline));
  }else{
    for(const code of LANGS){
      const candidate=phrases()[sourceTagline]?.[code];
      if(candidate&&document.title.includes(candidate)){
        document.title=document.title.replace(candidate,translate(candidate));
        break;
      }
    }
  }
}
let queuedRoot=null,frame=0;
function queue(root=document.body){
  if(root&&(!queuedRoot||queuedRoot===document.body))queuedRoot=root;
  if(frame)return;
  frame=requestAnimationFrame(()=>{
    frame=0;
    const target=queuedRoot||document.body;
    queuedRoot=null;
    apply(target);
  });
}
const observer=new MutationObserver(records=>{
  for(const record of records){
    if(record.type==='attributes'&&record.target===document.documentElement&&record.attributeName==='lang'){
      queue(document.body);return;
    }
    if(record.type==='childList'&&record.addedNodes.length){queue(record.target);return;}
    if(record.type==='characterData'){queue(record.target.parentElement);return;}
  }
});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang','placeholder','title','aria-label']});

const nativeAlert=window.alert.bind(window);
const nativeConfirm=window.confirm.bind(window);
const nativePrompt=window.prompt.bind(window);
window.alert=message=>nativeAlert(translate(String(message??'')));
window.confirm=message=>nativeConfirm(translate(String(message??'')));
window.prompt=(message,defaultValue)=>nativePrompt(translate(String(message??'')),defaultValue);

document.addEventListener('click',event=>{
  if(event.target.closest?.('.language-choice,[data-language],.language-option,[onclick*="setAppLanguage"]')){
    setTimeout(()=>queue(document.body),0);
    setTimeout(()=>queue(document.body),80);
  }
},true);
window.addEventListener('pageshow',()=>queue(document.body));
window.addEventListener('popstate',()=>queue(document.body));
window.addEventListener('load',()=>queue(document.body));
window.ParFolioI18n={
  translate,
  apply:()=>apply(document.body),
  language,
  refresh:()=>queue(document.body),
  phrases
};
queue(document.body);
})();