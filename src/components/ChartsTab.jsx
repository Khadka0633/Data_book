import { useState, useEffect, useMemo, useCallback } from "react";
import supabase from "../supabase";
import PieChart from "./Chart/PieChart";
import ChartJsLoader from "./Chart/ChartJsLoader";
import CategoryList from "./Chart/CategoryList";
import CategoryModal from "./Chart/CategoryModal";

// ── CSV Export ─────────────────────────────────────────────────────
function exportCSV(entries, accounts, month) {
  const filtered = entries.filter((e) => e.date.slice(0, 7) === month);
  const header = [
    "Date",
    "Type",
    "Category",
    "Note",
    "Amount",
    "Account",
    "Transfer",
  ];
  const rows = filtered.map((e) => {
    // account_id (snake_case)
    const acc = accounts.find((a) => a.id === e.account_id);
    return [
      e.date,
      e.type,
      e.category,
      `"${(e.note || "").replace(/"/g, '""')}"`,
      e.amount,
      acc ? `${acc.icon} ${acc.name}` : "",
      e.is_transfer ? "Yes" : "No",
    ];
  });
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexus-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main ChartsTab ─────────────────────────────────────────────────
export default function ChartsTab({
  userId,
  entries: propEntries,
  accounts: propAccounts,
}) {
  const today = new Date().toISOString().split("T")[0];
  const [chartMonth, setChartMonth] = useState(today.slice(0, 7));
  const [entries, setEntries] = useState(propEntries || []);
  const [expCats, setExpCats] = useState([]);
  const [incCats, setIncCats] = useState([]);
  const [accounts, setAccounts] = useState(propAccounts || []);
  const [loading, setLoading] = useState(!propEntries);
  const [modal, setModal] = useState(null);
  const [showLifetime, setShowLifetime] = useState(false);
  const [chartTab, setChartTab] = useState("expense");

  // ── Sync prop entries / accounts ───────────────────────────────
  useEffect(() => {
    if (propEntries) setEntries(propEntries);
  }, [propEntries]);

  useEffect(() => {
    if (propAccounts) setAccounts(propAccounts);
  }, [propAccounts]);

  // ── Load categories (and optionally entries/accounts) from Supabase
  useEffect(() => {
    const load = async () => {
      try {
        const promises = [
          supabase
            .from("expense_categories")
            .select("*")
            .eq("user_id", userId),
          supabase
            .from("income_categories")
            .select("*")
            .eq("user_id", userId),
        ];

        if (!propEntries) {
          promises.push(
            supabase
              .from("entries")
              .select("*")
              .eq("user_id", userId)
              .order("date", { ascending: false }),
          );
        }

        if (!propAccounts) {
          promises.push(
            supabase
              .from("accounts")
              .select("*")
              .eq("user_id", userId),
          );
        }

        const results = await Promise.all(promises);

        const [expRes, incRes] = results;
        if (!expRes.error) setExpCats(expRes.data || []);
        if (!incRes.error) setIncCats(incRes.data || []);

        let idx = 2;
        if (!propEntries && results[idx]) {
          if (!results[idx].error) setEntries(results[idx].data || []);
          idx++;
        }
        if (!propAccounts && results[idx]) {
          if (!results[idx].error) setAccounts(results[idx].data || []);
        }
      } catch (err) {
        console.error("Failed to load chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  // ── Monthly stats — is_transfer (snake_case) ───────────────────
  const monthlyIncome = entries
    .filter(
      (e) =>
        e.type === "income" &&
        !e.is_transfer &&
        (showLifetime || e.date.slice(0, 7) === chartMonth),
    )
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthlyExpense = entries
    .filter(
      (e) =>
        e.type === "expense" &&
        !e.is_transfer &&
        (showLifetime || e.date.slice(0, 7) === chartMonth),
    )
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthlySavings = monthlyIncome - monthlyExpense;

  // ── Pie data — is_transfer (snake_case) ───────────────────────
  const expensePieData = useMemo(() => {
    const map = {};
    entries
      .filter(
        (e) =>
          e.type === "expense" &&
          !e.is_transfer &&
          e.date.slice(0, 7) === chartMonth,
      )
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + Number(e.amount);
      });
    return expCats
      .filter((c) => c.name !== "Transfer")
      .map((c) => ({ label: c.name, value: map[c.name] || 0, color: c.color }))
      .filter((d) => d.value > 0);
  }, [entries, expCats, chartMonth]);

  const incomePieData = useMemo(() => {
    const map = {};
    entries
      .filter(
        (e) =>
          e.type === "income" &&
          !e.is_transfer &&
          e.date.slice(0, 7) === chartMonth,
      )
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + Number(e.amount);
      });
    return incCats
      .filter((c) => c.name !== "Transfer")
      .map((c) => ({ label: c.name, value: map[c.name] || 0, color: c.color }))
      .filter((d) => d.value > 0);
  }, [entries, incCats, chartMonth]);

  const openModal = useCallback(
    (category, type, color) => setModal({ category, type, color }),
    [],
  );

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading charts...</p>
      </div>
    );

  return (
    <div className="page">
      <ChartJsLoader />

      {modal && (
        <CategoryModal
          category={modal.category}
          type={modal.type}
          color={modal.color}
          entries={entries}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="page-title">Charts</h1>
          <p className="page-sub">Visual breakdown of your finances</p>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <button
            onClick={() => setShowLifetime((v) => !v)}
            style={{
              background: showLifetime
                ? "rgba(99,102,241,0.2)"
                : "var(--surface-2)",
              color: showLifetime ? "var(--accent)" : "var(--text-muted)",
              border: showLifetime
                ? "1px solid rgba(99,102,241,0.4)"
                : "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            📊 Lifetime
          </button>
          <input
            type="month"
            value={chartMonth}
            onChange={(e) => {
              setChartMonth(e.target.value);
              setShowLifetime(false);
            }}
            style={{
              width: 130,
              opacity: showLifetime ? 0.4 : 1,
              padding: "8px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
            }}
            disabled={showLifetime}
          />
          <button
            className="btn-transfer"
            onClick={() => exportCSV(entries, accounts, chartMonth)}
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "var(--accent)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="stat-grid">
        <div className="stat-card income-card">
          <div className="stat-icon">↑</div>
          <div>
            <p className="stat-label">Income</p>
            <p className="stat-value">रु{monthlyIncome.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">↓</div>
          <div>
            <p className="stat-label">Expenses</p>
            <p className="stat-value">रु{monthlyExpense.toLocaleString()}</p>
          </div>
        </div>
        <div
          className={`stat-card ${monthlySavings >= 0 ? "balance-pos" : "balance-neg"}`}
        >
          <div className="stat-icon">◈</div>
          <div>
            <p className="stat-label">Saved</p>
            <p className="stat-value">रु{monthlySavings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div
        className="chart-tab-toggle"
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 16,
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {["income", "expense"].map((t) => (
          <button
            key={t}
            onClick={() => setChartTab(t)}
            style={{
              flex: 1,
              padding: "12px 0",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color:
                chartTab === t
                  ? t === "income"
                    ? "var(--green)"
                    : "var(--red)"
                  : "var(--text-muted)",
              borderBottom:
                chartTab === t
                  ? `2px solid ${t === "income" ? "var(--green)" : "var(--red)"}`
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t === "income" ? "💚 Income" : "❤️ Expenses"}
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .chart-tab-toggle { display: none !important; }
          .chart-two-col { display: grid !important; grid-template-columns: 1fr 1fr; gap: 16px; }
          .chart-two-col .card { display: block !important; }
        }
        @media (max-width: 767px) {
          .chart-two-col { display: block !important; }
        }
      `}</style>

      <div className="chart-two-col">
        <div
          className="card"
          style={{ display: chartTab === "income" ? "block" : "none" }}
          id="income-chart-card"
        >
          <h2
            className="card-title"
            style={{ color: "var(--green)", marginBottom: 16 }}
          >
            💚 Income Breakdown
          </h2>
          <PieChart
            data={incomePieData}
            label="INCOME"
            onSliceClick={(label) => {
              const cat = incCats.find((c) => c.name === label);
              openModal(label, "income", cat?.color || "#22c55e");
            }}
          />
        </div>
        <div
          className="card"
          style={{ display: chartTab === "expense" ? "block" : "none" }}
          id="expense-chart-card"
        >
          <h2
            className="card-title"
            style={{ color: "var(--red)", marginBottom: 16 }}
          >
            ❤️ Expense Breakdown
          </h2>
          <PieChart
            data={expensePieData}
            label="EXPENSES"
            onSliceClick={(label) => {
              const cat = expCats.find((c) => c.name === label);
              openModal(label, "expense", cat?.color || "#ef4444");
            }}
          />
        </div>
      </div>
    </div>
  );
}
