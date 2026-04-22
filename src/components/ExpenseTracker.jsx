import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import pb from "../pb";

// ─── Default Categories ───────────────────────────────────────────
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food",          color: "#f97316" },
  { name: "Transport",     color: "#3b82f6" },
  { name: "Shopping",      color: "#a855f7" },
  { name: "Bills",         color: "#ef4444" },
  { name: "Health",        color: "#22c55e" },
  { name: "Entertainment", color: "#eab308" },
  { name: "Education",     color: "#06b6d4" },
  { name: "Rent",          color: "#f43f5e" },
  { name: "Other",         color: "#94a3b8" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary",     color: "#22c55e" },
  { name: "Freelance",  color: "#10b981" },
  { name: "Business",   color: "#14b8a6" },
  { name: "Investment", color: "#6366f1" },
  { name: "Gift",       color: "#ec4899" },
  { name: "Bonus",      color: "#f97316" },
  { name: "Other",      color: "#94a3b8" },
];

const DEFAULT_ACCOUNTS = [
  { name: "Cash",         icon: "💵", color: "#22c55e" },
  { name: "Bank Account", icon: "🏦", color: "#3b82f6" },
  { name: "Credit Card",  icon: "💳", color: "#ef4444" },
  { name: "eSewa",        icon: "📱", color: "#6366f1" },
  { name: "Khalti",       icon: "💜", color: "#a855f7" },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Pie Chart ────────────────────────────────────────────────────
function PieChart({ data, label = "TOTAL" }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="pie-empty"><span>No data yet</span></div>;

  let cumAngle = -90;
  const radius = 80, cx = 100, cy = 100;
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const angle = pct * 360;
    const sa = (cumAngle * Math.PI) / 180;
    const ea = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(sa), y1 = cy + radius * Math.sin(sa);
    const x2 = cx + radius * Math.cos(ea), y2 = cy + radius * Math.sin(ea);
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
    cumAngle += angle;
    return { ...d, path, pct };
  });

  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.9">
            <title>{s.label}: ₹{s.value.toFixed(2)} ({(s.pct * 100).toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="var(--surface)" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
          ₹{total.toFixed(0)}
        </text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">₹{s.value.toFixed(0)}</span>
          </div>
        ))}
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
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
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
            <button className="acc-menu-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }} title="Account options">⋯</button>
            {menuOpen && (
              <div className="acc-dropdown">
                <button className="acc-dropdown-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(account); }}>✎ Edit</button>
                <button className="acc-dropdown-item acc-dropdown-delete" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(account); }}>✕ Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="account-name">{account.name}</p>
      <p className={`account-balance ${balance >= 0 ? "pos" : "neg"}`}>
        {balance >= 0 ? "+" : ""}₹{balance.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────
function EditAccountModal({ account, onSave, onClose }) {
  const [draft, setDraft] = useState({ name: account.name, icon: account.icon, color: account.color });
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!draft.name.trim()) return setError("Account name cannot be empty.");
    onSave({ ...account, ...draft, name: draft.name.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Account</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--surface-2)", border: `2px solid ${draft.color}`, borderRadius: "var(--radius-md)", padding: "16px", display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 16px ${draft.color}33` }}>
            <span style={{ fontSize: 28 }}>{draft.icon || "🏦"}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{draft.name || "Account Name"}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Preview</p>
            </div>
            <span style={{ marginLeft: "auto", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: draft.color }}>₹0</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Account Name</label>
            <input className="input" placeholder="e.g. Bank Account" value={draft.name} onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setError(""); }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Emoji Icon</label>
              <input className="input" placeholder="e.g. 🏦" value={draft.icon} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Color</label>
              <input type="color" className="color-pick" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: 50, height: 42 }} />
            </div>
          </div>
          {error && <p className="cat-error">{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Changes</button>
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
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{account.icon}</span>
            <div>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{account.name}</p>
              {linkedCount > 0 && <p style={{ fontSize: 12, color: "var(--orange)", marginTop: 2 }}>⚠ {linkedCount} transaction{linkedCount !== 1 ? "s" : ""} linked</p>}
            </div>
          </div>
          {linkedCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>This account has no transactions. It will be permanently deleted.</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>Choose what to do with the <strong style={{ color: "var(--text)" }}>{linkedCount} linked transaction{linkedCount !== 1 ? "s" : ""}</strong>:</p>
              {otherAccounts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Reassign transactions to</label>
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
              <button className="btn-primary" disabled={!reassignTo} style={{ opacity: reassignTo ? 1 : 0.45, cursor: reassignTo ? "pointer" : "not-allowed" }} onClick={() => reassignTo && onReassignAndDelete(reassignTo)}>Reassign & Delete</button>
            )}
            <button style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", padding: "11px 20px", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }} onClick={onConfirmDelete}>
              {linkedCount > 0 ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}` : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Manager Modal ───────────────────────────────────────
function CategoryManager({ type, categories, onAdd, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(type === "expense" ? "#f97316" : "#22c55e");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return setError("Please enter a category name.");
    if (categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())) return setError("This category already exists.");
    onAdd({ name: trimmed, color: newColor });
    setNewName("");
    setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{type === "expense" ? "❤️ Expense" : "💚 Income"} Categories</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cat-add-row">
          <input className="input" placeholder="New category name..." value={newName} onChange={e => { setNewName(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleAdd()} style={{ flex: 1 }} />
          <input type="color" className="color-pick" value={newColor} onChange={e => setNewColor(e.target.value)} title="Pick color" />
          <button className="btn-primary" onClick={handleAdd} style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>+ Add</button>
        </div>
        {error && <p className="cat-error">{error}</p>}
        <div className="cat-list">
          {categories.map((c, i) => (
            <div key={i} className="cat-item">
              <span className="cat-dot" style={{ background: c.color }} />
              <span className="cat-name">{c.name}</span>
              {c.name !== "Other" && categories.length > 1 && (
                <button className="cat-del-btn" onClick={() => onDelete(c.name)} title="Delete">✕</button>
              )}
            </div>
          ))}
        </div>
        <p className="cat-hint">💡 "Other" cannot be deleted. Click outside to close.</p>
      </div>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading your data...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ExpenseTracker({ userId }) {
  const today = new Date().toISOString().split("T")[0];

  const [loading, setLoading]   = useState(true);
  const [entries, setEntries]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expCats, setExpCats]   = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [incCats, setIncCats]   = useState(DEFAULT_INCOME_CATEGORIES);

  const [form, setForm] = useState({
    type: "expense", amount: "", category: DEFAULT_EXPENSE_CATEGORIES[0].name,
    note: "", date: today, accountId: "",
  });

  const [filterDate, setFilterDate]     = useState(today);
  const [confirmId, setConfirmId]       = useState(null);
  const [selectedAcc, setSelectedAcc]   = useState(null);
  const [showAddAcc, setShowAddAcc]     = useState(false);
  const [newAcc, setNewAcc]             = useState({ name: "", icon: "🏦", color: "#6366f1" });
  const [editEntry, setEditEntry]       = useState(null);
  const [catModal, setCatModal]         = useState(null);
  const [editingAccount, setEditingAccount]   = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [saving, setSaving]             = useState(false);

  // ─── Load all data from PocketBase on mount ───────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes, expCatsRes, incCatsRes] = await Promise.all([
        pb.collection("entries").getFullList({ filter: `userId = "${userId}"`, sort: "-date" }),
        pb.collection("accounts").getFullList({ filter: `userId = "${userId}"` }),
        pb.collection("expense_categories").getFullList({ filter: `userId = "${userId}"` }),
        pb.collection("income_categories").getFullList({ filter: `userId = "${userId}"` }),
      ]);

      setEntries(entriesRes);

      // Seed default accounts if user has none
      if (accountsRes.length === 0) {
        const created = await Promise.all(
          DEFAULT_ACCOUNTS.map(a => pb.collection("accounts").create({ ...a, userId }))
        );
        setAccounts(created);
        setForm(f => ({ ...f, accountId: created[0]?.id || "" }));
      } else {
        setAccounts(accountsRes);
        setForm(f => ({ ...f, accountId: f.accountId || accountsRes[0]?.id || "" }));
      }

      // Seed default categories if user has none
      if (expCatsRes.length === 0) {
        const created = await Promise.all(
          DEFAULT_EXPENSE_CATEGORIES.map(c => pb.collection("expense_categories").create({ ...c, userId }))
        );
        setExpCats(created);
      } else {
        setExpCats(expCatsRes);
      }

      if (incCatsRes.length === 0) {
        const created = await Promise.all(
          DEFAULT_INCOME_CATEGORIES.map(c => pb.collection("income_categories").create({ ...c, userId }))
        );
        setIncCats(created);
      } else {
        setIncCats(incCatsRes);
      }

    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Category helpers ─────────────────────────────────────────
  const currentCats = form.type === "expense" ? expCats : incCats;

  const getCatColor = (category, type) => {
    const list = type === "expense" ? expCats : incCats;
    return list.find(c => c.name === category)?.color || "#94a3b8";
  };

  const handleAddCat = async (type, cat) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const created = await pb.collection(collection).create({ ...cat, userId });
    if (type === "expense") setExpCats(prev => [...prev, created]);
    else setIncCats(prev => [...prev, created]);
  };

  const handleDeleteCat = async (type, name) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const list = type === "expense" ? expCats : incCats;
    const record = list.find(c => c.name === name);
    if (!record) return;
    await pb.collection(collection).delete(record.id);
    if (type === "expense") setExpCats(prev => prev.filter(c => c.name !== name));
    else setIncCats(prev => prev.filter(c => c.name !== name));
  };

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm(f => ({ ...f, type: t, category: cats[0]?.name || "" }));
  };

  // ─── Balances ─────────────────────────────────────────────────
  const accountBalances = useMemo(() => {
    const map = {};
    accounts.forEach(a => { map[a.id] = 0; });
    entries.forEach(e => {
      if (!map.hasOwnProperty(e.accountId)) return;
      map[e.accountId] += e.type === "income" ? e.amount : -e.amount;
    });
    return map;
  }, [entries, accounts]);

  const totalIncome  = entries.filter(e => e.type === "income" ).reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;

  // ─── Pie data ─────────────────────────────────────────────────
  const expensePieData = useMemo(() => {
    const map = {};
    entries.filter(e => e.type === "expense" && (!selectedAcc || e.accountId === selectedAcc))
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return expCats.map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color })).filter(d => d.value > 0);
  }, [entries, selectedAcc, expCats]);

  const incomePieData = useMemo(() => {
    const map = {};
    entries.filter(e => e.type === "income" && (!selectedAcc || e.accountId === selectedAcc))
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return incCats.map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color })).filter(d => d.value > 0);
  }, [entries, selectedAcc, incCats]);

  // ─── Ledger ───────────────────────────────────────────────────
  const dailyEntries = useMemo(() => {
    return entries.filter(e =>
      e.date === filterDate && (!selectedAcc || e.accountId === selectedAcc)
    );
  }, [entries, filterDate, selectedAcc]);

  // ─── CRUD: Entries ────────────────────────────────────────────
  const addEntry = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    setSaving(true);
    try {
      if (editEntry) {
        const updated = await pb.collection("entries").update(editEntry, {
          type: form.type, amount: +form.amount, category: form.category,
          note: form.note, date: form.date, accountId: form.accountId, userId,
        });
        setEntries(prev => prev.map(e => e.id === editEntry ? updated : e));
        setEditEntry(null);
      } else {
        const created = await pb.collection("entries").create({
          type: form.type, amount: +form.amount, category: form.category,
          note: form.note, date: form.date, accountId: form.accountId, userId,
        });
        setEntries(prev => [created, ...prev]);
      }
      setForm(f => ({ ...f, amount: "", note: "" }));
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditEntry(e.id);
    setForm({ type: e.type, amount: String(e.amount), category: e.category, note: e.note, date: e.date, accountId: e.accountId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditEntry(null);
    setForm({ type: "expense", amount: "", category: expCats[0]?.name || "", note: "", date: today, accountId: accounts[0]?.id || "" });
  };

  const handleDelete = async (id) => {
    if (confirmId === id) {
      await pb.collection("entries").delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  // ─── CRUD: Accounts ───────────────────────────────────────────
  const addAccount = async () => {
    if (!newAcc.name.trim()) return;
    const created = await pb.collection("accounts").create({ ...newAcc, userId });
    setAccounts(prev => [...prev, created]);
    setNewAcc({ name: "", icon: "💳", color: "#6366f1" });
    setShowAddAcc(false);
  };

  const handleSaveAccount = async (updated) => {
    const saved = await pb.collection("accounts").update(updated.id, {
      name: updated.name, icon: updated.icon, color: updated.color,
    });
    setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a));
    setEditingAccount(null);
  };

  const linkedEntryCount = (accId) => entries.filter(e => e.accountId === accId).length;

  const handleConfirmDeleteAccount = async (accId) => {
    // Delete all linked entries first
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").delete(e.id)));
    await pb.collection("accounts").delete(accId);
    setEntries(prev => prev.filter(e => e.accountId !== accId));
    setAccounts(prev => prev.filter(a => a.id !== accId));
    if (selectedAcc === accId) setSelectedAcc(null);
    setDeletingAccount(null);
  };

  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").update(e.id, { accountId: reassignToId })));
    await pb.collection("accounts").delete(accId);
    setEntries(prev => prev.map(e => e.accountId === accId ? { ...e, accountId: reassignToId } : e));
    setAccounts(prev => prev.filter(a => a.id !== accId));
    if (selectedAcc === accId) setSelectedAcc(null);
    setDeletingAccount(null);
  };

  if (loading) return <LoadingScreen />;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="page">

      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={(cat) => handleAddCat(catModal, cat)}
          onDelete={(name) => handleDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
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
          onReassignAndDelete={(id) => handleReassignAndDeleteAccount(deletingAccount.id, id)}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Tracker</h1>
          <p className="page-sub">Monitor income, expenses & accounts</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card income-card">
          <div className="stat-icon">↑</div>
          <div><p className="stat-label">Total Income</p><p className="stat-value">₹{totalIncome.toLocaleString()}</p></div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">↓</div>
          <div><p className="stat-label">Total Expenses</p><p className="stat-value">₹{totalExpense.toLocaleString()}</p></div>
        </div>
        <div className={`stat-card ${balance >= 0 ? "balance-pos" : "balance-neg"}`}>
          <div className="stat-icon">◈</div>
          <div><p className="stat-label">Net Balance</p><p className="stat-value">₹{balance.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Accounts */}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Accounts</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedAcc && <button className="filter-chip active" onClick={() => setSelectedAcc(null)}>Clear Filter</button>}
            <button className="btn-add-acc" onClick={() => setShowAddAcc(v => !v)}>+ Add Account</button>
          </div>
        </div>
        <div className="accounts-grid">
          {accounts.map(acc => (
            <AccountCard
              key={acc.id} account={acc} balance={accountBalances[acc.id] || 0}
              isSelected={selectedAcc === acc.id}
              onClick={() => setSelectedAcc(selectedAcc === acc.id ? null : acc.id)}
              onEdit={(a) => setEditingAccount(a)}
              onDelete={(a) => setDeletingAccount(a)}
            />
          ))}
        </div>
        {showAddAcc && (
          <div className="add-acc-form">
            <input className="input" placeholder="Account name" value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} />
            <input className="input" placeholder="Emoji icon" value={newAcc.icon} onChange={e => setNewAcc({ ...newAcc, icon: e.target.value })} style={{ maxWidth: 90 }} />
            <input type="color" className="color-pick" value={newAcc.color} onChange={e => setNewAcc({ ...newAcc, color: e.target.value })} />
            <button className="btn-primary" onClick={addAccount}>Save</button>
            <button className="btn-cancel" onClick={() => setShowAddAcc(false)}>Cancel</button>
          </div>
        )}
      </div>

      {/* Add / Edit + Charts */}
      <div className="two-col">
        <div className="card">
          <h2 className="card-title">{editEntry ? "✏️ Edit Transaction" : "Add Transaction"}</h2>
          <div className="form-group">
            <div className="type-toggle">
              {["expense", "income"].map(t => (
                <button key={t} onClick={() => handleTypeChange(t)} className={`toggle-btn ${form.type === t ? "active-" + t : ""}`}>
                  {t === "expense" ? "− Expense" : "+ Income"}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input" />
            <div className="cat-select-row">
              <select key={form.type} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input" style={{ flex: 1, minWidth: 0 }}>
                {currentCats.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
              <button className="btn-manage-cats" onClick={() => setCatModal(form.type)} title={`Manage ${form.type} categories`}>⚙ Manage</button>
            </div>
            <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="input">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
            <input type="text" placeholder="Note (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="input" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addEntry} className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? "Saving..." : editEntry ? "Save Changes" : "Add Transaction"}
              </button>
              {editEntry && <button onClick={cancelEdit} className="btn-cancel">Cancel</button>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card">
            <div className="card-header-row" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ color: "var(--green)", marginBottom: 0 }}>💚 Income Breakdown</h2>
              <button className="btn-manage-cats" onClick={() => setCatModal("income")}>⚙ Manage</button>
            </div>
            <PieChart data={incomePieData} label="INCOME" />
          </div>
          <div className="card">
            <div className="card-header-row" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ color: "var(--red)", marginBottom: 0 }}>❤️ Expense Breakdown</h2>
              <button className="btn-manage-cats" onClick={() => setCatModal("expense")}>⚙ Manage</button>
            </div>
            <PieChart data={expensePieData} label="EXPENSES" />
          </div>
        </div>
      </div>

      {/* Daily Ledger */}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">
            Daily Ledger
            {selectedAcc && <span className="breakdown-acc-tag">{accounts.find(a => a.id === selectedAcc)?.name}</span>}
          </h2>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input compact" />
        </div>
        {dailyEntries.length === 0 ? (
          <p className="empty-msg">No transactions for this date{selectedAcc ? " in this account" : ""}.</p>
        ) : (
          <div className="entry-list">
            {dailyEntries.map(e => {
              const acc = accounts.find(a => a.id === e.accountId);
              return (
                <div key={e.id} className={`entry-row ${e.type}`}>
                  <div className="entry-left">
                    <span className="entry-cat-dot" style={{ background: getCatColor(e.category, e.type) }} />
                    <div>
                      <p className="entry-note">{e.note || e.category}</p>
                      <p className="entry-meta">
                        {e.category} · {formatDate(e.date)}
                        {acc && <span className="entry-acc-tag" style={{ background: acc.color + "22", color: acc.color }}>{acc.icon} {acc.name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="entry-right">
                    <span className={`entry-amount ${e.type}`}>{e.type === "income" ? "+" : "−"}₹{e.amount}</span>
                    <button onClick={() => startEdit(e)} className="edit-btn" title="Edit">✎</button>
                    <button onClick={() => handleDelete(e.id)} className={`del-btn ${confirmId === e.id ? "del-btn-confirm" : ""}`} title={confirmId === e.id ? "Click again to confirm" : "Delete"}>
                      {confirmId === e.id ? "?" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
