import { useState, useEffect } from "react";
import supabase from "../../supabase";



export default function Weight({ userId }) {
  const today = new Date().toISOString().split("T")[0];
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [unit, setUnit] = useState("kg");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load weight logs:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const addLog = async () => {
    if (!weight || isNaN(weight) || +weight <= 0) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("weight_logs")
        .insert({ user_id: userId, weight: +weight, unit, note: note.trim(), date })
        .select()
        .single();
      if (error) throw error;
      setLogs((prev) => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setWeight(""); setNote("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id) => {
    await supabase.from("weight_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const latest = logs[0];
  const oldest = logs[logs.length - 1];
  const change = latest && oldest && logs.length > 1 ? (latest.weight - oldest.weight).toFixed(1) : null;

  // Simple sparkline using SVG
  const chartLogs = [...logs].reverse().slice(-12);
  const minW = Math.min(...chartLogs.map((l) => l.weight));
  const maxW = Math.max(...chartLogs.map((l) => l.weight));
  const range = maxW - minW || 1;
  const W = 300, H = 80;
  const points = chartLogs.map((l, i) => {
    const x = (i / Math.max(chartLogs.length - 1, 1)) * W;
    const y = H - ((l.weight - minW) / range) * (H - 16) - 8;
    return `${x},${y}`;
  }).join(" ");

  if (loading) return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Current", value: latest ? `${latest.weight}${latest.unit}` : "—", color: "var(--accent)" },
          { label: "Change", value: change !== null ? `${change > 0 ? "+" : ""}${change}${latest?.unit}` : "—", color: change > 0 ? "var(--red)" : change < 0 ? "var(--green)" : "var(--text-muted)" },
          { label: "Entries", value: logs.length, color: "var(--text)" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, padding: "12px 8px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartLogs.length > 1 && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: "16px 12px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Last {chartLogs.length} entries</p>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
            <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
            {chartLogs.map((l, i) => {
              const x = (i / Math.max(chartLogs.length - 1, 1)) * W;
              const y = H - ((l.weight - minW) / range) * (H - 16) - 8;
              return <circle key={l.id} cx={x} cy={y} r="4" fill="var(--accent)" />;
            })}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{chartLogs[0]?.date}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{chartLogs[chartLogs.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Add form */}
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Log Weight</p>

        {/* Unit toggle */}
        <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
          {["kg", "lbs"].map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              style={{ padding: "7px 18px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: unit === u ? "var(--accent)" : "var(--surface-2)", color: unit === u ? "#fff" : "var(--text-muted)" }}>
              {u}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" type="number" placeholder={`Weight (${unit})`} value={weight}
            onChange={(e) => setWeight(e.target.value)} style={{ flex: 1 }} step="0.1" />
          <input className="input" type="date" value={date}
            onChange={(e) => setDate(e.target.value)} style={{ flex: 1 }} />
        </div>

        <input className="input" placeholder="Note (optional)" value={note}
          onChange={(e) => setNote(e.target.value)} />

        <button onClick={addLog} disabled={saving || !weight}
          style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: !weight ? 0.5 : 1 }}>
          {saving ? "Saving..." : "Add Entry"}
        </button>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No weight entries yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {logs.map((l, i) => {
            const prev = logs[i + 1];
            const diff = prev ? (l.weight - prev.weight).toFixed(1) : null;
            return (
              <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {new Date(l.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  {l.note && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{l.note}</p>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {diff !== null && (
                    <span style={{ fontSize: 11, color: +diff > 0 ? "var(--red)" : +diff < 0 ? "var(--green)" : "var(--text-muted)", fontWeight: 600 }}>
                      {+diff > 0 ? "+" : ""}{diff}
                    </span>
                  )}
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", fontFamily: "'Syne', sans-serif" }}>{l.weight}{l.unit}</span>
                  <button onClick={() => deleteLog(l.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}