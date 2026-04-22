import { useState, useMemo, useEffect } from "react";

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

// ─── Default Accounts ─────────────────────────────────────────────
const DEFAULT_ACCOUNTS = [
  { id: "cash",   name: "Cash",         icon: "💵", color: "#22c55e" },
  { id: "bank",   name: "Bank Account", icon: "🏦", color: "#3b82f6" },
  { id: "credit", name: "Credit Card",  icon: "💳", color: "#ef4444" },
  { id: "esewa",  name: "eSewa",        icon: "📱", color: "#6366f1" },
  { id: "khalti", name: "Khalti",       icon: "💜", color: "#a855f7" },
];

const DEFAULT_ENTRIES = (today) => [
  { id: 1, type: "income",  amount: 3000, category: "Salary",    note: "Monthly Salary", date: today, accountId: "bank" },
  { id: 2, type: "expense", amount: 120,  category: "Food",      note: "Groceries",      date: today, accountId: "cash" },
  { id: 3, type: "expense", amount: 45,   category: "Transport", note: "Fuel",           date: today, accountId: "cash" },
];

// ─── Helpers ──────────────────────────────────────────────────────
function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (err) { console.warn("Could not save to localStorage:", err); }
}

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
            <title>{s.label}: ${s.value.toFixed(2)} ({(s.pct * 100).toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="var(--surface)" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
          ${total.toFixed(0)}
        </text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">${s.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────
function AccountCard({ account, balance, onClick, isSelected }) {
  return (
    <div
      className={`account-card ${isSelected ? "account-card-active" : ""}`}
      style={{ "--acc-color": account.color }}
      onClick={onClick}
    >
      <div className="account-card-top">
        <span className="account-icon">{account.icon}</span>
        {isSelected && <span className="account-selected-pip" />}
      </div>
      <p className="account-name">{account.name}</p>
      <p className={`account-balance ${balance >= 0 ? "pos" : "neg"}`}>
        {balance >= 0 ? "+" : ""}${balance.toLocaleString()}
      </p>
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
    if (categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase()))
      return setError("This category already exists.");
    onAdd({ name: trimmed, color: newColor });
    setNewName("");
    setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {type === "expense" ? "❤️ Expense" : "💚 Income"} Categories
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Add new */}
        <div className="cat-add-row">
          <input
            className="input" placeholder="New category name..."
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ flex: 1 }}
          />
          <input
            type="color" className="color-pick"
            value={newColor} onChange={e => setNewColor(e.target.value)}
            title="Pick color"
          />
          <button className="btn-primary" onClick={handleAdd}
            style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
            + Add
          </button>
        </div>
        {error && <p className="cat-error">{error}</p>}

        {/* List */}
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

// ─── Main Component ───────────────────────────────────────────────
export default function ExpenseTracker({ userEmail }) {
  const today = new Date().toISOString().split("T")[0];
  const ENTRIES_KEY  = `nexus-entries-${userEmail}`;
  const ACCOUNTS_KEY = `nexus-accounts-${userEmail}`;
  const EXP_CATS_KEY = `nexus-exp-cats-${userEmail}`;
  const INC_CATS_KEY = `nexus-inc-cats-${userEmail}`;

  const [entries, setEntries] = useState(() => {
    try { const s = localStorage.getItem(ENTRIES_KEY);  return s ? JSON.parse(s) : DEFAULT_ENTRIES(today); }
    catch { return DEFAULT_ENTRIES(today); }
  });

  const [accounts, setAccounts] = useState(() => {
    try { const s = localStorage.getItem(ACCOUNTS_KEY); return s ? JSON.parse(s) : DEFAULT_ACCOUNTS; }
    catch { return DEFAULT_ACCOUNTS; }
  });

  const [expCats, setExpCats] = useState(() => {
    try { const s = localStorage.getItem(EXP_CATS_KEY); return s ? JSON.parse(s) : DEFAULT_EXPENSE_CATEGORIES; }
    catch { return DEFAULT_EXPENSE_CATEGORIES; }
  });

  const [incCats, setIncCats] = useState(() => {
    try { const s = localStorage.getItem(INC_CATS_KEY); return s ? JSON.parse(s) : DEFAULT_INCOME_CATEGORIES; }
    catch { return DEFAULT_INCOME_CATEGORIES; }
  });

  const [form, setForm] = useState({
    type: "expense", amount: "",
    category: DEFAULT_EXPENSE_CATEGORIES[0].name,
    note: "", date: today,
    accountId: DEFAULT_ACCOUNTS[0].id,
  });

  const [filterDate, setFilterDate]   = useState(today);
  const [confirmId, setConfirmId]     = useState(null);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [showAddAcc, setShowAddAcc]   = useState(false);
  const [newAcc, setNewAcc]           = useState({ name: "", icon: "💳", color: "#6366f1" });
  const [editEntry, setEditEntry]     = useState(null);
  const [catModal, setCatModal]       = useState(null); // "expense" | "income" | null

  useEffect(() => { saveToStorage(ENTRIES_KEY,  entries);  }, [entries,  ENTRIES_KEY]);
  useEffect(() => { saveToStorage(ACCOUNTS_KEY, accounts); }, [accounts, ACCOUNTS_KEY]);
  useEffect(() => { saveToStorage(EXP_CATS_KEY, expCats);  }, [expCats,  EXP_CATS_KEY]);
  useEffect(() => { saveToStorage(INC_CATS_KEY, incCats);  }, [incCats,  INC_CATS_KEY]);

  // ─── Category helpers ─────────────────────────────────────────────
  const currentCats = form.type === "expense" ? expCats : incCats;

  const getCatColor = (category, type) => {
    const list = type === "expense" ? expCats : incCats;
    return list.find(c => c.name === category)?.color || "#94a3b8";
  };

  const handleAddCat = (type, cat) => {
    if (type === "expense") setExpCats(prev => [...prev, cat]);
    else setIncCats(prev => [...prev, cat]);
  };

  const handleDeleteCat = (type, name) => {
    if (type === "expense") setExpCats(prev => prev.filter(c => c.name !== name));
    else setIncCats(prev => prev.filter(c => c.name !== name));
  };

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm(f => ({ ...f, type: t, category: cats[0].name }));
  };

  // ─── Balances ─────────────────────────────────────────────────────
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

  // ─── Pie data ─────────────────────────────────────────────────────
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

  // ─── Ledger ───────────────────────────────────────────────────────
  const dailyEntries = useMemo(() => {
    return entries.filter(e =>
      e.date === filterDate && (!selectedAcc || e.accountId === selectedAcc)
    );
  }, [entries, filterDate, selectedAcc]);

  // ─── CRUD ─────────────────────────────────────────────────────────
  const addEntry = () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    if (editEntry) {
      setEntries(entries.map(e => e.id === editEntry ? { ...form, id: editEntry, amount: +form.amount } : e));
      setEditEntry(null);
    } else {
      setEntries([...entries, { ...form, id: Date.now(), amount: +form.amount }]);
    }
    setForm(f => ({ ...f, amount: "", note: "" }));
  };

  const startEdit = (e) => {
    setEditEntry(e.id);
    setForm({ type: e.type, amount: String(e.amount), category: e.category, note: e.note, date: e.date, accountId: e.accountId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditEntry(null);
    setForm({ type: "expense", amount: "", category: expCats[0].name, note: "", date: today, accountId: accounts[0]?.id });
  };

  const handleDelete = (id) => {
    if (confirmId === id) { setEntries(entries.filter(e => e.id !== id)); setConfirmId(null); }
    else { setConfirmId(id); setTimeout(() => setConfirmId(null), 3000); }
  };

  const addAccount = () => {
    if (!newAcc.name.trim()) return;
    setAccounts([...accounts, { id: `acc-${Date.now()}`, ...newAcc }]);
    setNewAcc({ name: "", icon: "💳", color: "#6366f1" });
    setShowAddAcc(false);
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="page">

      {/* ✅ Category Manager Modal */}
      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={(cat) => handleAddCat(catModal, cat)}
          onDelete={(name) => handleDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
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
          <div><p className="stat-label">Total Income</p><p className="stat-value">${totalIncome.toLocaleString()}</p></div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">↓</div>
          <div><p className="stat-label">Total Expenses</p><p className="stat-value">${totalExpense.toLocaleString()}</p></div>
        </div>
        <div className={`stat-card ${balance >= 0 ? "balance-pos" : "balance-neg"}`}>
          <div className="stat-icon">◈</div>
          <div><p className="stat-label">Net Balance</p><p className="stat-value">${balance.toLocaleString()}</p></div>
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
            <AccountCard key={acc.id} account={acc} balance={accountBalances[acc.id] || 0}
              isSelected={selectedAcc === acc.id}
              onClick={() => setSelectedAcc(selectedAcc === acc.id ? null : acc.id)} />
          ))}
        </div>
        {showAddAcc && (
          <div className="add-acc-form">
            <input className="input" placeholder="Account name" value={newAcc.name}
              onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} />
            <input className="input" placeholder="Emoji icon" value={newAcc.icon}
              onChange={e => setNewAcc({ ...newAcc, icon: e.target.value })} style={{ maxWidth: 90 }} />
            <input type="color" className="color-pick" value={newAcc.color}
              onChange={e => setNewAcc({ ...newAcc, color: e.target.value })} />
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
                <button key={t} onClick={() => handleTypeChange(t)}
                  className={`toggle-btn ${form.type === t ? "active-" + t : ""}`}>
                  {t === "expense" ? "− Expense" : "+ Income"}
                </button>
              ))}
            </div>

            <input type="number" placeholder="Amount" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} className="input" />

            {/* ✅ Category dropdown + Manage button */}
            <div className="cat-select-row">
              <select
                key={form.type}
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="input"
                style={{ flex: 1, minWidth: 0 }}
              >
                {currentCats.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                className="btn-manage-cats"
                onClick={() => setCatModal(form.type)}
                title={`Manage ${form.type} categories`}
              >
                ⚙ Manage
              </button>
            </div>

            <select value={form.accountId}
              onChange={e => setForm({ ...form, accountId: e.target.value })} className="input">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>

            <input type="text" placeholder="Note (optional)" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })} className="input" />

            <input type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} className="input" />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addEntry} className="btn-primary" style={{ flex: 1 }}>
                {editEntry ? "Save Changes" : "Add Transaction"}
              </button>
              {editEntry && <button onClick={cancelEdit} className="btn-cancel">Cancel</button>}
            </div>
          </div>
        </div>

        {/* Both charts */}
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
          <input type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)} className="input compact" />
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
                        {acc && (
                          <span className="entry-acc-tag" style={{ background: acc.color + "22", color: acc.color }}>
                            {acc.icon} {acc.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="entry-right">
                    <span className={`entry-amount ${e.type}`}>
                      {e.type === "income" ? "+" : "−"}${e.amount}
                    </span>
                    <button onClick={() => startEdit(e)} className="edit-btn" title="Edit">✎</button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className={`del-btn ${confirmId === e.id ? "del-btn-confirm" : ""}`}
                      title={confirmId === e.id ? "Click again to confirm" : "Delete"}
                    >
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
