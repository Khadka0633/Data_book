// ── sync.js ────────────────────────────────────────────────────────
// Called automatically when the app detects it's back online.
// Replays every queued operation against PocketBase in order.

import pb from "../pb";
import { offlineQueue } from "./offlineQueue";

/**
 * Syncs all pending offline operations to PocketBase.
 *
 * @param {function} onProgress - called after each op with { synced, failed, total }
 * @returns {{ synced: number, failed: number, errors: array }}
 */
export async function syncOfflineQueue(onProgress) {
  const ops = offlineQueue.getAll();
  if (!ops.length) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors = [];

  // Keep a map of tempId → real id so we can fix references
  // e.g. a transfer debit tempId that the credit references
  const idMap = {};

  for (const op of ops) {
    try {
      if (op.type === "create") {
        // Replace any temp ids in the data with real ids
        const cleanData = replaceTempIds(op.data, idMap);
        // Remove internal fields before sending
        delete cleanData._isTemp;

        const created = await pb.collection(op.collection).create(cleanData);
        // Record the mapping so later ops can reference the real id
        if (op.tempId) idMap[op.tempId] = created.id;

      } else if (op.type === "update") {
        const realId = idMap[op.id] || op.id;
        // Skip if id is still temp (create must have failed)
        if (String(realId).startsWith("temp_")) {
          throw new Error(`Cannot update — create for ${realId} failed`);
        }
        const cleanData = replaceTempIds(op.data, idMap);
        delete cleanData._isTemp;
        await pb.collection(op.collection).update(realId, cleanData);

      } else if (op.type === "delete") {
        const realId = idMap[op.id] || op.id;
        if (String(realId).startsWith("temp_")) {
          // Was never created on server — nothing to delete
          offlineQueue.remove(op.queuedAt);
          synced++;
          onProgress?.({ synced, failed, total: ops.length });
          continue;
        }
        await pb.collection(op.collection).delete(realId);
      }

      offlineQueue.remove(op.queuedAt);
      synced++;
      onProgress?.({ synced, failed, total: ops.length });

    } catch (err) {
      console.error("[sync] op failed:", op, err);
      errors.push({ op, error: err.message });
      failed++;
      onProgress?.({ synced, failed, total: ops.length });
      // Continue — don't let one failure block the rest
    }
  }

  return { synced, failed, errors };
}

// Replace temp_ ids in an object with their real counterparts
function replaceTempIds(obj, idMap) {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string" && value.startsWith("temp_") && idMap[value]) {
      result[key] = idMap[value];
    }
  }
  return result;
}

/**
 * Check if there are any pending operations
 */
export function hasPendingSync() {
  return offlineQueue.count() > 0;
}

/**
 * Get count of pending operations
 */
export function pendingCount() {
  return offlineQueue.count();
}
