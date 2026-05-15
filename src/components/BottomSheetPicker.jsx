/**
 * BottomSheetPicker
 *
 * Props:
 *   title    – string, shown in the header
 *   options  – array of { id, name, icon? }
 *   selected – currently selected id
 *   onSelect – (id) => void
 *   onClose  – () => void
 *   extra    – optional { label: string, onClick: () => void }
 *              renders an extra button at the end (e.g. "+ Add" for categories)
 */
export default function BottomSheetPicker({ title, options, selected, onSelect, onClose, extra }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
          maxHeight: "80vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "var(--border)",
            margin: "0 auto 16px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Options grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--border)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onSelect(opt.id); onClose(); }}
              style={{
                padding: "18px 8px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                background: selected === opt.id ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
                color: selected === opt.id ? "var(--accent)" : "var(--text)",
                textAlign: "center",
              }}
            >
              {opt.icon} {opt.name}
            </button>
          ))}

          {/* Extra slot — e.g. "+ Add" button for category management */}
          {extra && (
            <button
              onClick={() => { onClose(); extra.onClick(); }}
              style={{
                padding: "18px 8px",
                fontSize: 14,
                cursor: "pointer",
                border: "none",
                background: "var(--surface-2)",
                color: "var(--text-muted)",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {extra.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
