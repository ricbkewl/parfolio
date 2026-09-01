/* ParFolio v161: resilient admin-role loading.
   Primary source remains app_admins. If that select fails or returns no row,
   fall back to the authenticated security-definer role helpers. */
(function(){
  if(typeof db==='undefined')return;

  async function loadRoleResilient(){
    adminRole=null;
    if(!currentUser)return;

    try{
      const {data,error}=await db.from('app_admins').select('role').eq('user_id',currentUser.id).maybeSingle();
      if(!error&&data?.role){adminRole=data.role;return;}
      if(error)console.warn('ParFolio admin role direct lookup failed',error.message||error);
    }catch(error){
      console.warn('ParFolio admin role direct lookup exception',error);
    }

    try{
      const {data:isSuper,error:superError}=await db.rpc('is_super_admin');
      if(!superError&&isSuper===true){adminRole='super_admin';return;}
      if(superError)console.warn('ParFolio super-admin fallback failed',superError.message||superError);
    }catch(error){
      console.warn('ParFolio super-admin fallback exception',error);
    }

    try{
      const {data:isCourse,error:courseError}=await db.rpc('is_course_admin');
      if(!courseError&&isCourse===true){adminRole='course_admin';return;}
      if(courseError)console.warn('ParFolio course-admin fallback failed',courseError.message||courseError);
    }catch(error){
      console.warn('ParFolio course-admin fallback exception',error);
    }
  }

  loadAdminRole=loadRoleResilient;
  window.refreshParFolioAdminRole=async function(){
    await loadRoleResilient();
    if(typeof render==='function')render();
    return adminRole;
  };
})();
