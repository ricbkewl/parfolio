/* Run in browser console/dev harness after app load. */
(function(){
 var checks={swingAuto:!!window.ParFolioSwingAuto,version:window.ParFolioSwingAuto&&window.ParFolioSwingAuto.version===228,ai:!!window.ParFolioAI};
 window.ParFolioAIV228Smoke=checks;
 if(!checks.swingAuto||!checks.version||!checks.ai)console.warn('ParFolio AI v228 smoke check failed',checks);
})();
