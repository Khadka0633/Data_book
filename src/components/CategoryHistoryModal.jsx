import { useEffect, useRef, useMemo } from "react";

function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  return null;
}

/**
 * CategoryHistoryModal
 *
 * Props:
 *   category   – string
 *   type       – "expense" | "income"
 *   entries    – all entries array
 *   accounts   – all accounts array
 *   getCatColor – (category, type) => color string
 *   onClose    – () => void
 */
export default function CategoryHistoryModal({
  category,
  type,
  entries,
  accounts,
  getCatColor,
  onClose,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const catEntries = entries
    .filter(
      (e) =>
        e.category === category && e.type === type && !Boolean(e.isTransfer),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = catEntries.reduce((s, e) => s + e.amount, 0);
  const avg = catEntries.length ? total / catEntries.length : 0;
  const color = getCatColor(category, type);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months.push({ key, lbl, total: 0, count: 0 });
    }
    catEntries.forEach((e) => {
      const slot = months.find((m) => m.key === e.date.slice(0, 7));
      if (slot) {
        slot.total += e.amount;
        slot.count += 1;
      }
    });
    return months;
  }, [catEntries]);

  const hasData = monthData.some((m) => m.total > 0);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    const safeColor = color && color.length === 7 ? color : "#6366f1";
    const r = parseInt(safeColor.slice(1, 3), 16);
    const g = parseInt(safeColor.slice(3, 5), 16);
    const b = parseInt(safeColor.slice(5, 7), 16);

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: monthData.map((m) => m.lbl),
          datasets: [
            {
              data: monthData.map((m) => m.total),
              borderColor: safeColor,
              backgroundColor: `rgba(${r},${g},${b},0.08)`,
              pointBackgroundColor: monthData.map((m) =>
                m.total > 0 ? safeColor : `rgba(${r},${g},${b},0.2)`,
              ),
              pointBorderColor: safeColor,
              pointRadius: monthData.map((m) => (m.total > 0 ? 5 : 3)),
              pointHoverRadius: 7,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const slot = monthData[ctx.dataIndex];
                  if (slot.total === 0) return "No transactions";
                  return [
                    `रु${slot.total.toLocaleString()}`,
                    `${slot.count} transaction${slot.count !== 1 ? "s" : ""}`,
                  ];
                },
              },
              backgroundColor: "#1e1e2e",
              titleColor: "#fff",
              bodyColor: "#ccc",
              padding: 10,
              cornerRadius: 8,
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
                font: { size: 11 },
                color: "#888",
                callback: (v) =>
                  v === 0 ? "0" : `रु${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
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
      const interval = setInterval(() => {
        if (window.Chart) {
          clearInterval(interval);
          initChart();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [monthData, color]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: 520, width: "100%" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <h3 className="modal-title" style={{ marginBottom: 0 }}>
              {category}
            </h3>
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 99,
                background:
                  type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                color: type === "expense" ? "var(--red)" : "var(--green)",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {type}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {catEntries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}>
            No transactions found.
          </p>
        ) : (
          <>
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: "Total", value: `रु${total.toLocaleString()}` },
                { label: "Count", value: catEntries.length },
                { label: "Avg", value: `रु${Math.round(avg).toLocaleString()}` },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ position: "relative", width: "100%", height: 200, marginBottom: 16 }}>
              <canvas ref={canvasRef} />
              {!hasData && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    No data in last 12 months
                  </span>
                </div>
              )}
            </div>

            {/* Transaction list */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {catEntries.slice(0, 20).map((e) => {
                const acc = accounts.find((a) => a.id === e.accountId);
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                        {e.note || e.category}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                        {acc && (
                          <span
                            style={{
                              marginLeft: 6,
                              padding: "1px 5px",
                              borderRadius: 99,
                              background: acc.color + "22",
                              color: acc.color,
                            }}
                          >
                            {acc.icon} {acc.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: type === "expense" ? "var(--red)" : "var(--green)",
                      }}
                    >
                      रु{e.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <ChartJsLoader />
    </div>
  );
}
