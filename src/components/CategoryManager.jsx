import { useState } from "react";

const CAT_COLORS = [
  "#6366f1", "#22c55e", "#ef4444", "#f97316", "#eab308",
  "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
  "#84cc16", "#0ea5e9", "#a855f7", "#fb923c", "#10b981",
];

function getRandomColor(existing = []) {
  const unused = CAT_COLORS.filter((c) => !existing.includes(c));
  return (unused.length > 0 ? unused : CAT_COLORS)[
    Math.floor(Math.random() * (unused.length || CAT_COLORS.length))
  ];
}

/**
 * CategoryManager
 *
 * Props:
 *   type       – "expense" | "income"
 *   categories – array of { name, color }
 *   onAdd      – (cat: { name, color }) => void
 *   onDelete   – (name: string) => void
 *   onClose    – () => void
 */
export default function CategoryManager({ type, categories, onAdd, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return setError("Please enter a category name.");
    if (categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase()))
      return setError("Already exists.");
    onAdd({ name: trimmed, color: getRandomColor(categories.map((c) => c.color)) });
    setNewName("");
    setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {type === "expense" ? "❤️ Expense" : "💚 Income"} Categories
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Category name..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            style={{ padding: "10px 16px", whiteSpace: "nowrap", width: "auto" }}
          >
            + Add
          </button>
        </div>

        {error && <p className="cat-error">{error}</p>}

        <div className="cat-list">
          {categories.map((c, i) => (
            <div key={i} className="cat-item">
              <span className="cat-dot" style={{ background: c.color }} />
              <span className="cat-name">{c.name}</span>
              {categories.length > 1 && (
                <button className="cat-del-btn" onClick={() => onDelete(c.name)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
