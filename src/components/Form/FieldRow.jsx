


export default function FieldRow({ label, active, onTap, showChevron, noBorder, children }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", alignItems: "center",
        padding: "13px 0",
        borderBottom: noBorder ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        paddingLeft: 10,
        marginLeft: -10,
        transition: "all 0.15s",
      }}
    >
      <span style={{
        fontSize: 15, width: 90, flexShrink: 0, fontWeight: active ? 600 : 400,
        color: active ? "var(--accent)" : "var(--text-muted)",
        transition: "color 0.15s",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
        {children}
        {showChevron && (
          <span style={{ color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 14 }}>›</span>
        )}
      </div>
    </div>
  );
}
