// ── offlineQueue.js ────────────────────────────────────────────────
// When the user is offline, writes (create/update/delete) are stored
// here instead of being sent to PocketBase. When the app comes back
// online, syncOfflineQueue() replays them in order.

const QUEUE_KEY = "nexus_offline_queue";

export const offlineQueue = {
  // Add an operation to the queue
  add(operation) {
    // operation shape:
    // { type: "create"|"update"|"delete", collection, data?, id?, tempId? }
    const current = offlineQueue.getAll();
    const op = { ...operation, queuedAt: Date.now() };
    current.push(op);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn("[queue] write failed:", err);
    }
    return op;
  },

  // Get all queued operations
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  },

  // How many ops are pending
  count() {
    return offlineQueue.getAll().length;
  },

  // Remove a specific operation after it synced successfully
  remove(queuedAt) {
    const updated = offlineQueue
      .getAll()
      .filter((op) => op.queuedAt !== queuedAt);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  // Update a queued create (e.g. user edits a temp record while still offline)
  updateQueued(tempId, newData) {
    const ops = offlineQueue.getAll();
    const idx = ops.findIndex(
      (op) => op.type === "create" && op.tempId === tempId,
    );
    if (idx !== -1) {
      ops[idx].data = { ...ops[idx].data, ...newData };
      localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
      return true;
    }
    return false;
  },

  // Remove a queued create (user deleted a temp record while still offline)
  removeQueued(tempId) {
    const updated = offlineQueue
      .getAll()
      .filter((op) => !(op.type === "create" && op.tempId === tempId));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  // Wipe everything (use after full sync)
  clear() {
    localStorage.removeItem(QUEUE_KEY);
  },
};
