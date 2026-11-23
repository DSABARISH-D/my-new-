const CACHE="sabarish-shell-v1";
const PUBLIC_FILES=["/offline.html","/icons/icon-192.png","/icons/icon-512.png","/manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("sabarish-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));return;}
 if(PUBLIC_FILES.includes(new URL(event.request.url).pathname)){event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));}
});
