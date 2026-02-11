self.addEventListener("install", e => {
    e.waitUntil(
        caches.open("dcts-cache").then(cache => {
            return cache.addAll([
                "/",
                "/index.html",
                "/chat.js"
            ]);
        })
    );
});

self.addEventListener("fetch", e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});
