import { useState } from "react";


export default function DeleteAccountModal({
  account,
  linkedCount,
  accounts,
  onConfirmDelete,
  onReassignAndDelete,
  onClose,
}) {
  const [reassignTo, setReassignTo] = useState("");
  const others = accounts.filter((a) => a.id !== account.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--red)" }}>
            🗑 Delete Account
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{account.icon}</span>
            <div>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>
                {account.name}
              </p>
              {linkedCount > 0 && (
                <p style={{ fontSize: 12, color: "var(--orange)", marginTop: 2 }}>
                  ⚠ {linkedCount} transactions linked
                </p>
              )}
            </div>
          </div>

          {linkedCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              No transactions. This account will be permanently deleted.
            </p>
          ) : (
            others.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="input-label">Reassign transactions to</label>
                <select
                  className="input"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">— select account —</option>
                  {others.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {linkedCount > 0 && others.length > 0 && (
              <button
                className="btn-primary"
                disabled={!reassignTo}
                style={{ opacity: reassignTo ? 1 : 0.45 }}
                onClick={() => reassignTo && onReassignAndDelete(reassignTo)}
              >
                Reassign & Delete
              </button>
            )}
            <button
              style={{
                background: "rgba(239,68,68,0.12)", color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-sm)", padding: "11px 20px",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
              onClick={onConfirmDelete}
            >
              {linkedCount > 0
                ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}`
                : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}