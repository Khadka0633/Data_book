import { useState, useEffect, useMemo } from "react";
import pb from "../pb";

const MOODS = [
  { emoji: "😄", label: "Great",   value: 5, color: "#22c55e" },
  { emoji: "🙂", label: "Good",    value: 4, color: "#84cc16" },
  { emoji: "😐", label: "Okay",    value: 3, color: "#eab308" },
  { emoji: "😕", label: "Low",     value: 2, color: "#f97316" },
  { emoji: "😞", label: "Rough",   value: 1, color: "#ef4444" },
];

const ENERGY = [
  { label: "⚡⚡⚡", value: 3, text: "High" },
  { label: "⚡⚡",  value: 2, text: "Med"  },
  { label: "⚡",    value: 1, text: "Low"  },
];

export default function Journal({ userId }) {
  const today = new Date().toISOString().split("T")[0];

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [viewDate, setViewDate] = useState(today);

  const [form, setForm] = useState({
    date: today, mood: 3, energy: 2, note: "", tags: "",
  });

  useEffect(() => {
    pb.collection("journal_entries").getFullList({
      filter: `userId = '${userId}'`, sort: "-date",
    }).catch(() => [])
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [userId]);

  // Existing entry for today / selected date
  const existingEntry = useMemo(() =>
    entries.find(e => e.date === form.date), [entries, form.date]
  );

  // Pre-fill form when switching to a date that has an entry
  useEffect(() => {
    if (existingEntry) {
      setForm(f => ({
        ...f,
        mood: existingEntry.mood ?? 3,
        energy: existingEntry.energy ?? 2,
        note: existingEntry.note ?? "",
        tags: existingEntry.tags ?? "",
      }));
    } else {
      setForm(f => ({ ...f, mood: 3, energy: 2, note: "", tags: "" }));
    }
  }, [existingEntry]);

  const saveEntry = async () => {
    setSaving(true);
    try {
      const data = {
        userId, date: form.date,
        mood: form.mood, energy: form.energy,
        note: form.note, tags: form.tags,
      };
      if (existingEntry) {
        const updated = await pb.collection("journal_entries").update(existingEntry.id, data);
        setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await pb.collection("journal_entries").create(data);
        setEntries(prev => [created, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch (e) { console.error("Journal save failed:", e); }
    finally { setSaving(false); }
  };

  const deleteEntry = async id => {
    await pb.collection("journal_entries").delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Mood trend: last 7 days
  const moodTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split("T")[0];
      const entry = entries.find(e => e.date === key);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      return { date: key, dayLabel, mood: entry?.mood ?? null };
    });
  }, [entries, today]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Journal</h1>
          <p className="page-sub">Daily reflections, mood &amp; energy</p>
        </div>
      </div>

      {/* ── Mood Trend (last 7 days) ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 14 }}>📊 Mood — Last 7 Days</h2>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {moodTrend.map((d, i) => {
            const moodInfo = MOODS.find(m => m.value === d.mood);
            const isToday = d.date === today;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: moodInfo ? moodInfo.color + "22" : "var(--surface-2)",
                  border: `2px solid ${isToday ? "var(--accent)" : moodInfo ? moodInfo.color + "55" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {moodInfo ? moodInfo.emoji : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>}
                </div>
                <span style={{ fontSize: 10, color: isToday ? "var(--accent)" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── New / Edit Entry ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 14 }}>
          {existingEntry ? "✏️ Edit Entry" : "📝 New Entry"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Date */}
          <input type="date" className="input" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />

          {/* Mood */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: "block" }}>How are you feeling?</label>
            <div style={{ display: "flex", gap: 8 }}>
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                  title={m.label}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: "var(--radius-md)",
                    border: `2px solid ${form.mood === m.value ? m.color : "var(--border)"}`,
                    background: form.mood === m.value ? m.color + "18" : "var(--surface-2)",
                    cursor: "pointer", fontSize: 20, transition: "all 0.15s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}>
                  <span>{m.emoji}</span>
                  <span style={{ fontSize: 9, color: form.mood === m.value ? m.color : "var(--text-muted)", fontWeight: 600 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: "block" }}>Energy level</label>
            <div style={{ display: "flex", gap: 8 }}>
              {ENERGY.map(e => (
                <button key={e.value} onClick={() => setForm(f => ({ ...f, energy: e.value }))}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: "var(--radius-md)",
                    border: `2px solid ${form.energy === e.value ? "var(--accent)" : "var(--border)"}`,
                    background: form.energy === e.value ? "rgba(99,102,241,0.12)" : "var(--surface-2)",
                    cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                    color: form.energy === e.value ? "var(--accent)" : "var(--text-muted)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}>
                  <span>{e.label}</span>
                  <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 }}>{e.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <textarea className="input" placeholder="How was your day? Any reflections..."
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            rows={4}
            style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />

          {/* Tags */}
          <input className="input" placeholder="Tags (comma-separated, e.g. work, gym, family)"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />

          <button className="btn-primary" onClick={saveEntry} disabled={saving}>
            {saving ? "Saving..." : existingEntry ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </div>

      {/* ── Past Entries ─────────────────────────────────────────── */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>📖 Past Entries</h2>
        {entries.length === 0 ? (
          <p className="empty-msg">No journal entries yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entries.slice(0, 30).map(e => {
              const moodInfo = MOODS.find(m => m.value === e.mood);
              const energyInfo = ENERGY.find(en => en.value === e.energy);
              const tagList = e.tags ? e.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
              return (
                <div key={e.id} style={{
                  background: "var(--surface-2)", borderRadius: "var(--radius-md)",
                  padding: "14px 16px", border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{moodInfo?.emoji || "😐"}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          {e.date === today && <span style={{ fontSize: 10, marginLeft: 6, color: "var(--accent)", fontWeight: 700 }}>TODAY</span>}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {moodInfo?.label || "–"} · Energy: {energyInfo?.text || "–"}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setForm({ date: e.date, mood: e.mood ?? 3, energy: e.energy ?? 2, note: e.note ?? "", tags: e.tags ?? "" })}
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13 }}>✎</button>
                      <button onClick={() => deleteEntry(e.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                  {e.note && (
                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: tagList.length ? 8 : 0 }}>
                      {e.note}
                    </p>
                  )}
                  {tagList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {tagList.map((tag, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 99,
                          background: "var(--surface)", border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
