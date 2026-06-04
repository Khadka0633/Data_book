import { useState } from "react";
import MiniCalendar from "./Form/MiniCalendar";
import NumericKeypadInline from "./Form/NumericKeypadInline";
import FieldRow from "./Form/FieldRow";



export default function EditTransferPage({
  entry,
  accounts,
  entries,
  onSave,
  onDelete,
  onClose,
}) {
  const toAcc = accounts.find((a) => a.id === entry._transferTo?.account_id);

  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(
    entry.note
      ?.replace(`Transfer to ${toAcc?.name}: `, "")
      .replace(`Transfer to ${toAcc?.name}`, "") || "",
  );
  const [date, setDate]   = useState(entry.date);
  const [fromId, setFromId] = useState(entry.account_id);
  const [toId, setToId]   = useState(entry._transferTo?.account_id);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [activeField, setActiveField] = useState("amount");

  const fromAcc = accounts.find((a) => a.id === fromId);
  const currentTo = accounts.find((a) => a.id === toId);

  const handleSave = async () => {
    if (!amount || isNaN(amount) || +amount <= 0) return;
    setSaving(true);
    await onSave(+amount, note, date, fromId, toId);
    setSaving(false);
  };

  // ── Account grid (reused for from/to) ─────────────────────────
  const AccountGrid = ({ selectedId, onSelect, nextField }) => (
    <div style={{ padding: "8px 0 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => { onSelect(a.id); setActiveField(nextField); }}
            style={{
              padding: "16px 8px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              border: "none",
              background: selectedId === a.id ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
              color: selectedId === a.id ? "var(--accent)" : "var(--text)",
              textAlign: "center", lineHeight: 1.4,
            }}
          >
            <span style={{ display: "block", fontSize: 18, marginBottom: 2 }}>{a.icon}</span>
            <span style={{ fontSize: 11 }}>{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Context panel ──────────────────────────────────────────────
  const renderContextPanel = () => {
    switch (activeField) {
      case "date":
        return (
          <MiniCalendar
            value={date}
            onChange={(ds) => { setDate(ds); setActiveField("from"); }}
          />
        );
      case "from":
        return (
          <AccountGrid
            selectedId={fromId}
            onSelect={setFromId}
            nextField="to"
          />
        );
      case "to":
        return (
          <AccountGrid
            selectedId={toId}
            onSelect={setToId}
            nextField="amount"
          />
        );
      case "note":
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "var(--text-muted)", fontSize: 12 }}>
            ↑ Use the keyboard above to type your note
          </div>
        );
      case "amount":
      default:
        return (
          <NumericKeypadInline value={amount} onChange={setAmount} />
        );
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--bg)",
      zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          ‹ Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Edit Transfer</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Type tab — locked to Transfer */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {["Income", "Expense", "Transfer"].map((t) => {
          const color = t === "Income" ? "var(--green)" : t === "Expense" ? "var(--red)" : "var(--accent)";
          const active = t === "Transfer";
          return (
            <button
              key={t}
              disabled
              style={{
                flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
                border: "none", cursor: "default", background: "transparent",
                color: active ? color : "var(--text-muted)",
                borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >{t}</button>
          );
        })}
      </div>

      {/* Scrollable fields */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "0 20px" }}>

          {/* Amount */}
          <FieldRow label="Amount" active={activeField === "amount"} onTap={() => setActiveField("amount")}>
            <span style={{ fontSize: 28, fontWeight: 700, color: amount ? "var(--text)" : "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
              {amount || "0"}
            </span>
          </FieldRow>

          {/* Date */}
          <FieldRow label="Date" active={activeField === "date"} onTap={() => setActiveField("date")}>
            <span style={{ fontSize: 15, color: "var(--text)" }}>
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </FieldRow>

          {/* From */}
          <FieldRow label="From" active={activeField === "from"} onTap={() => setActiveField("from")} showChevron>
            <span style={{ fontSize: 15, color: "var(--text)" }}>
              {fromAcc ? `${fromAcc.icon} ${fromAcc.name}` : "Select..."}
            </span>
          </FieldRow>

          {/* Arrow divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>↓ to</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* To */}
          <FieldRow label="To" active={activeField === "to"} onTap={() => setActiveField("to")} showChevron>
            <span style={{ fontSize: 15, color: "var(--text)" }}>
              {currentTo ? `${currentTo.icon} ${currentTo.name}` : "Select..."}
            </span>
          </FieldRow>

          {/* Same account warning */}
          {fromId === toId && fromId && (
            <p style={{ fontSize: 12, color: "var(--red)", padding: "4px 0" }}>
              ⚠ Source and destination must be different
            </p>
          )}

          {/* Note */}
          <FieldRow label="Note" active={activeField === "note"} onTap={() => setActiveField("note")} noBorder>
            <input
              type="text"
              placeholder="Add a note..."
              value={note}
              onFocus={() => setActiveField("note")}
              onChange={(e) => setNote(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", textAlign: "right" }}
            />
          </FieldRow>

        </div>
      </div>

      {/* Save / Delete */}
      <div style={{ padding: "10px 20px 8px", flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={saving || fromId === toId}
          style={{
            width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
            background: "var(--accent)", color: "#fff", border: "none",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            opacity: fromId === toId ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {confirmDel ? (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={onDelete}
              style={{ flex: 1, padding: "12px", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 14, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            style={{ width: "100%", padding: "11px", marginTop: 6, borderRadius: "var(--radius-md)", background: "transparent", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            🗑 Delete Transfer
          </button>
        )}
      </div>

      {/* Context panel */}
      <div style={{
        flexShrink: 0,
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 60px)",
        minHeight: 240,
        maxHeight: 340,
        overflowY: "auto",
      }}>
        {renderContextPanel()}
      </div>

    </div>
  );
}
