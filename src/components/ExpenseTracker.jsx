import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import pb from "../pb";
import TransferPage from "./TransferPage";
import NumericKeypad from "./NumericKeypad";
import CategoryHistoryModal from "./CategoryHistoryModal";
import EditTransferPage from "./EditTransferPage";
import CategoryManager from "./CategoryManager";

function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  return null;
}

function useNoteSuggestions(entries, form) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  useEffect(() => {
    const query = form.note.trim().toLowerCase();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const seen = new Set();
    const matches = entries
      .filter(
        (e) =>
          e.type === form.type &&
          (!form.category || e.category === form.category) &&
          e.note &&
          e.note.toLowerCase().includes(query) &&
          !seen.has(e.note) &&
          seen.add(e.note),
      )
      .slice(0, 5)
      .map((e) => e.note);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.note, form.type, form.category, entries]);
  return { suggestions, showSuggestions, setShowSuggestions };
}

const CAT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#0ea5e9",
  "#a855f7",
  "#fb923c",
  "#10b981",
];
function getRandomColor(existing = []) {
  const unused = CAT_COLORS.filter((c) => !existing.includes(c));
  return (unused.length > 0 ? unused : CAT_COLORS)[
    Math.floor(Math.random() * (unused.length || CAT_COLORS.length))
  ];
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.92)} }`}</style>
      <span
        style={{
          fontSize: 40,
          color: "var(--accent)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        ⬡
      </span>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
    </div>
  );
}

export default function ExpenseTracker({
  userId,
  accounts,
  entries,
  onEntriesChange,
  ai,
}) {
  const today = new Date().toISOString().split("T")[0];
  const [loading, setLoading] = useState(true);
  const [expCats, setExpCats] = useState([]);
  const [incCats, setIncCats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: "",
    note: "",
    date: today,
    accountId: accounts?.[0]?.id || "",
  });
  const [filterDate, setFilterDate] = useState(today);
  const [confirmId, setConfirmId] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [catModal, setCatModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catHistory, setCatHistory] = useState(null);
  const hasLoaded = useRef(false);
  const { suggestions, showSuggestions, setShowSuggestions } =
    useNoteSuggestions(entries, form);
  const [editTransfer, setEditTransfer] = useState(null);
  const [showTransferPage, setShowTransferPage] = useState(false);

  // ── AI auto-categorization state ──────────────────────────────
  const [showAiCatBadge, setShowAiCatBadge] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);

  const loadData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    setLoading(true);
    try {
      const [expCatsRes, incCatsRes] = await Promise.all([
        pb
          .collection("expense_categories")
          .getFullList({ filter: `userId = '${userId}'` }),
        pb
          .collection("income_categories")
          .getFullList({ filter: `userId = '${userId}'` }),
      ]);
      setExpCats(expCatsRes);
      setIncCats(incCatsRes);
      setForm((f) => ({
        ...f,
        accountId: f.accountId || accounts?.[0]?.id || "",
        category: f.category || expCatsRes[0]?.name || "",
      }));
    } catch (err) {
      console.error("Failed to load categories:", err);
      // FIX: reset ref on failure so retry is possible
      hasLoaded.current = false;
    } finally {
      setLoading(false);
    }
  }, [userId, accounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!form.accountId && accounts?.length)
      setForm((f) => ({ ...f, accountId: accounts[0].id }));
  }, [accounts]);

  // FIX: combined scroll lock effect for form and transfer pages
  useEffect(() => {
    const scrollEl = document.querySelector(".main-content");
    if (showForm || showTransferPage || editTransfer) {
      if (scrollEl) scrollEl.style.overflow = "hidden";
    } else {
      if (scrollEl) scrollEl.style.overflow = "";
    }
    return () => {
      if (scrollEl) scrollEl.style.overflow = "";
    };
  }, [showForm, showTransferPage, editTransfer]);

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

  // ── AI auto-categorization: trigger on note change ────────────
  useEffect(() => {
    if (!ai || !form.note || form.note.trim().length < 3) {
      setShowAiCatBadge(false);
      return;
    }
    ai.suggestCategory(form.note, form.type);
    setShowAiCatBadge(false);
  }, [form.note, form.type]);

  useEffect(() => {
    if (ai?.catSuggestion && showForm) {
      setShowAiCatBadge(true);
    }
  }, [ai?.catSuggestion, showForm]);

  const applyAiCategory = () => {
    if (!ai?.catSuggestion) return;
    setForm((f) => ({ ...f, category: ai.catSuggestion }));
    setShowAiCatBadge(false);
    ai.clearCatSuggestion();
  };

  const currentCats = form.type === "expense" ? expCats : incCats;
  const getCatColor = (category, type) =>
    (type === "expense" ? expCats : incCats).find((c) => c.name === category)
      ?.color || "#94a3b8";

  const handleAddCat = async (type, cat) => {
    const collection =
      type === "expense" ? "expense_categories" : "income_categories";
    const created = await pb.collection(collection).create({ ...cat, userId });
    if (type === "expense") setExpCats((prev) => [...prev, created]);
    else setIncCats((prev) => [...prev, created]);
  };

  const handleDeleteCat = async (type, name) => {
    const collection =
      type === "expense" ? "expense_categories" : "income_categories";
    const list = type === "expense" ? expCats : incCats;
    const record = list.find((c) => c.name === name);
    if (!record) return;
    await pb.collection(collection).delete(record.id);
    if (type === "expense")
      setExpCats((prev) => prev.filter((c) => c.name !== name));
    else setIncCats((prev) => prev.filter((c) => c.name !== name));
  };

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm((f) => ({ ...f, type: t, category: cats[0]?.name || "" }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditEntry(null);
    setShowAiCatBadge(false);
    ai?.clearCatSuggestion?.();
    setForm({
      type: "expense",
      amount: "",
      category: expCats[0]?.name || "",
      note: "",
      date: today,
      accountId: accounts?.[0]?.id || "",
    });
  };

  const ledgerMonth = filterDate.slice(0, 7);

  const totalIncome = entries
    .filter(
      (e) =>
        e.type === "income" &&
        !Boolean(e.isTransfer) &&
        e.date.slice(0, 7) === ledgerMonth,
    )
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries
    .filter(
      (e) =>
        e.type === "expense" &&
        !Boolean(e.isTransfer) &&
        e.date.slice(0, 7) === ledgerMonth,
    )
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const changeMonth = (dir) => {
    const d = new Date(filterDate + "T00:00:00");
    d.setMonth(d.getMonth() + dir);
    setFilterDate(d.toISOString().split("T")[0]);
  };
  const monthLabel = new Date(filterDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const isCurrentMonth = ledgerMonth === today.slice(0, 7);

  const monthlyGrouped = useMemo(() => {
    const filtered = entries.filter((e) => e.date.slice(0, 7) === ledgerMonth);
    const seen = new Set();
    const collapsed = [];
    filtered.forEach((e) => {
      if (!Boolean(e.isTransfer)) {
        collapsed.push(e);
        return;
      }
      if (seen.has(e.id)) return;
      const pair = filtered.find(
        (p) =>
          p.id !== e.id &&
          Boolean(p.isTransfer) &&
          p.amount === e.amount &&
          p.date === e.date &&
          p.type !== e.type,
      );
      if (pair) {
        seen.add(e.id);
        seen.add(pair.id);
        const fromEntry = e.type === "expense" ? e : pair;
        const toEntry = e.type === "income" ? e : pair;
        collapsed.push({ ...fromEntry, _transferTo: toEntry, _isPair: true });
      } else collapsed.push(e);
    });
    const groups = {};
    collapsed.forEach((e) => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, entries: groups[date] }));
  }, [entries, ledgerMonth]);

  const addEntry = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    setSaving(true);
    try {
      if (editEntry) {
        const updated = await pb.collection("entries").update(editEntry, {
          type: form.type,
          amount: +form.amount,
          category: form.category,
          note: form.note,
          date: form.date,
          accountId: form.accountId,
          userId,
        });
        onEntriesChange(entries.map((e) => (e.id === editEntry ? updated : e)));
      } else {
        const created = await pb.collection("entries").create({
          type: form.type,
          amount: +form.amount,
          category: form.category,
          note: form.note,
          date: form.date,
          accountId: form.accountId,
          userId,
          isTransfer: false,
        });
        onEntriesChange([created, ...entries]);
      }
      closeForm();
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditEntry(e.id);
    setShowForm(true);
    setForm({
      type: e.type,
      amount: String(e.amount),
      category: e.category,
      note: e.note,
      date: e.date,
      accountId: e.accountId,
    });
  };

  const handleDelete = async (id) => {
    if (confirmId === id) {
      const entry = entries.find((e) => e.id === id);
      if (entry?.isTransfer) {
        const paired = entries.find(
          (e) =>
            e.id !== id &&
            Boolean(e.isTransfer) &&
            e.amount === entry.amount &&
            e.date === entry.date &&
            e.type !== entry.type,
        );
        await pb.collection("entries").delete(id);
        if (paired) await pb.collection("entries").delete(paired.id);
        onEntriesChange(
          entries.filter((e) => e.id !== id && e.id !== paired?.id),
        );
      } else {
        await pb.collection("entries").delete(id);
        onEntriesChange(entries.filter((e) => e.id !== id));
      }
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  if (loading) return <LoadingScreen />;

  // ── Edit Transfer Page ────────────────────────────────────────
  if (editTransfer) {
    return (
      <EditTransferPage
        entry={editTransfer}
        accounts={accounts}
        entries={entries}
        // FIX: onSave now receives fromId and toId from the page,
        // so account changes in the picker are actually persisted.
        onSave={async (amount, note, date, fromId, toId) => {
          const fromName = accounts.find((a) => a.id === fromId)?.name;
          const toName = accounts.find((a) => a.id === toId)?.name;
          await pb.collection("entries").update(editTransfer.id, {
            amount,
            note: note
              ? `Transfer to ${toName}: ${note}`
              : `Transfer to ${toName}`,
            date,
            accountId: fromId,
          });
          await pb.collection("entries").update(editTransfer._transferTo.id, {
            amount,
            note: note
              ? `Transfer from ${fromName}: ${note}`
              : `Transfer from ${fromName}`,
            date,
            accountId: toId,
          });
          onEntriesChange(
            entries.map((e) => {
              if (e.id === editTransfer.id)
                return { ...e, amount, note, date, accountId: fromId };
              if (e.id === editTransfer._transferTo.id)
                return { ...e, amount, note, date, accountId: toId };
              return e;
            }),
          );
          setEditTransfer(null);
        }}
        onDelete={async () => {
          await pb.collection("entries").delete(editTransfer.id);
          await pb.collection("entries").delete(editTransfer._transferTo.id);
          onEntriesChange(
            entries.filter(
              (e) =>
                e.id !== editTransfer.id &&
                e.id !== editTransfer._transferTo.id,
            ),
          );
          setEditTransfer(null);
        }}
        onClose={() => setEditTransfer(null)}
      />
    );
  }

  // ── Transfer Page ─────────────────────────────────────────────
  if (showTransferPage) {
    return (
      <TransferPage
        accounts={accounts}
        userId={userId}
        today={today}
        entries={entries}
        onTransferDone={(newEntries) => {
          onEntriesChange([...newEntries, ...entries]);
          setShowTransferPage(false);
        }}
        onClose={() => setShowTransferPage(false)}
        onSwitchType={(type) => {
          setShowTransferPage(false);
          setForm((f) => ({ ...f, type }));
          setShowForm(true);
        }}
      />
    );
  }

  // ── Add / Edit Entry Form ─────────────────────────────────────
  if (showForm) {
    return (
      <div
        style={{
          position: "fixed",
          // FIX: was "inset: 2" which offset the overlay; corrected to 0
          inset: 0,
          background: "var(--bg)",
          zIndex: 50,
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
            onClick={closeForm}
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
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
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
                    ? t === "expense"
                      ? "var(--red)"
                      : "var(--green)"
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
            onClick={() => {
              closeForm();
              setShowTransferPage(true);
            }}
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
              onClick={() =>
                document.getElementById("date-input").showPicker?.()
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
                {new Date(form.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <input
                id="date-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                {form.category || "Select..."}
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                ›
              </span>
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
              <span
                style={{
                  fontSize: 15,
                  color: "var(--text-muted)",
                  width: 90,
                  flexShrink: 0,
                }}
              >
                Account
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "var(--text)",
                  textAlign: "right",
                }}
              >
                {accounts.find((a) => a.id === form.accountId)?.icon}{" "}
                {accounts.find((a) => a.id === form.accountId)?.name ||
                  "Select..."}
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                ›
              </span>
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
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
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
                        borderBottom:
                          i < suggestions.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--surface-2)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        {/* FIX: padding typo corrected from "px 20px 20px" to "12px 20px 20px" */}
        <div style={{ padding: "12px 20px 20px" }}>
          <button
            onClick={addEntry}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              background:
                form.type === "expense" ? "var(--red)" : "var(--green)",
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : editEntry
                ? "Save Changes"
                : `Add ${form.type === "expense" ? "Expense" : "Income"}`}
          </button>
          {editEntry && (
            <button
              onClick={async () => {
                await pb.collection("entries").delete(editEntry);
                onEntriesChange(entries.filter((e) => e.id !== editEntry));
                closeForm();
              }}
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

        {/* ── Keypad pinned at bottom ── */}
        <div
          style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
        >
          <NumericKeypad
            value={form.amount}
            onChange={(val) => setForm({ ...form, amount: val })}
          />
        </div>

        {/* ── Category Manager modal ── */}
        {/* FIX: removed the duplicate catModal render that was buried inside the
            save-button div; this is the single correct location */}
        {catModal && (
          <CategoryManager
            type={catModal}
            categories={catModal === "expense" ? expCats : incCats}
            onAdd={(cat) => handleAddCat(catModal, cat)}
            onDelete={(name) => handleDeleteCat(catModal, name)}
            onClose={() => setCatModal(null)}
          />
        )}

        {/* Account Picker Bottom Sheet */}
        {showAccPicker && (
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
            onClick={() => setShowAccPicker(false)}
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
                  Account
                </span>
                <button
                  onClick={() => setShowAccPicker(false)}
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
                {(accounts || []).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setForm((f) => ({ ...f, accountId: a.id }));
                      setShowAccPicker(false);
                    }}
                    style={{
                      padding: "18px 8px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "none",
                      background:
                        form.accountId === a.id
                          ? "rgba(99,102,241,0.15)"
                          : "var(--surface-2)",
                      color:
                        form.accountId === a.id
                          ? "var(--accent)"
                          : "var(--text)",
                      textAlign: "center",
                    }}
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Picker Bottom Sheet */}
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
                {currentCats.map((c) => (
                  <button
                    key={c.id || c.name}
                    onClick={() => {
                      setForm((f) => ({ ...f, category: c.name }));
                      setShowCatPicker(false);
                    }}
                    style={{
                      padding: "18px 8px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "none",
                      background:
                        form.category === c.name
                          ? "rgba(99,102,241,0.15)"
                          : "var(--surface-2)",
                      color:
                        form.category === c.name
                          ? "var(--accent)"
                          : "var(--text)",
                      textAlign: "center",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCatPicker(false);
                    setCatModal(form.type);
                  }}
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
                  + Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main Ledger View ──────────────────────────────────────────
  return (
    <div className="page" style={{ padding: "16px", gap: 0 }}>
      {catHistory && (
        <CategoryHistoryModal
          category={catHistory.category}
          type={catHistory.type}
          entries={entries}
          accounts={accounts}
          getCatColor={getCatColor}
          onClose={() => setCatHistory(null)}
        />
      )}
      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={(cat) => handleAddCat(catModal, cat)}
          onDelete={(name) => handleDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
        />
      )}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
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
            Finance
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
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
          {
            label: "Income",
            value: `रु${totalIncome.toLocaleString()}`,
            color: "var(--green)",
          },
          {
            label: "Expense",
            value: `रु${totalExpense.toLocaleString()}`,
            color: "var(--red)",
          },
          {
            label: "Balance",
            value: `रु${Math.abs(balance).toLocaleString()}`,
            color: balance >= 0 ? "var(--green)" : "var(--red)",
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "12px 10px",
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
            <p style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Ledger header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Transactions
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => changeMonth(-1)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "var(--text)",
              minWidth: 80,
              textAlign: "center",
            }}
          >
            {monthLabel}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: 16,
              cursor: isCurrentMonth ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isCurrentMonth ? 0.3 : 1,
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Ledger ── */}
      {monthlyGrouped.length === 0 ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          No transactions for this month.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {monthlyGrouped.map(({ date, entries: dayEntries }) => {
            const d = new Date(date + "T00:00:00");
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayIncome = dayEntries
              .filter(
                (e) =>
                  e.type === "income" && !Boolean(e.isTransfer) && !e._isPair,
              )
              .reduce((s, e) => s + e.amount, 0);
            const dayExpense = dayEntries
              .filter(
                (e) =>
                  e.type === "expense" && !Boolean(e.isTransfer) && !e._isPair,
              )
              .reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date} style={{ marginBottom: 4 }}>
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
                    style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {dayName},{" "}
                      {d.toLocaleDateString("en-US", { day: "numeric" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                    {dayIncome > 0 && (
                      <span style={{ color: "var(--green)", fontWeight: 600 }}>
                        रु{dayIncome.toLocaleString()}
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>
                        रु{dayExpense.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {dayEntries.map((e, idx) => {
                  const acc = (accounts || []).find(
                    (a) => a.id === e.accountId,
                  );

                  if (e._isPair) {
                    const fromAcc = (accounts || []).find(
                      (a) => a.id === e.accountId,
                    );
                    const toAcc = (accounts || []).find(
                      (a) => a.id === e._transferTo?.accountId,
                    );
                    return (
                      <div
                        key={`${e.id}-${idx}`}
                        onClick={() => setEditTransfer(e)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 0",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(el) =>
                          (el.currentTarget.style.background =
                            "var(--surface-2)")
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
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 13,
                                color: "var(--text)",
                                fontWeight: 500,
                              }}
                            >
                              {fromAcc?.name} → {toAcc?.name}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginTop: 1,
                              }}
                            >
                              Transfer
                              {e.note
                                ? ` · ${e.note.replace(`Transfer to ${toAcc?.name}: `, "").replace(`Transfer to ${toAcc?.name}`, "")}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                            }}
                          >
                            रु{e.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={e.id}
                      onClick={() => startEdit(e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
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
                            <span
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setCatHistory({
                                  category: e.category,
                                  type: e.type,
                                });
                              }}
                              style={{
                                cursor: "pointer",
                                textDecoration: "underline dotted",
                              }}
                            >
                              {e.category}
                            </span>
                            {acc && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  padding: "1px 5px",
                                  borderRadius: 99,
                                  background: "var(--surface-2)",
                                  color: "var(--text-muted)",
                                  fontSize: 10,
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {acc.icon} {acc.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color:
                            e.type === "income" ? "var(--green)" : "var(--red)",
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        रु{e.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <style>{`
        .fab-add { position: fixed; right: 28px; bottom: 32px; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 26px; font-weight: 300; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(99,102,241,0.4); z-index: 90; transition: transform 0.15s, box-shadow 0.15s; }
        .fab-add:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(99,102,241,0.5); }
        @media (max-width: 768px) { .fab-add { bottom: 76px; right: 18px; width: 48px; height: 48px; font-size: 24px; } }
      `}</style>
      <button
        className="fab-add"
        onClick={() => setShowForm(true)}
        title="Add transaction"
      >
        +
      </button>
    </div>
  );
}
