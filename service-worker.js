const CACHE_NAME='parfolio-v171-20260901';
const APP_SHELL=[
  './',
  './index.html',
  './startup-guard-v171.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/supabase-v2.112.4.js',
  './vendor/qrcode-v1.0.0.min.js',
  './vendor/html5-qrcode-v2.3.8.min.js',
  './guide-i18n.js',
  './app.js',
  './styles.css',
  './mobile-fit-v157.css',
  './mobile-fit-v157.js',
  './home-v162.css',
  './home-v162.js',
  './parfolio-home-bg-v162.webp',
  './course-map-browser-v163.css',
  './course-map-browser-v163.js',
  './parfolio-contact-v168.js',
  './smart-golf-data-v170.css',
  './smart-golf-data-v170.js',
  './manifest.webmanifest',
  './parfolio-app-icon.png',
  './rick-kulon-profile.jpg',
  './shared-course-library-v145.js',
  './ny-course-catalog-v158.js',
  './ny-gps-draft-loader-v159.js',
  './regional-auto-publish-v160.js',
  './parfolio-admin-role-v161.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const appAsset=url.origin===self.location.origin;
  if(!appAsset)return;

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  if(/\.(?:js|css|webmanifest|json|webp)$/.test(url.pathname)){
    event.respondWith(fetch(event.request).then(response=>{
      if(response&&response.status<400){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}
      return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>{
    const fresh=fetch(event.request).then(response=>{
      if(response&&response.status<400){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}
      return response;
    }).catch(()=>cached);
    return cached||fresh;
  }));
});
