import { useEffect, useMemo, useRef } from "react";



export default function IncomeExpenseChart({ entries }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const monthData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short" });
      const income = entries
        .filter(
          (e) =>
            e.type === "income" && !e.is_transfer && e.date.slice(0, 7) === key,
        )
        .reduce((s, e) => s + e.amount, 0);
      const expense = entries
        .filter(
          (e) =>
            e.type === "expense" && !e.is_transfer && e.date.slice(0, 7) === key,
        )
        .reduce((s, e) => s + e.amount, 0);
      return { key, lbl, income, expense };
    });
  }, [entries]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: monthData.map((m) => m.lbl),
          datasets: [
            {
              label: "Income",
              data: monthData.map((m) => m.income),
              backgroundColor: "rgba(34,197,94,0.7)",
              borderRadius: 4,
            },
            {
              label: "Expense",
              data: monthData.map((m) => m.expense),
              backgroundColor: "rgba(239,68,68,0.7)",
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: { color: "#888", font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  `${ctx.dataset.label}: रु${ctx.parsed.y.toLocaleString()}`,
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
              ticks: { color: "#888", font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false },
              ticks: {
                color: "#888",
                font: { size: 11 },
                callback: (v) =>
                  `रु${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`,
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
  }, [monthData]);

  return (
    <div style={{ position: "relative", width: "100%", height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}