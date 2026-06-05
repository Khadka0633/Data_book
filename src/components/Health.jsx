import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import supabase from "../supabase";
import GymCalendar from "./Health/GymCalender";
import TabButton from "./Insight/TabButton";
import Diet from "./Health/Diet";
import Weight from "./Health/Weight";

// ── Gym helpers ────────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function toDateStr(date) {
  return date.toISOString().split("T")[0];
}
function calcGymStreak(attendedSet) {
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1);
  while (attendedSet.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  if (attendedSet.has(toDateStr(today))) streak++;
  return streak;
}

// ── Main Insights component ────────────────────────────────────────
export default function Health({ userId, ai }) {
  const today = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState("gym");

  // ── Gym state ──────────────────────────────────────────────────
  const todayObj = new Date();
  const [gymRecords, setGymRecords] = useState({});
  const [gymLoading, setGymLoading] = useState(true);
  const [gymSaving, setGymSaving] = useState(false);
  const [gymViewYear, setGymViewYear] = useState(todayObj.getFullYear());
  const [gymViewMonth, setGymViewMonth] = useState(todayObj.getMonth());

  const loadGym = useCallback(async () => {
    setGymLoading(true);
    try {
      const { data, error } = await supabase
        .from("gym_attendance")
        .select("*")
        .eq("user_id", userId)
        .order("date");
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => (map[r.date] = r.id));
      setGymRecords(map);
    } catch (err) {
      console.error("Failed to load gym attendance:", err);
    } finally {
      setGymLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadGym(); }, [loadGym]);

  const handleGymToggle = async (dateStr) => {
    if (gymSaving) return;
    setGymSaving(true);
    try {
      if (gymRecords[dateStr]) {
        await supabase.from("gym_attendance").delete().eq("id", gymRecords[dateStr]);
        setGymRecords((prev) => { const next = { ...prev }; delete next[dateStr]; return next; });
      } else {
        const { data, error } = await supabase
          .from("gym_attendance")
          .insert({ user_id: userId, date: dateStr })
          .select()
          .single();
        if (error) throw error;
        setGymRecords((prev) => ({ ...prev, [dateStr]: data.id }));
      }
    } catch (err) {
      console.error("Failed to toggle gym attendance:", err);
    } finally {
      setGymSaving(false);
    }
  };

  const gymAttended = useMemo(() => new Set(Object.keys(gymRecords)), [gymRecords]);
  const gymMonthKey = `${gymViewYear}-${String(gymViewMonth + 1).padStart(2, "0")}`;
  const gymMonthCount = useMemo(() => [...gymAttended].filter((d) => d.startsWith(gymMonthKey)).length, [gymAttended, gymMonthKey]);
  const gymDaysInViewMonth = getDaysInMonth(gymViewYear, gymViewMonth);
  const gymIsCurrentMonth = gymViewYear === todayObj.getFullYear() && gymViewMonth === todayObj.getMonth();
  const gymPassedDays = gymIsCurrentMonth ? todayObj.getDate() : gymDaysInViewMonth;
  const gymRate = gymPassedDays > 0 ? Math.round((gymMonthCount / gymPassedDays) * 100) : 0;
  const gymStreak = useMemo(() => calcGymStreak(gymAttended), [gymAttended]);
  const gymTotalAll = gymAttended.size;
  const isTodayAttended = gymAttended.has(today);
  const gymMonthLabel = new Date(gymViewYear, gymViewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const changeGymMonth = (dir) => {
    const d = new Date(gymViewYear, gymViewMonth + dir, 1);
    setGymViewYear(d.getFullYear());
    setGymViewMonth(d.getMonth());
  };

  const tabs = [
    { id: "gym",    label: "Gym",    icon: "🏋️" },
    { id: "diet",   label: "Diet",   icon: "🥗" },
    { id: "weight", label: "Weight", icon: "⚖️" },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div>
        <h1 className="page-title">Health</h1>
        <p className="page-sub">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: 4, border: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <TabButton key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />
        ))}
      </div>

      {/* ── GYM TAB ── */}
      {activeTab === "gym" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>🏋️ Gym Attendance</h2>

          <button
            onClick={() => handleGymToggle(today)}
            disabled={gymSaving}
            style={{
              width: "100%", padding: "13px", borderRadius: "var(--radius-md)",
              border: isTodayAttended ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid var(--border)",
              background: isTodayAttended ? "rgba(99,102,241,0.12)" : "var(--surface-2)",
              color: isTodayAttended ? "var(--accent)" : "var(--text-muted)",
              fontSize: 14, fontWeight: 700, cursor: gymSaving ? "default" : "pointer",
              marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
            }}>
            <span style={{ fontSize: 18 }}>{isTodayAttended ? "✓" : "+"}</span>
            {gymSaving ? "Saving..." : isTodayAttended ? "Attended today" : "Mark today as attended"}
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "This month", value: gymMonthCount, color: "var(--accent)", sub: `${gymRate}% rate` },
              { label: "Streak",     value: gymStreak,    color: gymStreak >= 3 ? "var(--green)" : "var(--text)", sub: gymStreak === 1 ? "day" : "days" },
              { label: "All time",   value: gymTotalAll,  color: "var(--text)", sub: "sessions" },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, padding: "10px 8px", textAlign: "center", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif", lineHeight: 1.1 }}>{s.value}</p>
                {s.sub && <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{s.sub}</p>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{gymMonthLabel}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => changeGymMonth(-1)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <button onClick={() => changeGymMonth(1)} disabled={gymIsCurrentMonth} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, cursor: gymIsCurrentMonth ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: gymIsCurrentMonth ? 0.3 : 1 }}>›</button>
            </div>
          </div>

          {gymLoading ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>Loading...</p>
          ) : (
            <GymCalendar year={gymViewYear} month={gymViewMonth} attended={gymAttended} today={todayObj} onToggle={handleGymToggle} />
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{gymMonthCount} of {gymPassedDays} days</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: gymRate >= 70 ? "var(--green)" : gymRate >= 40 ? "var(--accent)" : "var(--red)" }}>{gymRate}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${gymRate}%`, borderRadius: 99, background: gymRate >= 70 ? "var(--green)" : gymRate >= 40 ? "var(--accent)" : "var(--red)", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── DIET TAB ── */}
      {activeTab === "diet" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>🥗 Diet Tracker</h2>
          <Diet userId={userId} />
        </div>
      )}

      {/* ── WEIGHT TAB ── */}
      {activeTab === "weight" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>⚖️ Weight Tracker</h2>
          <Weight userId={userId} />
        </div>
      )}
    </div>
  );
}
