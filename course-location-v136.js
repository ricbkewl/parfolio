/* Version 136: show city/state beneath course names throughout course library and editor views. */
(function(){
  function clean(value){return String(value||'').trim()}
  function locationFor(course){
    if(!course)return'';
    const city=clean(course.city||course.catalog_city||course.address_city||course.locality);
    const state=clean(course.state||course.catalog_state||course.address_state||course.region);
    if(city&&state)return`${city}, ${state}`;
    return city||state||'';
  }
  function courseForName(name){
    const key=typeof courseMatchKey==='function'?courseMatchKey(name):clean(name).toLowerCase().replace(/[^a-z0-9]+/g,'');
    return (window.courses||[]).find(course=>{
      const ck=typeof courseMatchKey==='function'?courseMatchKey(course.name):clean(course.name).toLowerCase().replace(/[^a-z0-9]+/g,'');
      return ck===key;
    })||null;
  }
  function addLocationAfter(node,location,kind='list'){
    if(!node||!location)return;
    const parent=node.parentElement;if(!parent)return;
    const existing=parent.querySelector(`:scope > .course-location-subtitle[data-location-kind="${kind}"]`);
    if(existing){existing.textContent=location;return;}
    const sub=document.createElement('div');sub.className='course-location-subtitle';sub.dataset.locationKind=kind;sub.textContent=location;
    node.insertAdjacentElement('afterend',sub);
  }
  function decorateEditor(){
    if(!window.draft)return;
    let location=locationFor(draft);
    if(!location){
      const source=courseForName(draft.name);location=locationFor(source);
    }
    if(!location)return;
    const candidates=[...app.querySelectorAll('h1,h2,.course-editor-brand b,.course-editor-brand strong')];
    const title=candidates.find(el=>clean(el.textContent).includes(clean(draft.name)))||candidates.find(el=>/course|map/i.test(el.textContent));
    if(title)addLocationAfter(title,location,'editor');
  }
  function decorateCourseLists(){
    const allCourses=window.courses||[];
    if(!allCourses.length)return;
    const textNodes=[...app.querySelectorAll('h1,h2,h3,h4,b,strong,.course-name,.card-title,button')];
    for(const course of allCourses){
      const location=locationFor(course);if(!location)continue;
      const name=clean(course.name);if(!name)continue;
      const matches=textNodes.filter(el=>{
        if(el.closest('.course-location-subtitle'))return false;
        const text=clean(el.textContent);
        return text===name||text.startsWith(name+' ')||text.startsWith(name+'\n');
      });
      for(const el of matches){
        if(el.tagName==='BUTTON'){
          let target=el.querySelector('b,strong,.course-name,.card-title');
          if(!target){
            const label=document.createElement('span');label.className='course-location-button-label';label.textContent=name;
            while(el.firstChild)el.removeChild(el.firstChild);
            el.appendChild(label);target=label;
          }
          addLocationAfter(target,location,'list');
        }else addLocationAfter(el,location,'list');
      }
    }
  }
  function decorate(){try{decorateCourseLists();decorateEditor();}catch(error){console.warn('Course location labels skipped',error)}}
  const priorRender136=window.render;
  if(typeof priorRender136==='function')window.render=function(){const result=priorRender136.apply(this,arguments);setTimeout(decorate,0);return result};
  const observer=new MutationObserver(()=>{clearTimeout(window.__courseLocation136Timer);window.__courseLocation136Timer=setTimeout(decorate,25)});
  if(window.app)observer.observe(app,{childList:true,subtree:true});
  setTimeout(decorate,0);
})();
