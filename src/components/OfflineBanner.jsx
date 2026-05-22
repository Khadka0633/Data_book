// ── OfflineBanner.jsx ──────────────────────────────────────────────
// Shows at the top of the screen when offline or syncing.
// Disappears automatically when back online and synced.

export default function OfflineBanner({ isOffline, isSyncing, pendingOps, onSyncPress }) {
  // Nothing to show if online and nothing pending
  if (!isOffline && !isSyncing && pendingOps === 0) return null;

  let bg, icon, message, sub;

  if (isSyncing) {
    bg = "rgba(99,102,241,0.95)";
    icon = "🔄";
    message = "Syncing your changes...";
    sub = `${pendingOps} remaining`;
  } else if (isOffline && pendingOps > 0) {
    bg = "rgba(249,115,22,0.95)";
    icon = "⚡";
    message = "You're offline";
    sub = `${pendingOps} change${pendingOps !== 1 ? "s" : ""} will sync when reconnected`;
  } else if (isOffline) {
    bg = "rgba(100,100,100,0.95)";
    icon = "📡";
    message = "You're offline";
    sub = "Showing cached data";
  } else if (pendingOps > 0) {
    // Online but still has pending — syncing about to start
    bg = "rgba(99,102,241,0.95)";
    icon = "🔄";
    message = "Syncing...";
    sub = `${pendingOps} pending`;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bg,
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        backdropFilter: "blur(8px)",
        // Push content down so it doesn't overlap with safe area
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        transition: "background 0.3s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
            {message}
          </p>
          {sub && (
            <p style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
              {sub}
            </p>
          )}
        </div>
      </div>

      {/* Pending count badge */}
      {pendingOps > 0 && !isSyncing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              background: "rgba(0,0,0,0.25)",
              borderRadius: 99,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {pendingOps} pending
          </span>
        </div>
      )}

      {/* Syncing spinner */}
      {isSyncing && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fff",
                opacity: 0.8,
                animation: `syncDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes syncDot {
          0%,60%,100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
