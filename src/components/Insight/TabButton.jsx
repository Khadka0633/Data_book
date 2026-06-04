



export default function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        flex: 1,
        padding: "10px 8px",
        fontSize: 13,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  );
}
