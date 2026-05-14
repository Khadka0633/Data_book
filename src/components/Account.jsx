import { useState, useEffect, useRef, useCallback } from "react";
import pb from "../pb";

// ─── Account Groups ───────────────────────────────────────────────
const ACCOUNT_GROUPS = [
  { key: "savings", label: "Savings", color: "#5fc20e", bg: "#190749" },
  { key: "cash", label: "Cash", color: "#bd6f10", bg: "#190749" },
  { key: "investment", label: "Investments", color: "#534AB7", bg: "#190749" },
  { key: "loan", label: "Loans", color: "#A32D2D", bg: "#190749" },
  { key: "bank", label: "Bank", color: "#0ab97f", bg: "#190749" },
  { key: "wallet", label: "Digital_Wallet", color: "#ac9330", bg: "#190749" },
];

// ─── Currencies ───────────────────────────────────────────────────
const CURRENCIES = [
  { code: "NPR", flag: "🇳🇵", name: "Nepali Rupee" },
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
  { code: "AED", flag: "🇦🇪", name: "UAE Dirham" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
  { code: "KRW", flag: "🇰🇷", name: "South Korean Won" },
  { code: "SAR", flag: "🇸🇦", name: "Saudi Riyal" },
  { code: "QAR", flag: "🇶🇦", name: "Qatari Riyal" },
  { code: "MYR", flag: "🇲🇾", name: "Malaysian Ringgit" },
  { code: "THB", flag: "🇹🇭", name: "Thai Baht" },
  { code: "HKD", flag: "🇭🇰", name: "Hong Kong Dollar" },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

// ─── Exchange Rate Hook ───────────────────────────────────────────
const EXCHANGE_API_KEY = "4bb84711891658fe0cf10aa7";
let _ratesCache = null;
let _ratesCacheTime = 0;

function useExchangeRates() {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    const load = async () => {
      const now = Date.now();
      if (_ratesCache && now - _ratesCacheTime < 3_600_000) {
        setRates(_ratesCache);
        return;
      }
      try {
        const res = await fetch(
          `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/NPR`,
        );
        const data = await res.json();
        if (data.result === "success") {
          _ratesCache = data.conversion_rates;
          _ratesCacheTime = now;
          setRates(data.conversion_rates);
        }
      } catch (err) {
        console.error("Exchange rate fetch failed:", err);
      }
    };
    load();
  }, []);

  // Convert amount in fromCurrency to NPR
  const toNPR = useCallback(
    (amount, fromCurrency) => {
      if (!rates || fromCurrency === "NPR") return amount;
      const rate = rates[fromCurrency];
      if (!rate) return amount;
      // rates are NPR → X, so to go from X → NPR: amount / rate
      return amount / rate;
    },
    [rates],
  );

  // Format with currency symbol
  const format = useCallback((amount, currency = "NPR") => {
    const meta = CURRENCY_MAP[currency];
    const flag = meta?.flag || "";
    return `${flag} ${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }, []);

  return { rates, toNPR, format };
}

// ─── Icon Picker ──────────────────────────────────────────────────
const ACCOUNT_ICONS = [
  "🏦",
  "💵",
  "💳",
  "📱",
  "💜",
  "💰",
  "🏧",
  "💹",
  "📈",
  "🪙",
  "🏠",
  "🚗",
  "✈️",
];

function IconPicker({ value, onChange }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 4,
        padding: 10,
        background: "var(--surface-2)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      {ACCOUNT_ICONS.map((icon) => (
        <button
          key={icon}
          onClick={() => onChange(icon)}
          style={{
            fontSize: 20,
            padding: 6,
            borderRadius: "var(--radius-sm)",
            border:
              value === icon
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            background:
              value === icon ? "rgba(99,102,241,0.15)" : "transparent",
            cursor: "pointer",
            lineHeight: 1,
            transition: "all 0.15s",
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Currency Picker ──────────────────────────────────────────────
function CurrencyPicker({ value, onChange }) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code} — {c.name}
        </option>
      ))}
    </select>
  );
}

// ─── Entry Form (Add / Edit inside account detail) ────────────────
function EntryForm({
  account,
  entry,
  expCats,
  incCats,
  onSave,
  onDelete,
  onCancel,
}) {
  const isEdit = Boolean(entry);
  const today = new Date().toISOString().split("T")[0];
  const initialType = entry?.type || "expense";
  const [draft, setDraft] = useState({
    type: initialType,
    amount: entry?.amount ? String(entry.amount) : "",
    category:
      entry?.category ||
      (initialType === "expense" ? expCats[0]?.name : incCats[0]?.name) ||
      "",
    note: entry?.note || "",
    date: entry?.date || today,
  });
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setError("");
  };
  const currentCats = draft.type === "expense" ? expCats : incCats;
  const currency = account.currency || "NPR";
  const currMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.NPR;

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setDraft((d) => ({ ...d, type: t, category: cats[0]?.name || "" }));
  };

  const handleSave = () => {
    const amt = parseFloat(draft.amount);
    if (!draft.amount || isNaN(amt) || amt <= 0)
      return setError("Enter a valid amount.");
    if (!draft.category.trim()) return setError("Category is required.");
    onSave({
      ...draft,
      amount: amt,
      category: draft.category.trim(),
      note: draft.note.trim(),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {["expense", "income"].map((t) => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 13,
              fontWeight: 600,
              background:
                draft.type === t
                  ? t === "income"
                    ? "var(--green)"
                    : "var(--red)"
                  : "var(--surface-2)",
              color: draft.type === t ? "#fff" : "var(--text-muted)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t === "expense" ? "− Expense" : "+ Income"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Amount</label>
        <input
          className="input"
          type="number"
          placeholder="0"
          value={draft.amount}
          onChange={(e) => set("amount", e.target.value)}
          style={{ fontSize: 18, fontWeight: 700 }}
          autoFocus
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Category</label>
        {currentCats.length > 0 ? (
          <select
            className="input"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {currentCats.map((c) => (
              <option key={c.id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            No categories. Add them in Finance tab.
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Note (optional)</label>
        <input
          className="input"
          placeholder="Additional details…"
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Date</label>
        <input
          className="input"
          type="date"
          value={draft.date}
          onChange={(e) => set("date", e.target.value)}
        />
      </div>

      {error && <p className="cat-error">{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={handleSave}
        >
          {isEdit ? "Save Changes" : "Add Entry"}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {isEdit &&
        !entry.isTransfer &&
        (confirmDel ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                flex: 1,
                background: "rgba(239,68,68,0.12)",
                color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-sm)",
                padding: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={onDelete}
            >
              Confirm Delete
            </button>
            <button className="btn-cancel" onClick={() => setConfirmDel(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            style={{
              background: "transparent",
              color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setConfirmDel(true)}
          >
            🗑 Delete Entry
          </button>
        ))}
    </div>
  );
}

function AccountDetailPage({
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

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      pb
        .collection("expense_categories")
        .getFullList({ filter: `userId = '${userId}'` }),
      pb
        .collection("income_categories")
        .getFullList({ filter: `userId = '${userId}'` }),
    ]).then(([exp, inc]) => {
      setExpCats(exp);
      setIncCats(inc);
    });
  }, [userId]);

  const currency = account.currency || "NPR";
  const currMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.NPR;

  const accEntries = localEntries
    .filter((e) => e.accountId === account.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const income = accEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expense = accEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
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

  const handleAddSave = async (draft) => {
    const created = await pb
      .collection("entries")
      .create({ ...draft, accountId: account.id, userId, isTransfer: false });
    const updated = [...localEntries, created];
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
  };

  const handleEditSave = async (draft) => {
    const saved = await pb.collection("entries").update(editing.id, draft);
    const updated = localEntries.map((e) => (e.id === saved.id ? saved : e));
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  const handleDelete = async () => {
    await pb.collection("entries").delete(editing.id);
    const updated = localEntries.filter((e) => e.id !== editing.id);
    setLocalEntries(updated);
    onEntriesChange(updated);
    setMode("list");
    setEditing(null);
  };

  // ── Add / Edit form view ──────────────────────────────────────
  if (mode === "add" || mode === "edit") {
    const draft = editing || {};
    return (
      <div
        className="page"
        style={{
          padding: 0,
          gap: 0,
          maxWidth: "100%",
          background: "var(--bg)",
          minHeight: "100vh",
        }}
      >
        {/* Top bar */}
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
            onClick={() => {
              setMode("list");
              setEditing(null);
            }}
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
            {mode === "add"
              ? "Add Transaction"
              : editing?.type === "expense"
                ? "Expense"
                : "Income"}
          </span>
          <div style={{ width: 60 }} />
        </div>

        {/* Type toggle */}
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
          {["income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => {
                if (mode === "edit") return;
                setFormType(t);
                setFormCategory(
                  t === "expense"
                    ? expCats[0]?.name || ""
                    : incCats[0]?.name || "",
                );
              }}
              style={{
                flex: 1,
                padding: "14px 0",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: mode === "edit" ? "default" : "pointer",
                background: "transparent",
                color:
                  formType === t
                    ? t === "expense"
                      ? "var(--red)"
                      : "var(--green)"
                    : "var(--text-muted)",
                borderBottom:
                  formType === t
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                width: 90,
                flexShrink: 0,
              }}
            >
              Amount
            </span>
            <input
              type="number"
              placeholder="0"
              autoFocus
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 16,
                color: "var(--text)",
                fontFamily: "inherit",
                textAlign: "right",
              }}
            />
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
            onClick={() =>
              document.getElementById("acc-date-input").showPicker?.()
            }
          >
            <span
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                width: 90,
                flexShrink: 0,
              }}
            >
              Date
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 15,
                color: "var(--text)",
                textAlign: "right",
              }}
            >
              {new Date(formDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <input
              id="acc-date-input"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={{
                position: "absolute",
                opacity: 0,
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                cursor: "pointer",
              }}
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
            <span
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                width: 90,
                flexShrink: 0,
              }}
            >
              Category
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 15,
                color: "var(--text)",
                textAlign: "right",
              }}
            >
              {formCategory || "Select..."}
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
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                width: 90,
                flexShrink: 0,
              }}
            >
              Note
            </span>
            <input
              type="text"
              placeholder="Add a note..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
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
          </div>
        </div>

        {/* Save button */}
        <div
          style={{
            padding: "24px 20px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            onClick={async () => {
              if (!formAmount || isNaN(formAmount) || +formAmount <= 0) return;
              if (mode === "edit" && editing) {
                await handleEditSave({
                  type: formType,
                  amount: +formAmount,
                  category: formCategory,
                  note: formNote,
                  date: formDate,
                });
              } else {
                await handleAddSave({
                  type: formType,
                  amount: +formAmount,
                  category: formCategory,
                  note: formNote,
                  date: formDate,
                });
              }
            }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              background:
                formType === "expense" ? "var(--red)" : "var(--green)",
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {mode === "edit"
              ? "Save Changes"
              : `Add ${formType === "expense" ? "Expense" : "Income"}`}
          </button>

          {mode === "edit" && editing && !editing.isTransfer && (
            <button
              onClick={handleDelete}
              style={{
                width: "100%",
                padding: "12px",
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

        {/* Category picker bottom sheet */}
        {showCatPicker && (
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
            onClick={() => setShowCatPicker(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--surface)",
                borderRadius: "20px 20px 0 0",
                padding: "20px 16px",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--border)",
                  margin: "0 auto 16px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Category
                </span>
                <button
                  onClick={() => setShowCatPicker(false)}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                  background: "var(--border)",
                }}
              >
                {(formType === "expense" ? expCats : incCats).map((c) => (
                  <button
                    key={c.id || c.name}
                    onClick={() => {
                      setFormCategory(c.name);
                      setShowCatPicker(false);
                    }}
                    style={{
                      padding: "18px 8px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "none",
                      background:
                        formCategory === c.name
                          ? "rgba(99,102,241,0.15)"
                          : "var(--surface-2)",
                      color:
                        formCategory === c.name
                          ? "var(--accent)"
                          : "var(--text)",
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

  // ── List view ─────────────────────────────────────────────────
  return (
    <div className="page" style={{ padding: 16, gap: 0 }}>
      {/* Top nav */}
      <div style={{ marginBottom: 20 }}>
        {/* Row 1: Back + Delete */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "7px 14px",
              fontSize: 14,
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            ← Accounts
          </button>

          {confirmDelete ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={async () => {
                  const linked = entries.filter(
                    (e) => e.accountId === account.id,
                  );
                  await Promise.all(
                    linked.map((e) => pb.collection("entries").delete(e.id)),
                  );
                  await pb.collection("accounts").delete(account.id);
                  onEntriesChange(
                    entries.filter((e) => e.accountId !== account.id),
                  );
                  onAccountsChange(accounts.filter((a) => a.id !== account.id));
                  onBack();
                }}
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "var(--red)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>

        {/* Row 2: Account info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {account.name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
             
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 12,
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {[
          {
            label: "Income",
            value: `${currMeta.flag}${income.toLocaleString()}`,
            color: "var(--green)",
          },
          {
            label: "Expense",
            value: `${currMeta.flag}${expense.toLocaleString()}`,
            color: "var(--red)",
          },
          {
            label: "Balance",
            value: `${currMeta.flag}${Math.abs(balance).toLocaleString()}`,
            color: balance >= 0 ? "var(--green)" : "var(--red)",
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "12px 8px",
              textAlign: "center",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 3,
              }}
            >
              {s.label}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* NPR equivalent */}
      {currency !== "NPR" && (
        <div
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Balance in NPR
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: balanceNPR >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            🇳🇵 रु
            {Math.abs(balanceNPR).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      )}

      {/* Transactions */}
      {accEntries.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: "40px 0",
            fontSize: 13,
          }}
        >
          No transactions yet. Tap + to add one.
        </p>
      ) : (
        grouped.map(({ date, entries: dayEntries }) => {
          const d = new Date(date + "T00:00:00");
          return (
            <div key={date} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: "8px 0 4px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {d.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {dayEntries.map((e, idx) => (
                <div
                  key={`${e.id}-${idx}`}
                  onClick={() => {
                    if (e.isTransfer) return; // don't edit transfers
                    setEditing(e);
                    setFormType(e.type);
                    setFormAmount(String(e.amount));
                    setFormCategory(e.category);
                    setFormDate(e.date);
                    setFormNote(e.note || "");
                    setMode("edit");
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 8px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(el) =>
                    (el.currentTarget.style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(el) =>
                    (el.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    {Boolean(e.isTransfer) ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        ↔
                      </span>
                    ) : (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            e.type === "income" ? "var(--green)" : "var(--red)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.note || e.category}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}
                      >
                        {e.category}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color:
                          e.type === "income" ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {e.type === "income" ? "+" : "−"}
                      {currMeta.flag}
                      {e.amount.toLocaleString()}
                    </span>
                    {currency !== "NPR" && (
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}
                      >
                        ≈ रु
                        {toNPR(e.amount, currency).toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
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

// ─── Account Form (shared by Add + Edit) ─────────────────────────
function AccountForm({ initial, onSave, onCancel, title }) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Preview */}
      <div
        style={{
          background: "var(--surface-2)",
          border: `2px solid ${draft.color}`,
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: `0 0 16px ${draft.color}22`,
        }}
      >
        <span style={{ fontSize: 26 }}>{draft.icon || "🏦"}</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {draft.name || "Account Name"}
          </p>
          <p style={{ fontSize: 11, color: draft.color, marginTop: 2 }}>
            {ACCOUNT_GROUPS.find((g) => g.key === draft.group)?.label} ·{" "}
            {currMeta.flag} {draft.currency}
          </p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 700,
            fontSize: 16,
            color: draft.color,
          }}
        >
          {currMeta.flag} 0
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Account Name</label>
        <input
          className="input"
          placeholder="e.g. NIMB Bank"
          value={draft.name}
          onChange={(e) => {
            set("name", e.target.value);
            setError("");
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Group</label>
        <select
          className="input"
          value={draft.group}
          onChange={(e) => set("group", e.target.value)}
        >
          {ACCOUNT_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Currency */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Currency</label>
        <CurrencyPicker
          value={draft.currency || "NPR"}
          onChange={(v) => set("currency", v)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <label className="input-label">Icon</label>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            tap to select
          </span>
        </div>
        <IconPicker value={draft.icon} onChange={(icon) => set("icon", icon)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="input-label">Color</label>
        <input
          type="color"
          className="color-pick"
          value={draft.color}
          onChange={(e) => set("color", e.target.value)}
          style={{ width: "100%", height: 42 }}
        />
      </div>

      {error && <p className="cat-error">{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            if (!draft.name.trim())
              return setError("Account name cannot be empty.");
            onSave({
              ...draft,
              name: draft.name.trim(),
              currency: draft.currency || "NPR",
            });
          }}
        >
          {title}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────
function DeleteAccountModal({
  account,
  linkedCount,
  accounts,
  onConfirmDelete,
  onReassignAndDelete,
  onClose,
}) {
  const [reassignTo, setReassignTo] = useState("");
  const others = accounts.filter((a) => a.id !== account.id);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--red)" }}>
            🗑 Delete Account
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>{account.icon}</span>
            <div>
              <p
                style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}
              >
                {account.name}
              </p>
              {linkedCount > 0 && (
                <p
                  style={{ fontSize: 12, color: "var(--orange)", marginTop: 2 }}
                >
                  ⚠ {linkedCount} transactions linked
                </p>
              )}
            </div>
          </div>
          {linkedCount === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-soft)",
                lineHeight: 1.6,
              }}
            >
              No transactions. This account will be permanently deleted.
            </p>
          ) : (
            others.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="input-label">Reassign transactions to</label>
                <select
                  className="input"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">— select account —</option>
                  {others.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {linkedCount > 0 && others.length > 0 && (
              <button
                className="btn-primary"
                disabled={!reassignTo}
                style={{ opacity: reassignTo ? 1 : 0.45 }}
                onClick={() => reassignTo && onReassignAndDelete(reassignTo)}
              >
                Reassign & Delete
              </button>
            )}
            <button
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-sm)",
                padding: "11px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={onConfirmDelete}
            >
              {linkedCount > 0
                ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}`
                : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────
export default function Account({
  accounts,
  accountBalances,
  entries,
  userId,
  onAccountsChange,
  onEntriesChange,
  onShowTransfer,
}) {
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const { rates, toNPR, format } = useExchangeRates();

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  // Net worth in NPR (converting each account's balance)
  const grandTotal = accounts.reduce((s, a) => {
    const bal = accountBalances[a.id] || 0;
    return s + toNPR(bal, a.currency || "NPR");
  }, 0);

  if (selectedAcc) {
    return (
      <AccountDetailPage
        account={selectedAcc}
        entries={entries}
        userId={userId}
        toNPR={toNPR}
        format={format}
        accounts={accounts}
        onBack={() => setSelectedAcc(null)}
        onEntriesChange={onEntriesChange}
        onAccountsChange={onAccountsChange}
      />
    );
  }

  const addAccount = async (draft) => {
    try {
      const created = await pb.collection("accounts").create({
        ...draft,
        group: draft.group || "cash",
        currency: draft.currency || "NPR",
        userId,
      });
      onAccountsChange([...accounts, created]);
      setShowAddAcc(false);
    } catch (err) {
      console.error("Failed to create account:", err);
    }
  };

  const handleSaveAccount = async (updated) => {
    try {
      const saved = await pb.collection("accounts").update(updated.id, {
        name: updated.name,
        icon: updated.icon,
        color: updated.color,
        group: updated.group || "cash",
        currency: updated.currency || "NPR",
      });
      onAccountsChange(accounts.map((a) => (a.id === saved.id ? saved : a)));
      setEditingAccount(null);
    } catch (err) {
      console.error("Failed to update account:", err);
    }
  };

  const linkedEntryCount = (accId) =>
    entries.filter((e) => e.accountId === accId).length;

  const handleConfirmDeleteAccount = async (accId) => {
    const linked = entries.filter((e) => e.accountId === accId);
    await Promise.all(linked.map((e) => pb.collection("entries").delete(e.id)));
    await pb.collection("accounts").delete(accId);
    onEntriesChange(entries.filter((e) => e.accountId !== accId));
    onAccountsChange(accounts.filter((a) => a.id !== accId));
    setDeletingAccount(null);
  };

  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const linked = entries.filter((e) => e.accountId === accId);
    await Promise.all(
      linked.map((e) =>
        pb.collection("entries").update(e.id, { accountId: reassignToId }),
      ),
    );
    await pb.collection("accounts").delete(accId);
    onEntriesChange(
      entries.map((e) =>
        e.accountId === accId ? { ...e, accountId: reassignToId } : e,
      ),
    );
    onAccountsChange(accounts.filter((a) => a.id !== accId));
    setDeletingAccount(null);
  };

  return (
    <div className="page" style={{ padding: 16, gap: 0 }}>
      {/* Modals */}
      {selectedAcc && (
        <AccountDetailModal
          account={selectedAcc}
          entries={entries}
          userId={userId}
          toNPR={toNPR}
          format={format}
          onClose={() => setSelectedAcc(null)}
          onEntriesChange={onEntriesChange}
        />
      )}
      {editingAccount && (
        <div className="modal-overlay" onClick={() => setEditingAccount(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Account</h3>
              <button
                className="modal-close"
                onClick={() => setEditingAccount(null)}
              >
                ✕
              </button>
            </div>
            <AccountForm
              initial={{
                name: editingAccount.name,
                icon: editingAccount.icon,
                color: editingAccount.color,
                group: editingAccount.group || "cash",
                currency: editingAccount.currency || "NPR",
              }}
              onSave={(draft) =>
                handleSaveAccount({ ...editingAccount, ...draft })
              }
              onCancel={() => setEditingAccount(null)}
              title="Save Changes"
            />
          </div>
        </div>
      )}
      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          linkedCount={linkedEntryCount(deletingAccount.id)}
          accounts={accounts}
          onConfirmDelete={() => handleConfirmDeleteAccount(deletingAccount.id)}
          onReassignAndDelete={(id) =>
            handleReassignAndDeleteAccount(deletingAccount.id, id)
          }
          onClose={() => setDeletingAccount(null)}
        />
      )}
      {showAddAcc && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddAcc(false)}
          style={{ zIndex: 100 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: "100%" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">New Account</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddAcc(false)}
              >
                ✕
              </button>
            </div>
            <AccountForm
              onSave={addAccount}
              onCancel={() => setShowAddAcc(false)}
              title="Save Account"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: -0.5,
            }}
          >
            Accounts
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <button
            onClick={() => setShowAddAcc(true)}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Assets / Liabilities / Net Worth bar */}
      {(() => {
        const assets = accounts
          .filter((a) => a.group !== "loan")
          .reduce((s, a) => {
            const bal = accountBalances[a.id] || 0;
            return s + toNPR(Math.max(bal, 0), a.currency || "NPR");
          }, 0);

        const liabilities = accounts
          .filter((a) => a.group === "loan")
          .reduce((s, a) => {
            const bal = accountBalances[a.id] || 0;
            return s + toNPR(Math.abs(Math.min(bal, 0)), a.currency || "NPR");
          }, 0);

        const net = assets - liabilities;

        return (
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 16,
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            {[
              { label: "Assets", value: assets, color: "var(--green)" },
              { label: "Liabilities", value: liabilities, color: "var(--red)" },
              {
                label: "Net Total",
                value: net,
                color: net >= 0 ? "var(--green)" : "var(--red)",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  textAlign: "center",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 3,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  रु
                  {Math.abs(s.value).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Account list */}
      {accounts.length === 0 ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          No accounts yet. Tap + to add one.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ACCOUNT_GROUPS.map((grp) => {
            const grpAccounts = accounts.filter((a) => a.group === grp.key);
            if (!grpAccounts.length) return null;
            const grpTotalNPR = grpAccounts.reduce(
              (s, a) =>
                s + toNPR(accountBalances[a.id] || 0, a.currency || "NPR"),
              0,
            );
            return (
              <div key={grp.key} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0 4px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-2)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: grp.color,
                      }}
                    >
                      {grp.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: grpTotalNPR >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {grpTotalNPR >= 0 ? "+" : "−"}रु
                    {Math.abs(grpTotalNPR).toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                {grpAccounts.map((acc) => {
                  const bal = accountBalances[acc.id] || 0;
                  const currency = acc.currency || "NPR";
                  const currMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.NPR;
                  const balNPR = toNPR(bal, currency);

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAcc(acc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--surface-2)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {acc.name}
                            </p>
                            {currency !== "NPR" && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: "rgba(99,102,241,0.1)",
                                  color: "var(--accent)",
                                  border: "1px solid rgba(99,102,241,0.2)",
                                  borderRadius: 99,
                                  padding: "0px 5px",
                                  fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              >
                                {currMeta.flag} {currency}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: bal >= 0 ? "var(--green)" : "var(--red)",
                            }}
                          >
                            रु
                            {Math.abs(bal).toLocaleString()}
                          </p>
                          {currency !== "NPR" && (
                            <p
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                              }}
                            >
                              ≈ रु
                              {Math.abs(balNPR).toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
