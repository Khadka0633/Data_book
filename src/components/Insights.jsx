import { useState, useEffect, useMemo, useRef } from "react";
import pb from "../pb";

export default function Insights({ userId, entries, expCats = [], incCats = [], bills: propBills, onBillsChange, ai }) {
  const today     = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [bills,   setBills]   = useState(propBills || []);
  const [loading, setLoading] = useState(!propBills);
  const [bForm,   setBForm]   = useState({ name: "", amount: "", dueDay: "1" });
  const [bError,  setBError]  = useState("");
  const [bSaving, setBSaving] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // Natural language input state
  const [nlInput,    setNlInput]    = useState("");
  const [nlParsed,   setNlParsed]   = useState(null);
  const [nlLoading,  setNlLoading]  = useState(false);
  const [nlError,    setNlError]    = useState("");
  const [nlSaving,   setNlSaving]   = useState(false);
  const [nlSuccess,  setNlSuccess]  = useState("");

  useEffect(() => {
    if (propBills) { setBills(propBills); return; }
    pb.collection("bills").getFullList({ filter: `userId = '${userId}'` })
      .catch(() => []).then(b => setBills(b)).finally(() => setLoading(false));
  }, [userId, propBills]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ai?.messages, ai?.chatLoading]);

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

  // ── Bills ──────────────────────────────────────────────────────
  const addBill = async () => {
    if (!bForm.name.trim()) return setBError("Enter a name.");
    if (!bForm.amount || +bForm.amount <= 0) return setBError("Enter a valid amount.");
    setBSaving(true);
    try {
      const created = await pb.collection("bills").create({ userId, name: bForm.name.trim(), amount: +bForm.amount, dueDay: +bForm.dueDay });
      setBills(prev => [...prev, created]);
      onBillsChange?.(prev => [...prev, created]);
      setBForm({ name: "", amount: "", dueDay: "1" }); setBError("");
    } catch { setBError("Failed to save."); }
    finally { setBSaving(false); }
  };

  const deleteBill = async id => {
    await pb.collection("bills").delete(id);
    setBills(prev => prev.filter(b => b.id !== id));
    onBillsChange?.(prev => prev.filter(b => b.id !== id));
  };

  const daysUntilDue = dueDay => {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - now) / 86400000);
  };

  // ── Natural Language Entry ─────────────────────────────────────
  const handleNlParse = async () => {
    if (!nlInput.trim() || nlLoading) return;
    setNlLoading(true); setNlParsed(null); setNlError(""); setNlSuccess("");
    try {
      const parsed = await ai.parseNaturalTransaction(nlInput);
      if (!parsed || parsed.confidence < 0.5) {
        setNlError("Couldn't understand that. Try: \"spent 200 on food today\"");
      } else {
        setNlParsed(parsed);
      }
    } catch {
      setNlError("Failed to parse. Try again.");
    } finally {
      setNlLoading(false);
    }
  };

  const handleNlConfirm = async () => {
    if (!nlParsed) return;
    setNlSaving(true);
    try {
      const result = await ai.executeAction({ action: "add_transaction", ...nlParsed });
      setNlSuccess(result || "✅ Transaction added!");
      setNlInput(""); setNlParsed(null);
      setTimeout(() => setNlSuccess(""), 3000);
    } catch {
      setNlError("Failed to save transaction.");
    } finally {
      setNlSaving(false);
    }
  };

  const insightColors  = { warn: "rgba(249,115,22,0.12)", good: "rgba(34,197,94,0.12)", info: "rgba(99,102,241,0.1)" };
  const insightBorders = { warn: "rgba(249,115,22,0.3)",  good: "rgba(34,197,94,0.3)",  info: "rgba(99,102,241,0.25)" };

  const quickPrompts = [
    "Can I afford a रु15,000 purchase?",
    "Where am I wasting money?",
    "Set food budget to 3000",
    "Compare this month vs last month",
    "What's my savings rate?",
    "Add expense 500 transport today",
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

      {/* ── 🗣 Natural Language Entry ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
          }}>✨</div>
          <div>
            <h2 className="card-title" style={{ marginBottom: 0 }}>Quick Add</h2>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Type naturally — AI fills the form</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder='e.g. "spent 200 on cigarettes yesterday"'
            value={nlInput}
            onChange={e => { setNlInput(e.target.value); setNlParsed(null); setNlError(""); }}
            onKeyDown={e => e.key === "Enter" && handleNlParse()}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleNlParse}
            disabled={nlLoading || !nlInput.trim()}
            className="btn-primary"
            style={{ width: "auto", padding: "10px 16px", whiteSpace: "nowrap", opacity: (!nlInput.trim() || nlLoading) ? 0.5 : 1 }}
          >
            {nlLoading ? "..." : "Parse"}
          </button>
        </div>

        {nlError && (
          <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>⚠️ {nlError}</p>
        )}

        {nlSuccess && (
          <p style={{ fontSize: 12, color: "var(--green)", marginTop: 8 }}>{nlSuccess}</p>
        )}

        {nlParsed && nlParsed.confidence >= 0.5 && (
          <div style={{
            marginTop: 12, padding: "12px 14px",
            background: "var(--surface-2)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              AI parsed this as:
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { label: "Type",     value: nlParsed.type,     color: nlParsed.type === "income" ? "var(--green)" : "var(--red)" },
                { label: "Amount",   value: `रु${nlParsed.amount?.toLocaleString()}`, color: "var(--text)" },
                { label: "Category", value: nlParsed.category, color: "var(--accent)" },
                { label: "Date",     value: nlParsed.date,     color: "var(--text-muted)" },
                ...(nlParsed.note ? [{ label: "Note", value: nlParsed.note, color: "var(--text-muted)" }] : []),
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleNlConfirm}
                disabled={nlSaving}
              >
                {nlSaving ? "Saving..." : "✓ Confirm & Save"}
              </button>
              <button
                className="btn-cancel"
                onClick={() => { setNlParsed(null); setNlInput(""); }}
              >
                Edit
              </button>
            </div>
          </div>
        )}
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

      {/* ── Unified AI Chat ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
            }}>🤖</div>
            <div>
              <h2 className="card-title" style={{ marginBottom: 0 }}>Nexus AI</h2>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Knows all your data · Can take actions · Remembers your chats
              </p>
            </div>
          </div>
          <button
            onClick={ai?.clearChat}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>

        {/* Chat window */}
        <div style={{
          background: "var(--surface-2)", borderRadius: "var(--radius-md)",
          padding: 14, marginBottom: 12,
          height: 360, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {ai?.messages.map((msg, i) => (
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

          {ai?.chatLoading && (
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
                {[0, 1, 2].map(i => (
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
            placeholder="Ask anything or give a command..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                ai?.sendMessage(chatInput);
                setChatInput("");
              }
            }}
            disabled={ai?.chatLoading}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            onClick={() => { ai?.sendMessage(chatInput); setChatInput(""); }}
            disabled={ai?.chatLoading || !chatInput.trim()}
            className="btn-primary"
            style={{ width: "auto", flexShrink: 0, padding: "10px 20px", whiteSpace: "nowrap", opacity: (!chatInput.trim() || ai?.chatLoading) ? 0.5 : 1 }}
          >
            {ai?.chatLoading ? "..." : "Send"}
          </button>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
          Nexus AI knows your transactions, budgets, goals & bills · Chat history saved
        </p>
      </div>

      <style>{`
        @keyframes aiDot { 0%,60%,100%{transform:translateY(0);opacity:.7} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}