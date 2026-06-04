
import { useMemo } from "react";


export default function CategoryList({
  entries,
  type,
  categories,
  chartMonth,
  onCategoryClick,
}) {
  const total = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.type === type &&
            !e.isTransfer &&
            e.date.slice(0, 7) === chartMonth,
        )
        .reduce((s, e) => s + e.amount, 0),
    [entries, type, chartMonth],
  );

  const catTotals = useMemo(() => {
    const map = {};
    entries
      .filter(
        (e) =>
          e.type === type && !e.isTransfer && e.date.slice(0, 7) === chartMonth,
      )
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return categories
      .filter((c) => c.name !== "Transfer" && map[c.name])
      .map((c) => ({ name: c.name, color: c.color, amount: map[c.name] || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, type, categories, chartMonth]);

  if (catTotals.length === 0)
    return (
      <p
        style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}
      >
        No data this month.
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {catTotals.map((cat) => {
        const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
        return (
          <div
            key={cat.name}
            onClick={() => onCategoryClick(cat.name, type, cat.color)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              borderRadius: 6,
              transition: "background 0.15s",
              paddingLeft: 6,
              paddingRight: 6,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: cat.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text)",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cat.name}
            </span>
            <div
              style={{
                width: 80,
                height: 5,
                background: "var(--surface-2)",
                borderRadius: 3,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: cat.color,
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                width: 34,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {pct}%
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)",
                width: 90,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              रु{cat.amount.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              ›
            </span>
          </div>
        );
      })}
    </div>
  );
}
