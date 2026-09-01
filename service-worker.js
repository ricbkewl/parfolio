const CACHE_NAME='parfolio-v153-20260901';
const APP_SHELL=[
  './',
  './index.html',
  './guide-i18n.js',
  './app.js',
  './styles.css',
  './manifest.webmanifest',
  './parfolio-app-icon.png',
  './rick-kulon-profile.jpg',
  './shared-course-library-v145.js'
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
  const dependency=['unpkg.com','cdn.jsdelivr.net'].includes(url.hostname);
  if(!appAsset&&!dependency)return;

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  if(appAsset&&/\.(?:js|css|webmanifest)$/.test(url.pathname)){
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
