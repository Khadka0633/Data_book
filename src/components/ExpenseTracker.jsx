import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import pb from "../pb";
import Transfermodal from "./Transfermodal";

// ── Lazy CDN loader ───────────────────────────────────────────────
function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  return null;
}

// ─── Category History Modal ───────────────────────────────────────
function CategoryHistoryModal({ category, type, entries, accounts, getCatColor, onClose }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const catEntries = entries
    .filter(e => e.category === category && e.type === type && !e.isTransfer)
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = catEntries.reduce((s, e) => s + e.amount, 0);
  const avg   = catEntries.length ? total / catEntries.length : 0;
  const color = getCatColor(category, type);

  const monthData = useMemo(() => {
    const now    = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months.push({ key, lbl, total: 0, count: 0 });
    }
    catEntries.forEach(e => {
      const slot = months.find(m => m.key === e.date.slice(0, 7));
      if (slot) { slot.total += e.amount; slot.count += 1; }
    });
    return months;
  }, [catEntries]);

  const maxVal    = Math.max(...monthData.map(m => m.total), 1);
  const hasData   = monthData.some(m => m.total > 0);
  const peakMonth = monthData.reduce((a, b) => b.total > a.total ? b : a, monthData[0]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const safeColor = color && color.length === 7 ? color : "#6366f1";
    const r = parseInt(safeColor.slice(1, 3), 16);
    const g = parseInt(safeColor.slice(3, 5), 16);
    const b = parseInt(safeColor.slice(5, 7), 16);

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: monthData.map(m => m.lbl),
          datasets: [{
            data: monthData.map(m => m.total),
            borderColor: safeColor,
            backgroundColor: `rgba(${r},${g},${b},0.08)`,
            pointBackgroundColor: monthData.map(m =>
              m.total > 0 ? safeColor : `rgba(${r},${g},${b},0.2)`
            ),
            pointBorderColor: safeColor,
            pointRadius: monthData.map(m => m.total > 0 ? 5 : 3),
            pointHoverRadius: 7,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const slot = monthData[ctx.dataIndex];
                  if (slot.total === 0) return "No transactions";
                  return [`₹${slot.total.toLocaleString()}`, `${slot.count} transaction${slot.count !== 1 ? "s" : ""}`];
                },
              },
              backgroundColor: "#1e1e2e", titleColor: "#fff", bodyColor: "#ccc", padding: 10, cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, color: "#888", maxRotation: 45, autoSkip: false },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false },
              ticks: {
                font: { size: 11 }, color: "#888",
                callback: v => v === 0 ? "0" : `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
                maxTicksLimit: 5,
              },
            },
          },
          animation: { duration: 400 },
        },
      });
    };

    if (window.Chart) initChart();
    else {
      const interval = setInterval(() => {
        if (window.Chart) { clearInterval(interval); initChart(); }
      }, 100);
      return () => clearInterval(interval);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [monthData, color]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: 520, width: "100%" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
            <h3 className="modal-title" style={{ marginBottom: 0 }}>{category}</h3>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: type === "expense" ? "var(--red)" : "var(--green)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            }}>{type}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {catEntries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0" }}>No transactions found for this category.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "All-time total", value: `₹${total.toLocaleString()}` },
                { label: "Transactions",   value: catEntries.length },
                { label: "Avg per entry",  value: `₹${Math.round(avg).toLocaleString()}` },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--surface-2)", borderRadius: "var(--radius-md)",
                  padding: "10px 12px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {peakMonth?.total > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: color + "14", border: `1px solid ${color}33`,
                borderRadius: "var(--radius-md)", padding: "9px 14px", marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Peak month</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {peakMonth.lbl} — ₹{peakMonth.total.toLocaleString()}
                </span>
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600 }}>Last 12 months</p>
            <div style={{ position: "relative", width: "100%", height: 260, marginBottom: 24 }}>
              <canvas ref={canvasRef} role="img" aria-label={`Monthly trend for ${category}`} />
              {!hasData && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No data in the last 12 months</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Month-by-month</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {[...monthData].reverse().filter(m => m.total > 0).map(m => {
                const pct = Math.round((m.total / maxVal) * 100);
                return (
                  <div key={m.key} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 72, flexShrink: 0 }}>{m.lbl}</span>
                    <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, opacity: 0.8 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text)", width: 90, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>
                      ₹{m.total.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right", flexShrink: 0 }}>
                      ×{m.count}
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Recent transactions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {catEntries.slice(0, 20).map(e => {
                const acc = accounts.find(a => a.id === e.accountId);
                return (
                  <div key={e.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <div>
                      <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{e.note || e.category}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {acc && (
                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: acc.color + "22", color: acc.color }}>
                            {acc.icon} {acc.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: type === "expense" ? "var(--red)" : "var(--green)" }}>
                      {type === "income" ? "+" : "−"}₹{e.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {catEntries.length > 20 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>
                  + {catEntries.length - 20} more transactions
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <ChartJsLoader />
    </div>
  );
}

// ─── Auto-suggest Hook ────────────────────────────────────────────
function useNoteSuggestions(entries, form) {
  const [suggestions, setSuggestions]       = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const query = form.note.trim().toLowerCase();
    if (!query || query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const seen = new Set();
    const matches = entries
      .filter(e =>
        e.type === form.type &&
        (!form.category || e.category === form.category) &&
        e.note && e.note.toLowerCase().includes(query) &&
        !seen.has(e.note) && seen.add(e.note)
      )
      .slice(0, 5)
      .map(e => e.note);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.note, form.type, form.category, entries]);

  return { suggestions, showSuggestions, setShowSuggestions };
}

// ─── Category Manager Modal ───────────────────────────────────────
function CategoryManager({ type, categories, onAdd, onDelete, onClose }) {
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState(type === "expense" ? "#f97316" : "#22c55e");
  const [error,    setError]    = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return setError("Please enter a category name.");
    if (categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())) return setError("This category already exists.");
    onAdd({ name: trimmed, color: newColor });
    setNewName(""); setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{type === "expense" ? "❤️ Expense" : "💚 Income"} Categories</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cat-add-row">
          <input className="input" placeholder="New category name..." value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} style={{ flex: 1 }} />
          <input type="color" className="color-pick" value={newColor} onChange={e => setNewColor(e.target.value)} />
          <button className="btn-primary" onClick={handleAdd} style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>+ Add</button>
        </div>
        {error && <p className="cat-error">{error}</p>}
        <div className="cat-list">
          {categories.map((c, i) => (
            <div key={i} className="cat-item">
              <span className="cat-dot" style={{ background: c.color }} />
              <span className="cat-name">{c.name}</span>
              {categories.length > 1 && <button className="cat-del-btn" onClick={() => onDelete(c.name)}>✕</button>}
            </div>
          ))}
        </div>
        <p className="cat-hint">💡 Click outside to close.</p>
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
// Props (shared state lifted to App):
//   accounts       - array of account objects
//   entries        - array of all entry objects
//   onEntriesChange - (updatedEntries) => void
//   userId
export default function ExpenseTracker({ userId, accounts, entries, onEntriesChange }) {
  const today = new Date().toISOString().split("T")[0];

  const [loading,  setLoading]  = useState(true);
  const [expCats,  setExpCats]  = useState([]);
  const [incCats,  setIncCats]  = useState([]);

  const [form, setForm] = useState({
    type: "expense", amount: "", category: "", note: "", date: today,
    accountId: accounts?.[0]?.id || "",
  });

  const [filterDate,  setFilterDate]  = useState(today);
  const [confirmId,   setConfirmId]   = useState(null);
  const [editEntry,   setEditEntry]   = useState(null);
  const [catModal,    setCatModal]    = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [catHistory,  setCatHistory]  = useState(null);

  const hasLoaded = useRef(false);
  const { suggestions, showSuggestions, setShowSuggestions } = useNoteSuggestions(entries, form);

  // ─── Load categories ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    setLoading(true);
    try {
      const [expCatsRes, incCatsRes] = await Promise.all([
        pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }),
        pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }),
      ]);
      setExpCats(expCatsRes);
      setIncCats(incCatsRes);
      setForm(f => ({
        ...f,
        accountId: f.accountId || accounts?.[0]?.id || "",
        category: f.category || expCatsRes[0]?.name || "",
      }));
    } catch (err) {
      console.error("Failed to load categories:", err);
      hasLoaded.current = false;
    } finally {
      setLoading(false);
    }
  }, [userId, accounts]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep accountId in sync if accounts load after
  useEffect(() => {
    if (!form.accountId && accounts?.length) {
      setForm(f => ({ ...f, accountId: accounts[0].id }));
    }
  }, [accounts]);

  // ─── Helpers ──────────────────────────────────────────────────
  const currentCats = form.type === "expense" ? expCats : incCats;

  const getCatColor = (category, type) =>
    (type === "expense" ? expCats : incCats).find(c => c.name === category)?.color || "#94a3b8";

  const handleAddCat = async (type, cat) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const created = await pb.collection(collection).create({ ...cat, userId });
    if (type === "expense") setExpCats(prev => [...prev, created]);
    else setIncCats(prev => [...prev, created]);
  };

  const handleDeleteCat = async (type, name) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const list   = type === "expense" ? expCats : incCats;
    const record = list.find(c => c.name === name);
    if (!record) return;
    await pb.collection(collection).delete(record.id);
    if (type === "expense") setExpCats(prev => prev.filter(c => c.name !== name));
    else setIncCats(prev => prev.filter(c => c.name !== name));
  };

  const handleTypeChange = t => {
    const cats = t === "expense" ? expCats : incCats;
    setForm(f => ({ ...f, type: t, category: cats[0]?.name || "" }));
  };

  // ─── Derived stats ────────────────────────────────────────────
  const totalIncome  = entries.filter(e => e.type === "income"  && !e.isTransfer).reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense" && !e.isTransfer).reduce((s, e) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;

  // ─── Ledger ───────────────────────────────────────────────────
  const ledgerMonth = filterDate.slice(0, 7);

  const monthlyGrouped = useMemo(() => {
    const filtered = entries.filter(e => e.date.slice(0, 7) === ledgerMonth);
    const groups = {};
    filtered.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({ date, entries: groups[date] }));
  }, [entries, ledgerMonth]);

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
        onEntriesChange(entries.map(e => e.id === editEntry ? updated : e));
        setEditEntry(null);
      } else {
        const created = await pb.collection("entries").create({
          type: form.type, amount: +form.amount, category: form.category,
          note: form.note, date: form.date, accountId: form.accountId, userId, isTransfer: false,
        });
        onEntriesChange([created, ...entries]);
      }
      setForm(f => ({ ...f, amount: "", note: "" }));
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = e => {
    setEditEntry(e.id);
    setForm({ type: e.type, amount: String(e.amount), category: e.category, note: e.note, date: e.date, accountId: e.accountId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditEntry(null);
    setForm({ type: "expense", amount: "", category: expCats[0]?.name || "", note: "", date: today, accountId: accounts?.[0]?.id || "" });
  };

  const handleDelete = async id => {
    if (confirmId === id) {
      const entry = entries.find(e => e.id === id);
      if (entry?.isTransfer) {
        const paired = entries.find(e => e.id !== id && e.isTransfer && e.amount === entry.amount && e.date === entry.date && e.type !== entry.type);
        await pb.collection("entries").delete(id);
        if (paired) await pb.collection("entries").delete(paired.id);
        onEntriesChange(entries.filter(e => e.id !== id && e.id !== paired?.id));
      } else {
        await pb.collection("entries").delete(id);
        onEntriesChange(entries.filter(e => e.id !== id));
      }
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  if (loading) return <LoadingScreen />;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="page">

      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={cat => handleAddCat(catModal, cat)}
          onDelete={name => handleDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
        />
      )}
      {showTransfer && (
        <Transfermodal
          accounts={accounts}
          userId={userId}
          today={today}
          onTransferDone={newEntries => onEntriesChange([...newEntries, ...entries])}
          onClose={() => setShowTransfer(false)}
        />
      )}
      {catHistory && (
        <CategoryHistoryModal
          category={catHistory.category}
          type={catHistory.type}
          entries={entries}
          accounts={accounts}
          getCatColor={getCatColor}
          onClose={() => setCatHistory(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Tracker</h1>
          <p className="page-sub">Monitor income, expenses &amp; accounts</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-transfer" onClick={() => setShowTransfer(true)}>↔ Transfer</button>
          <div className="date-badge">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
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

      {/* Add / Edit Transaction */}
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
          <input type="number" placeholder="Amount" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })} className="input" />
          <div className="cat-select-row">
            <select key={form.type} value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="input" style={{ flex: 1, minWidth: 0 }}>
              {currentCats.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button className="btn-manage-cats" onClick={() => setCatModal(form.type)}>⚙ Manage</button>
          </div>
          <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="input">
            {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>

          {/* Note with auto-suggest */}
          <div style={{ position: "relative" }}>
            <input
              type="text" placeholder="Note (optional)" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="input"
            />
            {showSuggestions && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginTop: 4,
              }}>
                {suggestions.map((s, i) => (
                  <button key={i}
                    onMouseDown={() => { setForm(f => ({ ...f, note: s })); setShowSuggestions(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "9px 14px", fontSize: 13, color: "var(--text)",
                      background: "transparent", border: "none", cursor: "pointer",
                      borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>

          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addEntry} className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? "Saving..." : editEntry ? "Save Changes" : "Add Transaction"}
            </button>
            {editEntry && <button onClick={cancelEdit} className="btn-cancel">Cancel</button>}
          </div>
        </div>
      </div>

      {/* Monthly Ledger */}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Monthly Ledger</h2>
          <input type="month" value={ledgerMonth}
            onChange={e => setFilterDate(e.target.value + "-01")}
            className="input compact" style={{ width: "auto" }} />
        </div>

        {monthlyGrouped.length === 0 ? (
          <p className="empty-msg">No transactions for this month.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {monthlyGrouped.map(({ date, entries: dayEntries }) => {
              const d          = new Date(date + "T00:00:00");
              const dayName    = d.toLocaleDateString("en-US", { weekday: "long" });
              const dayNum     = d.getDate();
              const monthName  = d.toLocaleDateString("en-US", { month: "short" });
              const dayIncome  = dayEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
              const dayExpense = dayEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
              return (
                <div key={date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px 8px", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{dayNum}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{dayName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{monthName}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                      {dayIncome  > 0 && <span style={{ color: "var(--green)" }}>+₹{dayIncome.toLocaleString()}</span>}
                      {dayExpense > 0 && <span style={{ color: "var(--red)" }}>−₹{dayExpense.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="entry-list" style={{ paddingBottom: 8 }}>
                    {dayEntries.map(e => {
                      const acc = (accounts || []).find(a => a.id === e.accountId);
                      return (
                        <div key={e.id} className={`entry-row ${e.type} ${e.isTransfer ? "transfer-row" : ""}`}>
                          <div className="entry-left">
                            {e.isTransfer
                              ? <span className="transfer-badge">↔</span>
                              : <span className="entry-cat-dot" style={{ background: getCatColor(e.category, e.type) }} />
                            }
                            <div>
                              <p className="entry-note">
                                {e.note || e.category}
                                {e.isTransfer && <span className="transfer-tag">Transfer</span>}
                              </p>
                              <p className="entry-meta">
                                <span
                                  onClick={() => !e.isTransfer && setCatHistory({ category: e.category, type: e.type })}
                                  style={{ cursor: e.isTransfer ? "default" : "pointer", textDecoration: e.isTransfer ? "none" : "underline dotted" }}
                                >
                                  {e.category}
                                </span>
                                {acc && (
                                  <span className="entry-acc-tag" style={{ background: acc.color + "22", color: acc.color }}>
                                    {acc.icon} {acc.name}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="entry-right">
                            <span className={`entry-amount ${e.type}`}>{e.type === "income" ? "+" : "−"}₹{e.amount}</span>
                            {!e.isTransfer && <button onClick={() => startEdit(e)} className="edit-btn" title="Edit">✎</button>}
                            <button
                              onClick={() => handleDelete(e.id)}
                              className={`del-btn ${confirmId === e.id ? "del-btn-confirm" : ""}`}
                              title={confirmId === e.id ? (e.isTransfer ? "Click again — will delete both legs" : "Click again to confirm") : "Delete"}
                            >
                              {confirmId === e.id ? "?" : "✕"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
