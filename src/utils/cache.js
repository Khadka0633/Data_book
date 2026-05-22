// ── cache.js ───────────────────────────────────────────────────────
// Saves PocketBase fetch results to localStorage so the app can
// serve data when offline or when the network is slow.

const PREFIX = "nexus_cache_";

export const cache = {
  // Save data under a key
  set(key, data) {
    try {
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ data, timestamp: Date.now() }),
      );
    } catch (err) {
      // localStorage can be full (5MB limit) — fail silently
      console.warn("[cache] write failed:", err);
    }
  },

  // Get cached data. Returns null if missing or expired.
  // maxAgeMs defaults to 1 hour. Pass Infinity when offline.
  get(key, maxAgeMs = 1000 * 60 * 60) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > maxAgeMs) return null;
      return data;
    } catch {
      return null;
    }
  },

  // Delete one cached key
  clear(key) {
    localStorage.removeItem(PREFIX + key);
  },

  // Delete ALL cached keys (not the queue)
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },

  // Check if a key exists regardless of age
  has(key) {
    return localStorage.getItem(PREFIX + key) !== null;
  },
};
