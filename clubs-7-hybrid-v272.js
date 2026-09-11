/* ParFolio v272 — add 7 Hybrid to the shared My Clubs list. */
(function(){
  try{
    if(!Array.isArray(CLUBS)||CLUBS.includes('7 Hybrid'))return;
    const after=CLUBS.indexOf('5 Hybrid');
    CLUBS.splice(after>=0?after+1:CLUBS.length,0,'7 Hybrid');
  }catch(error){console.warn('ParFolio 7 Hybrid club extension unavailable',error)}
})();
