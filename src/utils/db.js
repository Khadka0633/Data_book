// ── db.js ──────────────────────────────────────────────────────────
// Drop-in replacement for direct pb.collection() calls.
// Automatically handles offline by queuing writes and serving
// cached reads. Use this everywhere instead of pb directly.

import pb from "../pb";
import { cache } from "./cache";
import { offlineQueue } from "./offlineQueue";

// Generate a temporary id for offline-created records
function tempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const db = {
  // ── READ ────────────────────────────────────────────────────────
  // Fetches from PocketBase and caches. Falls back to cache offline.
  async getAll(collection, options = {}, cacheKey = null) {
    const key = cacheKey || `${collection}_${options.filter || "all"}`;

    if (!navigator.onLine) {
      const cached = cache.get(key, Infinity);
      if (cached) return { data: cached, fromCache: true };
      return { data: [], fromCache: true };
    }

    try {
      const data = await pb.collection(collection).getFullList(options);
      cache.set(key, data);
      return { data, fromCache: false };
    } catch (err) {
      // Network failed even though navigator.onLine was true
      const cached = cache.get(key, Infinity);
      if (cached) return { data: cached, fromCache: true };
      throw err;
    }
  },

  // ── CREATE ──────────────────────────────────────────────────────
  async create(collection, data) {
    if (!navigator.onLine) {
      const id = tempId();
      const tempRecord = {
        ...data,
        id,
        _isTemp: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      offlineQueue.add({
        type: "create",
        collection,
        data,
        tempId: id,
      });
      return tempRecord;
    }

    try {
      return await pb.collection(collection).create(data);
    } catch (err) {
      // Unexpected network failure — queue it
      if (!navigator.onLine || err.message?.includes("network")) {
        const id = tempId();
        const tempRecord = {
          ...data,
          id,
          _isTemp: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        offlineQueue.add({ type: "create", collection, data, tempId: id });
        return tempRecord;
      }
      throw err;
    }
  },

  // ── UPDATE ──────────────────────────────────────────────────────
  async update(collection, id, data) {
    if (!navigator.onLine) {
      if (String(id).startsWith("temp_")) {
        // Update the data inside the queued create
        const updated = offlineQueue.updateQueued(id, data);
        if (!updated) {
          // Not in queue — queue a separate update
          offlineQueue.add({ type: "update", collection, id, data });
        }
      } else {
        offlineQueue.add({ type: "update", collection, id, data });
      }
      return { id, ...data, _isTemp: true };
    }

    return await pb.collection(collection).update(id, data);
  },

  // ── DELETE ──────────────────────────────────────────────────────
  async delete(collection, id) {
    if (!navigator.onLine) {
      if (String(id).startsWith("temp_")) {
        // Was never saved to server — just remove from queue
        offlineQueue.removeQueued(id);
      } else {
        offlineQueue.add({ type: "delete", collection, id });
      }
      return true;
    }

    return await pb.collection(collection).delete(id);
  },
};
