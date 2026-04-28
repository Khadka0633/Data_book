import { useState, useEffect, useMemo } from "react";
import pb from "../pb";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct";

// ── Insights Tab ───────────────────────────────────────────────────
export default function Insights({ userId, entries, expCats = [], incCats = [] }) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  // ── Bills State ────────────────────────────────────────────────
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [bForm,   setBForm]   = useState({ name: "", amount: "", dueDay: "1" });
  const [bError,  setBError]  = useState("");
  const [bSaving, setBSaving] = useState(false);

  // ── AI State ───────────────────────────────────────────────────
  const [aiInsights,   setAiInsights]   = useState([]);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState("");
  const [aiGenerated,  setAiGenerated]  = useState(false);

  useEffect(() => {
    pb.collection("bills").getFullList({ filter: `userId = '${userId}'` })
      .catch(() => [])
      .then(b => setBills(b))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Spending Streak ────────────────────────────────────────────
  const streak = useMemo(() => {
    const expenseDates = new Set(
      entries.filter(e => e.type === "expense" && !e.isTransfer).map(e => e.date)
    );
    let count = 0;
    const d = new Date(today);
    while (true) {
      const key = d.toISOString().split("T")[0];
      if (!expenseDates.has(key)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries, today]);

  // ── Static Insights ────────────────────────────────────────────
  const staticInsights = useMemo(() => {
    const list = [];
    const spendByCat = (month) => {
      const map = {};
      entries
        .filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === month)
        .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
      return map;
    };
    const thisSpend = spendByCat(thisMonth);
    const lastSpend = spendByCat(lastMonth);
    const thisTotal = Object.values(thisSpend).reduce((a, b) => a + b, 0);
    const lastTotal = Object.values(lastSpend).reduce((a, b) => a + b, 0);

    if (lastTotal > 0 && thisTotal > 0) {
      const diff = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
      if (Math.abs(diff) >= 10) {
        list.push({
          icon: diff > 0 ? "📈" : "📉",
          text: `Total spending is ${Math.abs(diff)}% ${diff > 0 ? "higher" : "lower"} this month vs last month.`,
          type: diff > 0 ? "warn" : "good",
        });
      }
    }

    const allCats = new Set([...Object.keys(thisSpend), ...Object.keys(lastSpend)]);
    allCats.forEach(cat => {
      const t = thisSpend[cat] || 0;
      const l = lastSpend[cat] || 0;
      if (l > 0 && t > 0) {
        const pct = Math.round(((t - l) / l) * 100);
        if (pct >= 40) {
          list.push({
            icon: "⚠️",
            text: `You spent ${pct}% more on ${cat} this month vs last month.`,
            type: "warn",
          });
        }
      }
    });

    const topCat = Object.entries(thisSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      list.push({
        icon: "🏆",
        text: `Your top expense category this month is ${topCat[0]} at ₹${topCat[1].toLocaleString()}.`,
        type: "info",
      });
    }

    const thisIncome = entries
      .filter(e => e.type === "income" && !e.isTransfer && e.date.slice(0, 7) === thisMonth)
      .reduce((s, e) => s + e.amount, 0);
    if (thisIncome > 0 && thisTotal > 0) {
      const savingRate = Math.round(((thisIncome - thisTotal) / thisIncome) * 100);
      if (savingRate > 0) {
        list.push({ icon: "💰", text: `You're saving ${savingRate}% of your income this month. Keep it up!`, type: "good" });
      } else {
        list.push({ icon: "🚨", text: `You've spent more than you earned this month. Time to review your budget.`, type: "warn" });
      }
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed  = now.getDate();
    const daysLeft    = daysInMonth - daysPassed;
    if (thisTotal > 0 && daysPassed > 3) {
      const avgDaily  = thisTotal / daysPassed;
      const projected = Math.round(thisTotal + avgDaily * daysLeft);
      list.push({ icon: "🔮", text: `At your current rate, you'll spend ~₹${projected.toLocaleString()} this month.`, type: "info" });
    }

    return list.slice(0, 6);
  }, [entries, thisMonth, lastMonth]);

  // ── AI Insights via Groq ───────────────────────────────────────
  const generateAiInsights = async () => {
    setAiLoading(true);
    setAiError("");
    setAiInsights([]);

    try {
      // Build a compact summary of the user's data
      const thisMonthEntries = entries.filter(e => e.date.slice(0, 7) === thisMonth && !e.isTransfer);
      const lastMonthEntries = entries.filter(e => e.date.slice(0, 7) === lastMonth && !e.isTransfer);

      const summarize = (ents) => {
        const byCategory = {};
        ents.forEach(e => {
          if (!byCategory[e.category]) byCategory[e.category] = { type: e.type, total: 0, count: 0 };
          byCategory[e.category].total += e.amount;
          byCategory[e.category].count += 1;
        });
        return byCategory;
      };

      const thisMonthSummary = summarize(thisMonthEntries);
      const lastMonthSummary = summarize(lastMonthEntries);

      const thisIncome  = thisMonthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const thisExpense = thisMonthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const lastIncome  = lastMonthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const lastExpense = lastMonthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

      const recentEntries = [...entries]
        .filter(e => !e.isTransfer)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20)
        .map(e => `${e.date} ${e.type === "income" ? "+" : "-"}₹${e.amount} (${e.category}${e.note ? ": " + e.note : ""})`);

      const prompt = `You are a personal finance advisor analyzing someone's expense data. Be concise, specific, and actionable.

CURRENT MONTH (${thisMonth}):
- Income: ₹${thisIncome.toLocaleString()}
- Expenses: ₹${thisExpense.toLocaleString()}
- Net: ₹${(thisIncome - thisExpense).toLocaleString()}
- By category: ${JSON.stringify(thisMonthSummary, null, 2)}

LAST MONTH (${lastMonth}):
- Income: ₹${lastIncome.toLocaleString()}
- Expenses: ₹${lastExpense.toLocaleString()}
- By category: ${JSON.stringify(lastMonthSummary, null, 2)}

RECENT 20 TRANSACTIONS:
${recentEntries.join("\n")}

Generate exactly 5 personalized financial insights. Each insight should be:
- Specific to this person's actual data (mention real numbers and categories)
- Actionable or informative
- Different from each other (spending patterns, saving rate, unusual expenses, trends, suggestions)

Respond ONLY with a JSON array of 5 objects, no other text:
[
  {"icon": "emoji", "text": "insight text", "type": "good|warn|info"}
]`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Groq API error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse AI response");
      const parsed = JSON.parse(jsonMatch[0]);

      setAiInsights(parsed);
      setAiGenerated(true);
    } catch (err) {
      console.error("Groq error:", err);
      setAiError(err.message || "Failed to generate insights. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Bill helpers ───────────────────────────────────────────────
  const addBill = async () => {
    if (!bForm.name.trim()) return setBError("Enter a name.");
    if (!bForm.amount || +bForm.amount <= 0) return setBError("Enter a valid amount.");
    setBSaving(true);
    try {
      const created = await pb.collection("bills").create({
        userId, name: bForm.name.trim(), amount: +bForm.amount, dueDay: +bForm.dueDay,
      });
      setBills(prev => [...prev, created]);
      setBForm({ name: "", amount: "", dueDay: "1" });
      setBError("");
    } catch (e) { setBError("Failed to save."); }
    finally { setBSaving(false); }
  };

  const deleteBill = async id => {
    await pb.collection("bills").delete(id);
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const daysUntilDue = (dueDay) => {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  const insightColors  = { warn: "rgba(249,115,22,0.12)", good: "rgba(34,197,94,0.12)", info: "rgba(99,102,241,0.1)" };
  const insightBorders = { warn: "rgba(249,115,22,0.3)",  good: "rgba(34,197,94,0.3)",  info: "rgba(99,102,241,0.25)" };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">Smart analysis of your spending</p>
        </div>
      </div>

      {/* ── Spending Streak ──────────────────────────────────────── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>🔥 Daily Logging Streak</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: streak > 0 ? "rgba(249,115,22,0.12)" : "var(--surface-2)",
            border: `2px solid ${streak > 0 ? "rgba(249,115,22,0.4)" : "var(--border)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: streak > 0 ? "#f97316" : "var(--text-muted)", lineHeight: 1 }}>{streak}</span>
            <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>days</span>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {streak === 0 ? "No streak yet" : streak === 1 ? "1 day streak!" : `${streak} day streak!`}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {streak === 0 ? "Log an expense today to start your streak."
                : streak < 7  ? "Keep logging daily to build your habit."
                : streak < 30 ? "Great consistency! Keep it going."
                : "Incredible discipline! You're a pro."}
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Insights ──────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>🤖 AI Financial Insights</h2>
          <button
            onClick={generateAiInsights}
            disabled={aiLoading || entries.length === 0}
            style={{
              background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)",
              padding: "8px 14px", fontSize: 12, fontWeight: 600,
              cursor: aiLoading || entries.length === 0 ? "not-allowed" : "pointer",
              opacity: aiLoading || entries.length === 0 ? 0.6 : 1,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {aiLoading ? "Analyzing..." : aiGenerated ? "↻ Refresh" : "✨ Generate"}
          </button>
        </div>

        {!aiGenerated && !aiLoading && (
          <div style={{
            textAlign: "center", padding: "24px 16px",
            background: "var(--surface-2)", borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border)",
          }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🧠</p>
            <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>
              Get AI-powered insights
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Click "Generate" to analyze your transactions with AI and get personalized financial insights.
            </p>
          </div>
        )}

        {aiLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 52, borderRadius: "var(--radius-md)",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {aiError && (
          <div style={{
            padding: "12px 14px", borderRadius: "var(--radius-md)",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--red)", fontSize: 13,
          }}>
            ⚠️ {aiError}
          </div>
        )}

        {aiInsights.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aiInsights.map((ins, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 14px", borderRadius: "var(--radius-md)",
                background: insightColors[ins.type] || insightColors.info,
                border: `1px solid ${insightBorders[ins.type] || insightBorders.info}`,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Static Smart Insights ────────────────────────────────── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>💡 Quick Insights</h2>
        {staticInsights.length === 0 ? (
          <p className="empty-msg">Not enough data yet. Add more transactions to see insights.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {staticInsights.map((ins, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 14px", borderRadius: "var(--radius-md)",
                background: insightColors[ins.type],
                border: `1px solid ${insightBorders[ins.type]}`,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bill Reminders ───────────────────────────────────────── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>📅 Bill Reminders</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input className="input" placeholder="Bill name" style={{ flex: 2, minWidth: 120 }}
            value={bForm.name} onChange={e => { setBForm(f => ({ ...f, name: e.target.value })); setBError(""); }} />
          <input className="input" type="number" placeholder="Amount (₹)" style={{ flex: 1, minWidth: 90 }}
            value={bForm.amount} onChange={e => setBForm(f => ({ ...f, amount: e.target.value }))} />
          <select className="input" style={{ flex: 1, minWidth: 80 }}
            value={bForm.dueDay} onChange={e => setBForm(f => ({ ...f, dueDay: e.target.value }))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={addBill} disabled={bSaving} style={{ whiteSpace: "nowrap" }}>
            {bSaving ? "..." : "+ Add"}
          </button>
        </div>
        {bError && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{bError}</p>}

        {bills.length === 0 ? (
          <p className="empty-msg">No bills tracked. Add recurring bills above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bills
              .slice().sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay))
              .map(bill => {
                const days   = daysUntilDue(bill.dueDay);
                const urgent = days <= 3;
                const soon   = days <= 7;
                return (
                  <div key={bill.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: "var(--radius-md)",
                    background: urgent ? "rgba(239,68,68,0.08)" : soon ? "rgba(249,115,22,0.08)" : "var(--surface-2)",
                    border: urgent ? "1px solid rgba(239,68,68,0.25)" : soon ? "1px solid rgba(249,115,22,0.25)" : "1px solid var(--border)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{bill.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Due on day {bill.dueDay} each month</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>₹{bill.amount.toLocaleString()}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: urgent ? "var(--red)" : soon ? "#f97316" : "var(--text-muted)" }}>
                        {days === 0 ? "Due today!" : days === 1 ? "Due tomorrow" : `${days} days`}
                      </p>
                    </div>
                    <button onClick={() => deleteBill(bill.id)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
