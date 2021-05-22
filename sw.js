const SW_VERSION = 420;
const CACHE_NAME = `OFFLINE_VERSION_${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";
const filesToCache = [
    '/index.css',
    '/script.js',
    '/index.html',
    '/favicon.ico',
    '/champion/Blitzcrank.png',
    '/champion/Caitlyn.png',
    '/champion/MissFortune.png',
    '/champion/Yasuo.png',
    '/champion/Poppy.png',
    '/champion/TahmKench.png',
    '/manifest.json'
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(function (cache) {
                cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
                return cache.addAll(filesToCache);
            })
            .then(function () {
                //return self.skipWaiting();
            })
    );

});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        caches.delete(cacheName);
                    } else {
                        return null;
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    console.log("[ServiceWorker] fetch event " + event.request.url);

    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage(
                `Hi ${client.id} you are loading the path ${event.request.url}`
            );
        });
    });

    event.respondWith(
        (async () => {
            try {
                const networkRequest = await fetch(event.request);
                return networkRequest;
            } catch (error) {
                console.log(
                    "[ServiceWorker] Fetch failed; returning offline page instead."
                );

                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                return cachedResponse;
            }
        })()
    );
    //self.skipWaiting();
});

self.addEventListener("message", function (event) {
    if (event.data === "skipWaiting") {
        self.skipWaiting();
    }

    clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                value: event.data.value
            });
        })
    })
});


self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const title = '❤❤😅😅👍';
    const options = {
        body: `${event.data.text()}`,
        icon: 'icon-192x192.png',
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    event.waitUntil(
        clients.openWindow('https://developers.google.com/web/')

    );
});