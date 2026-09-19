/* ParFolio camera compatibility shim v304.
   Camera ownership is intentionally centralized in google-maps-clean-v269.js.
   No GPS camera overrides, no tilt, no flyover, no heading animation, no wrappers. */
(function(){
  window.PARFOLIO_CAMERA_MODE='simple-6-to-12';
  console.info('[ParFolio] simple round camera controller active');
})();
