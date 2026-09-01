/* Version 123: verify Royale Jakarta loop saves against Supabase before leaving the editor. */
(function(){
  const priorSaveMappedCourse123=saveMappedCourse;

  function completeRoyaleHole(g){
    return Boolean((g?.tees?.black||g?.tee)&&g?.front&&g?.center&&g?.back);
  }
  function royaleReadyCount(greens){
    return Array.isArray(greens)?greens.slice(0,9).filter(completeRoyaleHole).length:0;
  }
  function royaleLoopLabel(key,name){
    if(key&&ROYALE_JAKARTA_LOOPS?.[key]?.label)return `${ROYALE_JAKARTA_LOOPS[key].label} 9`;
    const text=String(name||'Royale Jakarta').replace(/^Royale Jakarta Golf Club\s*[·-]?\s*/i,'').trim();
    return text||'Royale Jakarta 9';
  }

  saveMappedCourse=async function(){
    if(!draft?.royaleFacilityLoop){return priorSaveMappedCourse123();}
    if(!currentUser){alert('Administrator sign-in is required before saving.');return;}

    const button=$('saveCourseButton');
    const originalText=button?.textContent||'Save Shared Course';
    if(button){button.disabled=true;button.textContent='Saving & Verifying…';}

    const savedDraft=draft;
    const payload={
      id:savedDraft.id,
      name:savedDraft.name,
      holes:9,
      pars:savedDraft.pars,
      greens:savedDraft.greens,
      updated_by:currentUser.id,
      updated_at:new Date().toISOString()
    };

    let write;
    if(savedDraft.isNew)write=await db.from('courses').insert({...payload,created_by:currentUser.id});
    else write=await db.from('courses').update(payload).eq('id',savedDraft.id);

    if(write.error){
      alert(`Royale Jakarta was NOT saved. ${write.error.message}`);
      if(button){button.disabled=false;button.textContent=originalText;}
      return;
    }

    const check=await db.from('courses').select('id,name,holes,pars,greens,updated_at').eq('id',savedDraft.id).maybeSingle();
    if(check.error||!check.data){
      alert('The save request was sent, but ATG could not verify the Royale Jakarta record in the shared database. Your editor has been left open so the mapping is not lost. Please try Save Shared Course again.');
      if(button){button.disabled=false;button.textContent=originalText;}
      return;
    }

    const ready=royaleReadyCount(check.data.greens),label=royaleLoopLabel(savedDraft.royaleLoopKey,check.data.name);
    if(ready<9){
      alert(`${label} saved to the shared database, but only ${ready}/9 holes are GPS ready. ATG is keeping the editor open so you can find the incomplete hole before testing play.`);
      savedDraft.isNew=false;
      savedDraft.id=check.data.id;
      savedDraft.greens=JSON.parse(JSON.stringify(check.data.greens||savedDraft.greens));
      draft=savedDraft;
      if(button){button.disabled=false;button.textContent=originalText;}
      render();
      return;
    }

    await loadCourses();
    alert(`${label} saved to shared database — 9/9 GPS ready.`);
    draft=null;
    s.v='coursesView';
    render();
  };
})();
