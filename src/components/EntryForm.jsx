import { useState, useEffect } from "react";
import BottomSheetPicker from "./BottomSheetPicker";
import CategoryManager from "./CategoryManager";
import NumericKeypad from "./NumericKeypad";

/**
 * EntryForm
 *
 * Props:
 *   form            – { type, amount, category, note, date, accountId }
 *   setForm         – setter
 *   editEntry       – id string if editing, null if adding
 *   accounts        – array of account objects
 *   expCats         – expense category array
 *   incCats         – income category array
 *   suggestions     – note autocomplete suggestions array
 *   showSuggestions – bool
 *   setShowSuggestions – setter
 *   ai              – ai object (catSuggestion, clearCatSuggestion)
 *   saving          – bool
 *   onSave          – () => void
 *   onDelete        – () => void
 *   onClose         – () => void  (Back button)
 *   onGoToTransfer  – () => void  (Transfer tab click)
 *   onAddCat        – (type, cat) => void
 *   onDeleteCat     – (type, name) => void
 */
export default function EntryForm({
  form,
  setForm,
  editEntry,
  accounts,
  expCats,
  incCats,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  ai,
  saving,
  onSave,
  onDelete,
  onClose,
  onGoToTransfer,
  onAddCat,
  onDeleteCat,
}) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [catModal, setCatModal] = useState(null);
  const [showAiCatBadge, setShowAiCatBadge] = useState(false);

  const currentCats = form.type === "expense" ? expCats : incCats;

  // Lock scroll when pickers open
  useEffect(() => {
    const isOpen = showAccPicker || showCatPicker;
    const scrollEl = document.querySelector(".main-content");
    if (isOpen) {
      if (scrollEl) scrollEl.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      if (scrollEl) scrollEl.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [showAccPicker, showCatPicker]);

  // AI badge
  useEffect(() => {
    if (ai?.catSuggestion) setShowAiCatBadge(true);
  }, [ai?.catSuggestion]);

  useEffect(() => {
    if (!ai || !form.note || form.note.trim().length < 3) {
      setShowAiCatBadge(false);
      return;
    }
    ai.suggestCategory(form.note, form.type);
    setShowAiCatBadge(false);
  }, [form.note, form.type]);

  const applyAiCategory = () => {
    if (!ai?.catSuggestion) return;
    setForm((f) => ({ ...f, category: ai.catSuggestion }));
    setShowAiCatBadge(false);
    ai.clearCatSuggestion();
  };

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm((f) => ({ ...f, type: t, category: cats[0]?.name || "" }));
  };

  const selectedAccount = accounts.find((a) => a.id === form.accountId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ‹ Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          {form.type === "expense" ? "Expense" : "Income"}
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* ── Type toggle ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {["income", "expense"].map((t) => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            style={{
              flex: 1,
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color:
                form.type === t
                  ? t === "expense" ? "var(--red)" : "var(--green)"
                  : "var(--text-muted)",
              borderBottom:
                form.type === t
                  ? `2px solid ${t === "expense" ? "var(--red)" : "var(--green)"}`
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
        <button
          onClick={onGoToTransfer}
          style={{
            flex: 1,
            padding: "14px 0",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--text-muted)",
            borderBottom: "2px solid transparent",
            marginBottom: "-1px",
          }}
        >
          Transfer
        </button>
      </div>

      {/* ── Scrollable fields ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "0 20px" }}>

          {/* Amount */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
              Amount
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 28,
                fontWeight: 700,
                color: form.amount ? "var(--text)" : "var(--text-muted)",
                textAlign: "right",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {form.amount || "0"}
            </span>
          </div>

          {/* Date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              position: "relative",
            }}
            onClick={() => document.getElementById("date-input").showPicker?.()}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
              Date
            </span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {new Date(form.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric", year: "numeric",
              })}
            </span>
            <input
              id="date-input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }}
            />
          </div>

          {/* Category */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => setShowCatPicker(true)}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
              Category
            </span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {form.category || "Select..."}
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
          </div>

          {/* Account */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => setShowAccPicker(true)}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
              Account
            </span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {selectedAccount?.icon} {selectedAccount?.name || "Select..."}
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
          </div>

          {/* Note */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>
              Note
            </span>
            <input
              type="text"
              placeholder="Add a note..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "var(--text)",
                fontFamily: "inherit",
                textAlign: "right",
              }}
            />
            {showSuggestions && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  marginTop: 4,
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => {
                      setForm((f) => ({ ...f, note: s }));
                      setShowSuggestions(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 14px",
                      fontSize: 13,
                      color: "var(--text)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI suggestion badge */}
          {showAiCatBadge && ai?.catSuggestion && ai.catSuggestion !== form.category && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <span style={{ fontSize: 12 }}>✨</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
                AI suggests:{" "}
                <strong style={{ color: "var(--accent)" }}>{ai.catSuggestion}</strong>
              </span>
              <button
                onClick={applyAiCategory}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
              <button
                onClick={() => setShowAiCatBadge(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Save / Delete buttons ── */}
      <div style={{ padding: "12px 20px 20px" }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "var(--radius-md)",
            background: form.type === "expense" ? "var(--red)" : "var(--green)",
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : editEntry
            ? "Save Changes"
            : `Add ${form.type === "expense" ? "Expense" : "Income"}`}
        </button>
        {editEntry && (
          <button
            onClick={onDelete}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: 8,
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🗑 Delete
          </button>
        )}
      </div>

      {/* ── Numeric Keypad ── */}
      <NumericKeypad
  value={form.amount}
  onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
/>

      {/* ── Category Manager modal ── */}
      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={(cat) => onAddCat(catModal, cat)}
          onDelete={(name) => onDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
        />
      )}

      {/* ── Account Picker ── */}
      {showAccPicker && (
        <BottomSheetPicker
          title="Account"
          options={accounts}
          selected={form.accountId}
          onSelect={(id) => setForm((f) => ({ ...f, accountId: id }))}
          onClose={() => setShowAccPicker(false)}
        />
      )}

      {/* ── Category Picker ── */}
      {showCatPicker && (
        <BottomSheetPicker
          title="Category"
          options={currentCats.map((c) => ({ id: c.name, name: c.name }))}
          selected={form.category}
          onSelect={(id) => setForm((f) => ({ ...f, category: id }))}
          onClose={() => setShowCatPicker(false)}
          extra={{ label: "+ Add", onClick: () => setCatModal(form.type) }}
        />
      )}
    </div>
  );
}
