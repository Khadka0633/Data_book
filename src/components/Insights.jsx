import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import supabase from "../supabase";
import MultiCurrencyWidget from "./MultiCurrencyWidget";
import SportsTab from "./Sportstab";
import TabButton from "./Insight/TabButton";
import ChartJsLoader from "./Chart/ChartJsLoader";
import NetWorthChart from "./Insight/NetWorthChart";
import IncomeExpenseChart from "./Insight/IncomeExpenseChart";



// ── Main Component ─────────────────────────────────────────────────
export default function Insights({
  userId,
  accounts,
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

  // ── Chart View ──────────────────────────────────────────────────
  const [chartView, setChartView] = useState("networth");



  // ── Load bills from Supabase ───────────────────────────────────
  useEffect(() => {
    if (propBills) {
      setBills(propBills);
      setLoading(false);
      return;
    }

    const loadBills = async () => {
      try {
        const { data, error } = await supabase
          .from("bills")
          .select("*")
          .eq("user_id", userId);

        if (error) throw error;
        setBills(data || []);
      } catch (err) {
        console.error("Failed to load bills:", err);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, [userId, propBills]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ai?.messages, ai?.chatLoading]);

  // ── Gym derived values ─────────────────────────────────────────
  

  // ── Search results ─────────────────────────────────────────────
  // NOTE: entries use is_transfer (Supabase snake_case)
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();
    return entries
      .filter((e) => {
        if (e.is_transfer) return false;
        if (filterType !== "all" && e.type !== filterType) return false;
        if (filterCategory !== "all" && e.category !== filterCategory)
          return false;
        if (filterPeriod !== "all") {
          const entryDate = new Date(e.date + "T00:00:00");
          if (filterPeriod === "today" && e.date !== today) return false;
          if (filterPeriod === "week") {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            if (entryDate < weekAgo) return false;
          }
          if (filterPeriod === "month" && e.date.slice(0, 7) !== thisMonth)
            return false;
          if (filterPeriod === "last3") {
            const threeMonthsAgo = new Date(
              now.getFullYear(),
              now.getMonth() - 3,
              1,
            );
            if (entryDate < threeMonthsAgo) return false;
          }
        }
        if (q) {
          const inNote = e.note?.toLowerCase().includes(q);
          const inCategory = e.category?.toLowerCase().includes(q);
          const inAmount = String(e.amount).includes(q);
          if (!inNote && !inCategory && !inAmount) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    entries,
    searchQuery,
    filterType,
    filterCategory,
    filterPeriod,
    today,
    thisMonth,
  ]);

  // ── Finance streak ─────────────────────────────────────────────
  const streak = useMemo(() => {
    const expenseDates = new Set(
      entries
        .filter((e) => e.type === "expense" && !e.is_transfer)
        .map((e) => e.date),
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

  // ── Monthly stats ──────────────────────────────────────────────
  const thisMonthIncome = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.type === "income" &&
            !e.is_transfer &&
            e.date.slice(0, 7) === thisMonth,
        )
        .reduce((s, e) => s + Number(e.amount), 0),
    [entries, thisMonth],
  );

  const thisMonthExpense = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.type === "expense" &&
            !e.is_transfer &&
            e.date.slice(0, 7) === thisMonth,
        )
        .reduce((s, e) => s + Number(e.amount), 0),
    [entries, thisMonth],
  );

  const savedRate =
    thisMonthIncome > 0
      ? Math.round(
          ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100,
        )
      : 0;

  // ── Static insights ────────────────────────────────────────────
  const staticInsights = useMemo(() => {
    const list = [];

    const spendByCat = (month) => {
      const map = {};
      entries
        .filter(
          (e) =>
            e.type === "expense" &&
            !e.is_transfer &&
            e.date.slice(0, 7) === month,
        )
        .forEach((e) => {
          map[e.category] = (map[e.category] || 0) + Number(e.amount);
        });
      return map;
    };

    const thisSpend = spendByCat(thisMonth);
    const lastSpend = spendByCat(lastMonth);
    const thisTotal = Object.values(thisSpend).reduce((a, b) => a + b, 0);
    const lastTotal = Object.values(lastSpend).reduce((a, b) => a + b, 0);

    if (lastTotal > 0 && thisTotal > 0) {
      const diff = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
      if (Math.abs(diff) >= 10)
        list.push({
          icon: diff > 0 ? "📈" : "📉",
          text: `Spending is ${Math.abs(diff)}% ${diff > 0 ? "higher" : "lower"} this month vs last.`,
          type: diff > 0 ? "warn" : "good",
        });
    }

    new Set([...Object.keys(thisSpend), ...Object.keys(lastSpend)]).forEach(
      (cat) => {
        const t = thisSpend[cat] || 0,
          l = lastSpend[cat] || 0;
        if (l > 0 && t > 0) {
          const pct = Math.round(((t - l) / l) * 100);
          if (pct >= 40)
            list.push({
              icon: "⚠️",
              text: `You spent ${pct}% more on ${cat} this month vs last.`,
              type: "warn",
            });
        }
      },
    );

    const topCat = Object.entries(thisSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat)
      list.push({
        icon: "🏆",
        text: `Top category: ${topCat[0]} at रु${topCat[1].toLocaleString()}.`,
        type: "info",
      });

    if (thisMonthIncome > 0 && thisTotal > 0) {
      const rate = Math.round(
        ((thisMonthIncome - thisTotal) / thisMonthIncome) * 100,
      );
      list.push(
        rate > 0
          ? {
              icon: "💰",
              text: `You're saving ${rate}% of income this month. Keep it up!`,
              type: "good",
            }
          : {
              icon: "🚨",
              text: `You've spent more than you earned this month.`,
              type: "warn",
            },
      );
    }

    const now = new Date();
    const daysPassed = now.getDate();
    const daysLeft =
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - daysPassed;
    if (thisTotal > 0 && daysPassed > 3)
      list.push({
        icon: "🔮",
        text: `At current rate, you'll spend ~रु${Math.round(
          thisTotal + (thisTotal / daysPassed) * daysLeft,
        ).toLocaleString()} this month.`,
        type: "info",
      });

    return list.slice(0, 6);
  }, [entries, thisMonth, lastMonth, thisMonthIncome]);

  const insightColors = {
    warn: "rgba(249,115,22,0.12)",
    good: "rgba(34,197,94,0.12)",
    info: "rgba(99,102,241,0.1)",
  };
  const insightBorders = {
    warn: "rgba(249,115,22,0.3)",
    good: "rgba(34,197,94,0.3)",
    info: "rgba(99,102,241,0.25)",
  };

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

  const tabs = [
    { id: "overview", label: "Overview", icon: "💡" },
    { id: "currency", label: "Currency", icon: "💱" },
    { id: "ai", label: "AI Chat", icon: "🤖" },
    { id: "sports", label: "Sports", icon: "⚽" },
  ];

  return (
    <div className="page">
      <style>{`
        @keyframes aiDot { 0%,60%,100%{transform:translateY(0);opacity:.7} 30%{transform:translateY(-5px);opacity:1} }
        @media (max-width: 500px) { .tab-label { display: none; } }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--surface-2)",
          borderRadius: "var(--radius-md)",
          padding: 4,
          border: "1px solid var(--border)",
        }}
      >
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            {...t}
            active={activeTab === t.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Search bar */}
          <input
            className="input"
            placeholder="🔍 Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Search results */}
          {searchQuery.trim() && (
            <div className="card" style={{ padding: "12px 16px" }}>
              {searchResults.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  No results found.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  {searchResults.slice(0, 30).map((e, idx) => (
                    <div
                      key={`${e.id}-${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text)",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.note || e.category}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 1,
                          }}
                        >
                          {e.category} ·{" "}
                          {new Date(e.date + "T00:00:00").toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginLeft: 8,
                          color:
                            e.type === "income"
                              ? "var(--green)"
                              : "var(--red)",
                        }}
                      >
                        {e.type === "income" ? "+" : "−"}रु
                        {Number(e.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            {[
              {
                label: "Income",
                value: thisMonthIncome,
                color: "var(--green)",
                prefix: "रु",
                big: true,
              },
              {
                label: "Expenses",
                value: thisMonthExpense,
                color: "var(--red)",
                prefix: "रु",
                big: true,
              },
              {
                label: "Saved",
                value: savedRate,
                color: savedRate >= 0 ? "var(--accent)" : "var(--red)",
                suffix: "%",
                big: false,
              },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "16px 10px",
                  textAlign: "center",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {s.prefix || ""}
                  {s.big ? s.value.toLocaleString() : s.value}
                  {s.suffix || ""}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 16,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {[
              { id: "networth", label: "Net Worth" },
              { id: "incomevexp", label: "Income vs Expense" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setChartView(t.id)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  color:
                    chartView === t.id ? "var(--accent)" : "var(--text-muted)",
                  borderBottom:
                    chartView === t.id
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {chartView === "networth" && (
            <NetWorthChart entries={entries} accounts={accounts} />
          )}
          {chartView === "incomevexp" && (
            <div className="card">
              <IncomeExpenseChart entries={entries} />
            </div>
          )}

          <ChartJsLoader />

          {/* Quick Insights */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                💡 Quick Insights
              </span>
            </div>
            {staticInsights.length === 0 ? (
              <p className="empty-msg">
                Not enough data yet. Add more transactions.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {staticInsights.map((ins, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: insightColors[ins.type],
                      border: `1px solid ${insightBorders[ins.type]}`,
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0 }}>
                      {ins.icon}
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {ins.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: SPORTS
      ══════════════════════════════════════════ */}
      {activeTab === "sports" && <SportsTab />}

     
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
              <div>
                <h2 className="card-title" style={{ marginBottom: 0 }}>
                  Nexus AI
                </h2>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Knows all your data · Can take actions · Remembers your chats
                </p>
              </div>
            </div>
            <button
              onClick={ai?.clearChat}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 10px",
                fontSize: 11,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          {/* Chat window */}
          <div
            style={{
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              marginBottom: 12,
              height: 400,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {ai?.messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 8,
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 2,
                      background:
                        "linear-gradient(135deg, var(--accent), #8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      msg.role === "user" ? "var(--accent)" : "var(--surface)",
                    color: msg.role === "user" ? "#fff" : "var(--text)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    border:
                      msg.role === "assistant"
                        ? "1px solid var(--border)"
                        : "none",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {ai?.chatLoading && (
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      "linear-gradient(135deg, var(--accent), #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            {[
              "What's my top expense?",
              "How much did I save?",
              "Compare months",
              "Set food budget 3000",
            ].map((p) => (
              <button
                key={p}
                onClick={() => ai?.sendMessage(p)}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 99,
                  background: "rgba(99,102,241,0.1)",
                  color: "var(--accent)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  ai?.sendMessage(chatInput);
                  setChatInput("");
                }
              }}
              disabled={ai?.chatLoading}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => {
                ai?.sendMessage(chatInput);
                setChatInput("");
              }}
              disabled={ai?.chatLoading || !chatInput.trim()}
              className="btn-primary"
              style={{
                width: "auto",
                flexShrink: 0,
                padding: "10px 20px",
                whiteSpace: "nowrap",
                opacity: !chatInput.trim() || ai?.chatLoading ? 0.5 : 1,
              }}
            >
              {ai?.chatLoading ? "..." : "Send"}
            </button>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Nexus AI knows your transactions, budgets and goals · Chat history saved
          </p>
        </div>
      )}
    </div>
  );
}
