// ── useOffline.js ──────────────────────────────────────────────────
// React hook that:
//   1. Tracks whether the app is online or offline
//   2. Auto-syncs the offline queue when internet returns
//   3. Exposes sync state so UI can show progress

import { useState, useEffect, useCallback } from "react";
import { syncOfflineQueue, pendingCount } from "./sync";

/**
 * @param {function} onSyncComplete - called after successful sync
 *   so parent can reload fresh data from server
 */
export function useOffline(onSyncComplete) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOps, setPendingOps] = useState(pendingCount());
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Refresh pending count (call after any write)
  const refreshPending = useCallback(() => {
    setPendingOps(pendingCount());
  }, []);

  // Manual sync trigger (also called automatically on reconnect)
  const sync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    if (pendingCount() === 0) return;

    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue(({ synced, failed, total }) => {
        // Update pending count as each op completes
        setPendingOps(Math.max(0, total - synced - failed));
      });

      setLastSyncResult(result);
      setPendingOps(pendingCount());

      if (result.synced > 0) {
        // Tell parent to reload fresh data
        onSyncComplete?.(result);
      }
    } catch (err) {
      console.error("[useOffline] sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, onSyncComplete]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Small delay to let connection stabilize
      setTimeout(() => sync(), 1000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check on mount in case we're already offline
    setIsOffline(!navigator.onLine);

    // If we're online and have pending ops, sync immediately
    if (navigator.onLine && pendingCount() > 0) {
      sync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  return {
    isOffline,
    isSyncing,
    pendingOps,
    lastSyncResult,
    sync,
    refreshPending,
  };
}
