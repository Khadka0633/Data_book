
import { useState, useEffect, useMemo } from "react";
import supabase from "../../supabase";

export default function Diet({ userId }) {
  const today = new Date().toISOString().split("T")[0];
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ meal: "Breakfast", food: "", calories: "", date: today });
  const [showForm, setShowForm] = useState(false);

  const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const MEAL_ICONS = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("diet_logs")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load diet logs:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const addLog = async () => {
    if (!form.food.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("diet_logs")
        .insert({
          user_id: userId,
          meal: form.meal,
          food: form.food.trim(),
          calories: form.calories ? +form.calories : null,
          date: form.date,
        })
        .select()
        .single();
      if (error) throw error;
      setLogs((prev) => [data, ...prev]);
      setForm({ meal: "Breakfast", food: "", calories: "", date: today });
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id) => {
    await supabase.from("diet_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map((date) => ({ date, logs: map[date] }));
  }, [logs]);

  const todayCalories = logs
    .filter((l) => l.date === today && l.calories)
    .reduce((s, l) => s + l.calories, 0);

  if (loading) return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Today summary */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, padding: "14px 16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Today's Calories</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", fontFamily: "'Syne', sans-serif" }}>{todayCalories || "—"}</p>
          {todayCalories > 0 && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>kcal</p>}
        </div>
        <div style={{ flex: 1, padding: "14px 16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Today's Meals</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", fontFamily: "'Syne', sans-serif" }}>
            {logs.filter((l) => l.date === today).length}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>logged</p>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm((v) => !v)}
        style={{ width: "100%", padding: "13px", borderRadius: "var(--radius-md)", background: showForm ? "var(--surface-2)" : "var(--accent)", color: showForm ? "var(--text-muted)" : "#fff", border: showForm ? "1px solid var(--border)" : "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {showForm ? "Cancel" : "+ Log a Meal"}
      </button>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Meal type */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {MEALS.map((m) => (
              <button key={m} onClick={() => setForm((f) => ({ ...f, meal: m }))}
                style={{ padding: "9px 4px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: form.meal === m ? "rgba(99,102,241,0.15)" : "var(--surface-2)", color: form.meal === m ? "var(--accent)" : "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 16 }}>{MEAL_ICONS[m]}</span>
                {m}
              </button>
            ))}
          </div>

          <input className="input" placeholder="What did you eat?" value={form.food}
            onChange={(e) => setForm((f) => ({ ...f, food: e.target.value }))} autoFocus />

          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" type="number" placeholder="Calories (optional)" value={form.calories}
              onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} style={{ flex: 1 }} />
            <input className="input" type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ flex: 1 }} />
          </div>

          <button onClick={addLog} disabled={saving || !form.food.trim()}
            style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: !form.food.trim() ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Add Entry"}
          </button>
        </div>
      )}

      {/* Log list grouped by date */}
      {grouped.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>No meals logged yet. Tap + to start tracking.</p>
      ) : (
        grouped.map(({ date, logs: dayLogs }) => {
          const d = new Date(date + "T00:00:00");
          const dayTotal = dayLogs.filter((l) => l.calories).reduce((s, l) => s + l.calories, 0);
          return (
            <div key={date}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 4px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                {dayTotal > 0 && <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{dayTotal} kcal</span>}
              </div>
              {dayLogs.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{MEAL_ICONS[l.meal] || "🍽️"}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.food}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{l.meal}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {l.calories && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{l.calories} kcal</span>}
                    <button onClick={() => deleteLog(l.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
