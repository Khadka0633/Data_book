import { useState, useEffect } from "react";
import pb from "../pb";
import BottomSheetPicker from "./BottomSheetPicker";

/**
 * TransferPage
 *
 * Props:
 *   accounts       – array of account objects
 *   userId         – string
 *   today          – "YYYY-MM-DD" string
 *   entries        – array of all entries (for note suggestions)
 *   onTransferDone – (newEntries: [debit, credit]) => void
 *   onClose        – () => void
 */
export default function TransferPage({
  accounts,
  userId,
  today,
  entries = [],
  onTransferDone,
  onClose,
}) {
  const [form, setForm] = useState({
    fromId: accounts[0]?.id || "",
    toId: accounts[1]?.id || accounts[0]?.id || "",
    amount: "",
    note: "",
    date: today,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fromAcc = accounts.find((a) => a.id === form.fromId);
  const toAcc = accounts.find((a) => a.id === form.toId);

  // Scroll lock when pickers open
  useEffect(() => {
    const isOpen = showFromPicker || showToPicker;
    const scrollEl = document.querySelector(".main-content");
    if (isOpen) {
      if (scrollEl) scrollEl.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [showFromPicker, showToPicker]);

  const handleNoteChange = (value) => {
    setForm((f) => ({ ...f, note: value }));
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const seen = new Set();
    const matches = entries
      .filter(
        (e) =>
          Boolean(e.isTransfer) &&
          e.note &&
          e.note.toLowerCase().includes(value.toLowerCase()) &&
          !seen.has(e.note) &&
          seen.add(e.note),
      )
      .slice(0, 5)
      .map((e) => e.note.replace(/Transfer (to|from) [^:]+: ?/i, "").trim())
      .filter((n) => n.length > 0);
    setSuggestions([...new Set(matches)]);
    setShowSuggestions(matches.length > 0);
  };

  const handleTransfer = async () => {
    setError("");
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0)
      return setError("Enter a valid amount.");
    if (form.fromId === form.toId)
      return setError("Source and destination must be different.");
    setSaving(true);
    try {
      const debit = await pb.collection("entries").create({
        userId,
        type: "expense",
        amount: +form.amount,
        category: "Transfer",
        note: form.note
          ? `Transfer to ${toAcc?.name}: ${form.note}`
          : `Transfer to ${toAcc?.name}`,
        date: form.date,
        accountId: form.fromId,
        isTransfer: true,
      });
      const credit = await pb.collection("entries").create({
        userId,
        type: "income",
        amount: +form.amount,
        category: "Transfer",
        note: form.note
          ? `Transfer from ${fromAcc?.name}: ${form.note}`
          : `Transfer from ${fromAcc?.name}`,
        date: form.date,
        accountId: form.toId,
        isTransfer: true,
      });
      onTransferDone([debit, credit]);
    } catch (err) {
      setError("Transfer failed. Please try again.");
    } finally {
      setSaving(false);
    }
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
          Transfer
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
            background: (fromAcc?.color || "#6366f1") + "22",
            border: `1px solid ${fromAcc?.color || "#6366f1"}44`,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: fromAcc?.color || "var(--accent)",
          }}
        >
          {fromAcc?.icon} {fromAcc?.name}
        </div>
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 18 }}>
          →
        </span>
        <div
          style={{
            background: (toAcc?.color || "#6366f1") + "22",
            border: `1px solid ${toAcc?.color || "#6366f1"}44`,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: toAcc?.color || "var(--accent)",
          }}
        >
          {toAcc?.icon} {toAcc?.name}
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
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
          onClick={() => document.getElementById("transfer-date-input").showPicker?.()}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            Date
          </span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
            {new Date(form.date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric", year: "numeric",
            })}
          </span>
          <input
            id="transfer-date-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
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
            {fromAcc?.icon} {fromAcc?.name}
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
            {toAcc?.icon} {toAcc?.name}
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
            position: "relative",
          }}
        >
          <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
            Note
          </span>
          <input
            type="text"
            placeholder="Add a note..."
            value={form.note}
            onChange={(e) => handleNoteChange(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
          {showSuggestions && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                marginTop: 4,
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={() => {
                    setForm((f) => ({ ...f, note: s }));
                    setShowSuggestions(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 14px",
                    fontSize: 13,
                    color: "var(--text)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 13, color: "var(--red)", padding: "10px 0" }}>
            {error}
          </p>
        )}

        {/* Transfer button */}
        <div style={{ paddingTop: 24 }}>
          <button
            onClick={handleTransfer}
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
            {saving ? "Transferring..." : `Transfer${form.amount ? ` रु${form.amount}` : ""}`}
          </button>
        </div>
      </div>

      {/* From Picker */}
      {showFromPicker && (
        <BottomSheetPicker
          title="From Account"
          options={accounts}
          selected={form.fromId}
          onSelect={(id) => setForm((f) => ({ ...f, fromId: id }))}
          onClose={() => setShowFromPicker(false)}
        />
      )}

      {/* To Picker */}
      {showToPicker && (
        <BottomSheetPicker
          title="To Account"
          options={accounts}
          selected={form.toId}
          onSelect={(id) => setForm((f) => ({ ...f, toId: id }))}
          onClose={() => setShowToPicker(false)}
        />
      )}
    </div>
  );
}
