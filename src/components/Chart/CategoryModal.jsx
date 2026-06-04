
import { useMemo, useRef, useEffect } from "react";


export default function CategoryModal({ category, type, color, entries, onClose }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return { key, lbl, total: 0, count: 0 };
    });
    entries
      .filter(
        (e) => e.category === category && e.type === type && !e.isTransfer,
      )
      .forEach((e) => {
        const slot = months.find((m) => m.key === e.date.slice(0, 7));
        if (slot) {
          slot.total += e.amount;
          slot.count += 1;
        }
      });
    return months;
  }, [entries, category, type]);

  const catEntries = useMemo(
    () =>
      entries
        .filter(
          (e) => e.category === category && e.type === type && !e.isTransfer,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, category, type],
  );

  const allTimeTotal = catEntries.reduce((s, e) => s + e.amount, 0);
  const avg = catEntries.length
    ? Math.round(allTimeTotal / catEntries.length)
    : 0;
  const peakMonth = monthData.reduce(
    (a, b) => (b.total > a.total ? b : a),
    monthData[0],
  );
  const hasData = monthData.some((m) => m.total > 0);
  const maxVal = Math.max(...monthData.map((m) => m.total), 1);

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
              ticks: {
                font: { size: 10 },
                color: "#888",
                maxRotation: 45,
                autoSkip: false,
              },
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
                  v === 0
                    ? "0"
                    : `रु${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
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
      const id = setInterval(() => {
        if (window.Chart) {
          clearInterval(id);
          initChart();
        }
      }, 100);
      return () => clearInterval(id);
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [monthData, color]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          maxWidth: 520,
          width: "100%",
        }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 12,
                height: 12,
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
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 99,
                background:
                  type === "expense"
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(34,197,94,0.12)",
                color: type === "expense" ? "var(--red)" : "var(--green)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {type}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {catEntries.length === 0 ? (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              padding: "20px 0",
            }}
          >
            No transactions found.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "All-time total",
                  value: `रु${allTimeTotal.toLocaleString()}`,
                },
                { label: "Transactions", value: catEntries.length },
                { label: "Avg per entry", value: `रु${avg.toLocaleString()}` },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    {s.label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {peakMonth?.total > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: color + "14",
                  border: `1px solid ${color}33`,
                  borderRadius: "var(--radius-md)",
                  padding: "9px 14px",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Peak month
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {peakMonth.lbl} — रु{peakMonth.total.toLocaleString()}
                </span>
              </div>
            )}

            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              Last 12 months
            </p>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 260,
                marginBottom: 24,
              }}
            >
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Monthly trend for ${category}`}
              />
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

            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Month-by-month
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                marginBottom: 20,
              }}
            >
              {[...monthData]
                .reverse()
                .filter((m) => m.total > 0)
                .map((m) => {
                  const pct = Math.round((m.total / maxVal) * 100);
                  return (
                    <div
                      key={m.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          width: 72,
                          flexShrink: 0,
                        }}
                      >
                        {m.lbl}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          background: "var(--surface-2)",
                          borderRadius: 4,
                          height: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: color,
                            borderRadius: 4,
                            opacity: 0.8,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text)",
                          width: 90,
                          textAlign: "right",
                          flexShrink: 0,
                          fontWeight: 600,
                        }}
                      >
                        रु{m.total.toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          width: 32,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        ×{m.count}
                      </span>
                    </div>
                  );
                })}
            </div>

            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Recent transactions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {catEntries.slice(0, 20).map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        fontWeight: 500,
                      }}
                    >
                      {e.note || e.category}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(e.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: type === "expense" ? "var(--red)" : "var(--green)",
                    }}
                  >
                    {type === "income" ? "+" : "−"}रु{e.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {catEntries.length > 20 && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: "10px 0",
                  }}
                >
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
