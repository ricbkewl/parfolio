/* Version 147: golfer-assisted course correction suggestions. */
(function(){
  const SHARED_URL='https://qziemwgcjkohjchxdvnv.supabase.co';
  const SHARED_KEY='sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  let correctionClient=null,correctionCourse=null,correctionGps=null;
  function client(){if(!correctionClient)correctionClient=supabase.createClient(SHARED_URL,SHARED_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});return correctionClient}
  function close(){document.querySelector('.course-correction-overlay')?.remove();correctionCourse=null;correctionGps=null}
  function preferredName(){return [golferProfile?.first_name,golferProfile?.last_name].filter(Boolean).join(' ')||currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||''}
  function preferredEmail(){return golferProfile?.email||currentUser?.email||''}
  window.closeCourseCorrectionForm=close;
  window.useCorrectionLocation=function(){
    const status=document.getElementById('correctionLocationStatus');
    if(!navigator.geolocation){if(status)status.textContent='Location is not available on this device.';return}
    if(status)status.textContent='Getting your location…';
    navigator.geolocation.getCurrentPosition(pos=>{
      correctionGps={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(status)status.textContent=`Location attached · ±${Math.round(pos.coords.accuracy)} m`;
    },()=>{if(status)status.textContent='Location could not be attached.'},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  };
  window.showCourseCorrectionForm=function(index){
    const course=courses?.[index];if(!course)return;
    if(!course.sharedCourseId){alert('This course is not linked to the shared course library yet.');return}
    correctionCourse=course;correctionGps=null;close();correctionCourse=course;
    const overlay=document.createElement('div');overlay.className='course-correction-overlay';overlay.onclick=e=>{if(e.target===overlay)close()};
    overlay.innerHTML=`<section class="course-correction-sheet" role="dialog" aria-modal="true" aria-label="Suggest a course correction">
      <header><div><small>HELP IMPROVE THE COURSE</small><b>Suggest a Correction</b><span>${esc(course.name)}</span></div><button type="button" onclick="closeCourseCorrectionForm()">×</button></header>
      <form id="courseCorrectionForm" onsubmit="event.preventDefault();submitCourseCorrection()">
        <label>What needs changing?</label><select id="correctionType" required><option value="routing">Hole routing / map line</option><option value="tee">Tee location</option><option value="aim">Aim point</option><option value="green">Green location / front / center / back</option><option value="par">Hole par / scorecard</option><option value="course_info">Course name / address / information</option><option value="other">Other</option></select>
        <label>Hole number <span>(optional)</span></label><input id="correctionHole" type="number" min="1" max="54" inputmode="numeric" placeholder="e.g. 7">
        <label>Suggested change</label><textarea id="correctionText" required minlength="5" maxlength="2000" placeholder="Tell us what is wrong and what should be changed. Local knowledge is especially helpful."></textarea>
        <button class="correction-location-button" type="button" onclick="useCorrectionLocation()">◎ Attach My Current Location</button><div id="correctionLocationStatus" class="correction-location-status">Optional — useful when standing at a tee, aim point or green.</div>
        <div class="correction-contact-grid"><label>Your name <span>(optional)</span><input id="correctionName" maxlength="120" value="${esc(preferredName())}"></label><label>Email <span>(optional)</span><input id="correctionEmail" type="email" maxlength="254" value="${esc(preferredEmail())}"></label></div>
        <p class="correction-note">Suggestions are reviewed before they replace shared course data. Please submit only changes you believe are accurate.</p>
        <button id="correctionSubmit" class="primary" type="submit">Submit Suggested Change</button>
      </form></section>`;
    document.body.appendChild(overlay);
  };
  window.submitCourseCorrection=async function(){
    if(!correctionCourse?.sharedCourseId)return;
    const button=document.getElementById('correctionSubmit'),text=document.getElementById('correctionText')?.value.trim(),holeText=document.getElementById('correctionHole')?.value.trim();
    if(!text||text.length<5){alert('Please add a little more detail about the suggested change.');return}
    const hole=holeText?Number(holeText):null;if(hole!==null&&(!Number.isInteger(hole)||hole<1||hole>54)){alert('Enter a valid hole number.');return}
    button.disabled=true;button.textContent='Submitting…';
    try{
      const {data,error}=await client().rpc('submit_course_correction',{
        p_course_id:correctionCourse.sharedCourseId,
        p_issue_type:document.getElementById('correctionType').value,
        p_suggestion_text:text,
        p_hole_number:hole,
        p_suggested_lat:correctionGps?.lat??null,
        p_suggested_lng:correctionGps?.lng??null,
        p_submitter_name:document.getElementById('correctionName')?.value.trim()||null,
        p_submitter_email:document.getElementById('correctionEmail')?.value.trim()||null,
        p_source_app:'atg'
      });
      if(error)throw error;
      close();alert('Thank you. Your suggested course change has been submitted for review.');
    }catch(error){console.error('Course correction submission failed',error);alert('The suggestion could not be submitted right now. Please try again.');button.disabled=false;button.textContent='Submit Suggested Change';}
  };
  if(typeof courseLibraryCard==='function'){
    const priorCourseLibraryCard147=courseLibraryCard;
    courseLibraryCard=function(course,index,distance=null){
      let html=priorCourseLibraryCard147(course,index,distance);
      if(course?.sharedCourseId)html=html.replace('</article>',`<button class="course-correction-trigger" type="button" onclick="event.stopPropagation();showCourseCorrectionForm(${index})">✎ Suggest a Course Correction</button></article>`);
      return html;
    };
  }
})();
