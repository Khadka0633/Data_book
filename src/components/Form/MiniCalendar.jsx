import { useState } from "react";


export default function MiniCalendar({ value, onChange }) {
  const current = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());

  const todayStr = new Date().toISOString().split("T")[0];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const changeMonth = (dir) => {
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = ds === value;
    const isToday = ds === todayStr;
    cells.push(
      <button
        key={ds}
        onClick={() => onChange(ds)}
        style={{
          aspectRatio: "1", borderRadius: 8,
          border: isSelected ? "2px solid var(--accent)" : isToday ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
          background: isSelected ? "var(--accent)" : isToday ? "rgba(99,102,241,0.1)" : "transparent",
          color: isSelected ? "#fff" : "var(--text)",
          fontSize: 13, fontWeight: isSelected || isToday ? 700 : 400,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.12s",
        }}
      >{d}</button>
    );
  }

  return (
    <div style={{ padding: "8px 14px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => changeMonth(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{monthLabel}</span>
        <button onClick={() => changeMonth(1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", padding: "2px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells}
      </div>
    </div>
  );
}