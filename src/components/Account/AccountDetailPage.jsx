
import { useState, useEffect } from "react";
import supabase from "../../supabase";
import { CURRENCIES } from "../Constant/allConstant";


const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));


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
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => { setLocalEntries(entries); }, [entries]);

  // Load categories from Supabase
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

  // Filter entries for this account (field is account_id in Supabase)
  const accEntries = localEntries
    .filter((e) => e.account_id === account.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const income  = accEntries.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expense = accEntries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expense;
  const balanceNPR = toNPR(balance, currency);

  // Group by date
  const groups = {};
  accEntries.forEach((e) => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  const grouped = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, entries: groups[date] }));

  // ── Add entry ───────────────────────────────────────────────────
  const handleAddSave = async () => {
    if (!formAmount || isNaN(formAmount) || +formAmount <= 0) return;
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

    if (error) { console.error("Failed to add entry:", error); return; }
    const updated = [...localEntries, data];
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
  };

  // ── Edit entry ──────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!formAmount || isNaN(formAmount) || +formAmount <= 0) return;
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

    if (error) { console.error("Failed to update entry:", error); return; }
    const updated = localEntries.map((e) => (e.id === data.id ? data : e));
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  // ── Delete entry ────────────────────────────────────────────────
  const handleDelete = async () => {
    const { error } = await supabase.from("entries").delete().eq("id", editing.id);
    if (error) { console.error("Failed to delete entry:", error); return; }
    const updated = localEntries.filter((e) => e.id !== editing.id);
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  // ── Add / Edit form view ────────────────────────────────────────
  if (mode === "add" || mode === "edit") {
    return (
      <div className="page" style={{ padding: 0, gap: 0, maxWidth: "100%", background: "var(--bg)", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <button
            onClick={() => { setMode("list"); setEditing(null); }}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            ‹ Back
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {mode === "add" ? "Add Transaction" : formType === "expense" ? "Expense" : "Income"}
          </span>
          <div style={{ width: 60 }} />
        </div>

        {/* Type toggle */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {["income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => {
                if (mode === "edit") return;
                setFormType(t);
                setFormCategory(
                  t === "expense" ? expCats[0]?.name || "" : incCats[0]?.name || ""
                );
              }}
              style={{
                flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
                border: "none", cursor: mode === "edit" ? "default" : "pointer",
                background: "transparent",
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

        {/* Fields */}
        <div style={{ padding: "0 20px" }}>
          {/* Amount */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Amount</span>
            <input
              type="number" placeholder="0" autoFocus value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 28, fontWeight: 700, color: "var(--text)",
                fontFamily: "'Syne', sans-serif", textAlign: "right",
              }}
            />
          </div>

          {/* Date */}
          <div style={{
            display: "flex", alignItems: "center", padding: "18px 0",
            borderBottom: "1px solid var(--border)", cursor: "pointer", position: "relative",
          }}
            onClick={() => document.getElementById("acc-date-input").showPicker?.()}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Date</span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {new Date(formDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric", year: "numeric",
              })}
            </span>
            <input
              id="acc-date-input" type="date" value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }}
            />
          </div>

          {/* Category */}
          <div style={{
            display: "flex", alignItems: "center", padding: "18px 0",
            borderBottom: "1px solid var(--border)", cursor: "pointer",
          }}
            onClick={() => setShowCatPicker(true)}
          >
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Category</span>
            <span style={{ flex: 1, fontSize: 15, color: "var(--text)", textAlign: "right" }}>
              {formCategory || "Select..."}
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>›</span>
          </div>

          {/* Note */}
          <div style={{ display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 15, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>Note</span>
            <input
              type="text" placeholder="Add a note..." value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 15, color: "var(--text)", fontFamily: "inherit", textAlign: "right",
              }}
            />
          </div>
        </div>

        {/* Save button */}
        <div style={{ padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={mode === "edit" ? handleEditSave : handleAddSave}
            style={{
              width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
              background: formType === "expense" ? "var(--red)" : "var(--green)",
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}
          >
            {mode === "edit" ? "Save Changes" : `Add ${formType === "expense" ? "Expense" : "Income"}`}
          </button>

          {mode === "edit" && editing && !editing.is_transfer && (
            <button
              onClick={handleDelete}
              style={{
                width: "100%", padding: "12px", borderRadius: "var(--radius-md)",
                background: "transparent", color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>

        {/* Category picker bottom sheet */}
        {showCatPicker && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
              background: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setShowCatPicker(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--surface)", borderRadius: "20px 20px 0 0",
                padding: "20px 16px", maxHeight: "70vh", overflowY: "auto",
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Category</span>
                <button onClick={() => setShowCatPicker(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
                {(formType === "expense" ? expCats : incCats).map((c) => (
                  <button
                    key={c.id || c.name}
                    onClick={() => { setFormCategory(c.name); setShowCatPicker(false); }}
                    style={{
                      padding: "18px 8px", fontSize: 14, fontWeight: 500,
                      cursor: "pointer", border: "none",
                      background: formCategory === c.name ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
                      color: formCategory === c.name ? "var(--accent)" : "var(--text)",
                      textAlign: "center",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────
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
                  // Delete all entries for this account first
                  const { error: entryError } = await supabase
                    .from("entries")
                    .delete()
                    .eq("account_id", account.id);
                  if (entryError) { console.error(entryError); return; }

                  // Delete the account
                  const { error: accError } = await supabase
                    .from("accounts")
                    .delete()
                    .eq("id", account.id);
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
              >
                ✓ Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: "var(--surface-2)", color: "var(--text-muted)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  padding: "7px 12px", fontSize: 12, cursor: "pointer",
                }}
              >
                Cancel
              </button>
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
            >
              🗑 Delete
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
              {account.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 12,
        background: "var(--surface)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)", overflow: "hidden",
      }}>
        {[
          { label: "Income",  value: `${currMeta.flag}${income.toLocaleString()}`,              color: "var(--green)" },
          { label: "Expense", value: `${currMeta.flag}${expense.toLocaleString()}`,             color: "var(--red)" },
          { label: "Balance", value: `${currMeta.flag}${Math.abs(balance).toLocaleString()}`,   color: balance >= 0 ? "var(--green)" : "var(--red)" },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "12px 8px", textAlign: "center",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
          }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* NPR equivalent for foreign currency accounts */}
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
                    setMode("edit");
                  }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 8px", borderBottom: "1px solid var(--border)",
                    cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.12s",
                  }}
                  onMouseEnter={(el) => (el.currentTarget.style.background = "var(--surface-2)")}
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
                      <p style={{
                        fontSize: 13, color: "var(--text)", fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {e.note || e.category}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {e.category}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: e.type === "income" ? "var(--green)" : "var(--red)",
                    }}>
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
          setFormType("expense");
          setFormAmount("");
          setFormCategory(expCats[0]?.name || "");
          setFormDate(today);
          setFormNote("");
          setMode("add");
        }}
      >
        +
      </button>
    </div>
  );
}