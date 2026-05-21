import { useState, useEffect } from "react";
import pb from "../pb";
import BottomSheetPicker from "./BottomSheetPicker";
import NumericKeypad from "./NumericKeypad";

export default function TransferPage({
  accounts,
  userId,
  today,
  entries = [],
  onTransferDone,
  onClose,
  onSwitchType,
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
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const seen = new Set();
    const matches = entries
      .filter((e) => Boolean(e.isTransfer) && e.note && e.note.toLowerCase().includes(value.toLowerCase()) && !seen.has(e.note) && seen.add(e.note))
      .slice(0, 5)
      .map((e) => e.note.replace(/Transfer (to|from) [^:]+: ?/i, "").trim())
      .filter((n) => n.length > 0);
    setSuggestions([...new Set(matches)]);
    setShowSuggestions(matches.length > 0);
  };

  const handleTransfer = async () => {
    setError("");
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return setError("Enter a valid amount.");
    if (form.fromId === form.toId) return setError("Source and destination must be different.");
    setSaving(true);
    try {
      const debit = await pb.collection("entries").create({
        userId, type: "expense", amount: +form.amount, category: "Transfer",
        note: form.note ? `Transfer to ${toAcc?.name}: ${form.note}` : `Transfer to ${toAcc?.name}`,
        date: form.date, accountId: form.fromId, isTransfer: true,
      });
      const credit = await pb.collection("entries").create({
        userId, type: "income", amount: +form.amount, category: "Transfer",
        note: form.note ? `Transfer from ${fromAcc?.name}: ${form.note}` : `Transfer from ${fromAcc?.name}`,
        date: form.date, accountId: form.toId, isTransfer: true,
      });
      onTransferDone([debit, credit]);
    } catch (err) {
      setError("Transfer failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "var(--bg)",
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          ‹ Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Transfer</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Type toggle — matches income/expense style */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {["Income", "Expense"].map((t) => (
          <button key={t} onClick={() => onSwitchType(t.toLowerCase())}
            style={{
              flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
              border: "none", cursor: "pointer", background: "transparent",
              color: "var(--text-muted)", borderBottom: "2px solid transparent", marginBottom: "-1px",
            }}
          >
            {t}
          </button>
        ))}
        <button style={{
          flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
          border: "none", cursor: "pointer", background: "transparent",
          color: "var(--accent)", borderBottom: "2px solid var(--accent)", marginBottom: "-1px",
        }}>
          Transfer
        </button>
      </div>

      {/* Scrollable fields */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "0 20px" }}>

          {/* Amount display */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Amount</span>
            <span style={{
              flex: 1, fontSize: 28, fontWeight: 700,
              color: form.amount ? "var(--text)" : "var(--text-muted)",
              textAlign: "right", fontFamily: "'Syne', sans-serif",
            }}>
              {form.amount || "0"}
            </span>
          </div>

          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)", cursor: "pointer", position: "relative" }}
            onClick={() => document.getElementById("transfer-date-input").showPicker?.()}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Date</span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {new Date(form.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <input id="transfer-date-input" type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }} />
          </div>

          {/* From */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => setShowFromPicker(true)}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>From</span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>{fromAcc?.icon} {fromAcc?.name}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
          </div>

          {/* To */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => setShowToPicker(true)}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>To</span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>{toAcc?.icon} {toAcc?.name}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
          </div>

          {/* Note */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Note</span>
            <input type="text" placeholder="Add a note..." value={form.note}
              onChange={(e) => handleNoteChange(e.target.value)}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", textAlign: "right" }} />
            {showSuggestions && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginTop: 4 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onMouseDown={() => { setForm((f) => ({ ...f, note: s })); setShowSuggestions(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--text)", background: "transparent", border: "none", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ fontSize: 13, color: "var(--red)", padding: "10px 0" }}>{error}</p>}
        </div>

        
      </div>
      {/* Transfer button */}
        <div style={{ padding: "12px 20px 20px" }}>
          <button onClick={handleTransfer} disabled={saving} style={{
            width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
            background: "var(--accent)", color: "#fff", border: "none",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
            {saving ? "Transferring..." : `Transfer${form.amount ? ` रु${form.amount}` : ""}`}
          </button>
        </div>

      {/* Keypad pinned at bottom */}
      <div style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
  <NumericKeypad
    value={form.amount}
    onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
  />
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