import { useState, useEffect } from "react";
import BottomSheetPicker from "./BottomSheetPicker";

/**
 * EditTransferPage
 *
 * Props:
 *   entry    – the debit entry object (with _transferTo attached)
 *   accounts – array of account objects
 *   entries  – all entries (unused here but kept for consistency)
 *   onSave   – (amount, note, date, fromId, toId) => Promise<void>
 *   onDelete – () => Promise<void>
 *   onClose  – () => void
 */
export default function EditTransferPage({
  entry,
  accounts,
  entries,
  onSave,
  onDelete,
  onClose,
}) {
  const toAcc = accounts.find((a) => a.id === entry._transferTo?.accountId);

  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(
    entry.note
      ?.replace(`Transfer to ${toAcc?.name}: `, "")
      .replace(`Transfer to ${toAcc?.name}`, "") || "",
  );
  const [date, setDate] = useState(entry.date);
  const [fromId, setFromId] = useState(entry.accountId);
  const [toId, setToId] = useState(entry._transferTo?.accountId);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const currentFrom = accounts.find((a) => a.id === fromId);
  const currentTo = accounts.find((a) => a.id === toId);

  // Scroll lock when pickers open
  useEffect(() => {
    const isOpen = showFromPicker || showToPicker;
    const scrollEl = document.querySelector(".main-content");
    if (isOpen) {
      if (scrollEl) scrollEl.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [showFromPicker, showToPicker]);

  const handleSave = async () => {
    if (!amount || isNaN(amount) || +amount <= 0) return;
    setSaving(true);
    await onSave(+amount, note, date, fromId, toId);
    setSaving(false);
  };

  return (
    <div
      className="page"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ‹ Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          Edit Transfer
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* From → To preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            background: (currentFrom?.color || "#6366f1") + "22",
            border: `1px solid ${currentFrom?.color || "#6366f1"}44`,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: currentFrom?.color || "var(--accent)",
          }}
        >
          {currentFrom?.icon} {currentFrom?.name}
        </div>
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 18 }}>
          →
        </span>
        <div
          style={{
            background: (currentTo?.color || "#6366f1") + "22",
            border: `1px solid ${currentTo?.color || "#6366f1"}44`,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: currentTo?.color || "var(--accent)",
          }}
        >
          {currentTo?.icon} {currentTo?.name}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* Amount */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            Amount
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 16,
              color: "var(--text)",
              fontFamily: "inherit",
              textAlign: "right",
            }}
          />
        </div>

        {/* Date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={() => document.getElementById("edit-transfer-date").showPicker?.()}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            Date
          </span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric", year: "numeric",
            })}
          </span>
          <input
            id="edit-transfer-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }}
          />
        </div>

        {/* From */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
          }}
          onClick={() => setShowFromPicker(true)}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            From
          </span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
            {currentFrom?.icon} {currentFrom?.name}
          </span>
          <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
        </div>

        {/* To */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
          }}
          onClick={() => setShowToPicker(true)}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            To
          </span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
            {currentTo?.icon} {currentTo?.name}
          </span>
          <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
        </div>

        {/* Note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            Note
          </span>
          <input
            type="text"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--text)",
              fontFamily: "inherit",
              textAlign: "right",
            }}
          />
        </div>

        {/* Save / Delete */}
        <div style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {confirmDel ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onDelete}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(239,68,68,0.12)",
                  color: "var(--red)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm Delete Both
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-2)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑 Delete Transfer
            </button>
          )}
        </div>
      </div>

      {/* From Picker */}
      {showFromPicker && (
        <BottomSheetPicker
          title="From Account"
          options={accounts}
          selected={fromId}
          onSelect={setFromId}
          onClose={() => setShowFromPicker(false)}
        />
      )}

      {/* To Picker */}
      {showToPicker && (
        <BottomSheetPicker
          title="To Account"
          options={accounts}
          selected={toId}
          onSelect={setToId}
          onClose={() => setShowToPicker(false)}
        />
      )}
    </div>
  );
}
