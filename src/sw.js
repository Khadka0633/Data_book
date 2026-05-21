// ── public/sw.js ───────────────────────────────────────────────────
// Caches the app shell so it loads even with no internet.
// PocketBase API calls are NOT cached here — that's handled
// in JS via cache.js and db.js.

const CACHE_NAME = "nexus-app-v1";

// Files that make up the app shell
// Vite hashes JS/CSS filenames, so we cache them dynamically
const STATIC_ASSETS = ["/", "/index.html"];

// ── Install: cache the app shell ───────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()), // activate immediately
  );
});

// ── Activate: delete old caches ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: serve from cache, fall back to network ──────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER intercept PocketBase API calls — db.js handles those
  if (url.pathname.startsWith("/api/")) return;

  // NEVER cache non-GET requests (fixes the POST cache error)
  if (request.method !== "GET") return;

  // NEVER cache cross-origin requests (CDN scripts etc)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // Return cached version immediately if available
      if (cached) {
        // Also fetch in background to update cache (stale-while-revalidate)
        fetch(request)
          .then((fresh) => {
            if (fresh.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, fresh);
              });
            }
          })
          .catch(() => {}); // ignore network errors in background
        return cached;
      }

      // Not cached — fetch from network and cache it
      return fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Completely offline and not cached
          // Return the app shell so React can handle routing
          return caches.match("/index.html");
        });
    }),
  );
});
