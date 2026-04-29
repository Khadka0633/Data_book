import { useState } from "react";
import pb from "../pb";

export default function TransferModal({ accounts, userId, today, onTransferDone, onClose }) {
  const [form, setForm] = useState({
    fromId: accounts[0]?.id || "",
    toId:   accounts[1]?.id || accounts[0]?.id || "",
    amount: "",
    note:   "",
    date:   today,
  });
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const fromAcc = accounts.find(a => a.id === form.fromId);
  const toAcc   = accounts.find(a => a.id === form.toId);

  const handleTransfer = async () => {
    setError("");
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0)
      return setError("Please enter a valid amount.");
    if (form.fromId === form.toId)
      return setError("Source and destination accounts must be different.");

    setSaving(true);
    try {
      // Create debit entry on source account
      const debit = await pb.collection("entries").create({
        userId,
        type:      "expense",
        amount:    +form.amount,
        category:  "Transfer",
        note:      form.note ? `Transfer to ${toAcc?.name}: ${form.note}` : `Transfer to ${toAcc?.name}`,
        date:      form.date,
        accountId: form.fromId,
        isTransfer: true,
      });

      // Create credit entry on destination account
      const credit = await pb.collection("entries").create({
        userId,
        type:      "income",
        amount:    +form.amount,
        category:  "Transfer",
        note:      form.note ? `Transfer from ${fromAcc?.name}: ${form.note}` : `Transfer from ${fromAcc?.name}`,
        date:      form.date,
        accountId: form.toId,
        isTransfer: true,
      });

      onTransferDone([debit, credit]);
      onClose();
    } catch (err) {
      console.error("Transfer failed:", err);
      setError("Transfer failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">↔ Transfer Money</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Transfer preview arrow */}
        <div className="transfer-preview">
          <div className="transfer-acc-pill" style={{ "--acc-color": fromAcc?.color || "var(--accent)" }}>
            <span>{fromAcc?.icon}</span>
            <span>{fromAcc?.name}</span>
          </div>
          <div className="transfer-arrow">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div className="transfer-acc-pill" style={{ "--acc-color": toAcc?.color || "var(--green)" }}>
            <span>{toAcc?.icon}</span>
            <span>{toAcc?.name}</span>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* From account */}
          <div className="input-group">
            <label className="input-label">From Account</label>
            <select
              className="input"
              value={form.fromId}
              onChange={e => setForm({ ...form, fromId: e.target.value })}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          {/* To account */}
          <div className="input-group">
            <label className="input-label">To Account</label>
            <select
              className="input"
              value={form.toId}
              onChange={e => setForm({ ...form, toId: e.target.value })}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="input-group">
            <label className="input-label">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="input"
              autoFocus
            />
          </div>

          {/* Note */}
          <div className="input-group">
            <label className="input-label">Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly savings"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="input"
            />
          </div>

          {/* Date */}
          <div className="input-group">
            <label className="input-label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="input"
            />
          </div>

          {error && (
            <p style={{ fontSize:13, color:"var(--red)", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 14px" }}>
              {error}
            </p>
          )}

          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button
              className="btn-primary"
              style={{ flex:1 }}
              onClick={handleTransfer}
              disabled={saving}
            >
              {saving ? "Transferring..." : `Transfer${form.amount ? ` रु${form.amount}` : ""}`}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
