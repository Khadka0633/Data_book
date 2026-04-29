import { useState, useEffect, useMemo, useRef } from "react";
import pb from "../pb";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

export default function Insights({ userId, entries, expCats = [], incCats = [] }) {
  const today     = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  // ── Bills ──────────────────────────────────────────────────────
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [bForm,   setBForm]   = useState({ name: "", amount: "", dueDay: "1" });
  const [bError,  setBError]  = useState("");
  const [bSaving, setBSaving] = useState(false);

  // ── AI Insights ────────────────────────────────────────────────
  const [aiInsights,  setAiInsights]  = useState([]);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  // ── AI Chat ────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState([{
    role: "assistant",
    content: "Hey! I'm your AI Financial Coach 👋\n\nI have full access to your transactions and spending patterns. Ask me anything:\n• \"Can I afford a रु15,000 purchase?\"\n• \"Where am I wasting money?\"\n• \"Compare this month vs last month\"",
  }]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    pb.collection("bills").getFullList({ filter: `userId = '${userId}'` })
      .catch(() => []).then(b => setBills(b)).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // ── Streak ─────────────────────────────────────────────────────
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

  // ── Static insights ────────────────────────────────────────────
  const staticInsights = useMemo(() => {
    const list = [];
    const spendByCat = month => {
      const map = {};
      entries.filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === month)
        .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
      return map;
    };
    const thisSpend = spendByCat(thisMonth);
    const lastSpend = spendByCat(lastMonth);
    const thisTotal = Object.values(thisSpend).reduce((a, b) => a + b, 0);
    const lastTotal = Object.values(lastSpend).reduce((a, b) => a + b, 0);

    if (lastTotal > 0 && thisTotal > 0) {
      const diff = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
      if (Math.abs(diff) >= 10)
        list.push({ icon: diff > 0 ? "📈" : "📉", text: `Total spending is ${Math.abs(diff)}% ${diff > 0 ? "higher" : "lower"} this month vs last month.`, type: diff > 0 ? "warn" : "good" });
    }
    new Set([...Object.keys(thisSpend), ...Object.keys(lastSpend)]).forEach(cat => {
      const t = thisSpend[cat] || 0, l = lastSpend[cat] || 0;
      if (l > 0 && t > 0) {
        const pct = Math.round(((t - l) / l) * 100);
        if (pct >= 40) list.push({ icon: "⚠️", text: `You spent ${pct}% more on ${cat} this month vs last month.`, type: "warn" });
      }
    });
    const topCat = Object.entries(thisSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) list.push({ icon: "🏆", text: `Your top expense category this month is ${topCat[0]} at रु${topCat[1].toLocaleString()}.`, type: "info" });
    const thisIncome = entries.filter(e => e.type === "income" && !e.isTransfer && e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0);
    if (thisIncome > 0 && thisTotal > 0) {
      const rate = Math.round(((thisIncome - thisTotal) / thisIncome) * 100);
      list.push(rate > 0
        ? { icon: "💰", text: `You're saving ${rate}% of your income this month. Keep it up!`, type: "good" }
        : { icon: "🚨", text: `You've spent more than you earned this month. Time to review your budget.`, type: "warn" });
    }
    const now = new Date();
    const daysPassed = now.getDate();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - daysPassed;
    if (thisTotal > 0 && daysPassed > 3)
      list.push({ icon: "🔮", text: `At your current rate, you'll spend ~रु${Math.round(thisTotal + (thisTotal / daysPassed) * daysLeft).toLocaleString()} this month.`, type: "info" });
    return list.slice(0, 6);
  }, [entries, thisMonth, lastMonth]);

  // ── Build financial context ────────────────────────────────────
  const buildContext = () => {
    const summarize = list => {
      const byCategory = {};
      let income = 0, expense = 0;
      list.filter(e => !e.isTransfer).forEach(e => {
        if (e.type === "income") income += e.amount;
        else { expense += e.amount; byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; }
      });
      return { income, expense, byCategory, net: income - expense };
    };
    const thisSum = summarize(entries.filter(e => e.date.slice(0, 7) === thisMonth));
    const lastSum = summarize(entries.filter(e => e.date.slice(0, 7) === lastMonth));
    const allSum  = summarize(entries);
    const recent  = [...entries].filter(e => !e.isTransfer)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25)
      .map(e => `${e.date} ${e.type === "income" ? "+" : "-"}रु${e.amount} (${e.category}${e.note ? ": " + e.note : ""})`).join("\n");
    return `You are a friendly personal finance coach for a user in Nepal. Currency is NPR (रु).
Be specific, warm, and concise (3-5 sentences unless detail is asked). Reference actual numbers.

TODAY: ${today}
THIS MONTH (${thisMonth}): Income रु${thisSum.income.toLocaleString()}, Expenses रु${thisSum.expense.toLocaleString()}, Net रु${thisSum.net.toLocaleString()}
By category: ${JSON.stringify(thisSum.byCategory)}
LAST MONTH (${lastMonth}): Income रु${lastSum.income.toLocaleString()}, Expenses रु${lastSum.expense.toLocaleString()}
By category: ${JSON.stringify(lastSum.byCategory)}
ALL TIME: Income रु${allSum.income.toLocaleString()}, Expenses रु${allSum.expense.toLocaleString()}, Net रु${allSum.net.toLocaleString()}
RECENT 25 TRANSACTIONS:\n${recent}
BILLS: ${bills.length > 0 ? bills.map(b => `${b.name} रु${b.amount} due day ${b.dueDay}`).join(", ") : "none"}`;
  };

  // ── Generate AI insights (button) ─────────────────────────────
  const generateAiInsights = async () => {
    setAiLoading(true); setAiError(""); setAiInsights([]);
    try {
      const thisMonthEntries = entries.filter(e => e.date.slice(0, 7) === thisMonth && !e.isTransfer);
      const lastMonthEntries = entries.filter(e => e.date.slice(0, 7) === lastMonth && !e.isTransfer);
      const summarize = ents => {
        const byCategory = {};
        ents.forEach(e => {
          if (!byCategory[e.category]) byCategory[e.category] = { type: e.type, total: 0, count: 0 };
          byCategory[e.category].total += e.amount; byCategory[e.category].count += 1;
        });
        return byCategory;
      };
      const thisIncome  = thisMonthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const thisExpense = thisMonthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const lastIncome  = lastMonthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const lastExpense = lastMonthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const recentEntries = [...entries].filter(e => !e.isTransfer)
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
        .map(e => `${e.date} ${e.type === "income" ? "+" : "-"}रु${e.amount} (${e.category}${e.note ? ": " + e.note : ""})`);

      const prompt = `You are a personal finance advisor analyzing someone's expense data. Be concise, specific, and actionable.

CURRENT MONTH (${thisMonth}):
- Income: रु${thisIncome.toLocaleString()}
- Expenses: रु${thisExpense.toLocaleString()}
- Net: रु${(thisIncome - thisExpense).toLocaleString()}
- By category: ${JSON.stringify(summarize(thisMonthEntries))}

LAST MONTH (${lastMonth}):
- Income: रु${lastIncome.toLocaleString()}
- Expenses: रु${lastExpense.toLocaleString()}
- By category: ${JSON.stringify(summarize(lastMonthEntries))}

RECENT 20 TRANSACTIONS:
${recentEntries.join("\n")}

Generate exactly 5 personalized financial insights. Each should be specific to this person's actual data (mention real numbers), actionable, and different from each other.

Respond ONLY with a JSON array of 5 objects, no other text:
[{"icon": "emoji", "text": "insight text", "type": "good|warn|info"}]`;

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 800 }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Groq API error"); }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse AI response");
      setAiInsights(JSON.parse(jsonMatch[0]));
      setAiGenerated(true);
    } catch (err) {
      setAiError(err.message || "Failed to generate insights. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Send chat message ──────────────────────────────────────────
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 800,
          messages: [
            { role: "system", content: buildContext() },
            ...history,
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Bills ──────────────────────────────────────────────────────
  const addBill = async () => {
    if (!bForm.name.trim()) return setBError("Enter a name.");
    if (!bForm.amount || +bForm.amount <= 0) return setBError("Enter a valid amount.");
    setBSaving(true);
    try {
      const created = await pb.collection("bills").create({ userId, name: bForm.name.trim(), amount: +bForm.amount, dueDay: +bForm.dueDay });
      setBills(prev => [...prev, created]);
      setBForm({ name: "", amount: "", dueDay: "1" }); setBError("");
    } catch { setBError("Failed to save."); }
    finally { setBSaving(false); }
  };

  const deleteBill = async id => {
    await pb.collection("bills").delete(id);
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const daysUntilDue = dueDay => {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - now) / 86400000);
  };

  const insightColors  = { warn: "rgba(249,115,22,0.12)", good: "rgba(34,197,94,0.12)", info: "rgba(99,102,241,0.1)" };
  const insightBorders = { warn: "rgba(249,115,22,0.3)",  good: "rgba(34,197,94,0.3)",  info: "rgba(99,102,241,0.25)" };

  const quickPrompts = [
    "Can I afford a रु15,000 purchase?",
    "Where am I wasting money?",
    "How much did I spend on food?",
    "Compare this month vs last month",
    "What's my savings rate?",
    "Predict my month-end balance",
  ];

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

      {/* ── Streak ── */}
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
                : streak < 7 ? "Keep logging daily to build your habit."
                : streak < 30 ? "Great consistency! Keep it going."
                : "Incredible discipline! You're a pro."}
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Insights (generate button) ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>🤖 AI Financial Insights</h2>
          <button
            onClick={generateAiInsights}
            disabled={aiLoading || entries.length === 0}
            style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: "var(--radius-sm)", padding: "8px 14px",
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              cursor: aiLoading || entries.length === 0 ? "not-allowed" : "pointer",
              opacity: aiLoading || entries.length === 0 ? 0.6 : 1, transition: "all 0.2s",
            }}
          >
            {aiLoading ? "Analyzing..." : aiGenerated ? "↻ Refresh" : "✨ Generate"}
          </button>
        </div>

        {!aiGenerated && !aiLoading && (
          <div style={{ textAlign: "center", padding: "24px 16px", background: "var(--surface-2)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🧠</p>
            <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>Get AI-powered insights</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Click "Generate" to analyze your transactions with AI and get personalized financial insights.
            </p>
          </div>
        )}

        {aiLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 52, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border)", animation: `shimmer 1.5s ease-in-out ${i*0.1}s infinite` }} />
            ))}
          </div>
        )}

        {aiError && (
          <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 13 }}>
            ⚠️ {aiError}
          </div>
        )}

        {aiInsights.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aiInsights.map((ins, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                borderRadius: "var(--radius-md)",
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

      {/* ── Static Quick Insights ── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>💡 Quick Insights</h2>
        {staticInsights.length === 0 ? (
          <p className="empty-msg">Not enough data yet. Add more transactions to see insights.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {staticInsights.map((ins, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: insightColors[ins.type], border: `1px solid ${insightBorders[ins.type]}`,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bill Reminders ── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>📅 Bill Reminders</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input className="input" placeholder="Bill name" style={{ flex: 2, minWidth: 120 }}
            value={bForm.name} onChange={e => { setBForm(f => ({ ...f, name: e.target.value })); setBError(""); }} />
          <input className="input" type="number" placeholder="Amount (रु)" style={{ flex: 1, minWidth: 90 }}
            value={bForm.amount} onChange={e => setBForm(f => ({ ...f, amount: e.target.value }))} />
          <select className="input" style={{ flex: 1, minWidth: 80 }}
            value={bForm.dueDay} onChange={e => setBForm(f => ({ ...f, dueDay: e.target.value }))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Day {d}</option>)}
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
            {bills.slice().sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay)).map(bill => {
              const days = daysUntilDue(bill.dueDay);
              const urgent = days <= 3, soon = days <= 7;
              return (
                <div key={bill.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-md)",
                  background: urgent ? "rgba(239,68,68,0.08)" : soon ? "rgba(249,115,22,0.08)" : "var(--surface-2)",
                  border: urgent ? "1px solid rgba(239,68,68,0.25)" : soon ? "1px solid rgba(249,115,22,0.25)" : "1px solid var(--border)",
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{bill.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Due on day {bill.dueDay} each month</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>रु{bill.amount.toLocaleString()}</p>
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

      {/* ── AI Chat ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
          }}>🤖</div>
          <div>
            <h2 className="card-title" style={{ marginBottom: 0 }}>Chat with Your Finances</h2>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Powered by Groq · Knows your full financial data</p>
          </div>
        </div>

        {/* Chat window */}
        <div style={{
          background: "var(--surface-2)", borderRadius: "var(--radius-md)",
          padding: 14, marginBottom: 12,
          height: 320, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: "80%", padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--accent)" : "var(--surface)",
                color: msg.role === "user" ? "#fff" : "var(--text)",
                fontSize: 13, lineHeight: 1.6,
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {chatLoading && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              }}>🤖</div>
              <div style={{
                padding: "12px 16px", borderRadius: "16px 16px 16px 4px",
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                    animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {quickPrompts.map((p, i) => (
            <button key={i} onClick={() => setChatInput(p)}
              style={{
                fontSize: 11, padding: "5px 10px", borderRadius: 99,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >{p}</button>
          ))}
        </div>

        {/* Input */}
<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <input
    className="input"
    placeholder="Ask anything about your finances..."
    value={chatInput}
    onChange={e => setChatInput(e.target.value)}
    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
    disabled={chatLoading}
    style={{ flex: 1, minWidth: 0 }}
  />
  <button
    onClick={sendChat}
    disabled={chatLoading || !chatInput.trim()}
    className="btn-primary"
    style={{ 
      width: "auto",
      flexShrink: 0,
      padding: "10px 20px", 
      whiteSpace: "nowrap", 
      opacity: (!chatInput.trim() || chatLoading) ? 0.5 : 1 
    }}
  >
    {chatLoading ? "..." : "Ask"}
  </button>
</div>





        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
          The coach has access to your transactions, categories, and bills.
        </p>
      </div>

      <style>{`
        @keyframes aiDot { 0%,60%,100%{transform:translateY(0);opacity:.7} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}
