import { useState, useMemo, useEffect } from "react";
import pb from "../pb";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default function BudgetGoals({
  userId,
  entries,
  expCats = [],
  budgets: propBudgets,
  savingsGoals: propGoals,
  onBudgetsChange,
  onSavingsGoalsChange,
  ai,
}) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const [budgets, setBudgets] = useState(propBudgets || []);
  const [savingsGoals, setSavingsGoals] = useState(propGoals || []);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(!propBudgets);

  // Sync from props
  useEffect(() => {
    if (propBudgets) setBudgets(propBudgets);
  }, [propBudgets]);
  useEffect(() => {
    if (propGoals) setSavingsGoals(propGoals);
  }, [propGoals]);

  // Budget form
  const [bForm, setBForm] = useState({ category: "", limit: "" });
  const [bError, setBError] = useState("");
  const [bSaving, setBSaving] = useState(false);

  // Savings goal form
  const [sForm, setSForm] = useState({
    name: "",
    target: "",
    current: "",
    accountId: "",
  });
  const [sError, setSError] = useState("");
  const [sSaving, setSSaving] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  // AI Budget Suggester
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    const loadExtra = async () => {
      try {
        const [accs, ...rest] = await Promise.all([
          pb
            .collection("accounts")
            .getFullList({ filter: `userId = '${userId}'` })
            .catch(() => []),
          ...(!propBudgets
            ? [
                pb
                  .collection("budgets")
                  .getFullList({ filter: `userId = '${userId}'` })
                  .catch(() => []),
              ]
            : []),
          ...(!propGoals
            ? [
                pb
                  .collection("savings_goals")
                  .getFullList({ filter: `userId = '${userId}'` })
                  .catch(() => []),
              ]
            : []),
        ]);
        setAccounts(accs);
        if (!propBudgets && rest[0]) setBudgets(rest[0]);
        if (!propGoals && rest[1]) setSavingsGoals(rest[1]);
        if (accs.length) setSForm((f) => ({ ...f, accountId: accs[0].id }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadExtra();
  }, [userId]);

  // ── Month spending per category ─────────────────────────────────
  const monthSpend = useMemo(() => {
    const map = {};
    entries
      .filter(
        (e) =>
          e.type === "expense" &&
          !e.isTransfer &&
          e.date.slice(0, 7) === thisMonth,
      )
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
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
      .filter(
        (e) =>
          e.type === "expense" &&
          !e.isTransfer &&
          months.includes(e.date.slice(0, 7)),
      )
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

  // ── Helpers ─────────────────────────────────────────────────────
  const syncBudgets = (updated) => {
    setBudgets(updated);
    onBudgetsChange?.(updated);
  };
  const syncGoals = (updated) => {
    setSavingsGoals(updated);
    onSavingsGoalsChange?.(updated);
  };

  // ── AI Budget Suggestions ────────────────────────────────────────
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
        .filter(
          (e) =>
            e.type === "expense" &&
            !e.isTransfer &&
            months.includes(e.date.slice(0, 7)),
        )
        .forEach((e) => {
          if (!catMonthly[e.category])
            catMonthly[e.category] = { months: {}, total: 0, count: 0 };
          const m = e.date.slice(0, 7);
          catMonthly[e.category].months[m] =
            (catMonthly[e.category].months[m] || 0) + e.amount;
          catMonthly[e.category].total += e.amount;
          catMonthly[e.category].count += 1;
        });
      const alreadyBudgeted = budgets.map((b) => b.category);
      const historyLines = Object.entries(catMonthly)
        .filter(([cat]) => !alreadyBudgeted.includes(cat))
        .map(([cat, data]) => {
          const monthVals = Object.entries(data.months)
            .map(([m, v]) => `${m}: रु${v}`)
            .join(", ");
          const avg = Math.round(data.total / Object.keys(data.months).length);
          return `${cat}: avg रु${avg}/month (${monthVals})`;
        })
        .join("\n");

      if (!historyLines) {
        setAiError(
          "All categories already have budgets, or not enough history.",
        );
        setAiLoading(false);
        return;
      }

      const thisMonthIncome = entries
        .filter(
          (e) =>
            e.type === "income" &&
            !e.isTransfer &&
            e.date.slice(0, 7) === thisMonth,
        )
        .reduce((s, e) => s + e.amount, 0);

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "user",
              content: `You are a personal finance advisor. Analyze spending history and suggest monthly budget limits.
MONTHLY INCOME: रु${thisMonthIncome.toLocaleString()}
SPENDING HISTORY (last 3 months):
${historyLines}
Respond ONLY with a JSON array:
[{"category":"name","suggested":number,"avg":number,"reason":"short reason","trend":"stable|increasing|decreasing"}]`,
            },
          ],
          temperature: 0.4,
          max_tokens: 1000,
        }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error?.message || "Groq API error");
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse AI response");
      setAiSuggestions(JSON.parse(match[0]));
      setAiGenerated(true);
    } catch (err) {
      setAiError(err.message || "Failed to generate suggestions.");
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = async (s) => {
    if (budgets.find((b) => b.category === s.category)) return;
    const created = await pb
      .collection("budgets")
      .create({ userId, category: s.category, limit: s.suggested });
    syncBudgets([...budgets, created]);
    setAiSuggestions((prev) => prev.filter((x) => x.category !== s.category));
  };

  const applyAllSuggestions = async () => {
    for (const s of aiSuggestions.filter(
      (s) => !budgets.find((b) => b.category === s.category),
    )) {
      const created = await pb
        .collection("budgets")
        .create({ userId, category: s.category, limit: s.suggested });
      syncBudgets((prev) => [
        ...(Array.isArray(prev) ? prev : budgets),
        created,
      ]);
    }
    setAiSuggestions([]);
  };

  // ── Budget CRUD ──────────────────────────────────────────────────
  const addBudget = async () => {
    if (!bForm.category) return setBError("Pick a category.");
    if (!bForm.limit || +bForm.limit <= 0)
      return setBError("Enter a valid limit.");
    if (budgets.find((b) => b.category === bForm.category))
      return setBError("Budget already exists.");
    setBSaving(true);
    try {
      const created = await pb
        .collection("budgets")
        .create({ userId, category: bForm.category, limit: +bForm.limit });
      syncBudgets([...budgets, created]);
      setBForm({ category: "", limit: "" });
      setBError("");
    } catch {
      setBError("Failed to save.");
    } finally {
      setBSaving(false);
    }
  };

  const deleteBudget = async (id) => {
    await pb.collection("budgets").delete(id);
    syncBudgets(budgets.filter((b) => b.id !== id));
  };

  // ── Savings CRUD ─────────────────────────────────────────────────
  const addSavingsGoal = async () => {
    if (!sForm.name.trim()) return setSError("Enter a name.");
    if (!sForm.target || +sForm.target <= 0)
      return setSError("Enter a valid target.");
    setSSaving(true);
    try {
      const created = await pb.collection("savings_goals").create({
        userId,
        name: sForm.name.trim(),
        target: +sForm.target,
        current: +sForm.current || 0,
        accountId: sForm.accountId,
      });
      syncGoals([...savingsGoals, created]);
      setSForm((f) => ({ ...f, name: "", target: "", current: "" }));
      setSError("");
    } catch {
      setSError("Failed to save.");
    } finally {
      setSSaving(false);
    }
  };

  const updateGoalProgress = async (id, newCurrent) => {
    const updated = await pb
      .collection("savings_goals")
      .update(id, { current: +newCurrent });
    syncGoals(savingsGoals.map((g) => (g.id === id ? updated : g)));
    setEditGoal(null);
  };

  const deleteSavingsGoal = async (id) => {
    await pb.collection("savings_goals").delete(id);
    syncGoals(savingsGoals.filter((g) => g.id !== id));
  };

  const availableCats = expCats.filter(
    (c) => c.name !== "Transfer" && !budgets.find((b) => b.category === c.name),
  );
  const trendIcon = (t) =>
    t === "increasing" ? "📈" : t === "decreasing" ? "📉" : "➡️";
  const trendColor = (t) =>
    t === "increasing"
      ? "var(--red)"
      : t === "decreasing"
        ? "var(--green)"
        : "var(--text-muted)";

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
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

      {/* ── 🤖 AI Budget Suggester ── */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 className="card-title" style={{ marginBottom: 2 }}>
              🤖 Smart Budget Suggester
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              AI analyzes your last 3 months and suggests realistic limits
            </p>
          </div>
          <button
            onClick={generateAiBudgets}
            disabled={aiLoading || entries.length < 5}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor:
                aiLoading || entries.length < 5 ? "not-allowed" : "pointer",
              opacity: aiLoading || entries.length < 5 ? 0.6 : 1,
            }}
          >
            {aiLoading
              ? "Analyzing..."
              : aiGenerated
                ? "↻ Re-analyze"
                : "✨ Suggest Budgets"}
          </button>
        </div>

        {!aiGenerated && !aiLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 16px",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border)",
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>💡</p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Let AI set your budgets
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Click "Suggest Budgets" to get AI-recommended limits based on your
              spending patterns.
            </p>
          </div>
        )}

        {aiLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  animation: "shimmer 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
            <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {aiError && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--red)",
              fontSize: 13,
            }}
          >
            ⚠️ {aiError}
          </div>
        )}

        {aiSuggestions.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {aiSuggestions.length} suggestion
                {aiSuggestions.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={applyAllSuggestions}
                style={{
                  background: "rgba(34,197,94,0.12)",
                  color: "var(--green)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Apply All
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiSuggestions.map((s, i) => {
                const catColor =
                  expCats.find((c) => c.name === s.category)?.color ||
                  "#6366f1";
                const alreadySet = !!budgets.find(
                  (b) => b.category === s.category,
                );
                return (
                  <div
                    key={i}
                    style={{
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius-md)",
                      padding: "14px 16px",
                      border: "1px solid var(--border)",
                      opacity: alreadySet ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: catColor,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "var(--text)",
                          }}
                        >
                          {s.category}
                        </span>
                        <span
                          style={{ fontSize: 12, color: trendColor(s.trend) }}
                        >
                          {trendIcon(s.trend)}
                        </span>
                      </div>
                      {!alreadySet ? (
                        <button
                          onClick={() => applySuggestion(s)}
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            padding: "5px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          Set Budget
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--green)",
                            fontWeight: 600,
                          }}
                        >
                          ✓ Applied
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                      <div>
                        <p
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 2,
                          }}
                        >
                          3-month avg
                        </p>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          रु{s.avg?.toLocaleString()}
                        </p>
                      </div>
                      <div style={{ width: 1, background: "var(--border)" }} />
                      <div>
                        <p
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 2,
                          }}
                        >
                          suggested limit
                        </p>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--accent)",
                          }}
                        >
                          रु{s.suggested?.toLocaleString()}
                        </p>
                      </div>
                      {s.suggested < s.avg && (
                        <div>
                          <p
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              marginBottom: 2,
                            }}
                          >
                            potential saving
                          </p>
                          <p
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "var(--green)",
                            }}
                          >
                            रु{(s.avg - s.suggested).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      💬 {s.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 📊 Monthly Budget Limits ── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 16 }}>
          📊 Monthly Budget Limits
        </h2>

        {availableCats.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <select
              className="input"
              style={{ flex: 2, minWidth: 140 }}
              value={bForm.category}
              onChange={(e) => {
                setBForm((f) => ({ ...f, category: e.target.value }));
                setBError("");
              }}
            >
              <option value="">Select category...</option>
              {availableCats.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              placeholder="Limit (रु)"
              style={{ flex: 1, minWidth: 100 }}
              value={bForm.limit}
              onChange={(e) => {
                setBForm((f) => ({ ...f, limit: e.target.value }));
                setBError("");
              }}
            />
            <button
              className="btn-primary"
              onClick={addBudget}
              disabled={bSaving}
              style={{ whiteSpace: "nowrap" }}
            >
              {bSaving ? "..." : "+ Add"}
            </button>
          </div>
        )}


        
        {bError && (
          <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>
            {bError}
          </p>
        )}
        {budgets.length === 0 ? (
          <p className="empty-msg">
            No budgets set. Use AI suggestions above or add manually.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {budgets.map((b) => {
              const spent = monthSpend[b.category] || 0;
              const pct = Math.min((spent / b.limit) * 100, 100);
              const over = spent > b.limit;
              const near = !over && pct >= 80;
              const catColor =
                expCats.find((c) => c.name === b.category)?.color || "#6366f1";
              const barColor = over
                ? "var(--red)"
                : near
                  ? "#f97316"
                  : catColor;
              const avg3 = last3MonthsAvg[b.category];
              return (
                <div
                  key={b.id}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    border: over
                      ? "1px solid rgba(239,68,68,0.3)"
                      : near
                        ? "1px solid rgba(249,115,22,0.3)"
                        : "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: catColor,
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--text)",
                        }}
                      >
                        {b.category}
                      </span>
                      {over && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--red)",
                            background: "rgba(239,68,68,0.12)",
                            padding: "2px 6px",
                            borderRadius: 99,
                          }}
                        >
                          OVER
                        </span>
                      )}
                      {near && !over && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#f97316",
                            background: "rgba(249,115,22,0.12)",
                            padding: "2px 6px",
                            borderRadius: 99,
                          }}
                        >
                          NEAR
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: over ? "var(--red)" : "var(--text-muted)",
                        }}
                      >
                        रु{spent.toLocaleString()} / रु
                        {b.limit.toLocaleString()}
                      </span>
                      <button
                        onClick={() => deleteBudget(b.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 13,
                          padding: 2,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 7,
                      background: "var(--border)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: barColor,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 5,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {over
                        ? `रु${(spent - b.limit).toLocaleString()} over budget`
                        : `रु${(b.limit - spent).toLocaleString()} remaining`}
                    </span>
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      {avg3 && (
                        <span
                          style={{ fontSize: 10, color: "var(--text-muted)" }}
                        >
                          3-mo avg: रु{avg3.toLocaleString()}
                        </span>
                      )}
                      <span
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 🎯 Savings Goals ── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 16 }}>
          🎯 Savings Goals
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Goal name (e.g. Laptop)"
              style={{ flex: 2, minWidth: 140 }}
              value={sForm.name}
              onChange={(e) => {
                setSForm((f) => ({ ...f, name: e.target.value }));
                setSError("");
              }}
            />
            <input
              className="input"
              type="number"
              placeholder="Target (रु)"
              style={{ flex: 1, minWidth: 100 }}
              value={sForm.target}
              onChange={(e) =>
                setSForm((f) => ({ ...f, target: e.target.value }))
              }
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              type="number"
              placeholder="Already saved (रु)"
              style={{ flex: 1, minWidth: 100 }}
              value={sForm.current}
              onChange={(e) =>
                setSForm((f) => ({ ...f, current: e.target.value }))
              }
            />
            {accounts.length > 0 && (
              <select
                className="input"
                style={{ flex: 1, minWidth: 130 }}
                value={sForm.accountId}
                onChange={(e) =>
                  setSForm((f) => ({ ...f, accountId: e.target.value }))
                }
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="btn-primary"
              onClick={addSavingsGoal}
              disabled={sSaving}
              style={{ whiteSpace: "nowrap" }}
            >
              {sSaving ? "..." : "+ Add Goal"}
            </button>
          </div>
          {sError && (
            <p style={{ color: "var(--red)", fontSize: 12 }}>{sError}</p>
          )}
        </div>
        {savingsGoals.length === 0 ? (
          <p className="empty-msg">
            No savings goals yet. Add one above or ask Nexus AI in Insights.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {savingsGoals.map((g) => {
              const pct = Math.min((g.current / g.target) * 100, 100);
              const done = g.current >= g.target;
              const acc = accounts.find((a) => a.id === g.accountId);
              return (
                <div
                  key={g.id}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    border: done
                      ? "1px solid rgba(34,197,94,0.3)"
                      : "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "var(--text)",
                          }}
                        >
                          {g.name}
                        </span>
                        {done && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--green)",
                              background: "rgba(34,197,94,0.12)",
                              padding: "2px 6px",
                              borderRadius: 99,
                            }}
                          >
                            ✓ COMPLETE
                          </span>
                        )}
                      </div>
                      {acc && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 2,
                            display: "block",
                          }}
                        >
                          {acc.icon} {acc.name}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{ fontSize: 13, color: "var(--text-muted)" }}
                      >
                        रु{g.current.toLocaleString()} / रु
                        {g.target.toLocaleString()}
                      </span>
                      <button
                        onClick={() =>
                          setEditGoal({ id: g.id, current: String(g.current) })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteSavingsGoal(g.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 7,
                      background: "var(--border)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: done ? "var(--green)" : "var(--accent)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 5,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {done
                        ? "Goal reached! 🎉"
                        : `रु${(g.target - g.current).toLocaleString()} to go`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  {editGoal?.id === g.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        className="input"
                        type="number"
                        placeholder="Current amount"
                        value={editGoal.current}
                        onChange={(e) =>
                          setEditGoal((eg) => ({
                            ...eg,
                            current: e.target.value,
                          }))
                        }
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: "8px 14px" }}
                        onClick={() =>
                          updateGoalProgress(g.id, editGoal.current)
                        }
                      >
                        Save
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => setEditGoal(null)}
                      >
                        ✕
                      </button>
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
