



import { useEffect, useRef, useMemo } from "react";

export default function NetWorthChart({ entries, accounts }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      return { key, lbl, netWorth: 0 };
    });

    // Compute cumulative net worth up to end of each month
    months.forEach((m, idx) => {
      const cutoffMonth = m.key;
      let total = 0;
      entries
        .filter((e) => e.date.slice(0, 7) <= cutoffMonth)
        .forEach((e) => {
          total += e.type === "income" ? e.amount : -e.amount;
        });
      m.netWorth = total;
    });

    return months;
  }, [entries, accounts]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      const maxVal = Math.max(...monthData.map((m) => m.netWorth));
      const isPositive = monthData[monthData.length - 1]?.netWorth >= 0;

      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: monthData.map((m) => m.lbl),
          datasets: [
            {
              label: "Net Worth",
              data: monthData.map((m) => m.netWorth),
              borderColor: isPositive ? "#22c55e" : "#ef4444",
              backgroundColor: isPositive
                ? "rgba(34,197,94,0.08)"
                : "rgba(239,68,68,0.08)",
              pointBackgroundColor: isPositive ? "#22c55e" : "#ef4444",
              pointRadius: 4,
              pointHoverRadius: 7,
              borderWidth: 2.5,
              fill: true,
              tension: 0.3,
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
                label: (ctx) => `Net Worth: रु${ctx.parsed.y.toLocaleString()}`,
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
                maxRotation: 0,
                autoSkip: false,
              },
              border: { display: false },
            },
            y: {
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false },
              ticks: {
                font: { size: 11 },
                color: "#888",
                callback: (v) =>
                  `रु${v >= 1000 || v <= -1000 ? (v / 1000).toFixed(0) + "k" : v}`,
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
  }, [monthData]);

  const current = monthData[monthData.length - 1]?.netWorth || 0;
  const prev = monthData[monthData.length - 2]?.netWorth || 0;
  const change = current - prev;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          📈 Net Worth Timeline
        </h2>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: current >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            रु{current.toLocaleString()}
          </p>
          <p
            style={{
              fontSize: 11,
              color: change >= 0 ? "var(--green)" : "var(--red)",
              marginTop: 2,
            }}
          >
            {change >= 0 ? "+" : ""}रु{change.toLocaleString()} vs last month
          </p>
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: 220 }}>
        <canvas ref={canvasRef} />
        {entries.length === 0 && (
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
              No data yet
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
