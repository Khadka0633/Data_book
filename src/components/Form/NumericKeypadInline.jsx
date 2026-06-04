



export default function NumericKeypadInline({ value, onChange }) {
  const handleKey = (key) => {
    if (key === "⌫") { onChange(value.slice(0, -1) || ""); }
    else if (key === ".") { if (!value.includes(".")) onChange(value + "."); }
    else { if (value === "0") onChange(key); else onChange(value + key); }
  };
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => handleKey(key)}
          style={{
            padding: "18px 0", fontSize: key === "⌫" ? 20 : 22, fontWeight: 500,
            background: key === "⌫" ? "var(--surface-2)" : "var(--surface)",
            border: "none", color: key === "⌫" ? "var(--red)" : "var(--text)",
            cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}
        >{key}</button>
      ))}
    </div>
  );
}
