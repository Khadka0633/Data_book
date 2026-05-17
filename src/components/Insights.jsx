import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import pb from "../pb";
import MultiCurrencyWidget from "./MultiCurrencyWidget";

// ── Gym helpers ────────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(date) {
  return date.toISOString().split("T")[0];
}
function calcGymStreak(attendedSet) {
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1);
  while (attendedSet.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  if (attendedSet.has(toDateStr(today))) streak++;
  return streak;
}

// ── Gym Calendar ───────────────────────────────────────────────────
function GymCalendar({ year, month, attended, today, onToggle }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = toDateStr(today);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === todayStr;
    const isAttended = attended.has(dateStr);
    const isFuture = dateStr > todayStr;
    cells.push(
      <button
        key={dateStr}
        onClick={() => !isFuture && onToggle(dateStr)}
        style={{
          aspectRatio: "1",
          borderRadius: 6,
          border: isToday ? "1.5px solid var(--accent)" : "1px solid transparent",
          background: isAttended ? "rgba(99,102,241,0.18)" : "var(--surface-2)",
          cursor: isFuture ? "default" : "pointer",
          opacity: isFuture ? 0.3 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 1,
          transition: "background 0.15s, transform 0.1s",
          padding: 0,
        }}
        onMouseEnter={(e) => { if (!isFuture) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <span style={{
          fontSize: 11, fontWeight: isToday ? 700 : 500,
          color: isAttended ? "var(--accent)" : isToday ? "var(--text)" : "var(--text-muted)",
          lineHeight: 1,
        }}>
          {d}
        </span>
        {isAttended && <span style={{ fontSize: 6, color: "var(--accent)", lineHeight: 1 }}>●</span>}
      </button>,
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {weekDays.map((d) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 9, fontWeight: 600,
            color: "var(--text-muted)", padding: "3px 0",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells}
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────
function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        flex: 1,
        padding: "10px 8px",
        fontSize: 13,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function Insights({
  userId,
  entries,
  expCats = [],
  incCats = [],
  bills: propBills,
  onBillsChange,
  ai,
}) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [activeTab, setActiveTab] = useState("overview");
  const [bills, setBills] = useState(propBills || []);
  const [loading, setLoading] = useState(!propBills);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // ── Search & Filter ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  // ── Gym state ──────────────────────────────────────────────────
  const todayObj = new Date();
  const [gymRecords, setGymRecords] = useState({});
  const [gymLoading, setGymLoading] = useState(true);
  const [gymSaving, setGymSaving] = useState(false);
  const [gymViewYear, setGymViewYear] = useState(todayObj.getFullYear());
  const [gymViewMonth, setGymViewMonth] = useState(todayObj.getMonth());

  const loadGym = useCallback(async () => {
    setGymLoading(true);
    try {
      const res = await pb.collection("gym_attendance").getFullList({ filter: `userId = '${userId}'`, sort: "date" });
      const map = {};
      res.forEach((r) => (map[r.date] = r.id));
      setGymRecords(map);
    } catch (err) {
      console.error("Failed to load gym attendance:", err);
    } finally {
      setGymLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadGym(); }, [loadGym]);

  const handleGymToggle = async (dateStr) => {
    if (gymSaving) return;
    setGymSaving(true);
    try {
      if (gymRecords[dateStr]) {
        await pb.collection("gym_attendance").delete(gymRecords[dateStr]);
        setGymRecords((prev) => { const next = { ...prev }; delete next[dateStr]; return next; });
      } else {
        const created = await pb.collection("gym_attendance").create({ userId, date: dateStr });
        setGymRecords((prev) => ({ ...prev, [dateStr]: created.id }));
      }
    } catch (err) {
      console.error("Failed to toggle gym attendance:", err);
    } finally {
      setGymSaving(false);
    }
  };

  const gymAttended = useMemo(() => new Set(Object.keys(gymRecords)), [gymRecords]);
  const gymMonthKey = `${gymViewYear}-${String(gymViewMonth + 1).padStart(2, "0")}`;
  const gymMonthCount = useMemo(() => [...gymAttended].filter((d) => d.startsWith(gymMonthKey)).length, [gymAttended, gymMonthKey]);
  const gymDaysInViewMonth = getDaysInMonth(gymViewYear, gymViewMonth);
  const gymIsCurrentMonth = gymViewYear === todayObj.getFullYear() && gymViewMonth === todayObj.getMonth();
  const gymPassedDays = gymIsCurrentMonth ? todayObj.getDate() : gymDaysInViewMonth;
  const gymRate = gymPassedDays > 0 ? Math.round((gymMonthCount / gymPassedDays) * 100) : 0;
  const gymStreak = useMemo(() => calcGymStreak(gymAttended), [gymAttended]);
  const gymTotalAll = gymAttended.size;
  const isTodayAttended = gymAttended.has(today);
  const gymMonthLabel = new Date(gymViewYear, gymViewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const changeGymMonth = (dir) => {
    const d = new Date(gymViewYear, gymViewMonth + dir, 1);
    setGymViewYear(d.getFullYear());
    setGymViewMonth(d.getMonth());
  };

  // ── Search results ─────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();
    return entries.filter((e) => {
      if (e.isTransfer) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (filterPeriod !== "all") {
        const entryDate = new Date(e.date + "T00:00:00");
        if (filterPeriod === "today" && e.date !== today) return false;
        if (filterPeriod === "week") { const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); if (entryDate < weekAgo) return false; }
        if (filterPeriod === "month" && e.date.slice(0, 7) !== thisMonth) return false;
        if (filterPeriod === "last3") { const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1); if (entryDate < threeMonthsAgo) return false; }
      }
      if (q) {
        const inNote = e.note?.toLowerCase().includes(q);
        const inCategory = e.category?.toLowerCase().includes(q);
        const inAmount = String(e.amount).includes(q);
        if (!inNote && !inCategory && !inAmount) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, searchQuery, filterType, filterCategory, filterPeriod, today, thisMonth]);

  useEffect(() => {
    if (propBills) { setBills(propBills); return; }
    pb.collection("bills").getFullList({ filter: `userId = '${userId}'` }).catch(() => []).then((b) => setBills(b)).finally(() => setLoading(false));
  }, [userId, propBills]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ai?.messages, ai?.chatLoading]);

  // ── Finance streak ─────────────────────────────────────────────
  const streak = useMemo(() => {
    const expenseDates = new Set(entries.filter((e) => e.type === "expense" && !e.isTransfer).map((e) => e.date));
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

  // ── Monthly stats ──────────────────────────────────────────────
  const thisMonthIncome = useMemo(() =>
    entries.filter((e) => e.type === "income" && !e.isTransfer && e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [entries, thisMonth]);
  const thisMonthExpense = useMemo(() =>
    entries.filter((e) => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [entries, thisMonth]);
  const savedRate = thisMonthIncome > 0 ? Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100) : 0;

  // ── Static insights ────────────────────────────────────────────
  const staticInsights = useMemo(() => {
    const list = [];
    const spendByCat = (month) => {
      const map = {};
      entries.filter((e) => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === month).forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
      return map;
    };
    const thisSpend = spendByCat(thisMonth);
    const lastSpend = spendByCat(lastMonth);
    const thisTotal = Object.values(thisSpend).reduce((a, b) => a + b, 0);
    const lastTotal = Object.values(lastSpend).reduce((a, b) => a + b, 0);

    if (lastTotal > 0 && thisTotal > 0) {
      const diff = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
      if (Math.abs(diff) >= 10) list.push({ icon: diff > 0 ? "📈" : "📉", text: `Spending is ${Math.abs(diff)}% ${diff > 0 ? "higher" : "lower"} this month vs last.`, type: diff > 0 ? "warn" : "good" });
    }
    new Set([...Object.keys(thisSpend), ...Object.keys(lastSpend)]).forEach((cat) => {
      const t = thisSpend[cat] || 0, l = lastSpend[cat] || 0;
      if (l > 0 && t > 0) {
        const pct = Math.round(((t - l) / l) * 100);
        if (pct >= 40) list.push({ icon: "⚠️", text: `You spent ${pct}% more on ${cat} this month vs last.`, type: "warn" });
      }
    });
    const topCat = Object.entries(thisSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) list.push({ icon: "🏆", text: `Top category: ${topCat[0]} at रु${topCat[1].toLocaleString()}.`, type: "info" });
    if (thisMonthIncome > 0 && thisTotal > 0) {
      const rate = Math.round(((thisMonthIncome - thisTotal) / thisMonthIncome) * 100);
      list.push(rate > 0
        ? { icon: "💰", text: `You're saving ${rate}% of income this month. Keep it up!`, type: "good" }
        : { icon: "🚨", text: `You've spent more than you earned this month.`, type: "warn" });
    }
    const now = new Date();
    const daysPassed = now.getDate();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - daysPassed;
    if (thisTotal > 0 && daysPassed > 3) list.push({ icon: "🔮", text: `At current rate, you'll spend ~रु${Math.round(thisTotal + (thisTotal / daysPassed) * daysLeft).toLocaleString()} this month.`, type: "info" });
    return list.slice(0, 6);
  }, [entries, thisMonth, lastMonth, thisMonthIncome]);

  const insightColors = { warn: "rgba(249,115,22,0.12)", good: "rgba(34,197,94,0.12)", info: "rgba(99,102,241,0.1)" };
  const insightBorders = { warn: "rgba(249,115,22,0.3)", good: "rgba(34,197,94,0.3)", info: "rgba(99,102,241,0.25)" };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: "💡" },
    { id: "search", label: "Search", icon: "🔍" },
    { id: "gym", label: "Gym", icon: "🏋️" },
    { id: "currency", label: "Currency", icon: "💱" },
    { id: "ai", label: "AI Chat", icon: "🤖" },
  ];

  return (
    <div className="page">
      <style>{`
        @keyframes aiDot { 0%,60%,100%{transform:translateY(0);opacity:.7} 30%{transform:translateY(-5px);opacity:1} }
        @media (max-width: 500px) { .tab-label { display: none; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex",
        gap: 4,
        background: "var(--surface-2)",
        borderRadius: "var(--radius-md)",
        padding: 4,
        border: "1px solid var(--border)",
      }}>
        {tabs.map((t) => (
          <TabButton key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Stats bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}>
            {[
              { label: "Income", value: thisMonthIncome, color: "var(--green)", prefix: "रु", suffix: "k", big: true },
              { label: "Expenses", value: thisMonthExpense, color: "var(--red)", prefix: "रु", suffix: "k", big: true },
              { label: "Saved", value: savedRate, color: savedRate >= 0 ? "var(--accent)" : "var(--red)", suffix: "%", big: false },
            ].map((s, i) => (
              <div key={s.label} style={{
                padding: "16px 10px", textAlign: "center",
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
              }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
                  {s.prefix || ""}
                  {s.big
                    ? s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value.toLocaleString()
                    : s.value}
                  {s.suffix || ""}
                </p>
              </div>
            ))}
          </div>

          {/* Finance Streak */}
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>🔥 Logging Streak</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: streak > 0 ? "rgba(249,115,22,0.12)" : "var(--surface-2)",
                border: `2px solid ${streak > 0 ? "rgba(249,115,22,0.4)" : "var(--border)"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: streak > 0 ? "#f97316" : "var(--text-muted)", lineHeight: 1 }}>{streak}</span>
                <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>days</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {streak === 0 ? "No streak yet" : streak === 1 ? "1 day streak!" : `${streak} day streak!`}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                  {streak === 0 ? "Log an expense today to start." : streak < 7 ? "Keep logging daily to build your habit." : streak < 30 ? "Great consistency! Keep it going." : "Incredible discipline! You're a pro."}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>💡 Quick Insights</span>
            </div>
            {staticInsights.length === 0 ? (
              <p className="empty-msg">Not enough data yet. Add more transactions.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {staticInsights.map((ins, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", borderRadius: "var(--radius-sm)",
                    background: insightColors[ins.type],
                    border: `1px solid ${insightBorders[ins.type]}`,
                  }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{ins.icon}</span>
                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{ins.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: SEARCH
      ══════════════════════════════════════════ */}
      {activeTab === "search" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>🔍 Search Transactions</h2>
          <input
            className="input"
            placeholder="Search by note, category, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <select className="input" style={{ flex: 1, minWidth: 100 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All categories</option>
              {[...expCats, ...incCats].map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className="input" style={{ flex: 1, minWidth: 100 }} value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="last3">Last 3 months</option>
            </select>
            {(searchQuery || filterType !== "all" || filterCategory !== "all" || filterPeriod !== "all") && (
              <button onClick={() => { setSearchQuery(""); setFilterType("all"); setFilterCategory("all"); setFilterPeriod("all"); }}
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                ✕ Clear
              </button>
            )}
          </div>

          {(searchQuery || filterType !== "all" || filterCategory !== "all" || filterPeriod !== "all") ? (
            <>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                {searchResults.length > 0 && <span style={{ marginLeft: 8, color: "var(--accent)" }}>Total: रु{searchResults.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>}
              </p>
              {searchResults.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No transactions found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", maxHeight: 400, overflowY: "auto" }}>
                  {searchResults.slice(0, 50).map((e, idx) => (
                    <div key={`${e.id}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: [...expCats, ...incCats].find((c) => c.name === e.category)?.color || "#6366f1" }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.note || e.category}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{e.category} · {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: e.type === "income" ? "var(--green)" : "var(--red)" }}>
                        {e.type === "income" ? "+" : "−"}रु{e.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {searchResults.length > 50 && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>Showing 50 of {searchResults.length} results</p>}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Use filters above to search all your transactions</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: GYM
      ══════════════════════════════════════════ */}
      {activeTab === "gym" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>🏋️ Gym Attendance</h2>

          {/* Check-in button */}
          <button
            onClick={() => handleGymToggle(today)}
            disabled={gymSaving}
            style={{
              width: "100%", padding: "13px", borderRadius: "var(--radius-md)",
              border: isTodayAttended ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid var(--border)",
              background: isTodayAttended ? "rgba(99,102,241,0.12)" : "var(--surface-2)",
              color: isTodayAttended ? "var(--accent)" : "var(--text-muted)",
              fontSize: 14, fontWeight: 700,
              cursor: gymSaving ? "default" : "pointer",
              marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 18 }}>{isTodayAttended ? "✓" : "+"}</span>
            {gymSaving ? "Saving..." : isTodayAttended ? "Attended today" : "Mark today as attended"}
          </button>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "This month", value: gymMonthCount, color: "var(--accent)", sub: `${gymRate}% rate` },
              { label: "Streak", value: gymStreak, color: gymStreak >= 3 ? "var(--green)" : "var(--text)", sub: gymStreak === 1 ? "day" : "days" },
              { label: "All time", value: gymTotalAll, color: "var(--text)", sub: "sessions" },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, padding: "10px 8px", textAlign: "center", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif", lineHeight: 1.1 }}>{s.value}</p>
                {s.sub && <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Calendar nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{gymMonthLabel}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => changeGymMonth(-1)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <button onClick={() => changeGymMonth(1)} disabled={gymIsCurrentMonth} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, cursor: gymIsCurrentMonth ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: gymIsCurrentMonth ? 0.3 : 1 }}>›</button>
            </div>
          </div>

          {gymLoading ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>Loading...</p>
          ) : (
            <GymCalendar year={gymViewYear} month={gymViewMonth} attended={gymAttended} today={todayObj} onToggle={handleGymToggle} />
          )}

          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{gymMonthCount} of {gymPassedDays} days</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: gymRate >= 70 ? "var(--green)" : gymRate >= 40 ? "var(--accent)" : "var(--red)" }}>{gymRate}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${gymRate}%`, borderRadius: 99, background: gymRate >= 70 ? "var(--green)" : gymRate >= 40 ? "var(--accent)" : "var(--red)", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: CURRENCY
      ══════════════════════════════════════════ */}
      {activeTab === "currency" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <MultiCurrencyWidget />
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: AI CHAT
      ══════════════════════════════════════════ */}
      {activeTab === "ai" && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</div>
              <div>
                <h2 className="card-title" style={{ marginBottom: 0 }}>Nexus AI</h2>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Knows all your data · Can take actions · Remembers your chats</p>
              </div>
            </div>
            <button onClick={ai?.clearChat} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
              Clear
            </button>
          </div>

          {/* Chat window */}
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 12, height: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {ai?.messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2, background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {["What's my top expense?", "How much did I save?", "Compare months", "Set food budget 3000"].map((p) => (
              <button key={p} onClick={() => { ai?.sendMessage(p); }}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 99, background: "rgba(99,102,241,0.1)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer", whiteSpace: "nowrap" }}>
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Ask anything or give a command..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { ai?.sendMessage(chatInput); setChatInput(""); } }}
              disabled={ai?.chatLoading}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => { ai?.sendMessage(chatInput); setChatInput(""); }}
              disabled={ai?.chatLoading || !chatInput.trim()}
              className="btn-primary"
              style={{ width: "auto", flexShrink: 0, padding: "10px 20px", whiteSpace: "nowrap", opacity: !chatInput.trim() || ai?.chatLoading ? 0.5 : 1 }}
            >
              {ai?.chatLoading ? "..." : "Send"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
            Nexus AI knows your transactions, budgets and goals · Chat history saved
          </p>
        </div>
      )}
    </div>
  );
}
