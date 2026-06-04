


export default function PieChart({ data, label = "TOTAL", onSliceClick }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <div className="pie-empty">
        <span>No data yet</span>
      </div>
    );

  let cumAngle = -90;
  const radius = 90,
    cx = 160,
    cy = 160;

  const slices = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((d) => {
      const pct = d.value / total;
      const angle = pct * 360;
      const midAngle = cumAngle + angle / 2;
      const sa = (cumAngle * Math.PI) / 180;
      const ea = ((cumAngle + angle) * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(sa);
      const y1 = cy + radius * Math.sin(sa);
      const x2 = cx + radius * Math.cos(ea);
      const y2 = cy + radius * Math.sin(ea);
      const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`;

      // Label line points
      const labelR = radius + 20;
      const labelEndR = radius + 35;
      const midRad = (midAngle * Math.PI) / 180;
      const lx1 = cx + radius * Math.cos(midRad);
      const ly1 = cy + radius * Math.sin(midRad);
      const lx2 = cx + labelR * Math.cos(midRad);
      const ly2 = cy + labelR * Math.sin(midRad);
      const lx3 = cx + labelEndR * Math.cos(midRad);
      const ly3 = cy + labelEndR * Math.sin(midRad);
      const textX = cx + (labelEndR + 4) * Math.cos(midRad);
      const textY = cy + (labelEndR + 4) * Math.sin(midRad);
      const textAnchor = textX > cx ? "start" : "end";

      cumAngle += angle;
      return {
        ...d,
        path,
        pct,
        midAngle,
        lx1,
        ly1,
        lx2,
        ly2,
        lx3,
        ly3,
        textX,
        textY,
        textAnchor,
      };
    });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Pie SVG */}
      <svg viewBox="0 0 320 320" style={{ width: "100%", maxWidth: 320 }}>
        {slices.map((s, i) => (
          <g
            key={i}
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={s.path}
              fill={s.color}
              opacity="0.9"
              stroke="var(--surface)"
              strokeWidth="1.5"
            >
              <title>
                {s.label}: रु{s.value.toFixed(0)} ({(s.pct * 100).toFixed(1)}%)
              </title>
            </path>
            {/* Only show label if slice is big enough */}
            {s.pct > 0.04 && (
              <>
                <line
                  x1={s.lx1}
                  y1={s.ly1}
                  x2={s.lx3}
                  y2={s.ly3}
                  stroke={s.color}
                  strokeWidth="1"
                  opacity="0.7"
                />
                <text
                  x={s.textX}
                  y={s.textY - 5}
                  textAnchor={s.textAnchor}
                  fill="var(--text)"
                  fontSize="9"
                  fontWeight="600"
                >
                  {s.label.length > 8 ? s.label.slice(0, 7) + "…" : s.label}
                </text>
                <text
                  x={s.textX}
                  y={s.textY + 7}
                  textAnchor={s.textAnchor}
                  fill={s.color}
                  fontSize="8"
                  fontWeight="700"
                >
                  {(s.pct * 100).toFixed(1)}%
                </text>
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Category list with badge */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {slices.map((s, i) => (
          <div
            key={i}
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 8px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {/* Percentage badge */}
            <div
              style={{
                minWidth: 42,
                height: 28,
                borderRadius: 6,
                background: s.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>
                {Math.round(s.pct * 100)}%
              </span>
            </div>

            {/* Category name */}
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </span>

            {/* Amount */}
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text)",
                flexShrink: 0,
              }}
            >
              रु{s.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}