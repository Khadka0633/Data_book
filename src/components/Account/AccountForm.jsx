import { useState } from "react";
import { CURRENCIES, ACCOUNT_GROUPS, ACCOUNT_ICONS} from "../Constant/allConstant";

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));


export default function AccountForm({ initial, onSave, onCancel, title }) {
  const [draft, setDraft] = useState(
    initial || {
      name: "",
      icon: "🏦",
      color: "#6366f1",
      group: "cash",
      currency: "NPR",
    },
  );
  const [error, setError] = useState("");
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const currMeta = CURRENCY_MAP[draft.currency] || CURRENCY_MAP.NPR;
  const groupInfo = ACCOUNT_GROUPS.find((g) => g.key === draft.group);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Live Preview Card */}
      <div style={{
        margin: "0 0 28px",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: `1px solid ${draft.color}55`,
        background: `linear-gradient(135deg, ${draft.color}18 0%, ${draft.color}08 100%)`,
        position: "relative",
      }}>
        <div style={{ height: 3, background: draft.color, width: "100%" }} />
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: draft.color + "22",
            border: `2px solid ${draft.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>
            {draft.icon || "🏦"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontWeight: 700, fontSize: 15, color: "var(--text)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: 3,
            }}>
              {draft.name || "Account Name"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: 0.5, color: draft.color,
                background: draft.color + "18",
                padding: "2px 7px", borderRadius: 99,
                border: `1px solid ${draft.color}33`,
              }}>
                {groupInfo?.label || "Cash"}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {currMeta.flag} {draft.currency}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 1 }}>Balance</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: draft.color, fontFamily: "'Syne', sans-serif" }}>
              {currMeta.flag} 0
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Account Name */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: 0.8, marginBottom: 7,
          }}>
            Account Name
          </label>
          <input
            className="input"
            placeholder="e.g. NIMB Bank, eSewa Wallet"
            value={draft.name}
            autoFocus
            onChange={(e) => { set("name", e.target.value); setError(""); }}
            style={{ fontSize: 15 }}
          />
        </div>

        {/* Group + Currency */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              color: "var(--text-muted)", textTransform: "uppercase",
              letterSpacing: 0.8, marginBottom: 7,
            }}>
              Group
            </label>
            <select
              className="input"
              value={draft.group}
              onChange={(e) => set("group", e.target.value)}
              style={{ fontSize: 14 }}
            >
              {ACCOUNT_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              color: "var(--text-muted)", textTransform: "uppercase",
              letterSpacing: 0.8, marginBottom: 7,
            }}>
              Currency
            </label>
            <select
              className="input"
              value={draft.currency || "NPR"}
              onChange={(e) => set("currency", e.target.value)}
              style={{ fontSize: 14 }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Icon */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <label style={{
              fontSize: 11, fontWeight: 700,
              color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8,
            }}>
              Icon
            </label>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>tap to select</span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6,
            padding: "12px", background: "var(--surface-2)",
            borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
          }}>
            {ACCOUNT_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => set("icon", icon)}
                style={{
                  aspectRatio: "1", fontSize: 20,
                  borderRadius: "var(--radius-sm)",
                  border: draft.icon === icon ? `2px solid ${draft.color}` : "2px solid transparent",
                  background: draft.icon === icon ? draft.color + "20" : "transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", lineHeight: 1,
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: 0.8, marginBottom: 7,
          }}>
            Accent Color
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {["#6366f1","#22c55e","#ef4444","#f97316","#eab308","#06b6d4","#8b5cf6","#ec4899","#14b8a6","#0ea5e9"].map((c) => (
              <button
                key={c}
                onClick={() => set("color", c)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: c, border: "none", cursor: "pointer",
                  outline: draft.color === c ? `3px solid ${c}` : "none",
                  outlineOffset: 2,
                  transform: draft.color === c ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              />
            ))}
            <label style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--surface-2)",
              border: "1.5px dashed var(--border)",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--text-muted)",
              flexShrink: 0, position: "relative", overflow: "hidden",
            }} title="Custom color">
              +
              <input
                type="color"
                value={draft.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  position: "absolute", opacity: 0,
                  width: "100%", height: "100%", cursor: "pointer",
                }}
              />
            </label>
          </div>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-sm)",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--red)", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, paddingTop: 4, paddingBottom: 8 }}>
          <button
            onClick={() => {
              if (!draft.name.trim()) return setError("Account name cannot be empty.");
              onSave({ ...draft, name: draft.name.trim(), currency: draft.currency || "NPR" });
            }}
            style={{
              flex: 1, padding: "13px",
              borderRadius: "var(--radius-md)",
              background: draft.color,
              color: "#fff", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            {title}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "13px 20px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-2)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}




