import { useState, useEffect, useMemo } from "react";
import pb from "../pb";

// ── Budget Goals Tab ───────────────────────────────────────────────
// Props: userId, entries, expCats (expense categories array)
export default function BudgetGoals({ userId, entries, expCats = [] }) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  // ── State ──────────────────────────────────────────────────────
  const [budgets,       setBudgets]       = useState([]);   // { id, category, limit, userId }
  const [savingsGoals,  setSavingsGoals]  = useState([]);   // { id, name, target, current, accountId, userId }
  const [accounts,      setAccounts]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  // Budget form
  const [bForm, setBForm] = useState({ category: "", limit: "" });
  const [bError, setBError] = useState("");
  const [bSaving, setBSaving] = useState(false);

  // Savings goal form
  const [sForm, setSForm] = useState({ name: "", target: "", current: "", accountId: "" });
  const [sError, setSError] = useState("");
  const [sSaving, setSSaving] = useState(false);

  // Edit savings goal
  const [editGoal, setEditGoal] = useState(null); // { id, current }

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      pb.collection("budgets").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
      pb.collection("savings_goals").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
      pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
    ]).then(([b, s, a]) => {
      setBudgets(b);
      setSavingsGoals(s);
      setAccounts(a);
      if (a.length) setSForm(f => ({ ...f, accountId: a[0].id }));
    }).finally(() => setLoading(false));
  }, [userId]);

  // ── Month spending per category ────────────────────────────────
  const monthSpend = useMemo(() => {
    const map = {};
    entries
      .filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === thisMonth)
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [entries, thisMonth]);

  // ── Budget CRUD ────────────────────────────────────────────────
  const addBudget = async () => {
    if (!bForm.category) return setBError("Pick a category.");
    if (!bForm.limit || +bForm.limit <= 0) return setBError("Enter a valid limit.");
    if (budgets.find(b => b.category === bForm.category)) return setBError("Budget already exists for this category.");
    setBSaving(true);
    try {
      const created = await pb.collection("budgets").create({
        userId, category: bForm.category, limit: +bForm.limit,
      });
      setBudgets(prev => [...prev, created]);
      setBForm({ category: "", limit: "" });
      setBError("");
    } catch (e) { setBError("Failed to save."); }
    finally { setBSaving(false); }
  };

  const deleteBudget = async id => {
    await pb.collection("budgets").delete(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  // ── Savings CRUD ───────────────────────────────────────────────
  const addSavingsGoal = async () => {
    if (!sForm.name.trim()) return setSError("Enter a name.");
    if (!sForm.target || +sForm.target <= 0) return setSError("Enter a valid target.");
    setSSaving(true);
    try {
      const created = await pb.collection("savings_goals").create({
        userId, name: sForm.name.trim(),
        target: +sForm.target,
        current: +sForm.current || 0,
        accountId: sForm.accountId,
      });
      setSavingsGoals(prev => [...prev, created]);
      setSForm(f => ({ ...f, name: "", target: "", current: "" }));
      setSError("");
    } catch (e) { setSError("Failed to save."); }
    finally { setSSaving(false); }
  };

  const updateGoalProgress = async (id, newCurrent) => {
    const updated = await pb.collection("savings_goals").update(id, { current: +newCurrent });
    setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
    setEditGoal(null);
  };

  const deleteSavingsGoal = async id => {
    await pb.collection("savings_goals").delete(id);
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  };

  // ── Category options (not already budgeted) ────────────────────
  const availableCats = expCats.filter(c => c.name !== "Transfer" && !budgets.find(b => b.category === c.name));

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget & Goals</h1>
          <p className="page-sub">Monthly limits and savings targets</p>
        </div>
      </div>

      {/* ── Budget Limits ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>📊 Monthly Budget Limits</h2>

        {/* Add budget form */}
        {availableCats.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select className="input" style={{ flex: 2, minWidth: 140 }}
              value={bForm.category} onChange={e => { setBForm(f => ({ ...f, category: e.target.value })); setBError(""); }}>
              <option value="">Select category...</option>
              {availableCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input className="input" type="number" placeholder="Limit (₹)" style={{ flex: 1, minWidth: 100 }}
              value={bForm.limit} onChange={e => { setBForm(f => ({ ...f, limit: e.target.value })); setBError(""); }} />
            <button className="btn-primary" onClick={addBudget} disabled={bSaving} style={{ whiteSpace: "nowrap" }}>
              {bSaving ? "..." : "+ Add"}
            </button>
          </div>
        )}
        {bError && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{bError}</p>}

        {budgets.length === 0 ? (
          <p className="empty-msg">No budgets set. Add one above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {budgets.map(b => {
              const spent = monthSpend[b.category] || 0;
              const pct = Math.min((spent / b.limit) * 100, 100);
              const over = spent > b.limit;
              const near = !over && pct >= 80;
              const catColor = expCats.find(c => c.name === b.category)?.color || "#6366f1";
              const barColor = over ? "var(--red)" : near ? "var(--orange, #f97316)" : catColor;

              return (
                <div key={b.id} style={{
                  background: "var(--surface-2)", borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  border: over ? "1px solid rgba(239,68,68,0.3)" : near ? "1px solid rgba(249,115,22,0.3)" : "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: catColor, display: "inline-block" }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{b.category}</span>
                      {over && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "rgba(239,68,68,0.12)", padding: "2px 6px", borderRadius: 99 }}>OVER BUDGET</span>}
                      {near && !over && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--orange, #f97316)", background: "rgba(249,115,22,0.12)", padding: "2px 6px", borderRadius: 99 }}>NEAR LIMIT</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: over ? "var(--red)" : "var(--text-muted)" }}>
                        ₹{spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                      </span>
                      <button onClick={() => deleteBudget(b.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 2 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ height: 7, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: 99,
                      background: barColor,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {over ? `₹${(spent - b.limit).toLocaleString()} over` : `₹${(b.limit - spent).toLocaleString()} remaining`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Savings Goals ────────────────────────────────────────── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 16 }}>🎯 Savings Goals</h2>

        {/* Add savings goal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" placeholder="Goal name (e.g. Laptop)" style={{ flex: 2, minWidth: 140 }}
              value={sForm.name} onChange={e => { setSForm(f => ({ ...f, name: e.target.value })); setSError(""); }} />
            <input className="input" type="number" placeholder="Target (₹)" style={{ flex: 1, minWidth: 100 }}
              value={sForm.target} onChange={e => setSForm(f => ({ ...f, target: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" type="number" placeholder="Already saved (₹)" style={{ flex: 1, minWidth: 100 }}
              value={sForm.current} onChange={e => setSForm(f => ({ ...f, current: e.target.value }))} />
            {accounts.length > 0 && (
              <select className="input" style={{ flex: 1, minWidth: 130 }}
                value={sForm.accountId} onChange={e => setSForm(f => ({ ...f, accountId: e.target.value }))}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            )}
            <button className="btn-primary" onClick={addSavingsGoal} disabled={sSaving} style={{ whiteSpace: "nowrap" }}>
              {sSaving ? "..." : "+ Add Goal"}
            </button>
          </div>
          {sError && <p style={{ color: "var(--red)", fontSize: 12 }}>{sError}</p>}
        </div>

        {savingsGoals.length === 0 ? (
          <p className="empty-msg">No savings goals yet. Add one above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {savingsGoals.map(g => {
              const pct = Math.min((g.current / g.target) * 100, 100);
              const done = g.current >= g.target;
              const acc = accounts.find(a => a.id === g.accountId);

              return (
                <div key={g.id} style={{
                  background: "var(--surface-2)", borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  border: done ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{g.name}</span>
                        {done && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", background: "rgba(34,197,94,0.12)", padding: "2px 6px", borderRadius: 99 }}>✓ COMPLETE</span>}
                      </div>
                      {acc && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                          {acc.icon} {acc.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        ₹{g.current.toLocaleString()} / ₹{g.target.toLocaleString()}
                      </span>
                      <button onClick={() => setEditGoal({ id: g.id, current: String(g.current) })}
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13 }}>✎</button>
                      <button onClick={() => deleteSavingsGoal(g.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ height: 7, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: 99,
                      background: done ? "var(--green)" : "var(--accent)",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {done ? "Goal reached! 🎉" : `₹${(g.target - g.current).toLocaleString()} to go`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                  </div>

                  {/* Inline edit */}
                  {editGoal?.id === g.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input className="input" type="number" placeholder="Current amount"
                        value={editGoal.current}
                        onChange={e => setEditGoal(eg => ({ ...eg, current: e.target.value }))}
                        style={{ flex: 1 }} autoFocus />
                      <button className="btn-primary" style={{ padding: "8px 14px" }}
                        onClick={() => updateGoalProgress(g.id, editGoal.current)}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditGoal(null)}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
