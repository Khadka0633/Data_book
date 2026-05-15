/**
 * NumericKeypad
 *
 * Props:
 *   value    – current string value
 *   onChange – (newValue: string) => void
 */
export default function NumericKeypad({ value, onChange }) {
  const handleKey = (key) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1) || "");
    } else if (key === ".") {
      if (!value.includes(".")) onChange(value + ".");
    } else {
      if (value === "0") onChange(key);
      else onChange(value + key);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        background: "var(--border)",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => handleKey(key)}
          style={{
            padding: "18px 0",
            fontSize: key === "⌫" ? 20 : 22,
            fontWeight: 500,
            background: key === "⌫" ? "var(--surface-2)" : "var(--surface)",
            border: "none",
            color: key === "⌫" ? "var(--red)" : "var(--text)",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
          }}
          onTouchStart={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onTouchEnd={(e) =>
            (e.currentTarget.style.background =
              key === "⌫" ? "var(--surface-2)" : "var(--surface)")
          }
        >
          {key}
        </button>
      ))}
    </div>
  );
}
