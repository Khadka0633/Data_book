import { useState, useEffect, useMemo } from "react";
import supabase from "../supabase";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Bottom Sheet ───────────────────────────────────────────────────
function BottomSheet({ title, onClose, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "20px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BudgetGoals({
  userId,
  entries,
  expCats = [],
  budgets: propBudgets,
  savingsGoals: propGoals,
  onBudgetsChange,
  onSavingsGoalsChange,
}) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const [budgets, setBudgets] = useState(propBudgets || []);
  const [savingsGoals, setSavingsGoals] = useState(propGoals || []);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(!propBudgets);

  useEffect(() => { if (propBudgets) setBudgets(propBudgets); }, [propBudgets]);
  useEffect(() => { if (propGoals) setSavingsGoals(propGoals); }, [propGoals]);

  // Sheet states
  const [showBudgetSheet, setShowBudgetSheet] = useState(false);
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  // Budget form
  const [bForm, setBForm] = useState({ category: "", limit: "" });
  const [bError, setBError] = useState("");
  const [bSaving, setBSaving] = useState(false);

  // Savings goal form
  const [sForm, setSForm] = useState({ name: "", target: "", current: "", accountId: "" });
  const [sError, setSError] = useState("");
  const [sSaving, setSSaving] = useState(false);

  // AI
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [showAiSheet, setShowAiSheet] = useState(false);

  // ── Load extra data (accounts + optionally budgets/goals) ────────
  useEffect(() => {
    const loadExtra = async () => {
      try {
        const promises = [
          supabase.from("accounts").select("*").eq("user_id", userId),
        ];
        if (!propBudgets) promises.push(supabase.from("budgets").select("*").eq("user_id", userId));
        if (!propGoals) promises.push(supabase.from("savings_goals").select("*").eq("user_id", userId));

        const results = await Promise.all(promises);

        const accs = results[0].data || [];
        setAccounts(accs);
        if (accs.length) setSForm((f) => ({ ...f, accountId: accs[0].id }));

        let idx = 1;
        if (!propBudgets) { setBudgets(results[idx]?.data || []); idx++; }
        if (!propGoals)   { setSavingsGoals(results[idx]?.data || []); }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadExtra();
  }, [userId]);

  // ── Derived stats ────────────────────────────────────────────────
  const monthSpend = useMemo(() => {
    const map = {};
    entries
      .filter((e) => e.type === "expense" && !e.is_transfer && e.date.slice(0, 7) === thisMonth)
      .forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [entries, thisMonth]);

  const last3MonthsAvg = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const catMonthly = {};
    entries
      .filter((e) => e.type === "expense" && !e.is_transfer && months.includes(e.date.slice(0, 7)))
      .forEach((e) => {
        if (!catMonthly[e.category]) catMonthly[e.category] = {};
        const m = e.date.slice(0, 7);
        catMonthly[e.category][m] = (catMonthly[e.category][m] || 0) + e.amount;
      });
    const avg = {};
    Object.entries(catMonthly).forEach(([cat, monthMap]) => {
      const vals = Object.values(monthMap);
      avg[cat] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
    return avg;
  }, [entries]);

  const syncBudgets = (updated) => { setBudgets(updated); onBudgetsChange?.(updated); };
  const syncGoals   = (updated) => { setSavingsGoals(updated); onSavingsGoalsChange?.(updated); };

  // ── AI Budget Suggester ──────────────────────────────────────────
  const generateAiBudgets = async () => {
    setAiLoading(true);
    setAiError("");
    setAiSuggestions([]);
    try {
      const now = new Date();
      const months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
      const catMonthly = {};
      entries
        .filter((e) => e.type === "expense" && !e.is_transfer && months.includes(e.date.slice(0, 7)))
        .forEach((e) => {
          if (!catMonthly[e.category]) catMonthly[e.category] = { months: {}, total: 0, count: 0 };
          const m = e.date.slice(0, 7);
          catMonthly[e.category].months[m] = (catMonthly[e.category].months[m] || 0) + e.amount;
          catMonthly[e.category].total += e.amount;
          catMonthly[e.category].count += 1;
        });

      const alreadyBudgeted = budgets.map((b) => b.category);
      const historyLines = Object.entries(catMonthly)
        .filter(([cat]) => !alreadyBudgeted.includes(cat))
        .map(([cat, data]) => {
          const monthVals = Object.entries(data.months).map(([m, v]) => `${m}: रु${v}`).join(", ");
          const avg = Math.round(data.total / Object.keys(data.months).length);
          return `${cat}: avg रु${avg}/month (${monthVals})`;
        }).join("\n");

      if (!historyLines) {
        setAiError("All categories already have budgets, or not enough history.");
        setAiLoading(false);
        return;
      }

      const thisMonthIncome = entries
        .filter((e) => e.type === "income" && !e.is_transfer && e.date.slice(0, 7) === thisMonth)
        .reduce((s, e) => s + e.amount, 0);

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{
            role: "user",
            content: `You are a personal finance advisor. Analyze spending history and suggest monthly budget limits.\nMONTHLY INCOME: रु${thisMonthIncome.toLocaleString()}\nSPENDING HISTORY (last 3 months):\n${historyLines}\nRespond ONLY with a JSON array:\n[{"category":"name","suggested":number,"avg":number,"reason":"short reason","trend":"stable|increasing|decreasing"}]`,
          }],
          temperature: 0.4, max_tokens: 1000,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error?.message || "Groq API error");
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse AI response");
      setAiSuggestions(JSON.parse(match[0]));
      setAiGenerated(true);
      setShowAiSheet(true);
    } catch (err) {
      setAiError(err.message || "Failed to generate suggestions.");
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = async (s) => {
    if (budgets.find((b) => b.category === s.category)) return;
    const { data, error } = await supabase
      .from("budgets")
      .insert({ user_id: userId, category: s.category, limit: s.suggested })
      .select()
      .single();
    if (error) { console.error(error); return; }
    syncBudgets([...budgets, data]);
    setAiSuggestions((prev) => prev.filter((x) => x.category !== s.category));
  };

  const applyAllSuggestions = async () => {
    for (const s of aiSuggestions.filter((s) => !budgets.find((b) => b.category === s.category))) {
      const { data, error } = await supabase
        .from("budgets")
        .insert({ user_id: userId, category: s.category, limit: s.suggested })
        .select()
        .single();
      if (!error) syncBudgets([...budgets, data]);
    }
    setAiSuggestions([]);
    setShowAiSheet(false);
  };

  // ── Budget CRUD ──────────────────────────────────────────────────
  const addBudget = async () => {
    if (!bForm.category) return setBError("Pick a category.");
    if (!bForm.limit || +bForm.limit <= 0) return setBError("Enter a valid limit.");
    if (budgets.find((b) => b.category === bForm.category)) return setBError("Budget already exists.");
    setBSaving(true);
    try {
      const { data, error } = await supabase
        .from("budgets")
        .insert({ user_id: userId, category: bForm.category, limit: +bForm.limit })
        .select()
        .single();
      if (error) throw error;
      syncBudgets([...budgets, data]);
      setBForm({ category: "", limit: "" });
      setBError("");
      setShowBudgetSheet(false);
    } catch { setBError("Failed to save."); } finally { setBSaving(false); }
  };

  const deleteBudget = async (id) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) { console.error(error); return; }
    syncBudgets(budgets.filter((b) => b.id !== id));
  };

  // ── Savings Goal CRUD ────────────────────────────────────────────
  const addSavingsGoal = async () => {
    if (!sForm.name.trim()) return setSError("Enter a name.");
    if (!sForm.target || +sForm.target <= 0) return setSError("Enter a valid target.");
    setSSaving(true);
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .insert({
          user_id:    userId,
          name:       sForm.name.trim(),
          target:     +sForm.target,
          current:    +sForm.current || 0,
          account_id: sForm.accountId || null,
        })
        .select()
        .single();
      if (error) throw error;
      syncGoals([...savingsGoals, data]);
      setSForm((f) => ({ ...f, name: "", target: "", current: "" }));
      setSError("");
      setShowGoalSheet(false);
    } catch { setSError("Failed to save."); } finally { setSSaving(false); }
  };

  const updateGoalProgress = async (id, newCurrent) => {
    const { data, error } = await supabase
      .from("savings_goals")
      .update({ current: +newCurrent })
      .eq("id", id)
      .select()
      .single();
    if (error) { console.error(error); return; }
    syncGoals(savingsGoals.map((g) => (g.id === id ? data : g)));
    setEditGoal(null);
  };

  const deleteSavingsGoal = async (id) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) { console.error(error); return; }
    syncGoals(savingsGoals.filter((g) => g.id !== id));
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const availableCats = expCats.filter((c) => c.name !== "Transfer" && !budgets.find((b) => b.category === c.name));
  const trendIcon  = (t) => t === "increasing" ? "📈" : t === "decreasing" ? "📉" : "➡️";
  const trendColor = (t) => t === "increasing" ? "var(--red)" : t === "decreasing" ? "var(--green)" : "var(--text-muted)";

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div className="page">
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Budget & Goals</h1>
          <p className="page-sub">Monthly limits and savings targets</p>
        </div>
      </div>

      {/* ── AI Suggester Row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>✨ Smart Budget Suggester</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>AI analyzes your last 3 months</p>
        </div>
        <button
          onClick={generateAiBudgets}
          disabled={aiLoading || entries.length < 5}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: aiLoading || entries.length < 5 ? "not-allowed" : "pointer", opacity: aiLoading || entries.length < 5 ? 0.6 : 1, whiteSpace: "nowrap" }}
        >
          {aiLoading ? "Analyzing..." : aiGenerated ? "↻ Re-analyze" : "Suggest"}
        </button>
      </div>

      {aiError && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 12 }}>
          ⚠️ {aiError}
        </div>
      )}

      {/* ── Monthly Budget Limits ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: budgets.length > 0 ? 16 : 0 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>📊 Monthly Budget Limits</h2>
          {availableCats.length > 0 && (
            <button
              onClick={() => setShowBudgetSheet(true)}
              style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Add
            </button>
          )}
        </div>

        {budgets.length === 0 ? (
          <p className="empty-msg" style={{ marginTop: 12 }}>No budgets set. Use AI suggestions or tap + Add.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {budgets.map((b) => {
              const spent    = monthSpend[b.category] || 0;
              const pct      = Math.min((spent / b.limit) * 100, 100);
              const over     = spent > b.limit;
              const near     = !over && pct >= 80;
              const catColor = expCats.find((c) => c.name === b.category)?.color || "#6366f1";
              const barColor = over ? "var(--red)" : near ? "#f97316" : catColor;
              const avg3     = last3MonthsAvg[b.category];
              return (
                <div key={b.id} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "14px 16px", border: over ? "1px solid rgba(239,68,68,0.3)" : near ? "1px solid rgba(249,115,22,0.3)" : "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: catColor, display: "inline-block" }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{b.category}</span>
                      {over && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "rgba(239,68,68,0.12)", padding: "2px 6px", borderRadius: 99 }}>OVER</span>}
                      {near && !over && <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.12)", padding: "2px 6px", borderRadius: 99 }}>NEAR</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: over ? "var(--red)" : "var(--text-muted)" }}>
                        रु{spent.toLocaleString()} / रु{b.limit.toLocaleString()}
                      </span>
                      <button onClick={() => deleteBudget(b.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 2 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ height: 7, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: barColor, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {over ? `रु${(spent - b.limit).toLocaleString()} over` : `रु${(b.limit - spent).toLocaleString()} left`}
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      {avg3 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>avg: रु{avg3.toLocaleString()}</span>}
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Savings Goals ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: savingsGoals.length > 0 ? 16 : 0 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>🎯 Savings Goals</h2>
          <button
            onClick={() => setShowGoalSheet(true)}
            style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Add
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <p className="empty-msg" style={{ marginTop: 12 }}>No savings goals yet. Tap + Add to create one.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {savingsGoals.map((g) => {
              const pct  = Math.min((g.current / g.target) * 100, 100);
              const done = g.current >= g.target;
              // Supabase uses account_id (snake_case)
              const acc  = accounts.find((a) => a.id === g.account_id);
              return (
                <div key={g.id} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "14px 16px", border: done ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{g.name}</span>
                        {done && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", background: "rgba(34,197,94,0.12)", padding: "2px 6px", borderRadius: 99 }}>✓ DONE</span>}
                      </div>
                      {acc && <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "block" }}>{acc.icon} {acc.name}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>रु{g.current.toLocaleString()} / रु{g.target.toLocaleString()}</span>
                      <button onClick={() => setEditGoal({ id: g.id, current: String(g.current) })} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13 }}>✎</button>
                      <button onClick={() => deleteSavingsGoal(g.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ height: 7, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: done ? "var(--green)" : "var(--accent)", transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{done ? "Goal reached! 🎉" : `रु${(g.target - g.current).toLocaleString()} to go`}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                  </div>
                  {editGoal?.id === g.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input className="input" type="number" placeholder="Current amount" value={editGoal.current} onChange={(e) => setEditGoal((eg) => ({ ...eg, current: e.target.value }))} style={{ flex: 1 }} autoFocus />
                      <button className="btn-primary" style={{ padding: "8px 14px" }} onClick={() => updateGoalProgress(g.id, editGoal.current)}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditGoal(null)}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Budget Bottom Sheet ── */}
      {showBudgetSheet && (
        <BottomSheet title="Add Budget Limit" onClose={() => { setShowBudgetSheet(false); setBForm({ category: "", limit: "" }); setBError(""); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Category</label>
              <select className="input" value={bForm.category} onChange={(e) => { setBForm((f) => ({ ...f, category: e.target.value })); setBError(""); }}>
                <option value="">Select category...</option>
                {availableCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Monthly Limit (रु)</label>
              <input className="input" type="number" placeholder="e.g. 5000" value={bForm.limit} onChange={(e) => { setBForm((f) => ({ ...f, limit: e.target.value })); setBError(""); }} />
            </div>
            {bError && <p style={{ color: "var(--red)", fontSize: 12 }}>{bError}</p>}
            <button className="btn-primary" onClick={addBudget} disabled={bSaving} style={{ marginTop: 4 }}>
              {bSaving ? "Saving..." : "Add Budget"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Add Savings Goal Bottom Sheet ── */}
      {showGoalSheet && (
        <BottomSheet title="New Savings Goal" onClose={() => { setShowGoalSheet(false); setSForm((f) => ({ ...f, name: "", target: "", current: "" })); setSError(""); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Goal Name</label>
              <input className="input" placeholder="e.g. New Laptop" value={sForm.name} onChange={(e) => { setSForm((f) => ({ ...f, name: e.target.value })); setSError(""); }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Target Amount (रु)</label>
              <input className="input" type="number" placeholder="e.g. 50000" value={sForm.target} onChange={(e) => setSForm((f) => ({ ...f, target: e.target.value }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Already Saved (रु)</label>
              <input className="input" type="number" placeholder="0" value={sForm.current} onChange={(e) => setSForm((f) => ({ ...f, current: e.target.value }))} />
            </div>
            {accounts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Linked Account</label>
                <select className="input" value={sForm.accountId} onChange={(e) => setSForm((f) => ({ ...f, accountId: e.target.value }))}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
            )}
            {sError && <p style={{ color: "var(--red)", fontSize: 12 }}>{sError}</p>}
            <button className="btn-primary" onClick={addSavingsGoal} disabled={sSaving} style={{ marginTop: 4 }}>
              {sSaving ? "Saving..." : "Add Goal"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── AI Suggestions Bottom Sheet ── */}
      {showAiSheet && aiSuggestions.length > 0 && (
        <BottomSheet title={`${aiSuggestions.length} AI Suggestions`} onClose={() => setShowAiSheet(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={applyAllSuggestions} style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "var(--radius-sm)", padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ✓ Apply All Suggestions
            </button>
            {aiSuggestions.map((s, i) => {
              const catColor  = expCats.find((c) => c.name === s.category)?.color || "#6366f1";
              const alreadySet = !!budgets.find((b) => b.category === s.category);
              return (
                <div key={i} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "14px 16px", border: "1px solid var(--border)", opacity: alreadySet ? 0.5 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: catColor, display: "inline-block" }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{s.category}</span>
                      <span style={{ fontSize: 12, color: trendColor(s.trend) }}>{trendIcon(s.trend)}</span>
                    </div>
                    {!alreadySet ? (
                      <button onClick={() => applySuggestion(s)} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Set</button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>✓ Applied</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>3-mo avg</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>रु{s.avg?.toLocaleString()}</p>
                    </div>
                    <div style={{ width: 1, background: "var(--border)" }} />
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>suggested</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>रु{s.suggested?.toLocaleString()}</p>
                    </div>
                    {s.suggested < s.avg && (
                      <>
                        <div style={{ width: 1, background: "var(--border)" }} />
                        <div>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>save</p>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>रु{(s.avg - s.suggested).toLocaleString()}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>💬 {s.reason}</p>
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
