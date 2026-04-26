import { useState, useEffect, useMemo } from "react";
import pb from "../pb";

// ── Insights Tab ───────────────────────────────────────────────────
// Props: userId, entries, expCats, incCats
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

  useEffect(() => {
    pb.collection("bills").getFullList({ filter: `userId = '${userId}'` })
      .catch(() => [])
      .then(b => setBills(b))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Spending Streak ────────────────────────────────────────────
  // A "good" day = had at least 1 expense logged
  // Streak = consecutive days up to today with at least one expense
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

  // ── Smart Insights ─────────────────────────────────────────────
  const insights = useMemo(() => {
    const list = [];

    // Category spend this month vs last month
    const spendByCat = (month) => {
      const map = {};
      entries
        .filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === month)
        .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
      return map;
    };

    const thisSpend = spendByCat(thisMonth);
    const lastSpend = spendByCat(lastMonth);

    // Total comparison
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

    // Per-category comparison
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

    // Top expense this month
    const topCat = Object.entries(thisSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      list.push({
        icon: "🏆",
        text: `Your top expense category this month is ${topCat[0]} at ₹${topCat[1].toLocaleString()}.`,
        type: "info",
      });
    }

    // Income vs expense ratio
    const thisIncome = entries
      .filter(e => e.type === "income" && !e.isTransfer && e.date.slice(0, 7) === thisMonth)
      .reduce((s, e) => s + e.amount, 0);
    if (thisIncome > 0 && thisTotal > 0) {
      const savingRate = Math.round(((thisIncome - thisTotal) / thisIncome) * 100);
      if (savingRate > 0) {
        list.push({
          icon: "💰",
          text: `You're saving ${savingRate}% of your income this month. Keep it up!`,
          type: "good",
        });
      } else {
        list.push({
          icon: "🚨",
          text: `You've spent more than you earned this month. Time to review your budget.`,
          type: "warn",
        });
      }
    }

    // Days left in month + avg daily spend projection
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysLeft = daysInMonth - daysPassed;
    if (thisTotal > 0 && daysPassed > 3) {
      const avgDaily = thisTotal / daysPassed;
      const projected = Math.round(thisTotal + avgDaily * daysLeft);
      list.push({
        icon: "🔮",
        text: `At your current rate, you'll spend ~₹${projected.toLocaleString()} this month.`,
        type: "info",
      });
    }

    return list.slice(0, 6);
  }, [entries, thisMonth, lastMonth]);

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

  // Days until due this month
  const daysUntilDue = (dueDay) => {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  const insightColors = { warn: "rgba(249,115,22,0.12)", good: "rgba(34,197,94,0.12)", info: "rgba(99,102,241,0.1)" };
  const insightBorders = { warn: "rgba(249,115,22,0.3)", good: "rgba(34,197,94,0.3)", info: "rgba(99,102,241,0.25)" };
  const insightText = { warn: "var(--orange, #f97316)", good: "var(--green)", info: "var(--accent)" };

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
      <div className="card" style={{ marginBottom: 20 }}>
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
              {streak === 0
                ? "Log an expense today to start your streak."
                : streak < 7
                  ? "Keep logging daily to build your habit."
                  : streak < 30
                    ? "Great consistency! Keep it going."
                    : "Incredible discipline! You're a pro."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Smart Insights ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 14 }}>💡 Smart Insights</h2>
        {insights.length === 0 ? (
          <p className="empty-msg">Not enough data yet. Add more transactions to see insights.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((ins, i) => (
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

        {/* Add bill */}
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
              .slice()
              .sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay))
              .map(bill => {
                const days = daysUntilDue(bill.dueDay);
                const urgent = days <= 3;
                const soon = days <= 7;
                return (
                  <div key={bill.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: "var(--radius-md)",
                    background: urgent ? "rgba(239,68,68,0.08)" : soon ? "rgba(249,115,22,0.08)" : "var(--surface-2)",
                    border: urgent ? "1px solid rgba(239,68,68,0.25)" : soon ? "1px solid rgba(249,115,22,0.25)" : "1px solid var(--border)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{bill.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Due on day {bill.dueDay} of each month</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>₹{bill.amount.toLocaleString()}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: urgent ? "var(--red)" : soon ? "#f97316" : "var(--text-muted)", marginTop: 2 }}>
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
