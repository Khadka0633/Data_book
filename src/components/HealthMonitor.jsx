import { useState, useEffect, useCallback } from "react";
import pb from "../pb";

const METRICS = [
  { key: "weight",    label: "Weight",       unit: "kg",    icon: "⚖️",  color: "#3b82f6", min: 20,  max: 300    },
  { key: "water",     label: "Water Intake", unit: "L",     icon: "💧",  color: "#06b6d4", min: 0,   max: 10     },
  { key: "sleep",     label: "Sleep",        unit: "hrs",   icon: "🌙",  color: "#8b5cf6", min: 0,   max: 24     },
  { key: "steps",     label: "Steps",        unit: "steps", icon: "👟",  color: "#22c55e", min: 0,   max: 100000 },
  { key: "calories",  label: "Calories",     unit: "kcal",  icon: "🔥",  color: "#f97316", min: 0,   max: 10000  },
  { key: "heartRate", label: "Heart Rate",   unit: "bpm",   icon: "❤️", color: "#ef4444", min: 30,  max: 250    },
];

const GOALS = {
  water: 2.5, sleep: 8, steps: 10000, calories: 2000, heartRate: 72, weight: null,
};

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTop:"3px solid var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"var(--text-muted)", fontSize:14 }}>Loading your health data...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MiniBar({ value, goal, color }) {
  if (!goal || !value) return null;
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div className="mini-bar-track">
      <div className="mini-bar-fill" style={{ width:`${pct}%`, background:color }} />
    </div>
  );
}

function HealthPieChart({ logs }) {
  if (logs.length === 0) return <div className="pie-empty"><span>Log data to see chart</span></div>;

  const latest = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const data = METRICS.filter((m) => latest[m.key]).map((m) => ({
    label: m.label, value: latest[m.key], goal: GOALS[m.key], color: m.color,
  }));

  if (data.length === 0) return <div className="pie-empty"><span>No metrics in latest log</span></div>;

  const total = data.reduce((s, d) => s + (d.goal ? (d.value / d.goal) * 100 : 50), 0);
  let cumAngle = -90;
  const radius = 80, cx = 100, cy = 100;

  const slices = data.map((d) => {
    const pct = (d.goal ? (d.value / d.goal) * 100 : 50) / total;
    const angle = pct * 360;
    const sa = (cumAngle * Math.PI) / 180;
    const ea = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(sa), y1 = cy + radius * Math.sin(sa);
    const x2 = cx + radius * Math.cos(ea), y2 = cy + radius * Math.sin(ea);
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
    cumAngle += angle;
    return { ...d, path };
  });

  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.85">
            <title>{s.label}: {s.value}{s.goal ? ` / ${s.goal}` : ""}</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="var(--surface)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8">LATEST</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="600">Health</text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthMonitor({ userId }) {
  const today = new Date().toISOString().split("T")[0];

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ date: today });

  // ── Load from PocketBase ──────────────────────────────────────
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const records = await pb.collection("health_logs").getFullList({
        filter: `userId = "${userId}"`,
        sort: "-date",
      });
      setLogs(records);
    } catch (err) {
      console.error("Failed to load health logs:", err);
      setError("Could not load health data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // ── Save / Update log ─────────────────────────────────────────
  const addLog = async () => {
    const hasData = METRICS.some((m) => form[m.key] !== undefined && form[m.key] !== "");
    if (!hasData) return;

    setSaving(true);
    setError("");
    try {
      const payload = { userId, date: form.date };
      METRICS.forEach((m) => {
        if (form[m.key] !== undefined && form[m.key] !== "") payload[m.key] = +form[m.key];
      });

      const existing = logs.find((l) => l.date === form.date);
      if (existing) {
        const updated = await pb.collection("health_logs").update(existing.id, payload);
        setLogs((prev) => prev.map((l) => l.id === existing.id ? updated : l));
      } else {
        const created = await pb.collection("health_logs").create(payload);
        setLogs((prev) => [created, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      }
      setForm({ date: today });
    } catch (err) {
      console.error("Failed to save health log:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete log ────────────────────────────────────────────────
  const deleteLog = async (id) => {
    try {
      await pb.collection("health_logs").delete(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  const todayLog = logs.find((l) => l.date === today);
  const isUpdate = !!logs.find((l) => l.date === form.date);

  if (loading) return <LoadingScreen />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Monitor</h1>
          <p className="page-sub">Track your daily wellness metrics</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-md)", padding:"12px 16px", color:"var(--red)", fontSize:13 }}>
          {error}
        </div>
      )}

      {/* Today's snapshot cards */}
      {todayLog && (
        <div className="stat-grid">
          {METRICS.filter((m) => todayLog[m.key]).map((m) => (
            <div key={m.key} className="stat-card metric-card">
              <div className="metric-icon">{m.icon}</div>
              <div style={{ flex:1 }}>
                <p className="stat-label">{m.label}</p>
                <p className="stat-value" style={{ color:m.color }}>
                  {todayLog[m.key]} <span className="unit">{m.unit}</span>
                </p>
                <MiniBar value={todayLog[m.key]} goal={GOALS[m.key]} color={m.color} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="two-col">
        {/* Input form */}
        <div className="card">
          <h2 className="card-title">{isUpdate ? "✏️ Update Entry" : "Log Metrics"}</h2>
          <div className="form-group">
            <input
              type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
            />
            {METRICS.map((m) => (
              <div key={m.key} className="metric-input-row">
                <span className="metric-emoji">{m.icon}</span>
                <input
                  type="number"
                  placeholder={`${m.label} (${m.unit})`}
                  value={form[m.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [m.key]: e.target.value === "" ? undefined : e.target.value })}
                  min={m.min} max={m.max}
                  className="input"
                />
              </div>
            ))}
            <button onClick={addLog} className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : isUpdate ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="card-title">Latest Distribution</h2>
          <HealthPieChart logs={logs} />
        </div>
      </div>

      {/* History table */}
      {logs.length > 0 && (
        <div className="card">
          <h2 className="card-title">Log History</h2>
          <div className="health-table-wrap">
            <table className="health-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {METRICS.map((m) => <th key={m.key}>{m.icon} {m.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="date-cell">
                      {new Date(log.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                    </td>
                    {METRICS.map((m) => (
                      <td key={m.key} style={{ color: log[m.key] ? m.color : "var(--text-muted)" }}>
                        {log[m.key] ? `${log[m.key]} ${m.unit}` : "—"}
                      </td>
                    ))}
                    <td>
                      <button onClick={() => deleteLog(log.id)} className="del-btn" title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
