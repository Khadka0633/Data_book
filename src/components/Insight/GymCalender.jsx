




function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
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


export default function GymCalendar({ year, month, attended, today, onToggle }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = toDateStr(today);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === todayStr;
    const isAttended = attended.has(dateStr);
    const isFuture = dateStr > todayStr;
    cells.push(
      <button
        key={dateStr}
        onClick={() => !isFuture && onToggle(dateStr)}
        style={{
          aspectRatio: "1",
          borderRadius: 6,
          border: isToday
            ? "1.5px solid var(--accent)"
            : "1px solid transparent",
          background: isAttended ? "rgba(99,102,241,0.18)" : "var(--surface-2)",
          cursor: isFuture ? "default" : "pointer",
          opacity: isFuture ? 0.3 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 1,
          transition: "background 0.15s, transform 0.1s",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!isFuture) e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: isToday ? 700 : 500,
            color: isAttended
              ? "var(--accent)"
              : isToday
                ? "var(--text)"
                : "var(--text-muted)",
            lineHeight: 1,
          }}
        >
          {d}
        </span>
        {isAttended && (
          <span style={{ fontSize: 6, color: "var(--accent)", lineHeight: 1 }}>
            ●
          </span>
        )}
      </button>,
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
          marginBottom: 3,
        }}
      >
        {weekDays.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-muted)",
              padding: "3px 0",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}
      >
        {cells}
      </div>
    </div>
  );
}