/* ParFolio v161.1: resilient, self-starting admin-role loading.
   Primary source remains app_admins. If that select fails or returns no row,
   fall back to authenticated security-definer role helpers. Never grants a role
   client-side without Supabase confirming it. */
(function(){
  if(typeof db==='undefined')return;
  let checking=false;

  async function syncSessionUser(){
    if(currentUser)return currentUser;
    try{
      const {data:{session}}=await db.auth.getSession();
      if(session?.user)currentUser=session.user;
    }catch(error){console.warn('ParFolio session refresh failed',error);}
    return currentUser;
  }

  async function loadRoleResilient(){
    if(checking)return adminRole;
    checking=true;
    try{
      adminRole=null;
      await syncSessionUser();
      if(!currentUser)return null;

      try{
        const {data,error}=await db.from('app_admins').select('role').eq('user_id',currentUser.id).maybeSingle();
        if(!error&&data?.role){adminRole=data.role;return adminRole;}
        if(error)console.warn('ParFolio admin role direct lookup failed',error.message||error);
      }catch(error){
        console.warn('ParFolio admin role direct lookup exception',error);
      }

      try{
        const {data:isSuper,error:superError}=await db.rpc('is_super_admin');
        if(!superError&&isSuper===true){adminRole='super_admin';return adminRole;}
        if(superError)console.warn('ParFolio super-admin fallback failed',superError.message||superError);
      }catch(error){
        console.warn('ParFolio super-admin fallback exception',error);
      }

      try{
        const {data:isCourse,error:courseError}=await db.rpc('is_course_admin');
        if(!courseError&&isCourse===true){adminRole='course_admin';return adminRole;}
        if(courseError)console.warn('ParFolio course-admin fallback failed',courseError.message||courseError);
      }catch(error){
        console.warn('ParFolio course-admin fallback exception',error);
      }
      return null;
    } finally {checking=false;}
  }

  async function refreshAndRender(){
    const before=adminRole;
    await loadRoleResilient();
    if(typeof render==='function'&&(adminRole!==before||adminRole))render();
    return adminRole;
  }

  loadAdminRole=loadRoleResilient;
  window.refreshParFolioAdminRole=refreshAndRender;

  // app.js may have already started initializeCloud before this compatibility
  // module loads. Re-check the authenticated role after that startup finishes.
  [0,250,750,1600].forEach(ms=>setTimeout(()=>{refreshAndRender().catch(()=>{});},ms));

  try{
    db.auth.onAuthStateChange((event,session)=>{
      if(session?.user)currentUser=session.user;
      if(event==='SIGNED_OUT'){adminRole=null;return;}
      if(session?.user)setTimeout(()=>{refreshAndRender().catch(()=>{});},0);
    });
  }catch(error){console.warn('ParFolio auth role listener unavailable',error);}
})();
