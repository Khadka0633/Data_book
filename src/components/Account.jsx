import { useState, useEffect, useRef } from "react";
import pb from "../pb";

// ─── Account Groups Config ────────────────────────────────────────
const ACCOUNT_GROUPS = [
  { key: "savings",    label: "Savings",        color: "#5fc20e", bg: "#190749" },
  { key: "cash",       label: "Cash",           color: "#bd6f10", bg: "#190749" },
  { key: "investment", label: "Investments",    color: "#534AB7", bg: "#190749" },
  { key: "loan",       label: "Loans",          color: "#A32D2D", bg: "#190749" },
  { key: "bank",       label: "Bank",           color: "#0ab97f", bg: "#190749" },
  { key: "wallet",     label: "Digital_Wallet", color: "#ac9330", bg: "#190749" },
];

// ─── Icon Picker ──────────────────────────────────────────────────
const ACCOUNT_ICONS = [
  "🏦","💵","💳","📱","💜","💰","🏧","💹","📈","🪙",
  "🏠","🚗","✈️","🎓","💊","🛒","⚡","🍔","🎮","💼",
  "🏪","🌐","📦","🎁","💎","🔑","🏋️","🌱","🎯","🤝",
];

function IconPicker({ value, onChange }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4,
      padding: "10px", background: "var(--surface-2)",
      borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
    }}>
      {ACCOUNT_ICONS.map(icon => (
        <button key={icon} onClick={() => onChange(icon)} style={{
          fontSize: 20, padding: "6px", borderRadius: "var(--radius-sm)",
          border: value === icon ? "2px solid var(--accent)" : "2px solid transparent",
          background: value === icon ? "var(--accent)22" : "transparent",
          cursor: "pointer", lineHeight: 1, transition: "all 0.15s",
        }}>{icon}</button>
      ))}
    </div>
  );
}

// ─── Entry Form (Add / Edit) ──────────────────────────────────────
function EntryForm({ account, entry, expCats, incCats, onSave, onDelete, onCancel }) {
  const isEdit = Boolean(entry);
  const today = new Date().toISOString().split("T")[0];

  const initialType = entry?.type || "expense";
  const initialCats = initialType === "expense" ? expCats : incCats;

  const [draft, setDraft] = useState({
    type:     initialType,
    amount:   entry?.amount ? String(entry.amount) : "",
    category: entry?.category || initialCats[0]?.name || "",
    note:     entry?.note     || "",
    date:     entry?.date     || today,
  });
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const set = (k, v) => { setDraft(d => ({ ...d, [k]: v })); setError(""); };

  // When type changes, reset category to first of that type's cats
  const handleTypeChange = t => {
    const cats = t === "expense" ? expCats : incCats;
    setDraft(d => ({ ...d, type: t, category: cats[0]?.name || "" }));
    setError("");
  };

  const currentCats = draft.type === "expense" ? expCats : incCats;

  const handleSave = () => {
    const amt = parseFloat(draft.amount);
    if (!draft.amount || isNaN(amt) || amt <= 0) return setError("Enter a valid amount.");
    if (!draft.category.trim()) return setError("Category is required.");
    if (!draft.date) return setError("Date is required.");
    onSave({ ...draft, amount: amt, category: draft.category.trim(), note: draft.note.trim() });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Type Toggle */}
      <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
        {["expense", "income"].map(t => (
          <button key={t} onClick={() => handleTypeChange(t)} style={{
            flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
            background: draft.type === t ? (t === "income" ? "var(--green)" : "var(--red)") : "var(--surface-2)",
            color: draft.type === t ? "#fff" : "var(--text-muted)",
            border: "none", cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize",
          }}>{t === "expense" ? "− Expense" : "+ Income"}</button>
        ))}
      </div>

      {/* Amount */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Amount (रु)</label>
        <input className="input" type="number" placeholder="0" value={draft.amount}
          onChange={e => set("amount", e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} autoFocus />
      </div>

      {/* Category — dropdown from saved cats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Category</label>
        {currentCats.length > 0 ? (
          <select className="input" value={draft.category} onChange={e => set("category", e.target.value)}>
            {currentCats.map(c => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
            No categories yet. Add them in the Finance tab.
          </p>
        )}
      </div>

      {/* Note */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Note (optional)</label>
        <input className="input" placeholder="Additional details…" value={draft.note}
          onChange={e => set("note", e.target.value)} />
      </div>

      {/* Date */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Date</label>
        <input className="input" type="date" value={draft.date}
          onChange={e => set("date", e.target.value)} />
      </div>

      {error && <p className="cat-error">{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>
          {isEdit ? "Save Changes" : "Add Entry"}
        </button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>

      {/* Delete (edit mode only) */}
      {isEdit && !entry.isTransfer && (
        confirmDel ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              flex: 1, background: "rgba(239,68,68,0.12)", color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)",
              padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }} onClick={onDelete}>Confirm Delete</button>
            <button className="btn-cancel" onClick={() => setConfirmDel(false)}>Cancel</button>
          </div>
        ) : (
          <button style={{
            background: "transparent", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-sm)", padding: "10px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }} onClick={() => setConfirmDel(true)}>🗑 Delete Entry</button>
        )
      )}
    </div>
  );
}

// ─── Account Detail Modal ─────────────────────────────────────────
function AccountDetailModal({ account, entries, userId, onClose, onEntriesChange }) {
  const [localEntries, setLocalEntries] = useState(entries);
  const [mode, setMode]   = useState("list");
  const [editing, setEditing] = useState(null);
  const [expCats, setExpCats] = useState([]);
  const [incCats, setIncCats] = useState([]);

  // Keep in sync if parent entries change
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  // Load categories from PocketBase (same collections as ExpenseTracker)
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }),
      pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }),
    ]).then(([exp, inc]) => { setExpCats(exp); setIncCats(inc); })
      .catch(err => console.error("Failed to load categories:", err));
  }, [userId]);

  const accEntries = localEntries
    .filter(e => e.accountId === account.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const income  = accEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = accEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const balance = income - expense;

  const groups = {};
  accEntries.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
  const grouped = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date, entries: groups[date] }));

  // ── handlers ──
  const handleAddSave = async draft => {
    try {
      const created = await pb.collection("entries").create({ ...draft, accountId: account.id, userId, isTransfer: false });
      const updated = [...localEntries, created];
      setLocalEntries(updated);
      onEntriesChange(updated);
      setMode("list");
    } catch (err) { console.error("Add entry failed:", err); }
  };

  const handleEditSave = async draft => {
    try {
      const saved = await pb.collection("entries").update(editing.id, draft);
      const updated = localEntries.map(e => e.id === saved.id ? saved : e);
      setLocalEntries(updated);
      onEntriesChange(updated);
      setMode("list"); setEditing(null);
    } catch (err) { console.error("Edit entry failed:", err); }
  };

  const handleDelete = async () => {
    try {
      await pb.collection("entries").delete(editing.id);
      const updated = localEntries.filter(e => e.id !== editing.id);
      setLocalEntries(updated);
      onEntriesChange(updated);
      setMode("list"); setEditing(null);
    } catch (err) { console.error("Delete entry failed:", err); }
  };

  return (
    <div className="modal-overlay" onClick={mode === "list" ? onClose : undefined} style={{ zIndex: 300, alignItems: "flex-end" }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "100%", width: "100%", maxHeight: "90vh",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          overflowY: "auto", margin: 0,
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(mode === "add" || mode === "edit") && (
              <button onClick={() => { setMode("list"); setEditing(null); }} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 14,
                color: "var(--text)", cursor: "pointer",
              }}>← Back</button>
            )}
            {mode === "list" && <span style={{ fontSize: 28 }}>{account.icon}</span>}
            <div>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>
                {mode === "add" ? "Add Transaction" : mode === "edit" ? "Edit Transaction" : account.name}
              </h3>
              {mode === "list" && (
                <p style={{ fontSize: 12, color: account.color, marginTop: 2, textTransform: "capitalize" }}>
                  {account.group}
                </p>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {mode === "add" && (
          <EntryForm
            account={account}
            expCats={expCats}
            incCats={incCats}
            onSave={handleAddSave}
            onCancel={() => setMode("list")}
          />
        )}

        {mode === "edit" && editing && (
          <EntryForm
            account={account}
            entry={editing}
            expCats={expCats}
            incCats={incCats}
            onSave={handleEditSave}
            onDelete={handleDelete}
            onCancel={() => { setMode("list"); setEditing(null); }}
          />
        )}

        {mode === "list" && (<>
          {/* Stats */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 16,
            background: "var(--surface-2)", borderRadius: "var(--radius-md)",
            overflow: "hidden", border: "1px solid var(--border)",
          }}>
            {[
              { label: "Income",  value: `रु${income.toLocaleString()}`,            color: "var(--green)" },
              { label: "Expense", value: `रु${expense.toLocaleString()}`,           color: "var(--red)" },
              { label: "Balance", value: `रु${Math.abs(balance).toLocaleString()}`, color: balance >= 0 ? "var(--green)" : "var(--red)" },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: "12px 8px", textAlign: "center",
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
              }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Add button */}
          <style>{`
            .acc-detail-fab { position: fixed; right: 28px; bottom: 32px; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 26px; font-weight: 300; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(99,102,241,0.4); z-index: 400; transition: transform 0.15s, box-shadow 0.15s; }
            .acc-detail-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(99,102,241,0.5); }
            @media (max-width: 768px) { .acc-detail-fab { bottom: 76px; right: 18px; width: 48px; height: 48px; font-size: 24px; } }
          `}</style>
          <button className="acc-detail-fab" onClick={() => setMode("add")} title="Add transaction">+</button>

          {/* Entries List */}
          {accEntries.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
              No transactions yet. Tap + to add one.
            </p>
          ) : (
            grouped.map(({ date, entries: dayEntries }) => {
              const d = new Date(date + "T00:00:00");
              return (
                <div key={date} style={{ marginBottom: 4 }}>
                  <div style={{ padding: "8px 0 4px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {dayEntries.map((e, idx) => (
                    <div
                      key={`${e.id}-${idx}`}
                      onClick={() => { setEditing(e); setMode("edit"); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 8px", borderBottom: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={el => el.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={el => el.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {Boolean(e.isTransfer)
                          ? <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>↔</span>
                          : <span style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: e.type === "income" ? "var(--green)" : "var(--red)",
                              flexShrink: 0, display: "inline-block",
                            }} />
                        }
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, color: "var(--text)", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {e.note || e.category}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                            {e.category}
                            {Boolean(e.isTransfer) && (
                              <span style={{ marginLeft: 6, color: "var(--accent)", fontSize: 10 }}>Transfer</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: e.type === "income" ? "var(--green)" : "var(--red)",
                        }}>
                          {e.type === "income" ? "+" : "−"}रु{e.amount.toLocaleString()}
                        </span>
                        {!e.isTransfer && (
                          <span style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.6 }}>✎</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </>)}
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────
function AccountCard({ account, balance, onClick, isSelected, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`account-card ${isSelected ? "account-card-active" : ""}`}
      style={{ "--acc-color": account.color }}
      onClick={onClick}
    >
      <div className="account-card-top">
        <span className="account-icon">{account.icon}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isSelected && <span className="account-selected-pip" />}
          <div ref={menuRef} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button className="acc-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}>⋯</button>
            {menuOpen && (
              <div className="acc-dropdown">
                <button className="acc-dropdown-item" onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(account); }}>✎ Edit</button>
                <button className="acc-dropdown-item acc-dropdown-delete" onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(account); }}>✕ Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="account-name">{account.name}</p>
      <p className={`account-balance ${balance >= 0 ? "pos" : "neg"}`}>
        {balance >= 0 ? "+" : ""}रु{balance.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────
function AddAccountForm({ onSave, onCancel }) {
  const [draft, setDraft] = useState({ name: "", icon: "🏦", color: "#6366f1", group: "cash" });
  const [error, setError] = useState("");

  return (
    <div className="card ledger-card" style={{ marginTop: 0 }}>
      <h2 className="card-title" style={{ marginBottom: 16 }}>New Account</h2>
      <div style={{
        background: "var(--surface-2)", border: `2px solid ${draft.color}`,
        borderRadius: "var(--radius-md)", padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
        boxShadow: `0 0 16px ${draft.color}22`,
      }}>
        <span style={{ fontSize: 26 }}>{draft.icon || "🏦"}</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{draft.name || "Account Name"}</p>
          <p style={{ fontSize: 11, color: draft.color, marginTop: 2 }}>
            {ACCOUNT_GROUPS.find(g => g.key === draft.group)?.label || "Group"}
          </p>
        </div>
        <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16, color: draft.color }}>रु0</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Account Name</label>
          <input className="input" placeholder="e.g. Bank Account" value={draft.name}
            onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setError(""); }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Group</label>
          <select className="input" value={draft.group} onChange={e => setDraft(d => ({ ...d, group: e.target.value }))}>
            {ACCOUNT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="input-label">Icon</label>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>tap to select</span>
          </div>
          <IconPicker value={draft.icon} onChange={icon => setDraft(d => ({ ...d, icon }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Color</label>
          <input type="color" className="color-pick" value={draft.color}
            onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: "100%", height: 42 }} />
        </div>
        {error && <p className="cat-error">{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
            if (!draft.name.trim()) return setError("Account name cannot be empty.");
            onSave({ ...draft, name: draft.name.trim() });
          }}>Save Account</button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────
function EditAccountModal({ account, onSave, onClose }) {
  const [draft, setDraft] = useState({ name: account.name, icon: account.icon, color: account.color, group: account.group || "cash" });
  const [error, setError] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Account</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "var(--surface-2)", border: `2px solid ${draft.color}`,
            borderRadius: "var(--radius-md)", padding: "16px",
            display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 16px ${draft.color}33`,
          }}>
            <span style={{ fontSize: 28 }}>{draft.icon || "🏦"}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{draft.name || "Account Name"}</p>
              <p style={{ fontSize: 11, color: draft.color, marginTop: 2 }}>
                {ACCOUNT_GROUPS.find(g => g.key === draft.group)?.label || "Group"}
              </p>
            </div>
            <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16, color: draft.color }}>रु0</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Account Name</label>
            <input className="input" placeholder="e.g. Bank Account" value={draft.name}
              onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setError(""); }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Group</label>
            <select className="input" value={draft.group} onChange={e => setDraft(d => ({ ...d, group: e.target.value }))}>
              {ACCOUNT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="input-label">Icon</label>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>tap to select</span>
            </div>
            <IconPicker value={draft.icon} onChange={icon => setDraft(d => ({ ...d, icon }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Color</label>
            <input type="color" className="color-pick" value={draft.color}
              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: "100%", height: 42 }} />
          </div>
          {error && <p className="cat-error">{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
              if (!draft.name.trim()) return setError("Account name cannot be empty.");
              onSave({ ...account, ...draft, name: draft.name.trim() });
            }}>Save Changes</button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────
function DeleteAccountModal({ account, linkedCount, onConfirmDelete, onReassignAndDelete, accounts, onClose }) {
  const [reassignTo, setReassignTo] = useState("");
  const otherAccounts = accounts.filter(a => a.id !== account.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--red)" }}>🗑 Delete Account</h3>
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
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{account.name}</p>
              {linkedCount > 0 && (
                <p style={{ fontSize: 12, color: "var(--orange)", marginTop: 2 }}>
                  ⚠ {linkedCount} transaction{linkedCount !== 1 ? "s" : ""} linked
                </p>
              )}
            </div>
          </div>
          {linkedCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              This account has no transactions. It will be permanently deleted.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
                Choose what to do with the <strong style={{ color: "var(--text)" }}>{linkedCount} linked transaction{linkedCount !== 1 ? "s" : ""}</strong>:
              </p>
              {otherAccounts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="input-label">Reassign transactions to</label>
                  <select className="input" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                    <option value="">— select account —</option>
                    {otherAccounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {linkedCount > 0 && otherAccounts.length > 0 && (
              <button className="btn-primary" disabled={!reassignTo} style={{ opacity: reassignTo ? 1 : 0.45 }}
                onClick={() => reassignTo && onReassignAndDelete(reassignTo)}>
                Reassign & Delete
              </button>
            )}
            <button style={{
              background: "rgba(239,68,68,0.12)", color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)",
              padding: "11px 20px", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
            }} onClick={onConfirmDelete}>
              {linkedCount > 0 ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}` : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────
export default function Account({
  accounts,
  accountBalances,
  entries,
  userId,
  onAccountsChange,
  onEntriesChange,
  onShowTransfer,
}) {
  const [showAddAcc,      setShowAddAcc]      = useState(false);
  const [editingAccount,  setEditingAccount]  = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [selectedAcc,     setSelectedAcc]     = useState(null);
  const [openMenuId,      setOpenMenuId]      = useState(null);

  // Close ⋯ menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  const grandTotal = accounts.reduce((s, a) => s + (accountBalances[a.id] || 0), 0);

  // ── CRUD handlers ────────────────────────────────────────────
  const addAccount = async draft => {
    try {
      const created = await pb.collection("accounts").create({ ...draft, group: draft.group || "cash", userId });
      onAccountsChange([...accounts, created]);
      setShowAddAcc(false);
    } catch (err) { console.error("Failed to create account:", err); }
  };

  const handleSaveAccount = async updated => {
    try {
      const saved = await pb.collection("accounts").update(updated.id, {
        name: updated.name, icon: updated.icon, color: updated.color, group: updated.group || "cash",
      });
      onAccountsChange(accounts.map(a => a.id === saved.id ? saved : a));
      setEditingAccount(null);
    } catch (err) { console.error("Failed to update account:", err); }
  };

  const linkedEntryCount = accId => entries.filter(e => e.accountId === accId).length;

  const handleConfirmDeleteAccount = async accId => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").delete(e.id)));
    await pb.collection("accounts").delete(accId);
    onEntriesChange(entries.filter(e => e.accountId !== accId));
    onAccountsChange(accounts.filter(a => a.id !== accId));
    setDeletingAccount(null);
  };

  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").update(e.id, { accountId: reassignToId })));
    await pb.collection("accounts").delete(accId);
    onEntriesChange(entries.map(e => e.accountId === accId ? { ...e, accountId: reassignToId } : e));
    onAccountsChange(accounts.filter(a => a.id !== accId));
    setDeletingAccount(null);
  };

  return (
    <div className="page" style={{ padding: "16px", gap: 0 }}>
      {/* Modals */}
      {selectedAcc && (
        <AccountDetailModal
          account={selectedAcc}
          entries={entries}
          userId={userId}
          onClose={() => setSelectedAcc(null)}
          onEntriesChange={onEntriesChange}
        />
      )}
      {editingAccount && (
        <EditAccountModal account={editingAccount} onSave={handleSaveAccount} onClose={() => setEditingAccount(null)} />
      )}
      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          linkedCount={linkedEntryCount(deletingAccount.id)}
          accounts={accounts}
          onConfirmDelete={() => handleConfirmDeleteAccount(deletingAccount.id)}
          onReassignAndDelete={id => handleReassignAndDeleteAccount(deletingAccount.id, id)}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      {showAddAcc && (
        <div className="modal-overlay" onClick={() => setShowAddAcc(false)} style={{ zIndex: 100 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "100%" }}>
            <AddAccountForm onSave={addAccount} onCancel={() => setShowAddAcc(false)} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 }}>Accounts</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* Net Worth — compact stat bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Net Worth</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: grandTotal >= 0 ? "var(--green)" : "var(--red)", fontFamily: "'Syne', sans-serif" }}>
            {grandTotal >= 0 ? "+" : "−"}रु{Math.abs(grandTotal).toLocaleString()}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 12 }}>
          <button onClick={onShowTransfer} style={{
            background: "rgba(99,102,241,0.12)", color: "var(--accent)",
            border: "1px solid rgba(99,102,241,0.3)", borderRadius: "var(--radius-sm)",
            padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>↔ Transfer</button>
        </div>
      </div>

      {/* Account Groups — flat list like expense tracker */}
      {accounts.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No accounts yet. Tap + to add one.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ACCOUNT_GROUPS.map(grp => {
            const grpAccounts = accounts.filter(a => a.group === grp.key);
            if (grpAccounts.length === 0) return null;
            const grpTotal = grpAccounts.reduce((s, a) => s + (accountBalances[a.id] || 0), 0);
            return (
              <div key={grp.key} style={{ marginBottom: 4 }}>
                {/* Group header — same style as day header in expense tracker */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 4px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: grp.color }}>{grp.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{grpAccounts.length} account{grpAccounts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: grpTotal >= 0 ? "var(--green)" : "var(--red)" }}>
                    {grpTotal >= 0 ? "+" : "−"}रु{Math.abs(grpTotal).toLocaleString()}
                  </span>
                </div>

                {/* Account rows */}
                {grpAccounts.map(acc => {
                  const bal = accountBalances[acc.id] || 0;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAcc(acc)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 0", borderBottom: "1px solid var(--border)",
                        cursor: "pointer", transition: "background 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{acc.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.name}</p>
                          <p style={{ fontSize: 11, color: acc.color, marginTop: 1 }}>{grp.label}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: bal >= 0 ? "var(--green)" : "var(--red)" }}>
                          {bal >= 0 ? "+" : "−"}रु{Math.abs(bal).toLocaleString()}
                        </span>
                        {/* ⋯ menu */}
                        <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuId(v => v === acc.id ? null : acc.id);
                            }}
                            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}
                          >⋯</button>
                          {openMenuId === acc.id && (
                            <div style={{
                              position: "absolute", right: 0, top: "100%", zIndex: 50,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)", overflow: "hidden",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.3)", minWidth: 120,
                            }}>
                              <button onClick={() => { setOpenMenuId(null); setEditingAccount(acc); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--text)", background: "transparent", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >✎ Edit</button>
                              <button onClick={() => { setOpenMenuId(null); setDeletingAccount(acc); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--red)", background: "transparent", border: "none", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >✕ Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB — add account */}
      <style>{`
        .acc-fab { position: fixed; right: 28px; bottom: 32px; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 26px; font-weight: 300; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(99,102,241,0.4); z-index: 90; transition: transform 0.15s, box-shadow 0.15s; }
        .acc-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(99,102,241,0.5); }
        @media (max-width: 768px) { .acc-fab { bottom: 76px; right: 18px; width: 48px; height: 48px; font-size: 24px; } }
      `}</style>
      <button className="acc-fab" onClick={() => setShowAddAcc(true)} title="Add account">+</button>
    </div>
  );
}
