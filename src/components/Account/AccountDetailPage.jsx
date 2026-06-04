import { useState, useEffect } from "react";
import supabase from "../../supabase";
import { CURRENCIES } from "../Constant/allConstant";

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

// ─── MiniCalendar ─────────────────────────────────────────────────
function MiniCalendar({ value, onChange }) {
  const current = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());

  const todayStr = new Date().toISOString().split("T")[0];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const changeMonth = (dir) => {
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = ds === value;
    const isToday = ds === todayStr;
    cells.push(
      <button
        key={ds}
        onClick={() => onChange(ds)}
        style={{
          aspectRatio: "1", borderRadius: 8,
          border: isSelected ? "2px solid var(--accent)" : isToday ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
          background: isSelected ? "var(--accent)" : isToday ? "rgba(99,102,241,0.1)" : "transparent",
          color: isSelected ? "#fff" : "var(--text)",
          fontSize: 13, fontWeight: isSelected || isToday ? 700 : 400,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.12s",
        }}
      >{d}</button>
    );
  }

  return (
    <div style={{ padding: "8px 14px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => changeMonth(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{monthLabel}</span>
        <button onClick={() => changeMonth(1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", padding: "2px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells}
      </div>
    </div>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────
function FieldRow({ label, active, onTap, showChevron, noBorder, children }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", alignItems: "center",
        padding: "18px 0",
        borderBottom: noBorder ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
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

// ─── NumericKeypad ────────────────────────────────────────────────
function NumericKeypadInline({ value, onChange }) {
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

// ─── Main Component ───────────────────────────────────────────────
export default function AccountDetailPage({
  account,
  entries,
  userId,
  toNPR,
  format,
  accounts,
  onBack,
  onEntriesChange,
  onAccountsChange,
}) {
  const [localEntries, setLocalEntries] = useState(entries);
  const [mode, setMode] = useState("list"); // "list" | "add" | "edit"
  const [editing, setEditing] = useState(null);
  const [expCats, setExpCats] = useState([]);
  const [incCats, setIncCats] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [formType, setFormType] = useState("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formNote, setFormNote] = useState("");
  const [activeField, setActiveField] = useState("amount");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalEntries(entries); }, [entries]);

  // Load categories
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from("expense_categories").select("*").eq("user_id", userId),
      supabase.from("income_categories").select("*").eq("user_id", userId),
    ]).then(([expRes, incRes]) => {
      if (!expRes.error) setExpCats(expRes.data || []);
      if (!incRes.error) setIncCats(incRes.data || []);
    });
  }, [userId]);

  const currency = account.currency || "NPR";
  const currMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.NPR;

  const accEntries = localEntries
    .filter((e) => e.account_id === account.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const income  = accEntries.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expense = accEntries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expense;
  const balanceNPR = toNPR(balance, currency);

  const groups = {};
  accEntries.forEach((e) => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  const grouped = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, entries: groups[date] }));

  const currentCats = formType === "expense" ? expCats : incCats;

  // ── Reset form ─────────────────────────────────────────────────
  const resetForm = (type = "expense") => {
    setFormType(type);
    setFormAmount("");
    setFormCategory((type === "expense" ? expCats : incCats)[0]?.name || "");
    setFormDate(today);
    setFormNote("");
    setActiveField("amount");
  };

  // ── Add entry ──────────────────────────────────────────────────
  const handleAddSave = async () => {
    if (!formAmount || isNaN(formAmount) || +formAmount <= 0) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("entries")
      .insert({
        type: formType,
        amount: +formAmount,
        category: formCategory,
        note: formNote,
        date: formDate,
        account_id: account.id,
        user_id: userId,
        is_transfer: false,
      })
      .select()
      .single();
    setSaving(false);
    if (error) { console.error("Failed to add entry:", error); return; }
    const updated = [...localEntries, data];
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
  };

  // ── Edit entry ─────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!formAmount || isNaN(formAmount) || +formAmount <= 0) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("entries")
      .update({
        type: formType,
        amount: +formAmount,
        category: formCategory,
        note: formNote,
        date: formDate,
      })
      .eq("id", editing.id)
      .select()
      .single();
    setSaving(false);
    if (error) { console.error("Failed to update entry:", error); return; }
    const updated = localEntries.map((e) => (e.id === data.id ? data : e));
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  // ── Delete entry ───────────────────────────────────────────────
  const handleDelete = async () => {
    const { error } = await supabase.from("entries").delete().eq("id", editing.id);
    if (error) { console.error("Failed to delete entry:", error); return; }
    const updated = localEntries.filter((e) => e.id !== editing.id);
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  // ── Context panel renderer ────────────────────────────────────
  const renderContextPanel = () => {
    switch (activeField) {

      case "date":
        return (
          <MiniCalendar
            value={formDate}
            onChange={(ds) => {
              setFormDate(ds);
              setActiveField("category");
            }}
          />
        );

      case "category":
        return (
          <div style={{ padding: "8px 0 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
              {currentCats.map((c) => (
                <button
                  key={c.id || c.name}
                  onClick={() => {
                    setFormCategory(c.name);
                    setActiveField("amount");
                  }}
                  style={{
                    padding: "16px 8px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    border: "none",
                    background: formCategory === c.name ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
                    color: formCategory === c.name ? "var(--accent)" : "var(--text)",
                    textAlign: "center",
                  }}
                >{c.name}</button>
              ))}
            </div>
          </div>
        );

      case "note":
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "var(--text-muted)", fontSize: 12 }}>
            ↑ Use the keyboard above to type your note
          </div>
        );

      case "amount":
      default:
        return (
          <NumericKeypadInline
            value={formAmount}
            onChange={setFormAmount}
          />
        );
    }
  };

  // ── Add / Edit Form ────────────────────────────────────────────
  if (mode === "add" || mode === "edit") {
    const isEdit = mode === "edit";
    return (
      <div style={{
        position: "fixed", inset: 0, background: "var(--bg)",
        zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <button
            onClick={() => { setMode("list"); setEditing(null); setActiveField("amount"); }}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            ‹ Back
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {isEdit ? "Edit Transaction" : "Add Transaction"}
          </span>
          <div style={{ width: 60 }} />
        </div>

        {/* Type toggle — disabled when editing */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {["income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => {
                if (isEdit) return;
                setFormType(t);
                setFormCategory((t === "expense" ? expCats : incCats)[0]?.name || "");
              }}
              style={{
                flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
                border: "none", cursor: isEdit ? "default" : "pointer", background: "transparent",
                color: formType === t
                  ? t === "expense" ? "var(--red)" : "var(--green)"
                  : "var(--text-muted)",
                borderBottom: formType === t
                  ? `2px solid ${t === "expense" ? "var(--red)" : "var(--green)"}`
                  : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        {/* Scrollable fields */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "0 20px" }}>

            {/* Amount */}
            <FieldRow label="Amount" active={activeField === "amount"} onTap={() => setActiveField("amount")}>
              <span style={{
                fontSize: 28, fontWeight: 700,
                color: formAmount ? "var(--text)" : "var(--text-muted)",
                fontFamily: "'Syne', sans-serif",
              }}>
                {formAmount || "0"}
              </span>
            </FieldRow>

            {/* Date */}
            <FieldRow label="Date" active={activeField === "date"} onTap={() => setActiveField("date")}>
              <span style={{ fontSize: 15, color: "var(--text)" }}>
                {new Date(formDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </FieldRow>

            {/* Category */}
            <FieldRow label="Category" active={activeField === "category"} onTap={() => setActiveField("category")} showChevron>
              <span style={{ fontSize: 15, color: formCategory ? "var(--text)" : "var(--text-muted)" }}>
                {formCategory || "Select..."}
              </span>
            </FieldRow>

            {/* Note */}
            <FieldRow label="Note" active={activeField === "note"} onTap={() => setActiveField("note")} noBorder>
              <input
                type="text"
                placeholder="Add a note..."
                value={formNote}
                onFocus={() => setActiveField("note")}
                onChange={(e) => setFormNote(e.target.value)}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 15, color: "var(--text)", fontFamily: "inherit", textAlign: "right",
                }}
              />
            </FieldRow>

          </div>
        </div>

        {/* Save / Delete buttons */}
        <div style={{ padding: "10px 20px 8px", flexShrink: 0 }}>
          <button
            onClick={isEdit ? handleEditSave : handleAddSave}
            disabled={saving}
            style={{
              width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
              background: formType === "expense" ? "var(--red)" : "var(--green)",
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : `Add ${formType === "expense" ? "Expense" : "Income"}`}
          </button>

          {isEdit && editing && !editing.is_transfer && (
            <button
              onClick={handleDelete}
              style={{
                width: "100%", padding: "11px", marginTop: 6,
                borderRadius: "var(--radius-md)", background: "transparent",
                color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>

        {/* Context-sensitive bottom panel */}
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 60px)",
          minHeight: 240,
          maxHeight: 340,
          overflowY: "auto",
        }}>
          {renderContextPanel()}
        </div>

      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <div className="page" style={{ padding: 16, gap: 0 }}>

      {/* Top nav */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button
            onClick={onBack}
            style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "7px 14px",
              fontSize: 14, color: "var(--text)", cursor: "pointer",
            }}
          >
            ← Accounts
          </button>

          {confirmDelete ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={async () => {
                  const { error: entryError } = await supabase.from("entries").delete().eq("account_id", account.id);
                  if (entryError) { console.error(entryError); return; }
                  const { error: accError } = await supabase.from("accounts").delete().eq("id", account.id);
                  if (accError) { console.error(accError); return; }
                  onEntriesChange(entries.filter((e) => e.account_id !== account.id));
                  onAccountsChange(accounts.filter((a) => a.id !== account.id));
                  onBack();
                }}
                style={{
                  background: "rgba(239,68,68,0.12)", color: "var(--red)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "var(--radius-sm)", padding: "7px 12px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >✓ Confirm Delete</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: "var(--surface-2)", color: "var(--text-muted)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  padding: "7px 12px", fontSize: 12, cursor: "pointer",
                }}
              >Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: "rgba(239,68,68,0.08)", color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)", padding: "7px 12px",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >🗑 Delete</button>
          )}
        </div>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
          {account.name}
        </h2>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 12,
        background: "var(--surface)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)", overflow: "hidden",
      }}>
        {[
          { label: "Income",  value: `${currMeta.flag}${income.toLocaleString()}`,            color: "var(--green)" },
          { label: "Expense", value: `${currMeta.flag}${expense.toLocaleString()}`,           color: "var(--red)" },
          { label: "Balance", value: `${currMeta.flag}${Math.abs(balance).toLocaleString()}`, color: balance >= 0 ? "var(--green)" : "var(--red)" },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "12px 8px", textAlign: "center",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
          }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* NPR equivalent for foreign currency */}
      {currency !== "NPR" && (
        <div style={{
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Balance in NPR</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: balanceNPR >= 0 ? "var(--green)" : "var(--red)" }}>
            🇳🇵 रु{Math.abs(balanceNPR).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Transaction list */}
      {accEntries.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 13 }}>
          No transactions yet. Tap + to add one.
        </p>
      ) : (
        grouped.map(({ date, entries: dayEntries }) => {
          const d = new Date(date + "T00:00:00");
          return (
            <div key={date} style={{ marginBottom: 4 }}>
              <div style={{ padding: "8px 0 4px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              {dayEntries.map((e, idx) => (
                <div
                  key={`${e.id}-${idx}`}
                  onClick={() => {
                    if (e.is_transfer) return;
                    setEditing(e);
                    setFormType(e.type);
                    setFormAmount(String(e.amount));
                    setFormCategory(e.category);
                    setFormDate(e.date);
                    setFormNote(e.note || "");
                    setActiveField("amount");
                    setMode("edit");
                  }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 8px", borderBottom: "1px solid var(--border)",
                    cursor: e.is_transfer ? "default" : "pointer",
                    borderRadius: "var(--radius-sm)", transition: "background 0.12s",
                  }}
                  onMouseEnter={(el) => !e.is_transfer && (el.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(el) => (el.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {Boolean(e.is_transfer) ? (
                      <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>↔</span>
                    ) : (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: e.type === "income" ? "var(--green)" : "var(--red)",
                      }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.note || e.category}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{e.category}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: e.type === "income" ? "var(--green)" : "var(--red)" }}>
                      {e.type === "income" ? "+" : "−"}
                      {currMeta.flag}{Number(e.amount).toLocaleString()}
                    </span>
                    {currency !== "NPR" && (
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                        ≈ रु{toNPR(Number(e.amount), currency).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      {/* FAB */}
      <style>{`.acc-detail-fab{position:fixed;right:28px;bottom:32px;width:52px;height:52px;border-radius:50%;background:var(--accent);color:#fff;font-size:26px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(99,102,241,0.4);z-index:90;transition:transform .15s}.acc-detail-fab:hover{transform:scale(1.08)}@media(max-width:768px){.acc-detail-fab{bottom:76px;right:18px;width:48px;height:48px;font-size:24px}}`}</style>
      <button
        className="acc-detail-fab"
        onClick={() => {
          setEditing(null);
          resetForm("expense");
          setMode("add");
        }}
      >
        +
      </button>
    </div>
  );
}
