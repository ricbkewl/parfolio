const CACHE_NAME='parfolio-v249-20260909';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './parfolio-app-icon.png',
  './parfolio-home-bg-v162.webp',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/supabase-v2.112.4.js',
  './styles.css',
  './menu-v107.css',
  './home-v162.css',
  './parfolio-ai-v225.css',
  './app.js'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('parfolio-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),appAsset=url.origin===self.location.origin,dependency=['unpkg.com','cdn.jsdelivr.net'].includes(url.hostname);if(!appAsset&&!dependency)return;
  if(url.pathname==='/api/runtime-config'){event.respondWith(fetch(event.request));return}
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html',{ignoreSearch:true})));return}
  if(appAsset&&/\.(?:js|css|webmanifest|json|webp)$/.test(url.pathname)){event.respondWith(fetch(event.request).then(response=>{if(response&&response.status<400){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request,{ignoreSearch:true})));return}
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>{const fresh=fetch(event.request).then(response=>{if(response&&response.status<400){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>cached);return cached||fresh}))
});