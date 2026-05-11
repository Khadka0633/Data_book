import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import pb from "../pb";

// ── Chart.js CDN loader ────────────────────────────────────────────
function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ── Pie Chart ──────────────────────────────────────────────────────
function PieChart({ data, label = "TOTAL", onSliceClick }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="pie-empty"><span>No data yet</span></div>;

  let cumAngle = -90;
  const radius = 80, cx = 100, cy = 100;
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const angle = pct * 360;
    const sa = (cumAngle * Math.PI) / 180;
    const ea = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(sa), y1 = cy + radius * Math.sin(sa);
    const x2 = cx + radius * Math.cos(ea), y2 = cy + radius * Math.sin(ea);
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
    cumAngle += angle;
    return { ...d, path, pct };
  });

  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.9"
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}>
            <title>{s.label}: रु{s.value.toFixed(2)} ({(s.pct * 100).toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="var(--surface)" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
          रु{total.toFixed(0)}
        </text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="legend-item"
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}>
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">रु{s.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Clickable Category List ────────────────────────────────────────
function CategoryList({ entries, type, categories, chartMonth, onCategoryClick }) {
  const total = useMemo(() =>
    entries
      .filter(e => e.type === type && !e.isTransfer && e.date.slice(0, 7) === chartMonth)
      .reduce((s, e) => s + e.amount, 0),
    [entries, type, chartMonth]
  );

  const catTotals = useMemo(() => {
    const map = {};
    entries
      .filter(e => e.type === type && !e.isTransfer && e.date.slice(0, 7) === chartMonth)
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return categories
      .filter(c => c.name !== "Transfer" && map[c.name])
      .map(c => ({ name: c.name, color: c.color, amount: map[c.name] || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, type, categories, chartMonth]);

  if (catTotals.length === 0)
    return <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}>No data this month.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {catTotals.map((cat) => {
        const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
        return (
          <div key={cat.name}
            onClick={() => onCategoryClick(cat.name, type, cat.color)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 0", borderBottom: "1px solid var(--border)",
              cursor: "pointer", borderRadius: 6, transition: "background 0.15s",
              paddingLeft: 6, paddingRight: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
           <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text)", 
  minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
  {cat.name}
</span>
            <div style={{ width: 80, height: 5, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", width: 34, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", width: 90, textAlign: "right", flexShrink: 0 }}>
              रु{cat.amount.toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Category Monthly Analysis Modal ───────────────────────────────
function CategoryModal({ category, type, color, entries, onClose }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return { key, lbl, total: 0, count: 0 };
    });
    entries
      .filter(e => e.category === category && e.type === type && !e.isTransfer)
      .forEach(e => {
        const slot = months.find(m => m.key === e.date.slice(0, 7));
        if (slot) { slot.total += e.amount; slot.count += 1; }
      });
    return months;
  }, [entries, category, type]);

  const catEntries = useMemo(() =>
    entries
      .filter(e => e.category === category && e.type === type && !e.isTransfer)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, category, type]
  );

  const allTimeTotal = catEntries.reduce((s, e) => s + e.amount, 0);
  const avg          = catEntries.length ? Math.round(allTimeTotal / catEntries.length) : 0;
  const peakMonth    = monthData.reduce((a, b) => b.total > a.total ? b : a, monthData[0]);
  const hasData      = monthData.some(m => m.total > 0);
  const maxVal       = Math.max(...monthData.map(m => m.total), 1);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const safeColor = color && color.length === 7 ? color : "#6366f1";
    const r = parseInt(safeColor.slice(1, 3), 16);
    const g = parseInt(safeColor.slice(3, 5), 16);
    const b = parseInt(safeColor.slice(5, 7), 16);

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: monthData.map(m => m.lbl),
          datasets: [{
            data: monthData.map(m => m.total),
            borderColor: safeColor,
            backgroundColor: `rgba(${r},${g},${b},0.08)`,
            pointBackgroundColor: monthData.map(m => m.total > 0 ? safeColor : `rgba(${r},${g},${b},0.2)`),
            pointBorderColor: safeColor,
            pointRadius: monthData.map(m => m.total > 0 ? 5 : 3),
            pointHoverRadius: 7,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const slot = monthData[ctx.dataIndex];
                  if (slot.total === 0) return "No transactions";
                  return [`रु${slot.total.toLocaleString()}`, `${slot.count} transaction${slot.count !== 1 ? "s" : ""}`];
                },
              },
              backgroundColor: "#1e1e2e", titleColor: "#fff", bodyColor: "#ccc", padding: 10, cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, color: "#888", maxRotation: 45, autoSkip: false },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false },
              ticks: {
                font: { size: 11 }, color: "#888",
                callback: v => v === 0 ? "0" : `रु${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
                maxTicksLimit: 5,
              },
            },
          },
          animation: { duration: 400 },
        },
      });
    };

    if (window.Chart) initChart();
    else {
      const id = setInterval(() => { if (window.Chart) { clearInterval(id); initChart(); } }, 100);
      return () => clearInterval(id);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [monthData, color]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: 520, width: "100%" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
            <h3 className="modal-title" style={{ marginBottom: 0 }}>{category}</h3>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: type === "expense" ? "var(--red)" : "var(--green)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            }}>{type}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {catEntries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0" }}>No transactions found.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "All-time total", value: `रु${allTimeTotal.toLocaleString()}` },
                { label: "Transactions",   value: catEntries.length },
                { label: "Avg per entry",  value: `रु${avg.toLocaleString()}` },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {peakMonth?.total > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: color + "14", border: `1px solid ${color}33`,
                borderRadius: "var(--radius-md)", padding: "9px 14px", marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Peak month</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{peakMonth.lbl} — रु{peakMonth.total.toLocaleString()}</span>
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600 }}>Last 12 months</p>
            <div style={{ position: "relative", width: "100%", height: 260, marginBottom: 24 }}>
              <canvas ref={canvasRef} role="img" aria-label={`Monthly trend for ${category}`} />
              {!hasData && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No data in last 12 months</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Month-by-month</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {[...monthData].reverse().filter(m => m.total > 0).map(m => {
                const pct = Math.round((m.total / maxVal) * 100);
                return (
                  <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 72, flexShrink: 0 }}>{m.lbl}</span>
                    <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, opacity: 0.8 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text)", width: 90, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>रु{m.total.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right", flexShrink: 0 }}>×{m.count}</span>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Recent transactions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {catEntries.slice(0, 20).map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{e.note || e.category}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: type === "expense" ? "var(--red)" : "var(--green)" }}>
                    {type === "income" ? "+" : "−"}रु{e.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {catEntries.length > 20 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>
                  + {catEntries.length - 20} more transactions
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Net Worth Timeline Chart ───────────────────────────────────────
function NetWorthChart({ entries, accounts }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);











  

  const monthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { key, lbl, netWorth: 0 };
    });

    // Compute cumulative net worth up to end of each month
    months.forEach((m, idx) => {
      const cutoffMonth = m.key;
      let total = 0;
      entries
        .filter(e => e.date.slice(0, 7) <= cutoffMonth)
        .forEach(e => { total += e.type === "income" ? e.amount : -e.amount; });
      m.netWorth = total;
    });

    return months;
  }, [entries, accounts]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      const maxVal = Math.max(...monthData.map(m => m.netWorth));
      const isPositive = monthData[monthData.length - 1]?.netWorth >= 0;

      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: monthData.map(m => m.lbl),
          datasets: [{
            label: "Net Worth",
            data: monthData.map(m => m.netWorth),
            borderColor: isPositive ? "#22c55e" : "#ef4444",
            backgroundColor: isPositive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            pointBackgroundColor: isPositive ? "#22c55e" : "#ef4444",
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `Net Worth: रु${ctx.parsed.y.toLocaleString()}`,
              },
              backgroundColor: "#1e1e2e", titleColor: "#fff", bodyColor: "#ccc", padding: 10, cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, color: "#888", maxRotation: 0, autoSkip: false },
              border: { display: false },
            },
            y: {
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false },
              ticks: {
                font: { size: 11 }, color: "#888",
                callback: v => `रु${v >= 1000 || v <= -1000 ? (v / 1000).toFixed(0) + "k" : v}`,
                maxTicksLimit: 5,
              },
            },
          },
          animation: { duration: 600 },
        },
      });
    };

    if (window.Chart) initChart();
    else {
      const id = setInterval(() => { if (window.Chart) { clearInterval(id); initChart(); } }, 100);
      return () => clearInterval(id);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [monthData]);

  const current = monthData[monthData.length - 1]?.netWorth || 0;
  const prev    = monthData[monthData.length - 2]?.netWorth || 0;
  const change  = current - prev;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>📈 Net Worth Timeline</h2>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: current >= 0 ? "var(--green)" : "var(--red)" }}>
            रु{current.toLocaleString()}
          </p>
          <p style={{ fontSize: 11, color: change >= 0 ? "var(--green)" : "var(--red)", marginTop: 2 }}>
            {change >= 0 ? "+" : ""}रु{change.toLocaleString()} vs last month
          </p>
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: 220 }}>
        <canvas ref={canvasRef} />
        {entries.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No data yet</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CSV Export ─────────────────────────────────────────────────────
function exportCSV(entries, accounts, month) {
  const filtered = entries.filter(e => e.date.slice(0, 7) === month);
  const header = ["Date", "Type", "Category", "Note", "Amount", "Account", "Transfer"];
  const rows = filtered.map(e => {
    const acc = accounts.find(a => a.id === e.accountId);
    return [
      e.date,
      e.type,
      e.category,
      `"${(e.note || "").replace(/"/g, '""')}"`,
      e.amount,
      acc ? `${acc.icon} ${acc.name}` : "",
      e.isTransfer ? "Yes" : "No",
    ];
  });
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `nexus-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main ChartsTab ─────────────────────────────────────────────────
export default function ChartsTab({ userId, entries: propEntries, accounts: propAccounts }) {
  const today = new Date().toISOString().split("T")[0];
  const [chartMonth, setChartMonth] = useState(today.slice(0, 7));
  const [entries,    setEntries]    = useState(propEntries || []);
  const [expCats,    setExpCats]    = useState([]);
  const [incCats,    setIncCats]    = useState([]);
  const [accounts,   setAccounts]   = useState(propAccounts || []);
  const [loading,    setLoading]    = useState(!propEntries);
  const [modal,      setModal]      = useState(null);
  const [showLifetime, setShowLifetime] = useState(false);

  // Use prop entries if provided (lifted state), otherwise load own
  useEffect(() => {
    if (propEntries) { setEntries(propEntries); return; }
  }, [propEntries]);

  useEffect(() => {
    if (propAccounts) { setAccounts(propAccounts); return; }
  }, [propAccounts]);

  useEffect(() => {
    const promises = [
      pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }),
      pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }),
    ];
    if (!propEntries) {
      promises.push(pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }));
    }
    if (!propAccounts) {
      promises.push(pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }));
    }
    Promise.all(promises).then(([ec, ic, ...rest]) => {
      setExpCats(ec); setIncCats(ic);
      let i = 0;
      if (!propEntries && rest[i]) { setEntries(rest[i]); i++; }
      if (!propAccounts && rest[i]) { setAccounts(rest[i]); }
    }).finally(() => setLoading(false));
  }, [userId]);

 const monthlyIncome  = entries.filter(e => e.type === "income"  && !e.isTransfer && (showLifetime || e.date.slice(0, 7) === chartMonth)).reduce((s, e) => s + e.amount, 0);
const monthlyExpense = entries.filter(e => e.type === "expense" && !e.isTransfer && (showLifetime || e.date.slice(0, 7) === chartMonth)).reduce((s, e) => s + e.amount, 0);
const monthlySavings = monthlyIncome - monthlyExpense;

  const expensePieData = useMemo(() => {
    const map = {};
    entries.filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === chartMonth)
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return expCats.filter(c => c.name !== "Transfer")
      .map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color }))
      .filter(d => d.value > 0);
  }, [entries, expCats, chartMonth]);

  const incomePieData = useMemo(() => {
    const map = {};
    entries.filter(e => e.type === "income" && !e.isTransfer && e.date.slice(0, 7) === chartMonth)
      .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return incCats.filter(c => c.name !== "Transfer")
      .map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color }))
      .filter(d => d.value > 0);
  }, [entries, incCats, chartMonth]);

  const openModal = useCallback((category, type, color) => setModal({ category, type, color }), []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading charts...</p>
    </div>
  );

  return (
    <div className="page">
      <ChartJsLoader />

      {modal && (
        <CategoryModal
          category={modal.category} type={modal.type} color={modal.color}
          entries={entries} onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Charts</h1>
          <p className="page-sub">Visual breakdown of your finances</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
  <button
    onClick={() => setShowLifetime(v => !v)}
    style={{
      background: showLifetime ? "rgba(99,102,241,0.2)" : "var(--surface-2)",
      color: showLifetime ? "var(--accent)" : "var(--text-muted)",
      border: showLifetime ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    {showLifetime ? "📊 Lifetime" : "📊 Lifetime"}
  </button>
  <input
    type="month"
    value={chartMonth}
    onChange={e => { setChartMonth(e.target.value); setShowLifetime(false); }}
    className="input compact"
    style={{ width: "auto", opacity: showLifetime ? 0.4 : 1 }}
    disabled={showLifetime}
  />
  <button className="btn-transfer" onClick={() => exportCSV(entries, accounts, chartMonth)}>
    ↓ Export CSV
  </button>
</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="month" value={chartMonth}
            onChange={e => setChartMonth(e.target.value)}
            className="input compact" style={{ width: "auto" }} />
          <button className="btn-transfer" onClick={() => exportCSV(entries, accounts, chartMonth)}
            title="Download this month as CSV">
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="stat-grid">
        <div className="stat-card income-card">
          <div className="stat-icon">↑</div>
          <div><p className="stat-label">Income</p><p className="stat-value">रु{monthlyIncome.toLocaleString()}</p></div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">↓</div>
          <div><p className="stat-label">Expenses</p><p className="stat-value">रु{monthlyExpense.toLocaleString()}</p></div>
        </div>
        <div className={`stat-card ${monthlySavings >= 0 ? "balance-pos" : "balance-neg"}`}>
          <div className="stat-icon">◈</div>
          <div><p className="stat-label">Saved</p><p className="stat-value">रु{monthlySavings.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Net Worth Timeline */}
      <NetWorthChart entries={entries} accounts={accounts} />

      {/* Pie + category lists */}
      <div className="two-col">
        {/* Income */}
        <div className="card">
          <h2 className="card-title" style={{ color: "var(--green)", marginBottom: 16 }}>💚 Income Breakdown</h2>
          <PieChart data={incomePieData} label="INCOME"
            onSliceClick={label => {
              const cat = incCats.find(c => c.name === label);
              openModal(label, "income", cat?.color || "#22c55e");
            }}
          />
          <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Categories — click to analyze
            </p>
            <CategoryList entries={entries} type="income" categories={incCats} chartMonth={chartMonth} onCategoryClick={openModal} />
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <h2 className="card-title" style={{ color: "var(--red)", marginBottom: 16 }}>❤️ Expense Breakdown</h2>
          <PieChart data={expensePieData} label="EXPENSES"
            onSliceClick={label => {
              const cat = expCats.find(c => c.name === label);
              openModal(label, "expense", cat?.color || "#ef4444");
            }}
          />
          <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Categories — click to analyze
            </p>
            <CategoryList entries={entries} type="expense" categories={expCats} chartMonth={chartMonth} onCategoryClick={openModal} />
          </div>
        </div>
      </div>
    </div>
  );
}
