import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import supabase from "../supabase";
import CategoryHistoryModal from "./CategoryHistoryModal";
import CategoryManager from "./CategoryManager";
import ChartJsLoader from "./Chart/ChartJsLoader";
import { CAT_COLORS } from "./Constant/allConstant";
import useNoteSuggestions from "./Account/useNoteSuggestions";
import LoadingScreen from "./LoadingScreen";
import MiniCalendar from "./Form/MiniCalendar";
import EditTransferPage from "./EditTransferPage";
import NumericKeypadInline from "./Form/NumericKeypadInline";
import FieldRow from "./Form/FieldRow";

function getRandomColor(existing = []) {
  const unused = CAT_COLORS.filter((c) => !existing.includes(c));
  return (unused.length > 0 ? unused : CAT_COLORS)[
    Math.floor(Math.random() * (unused.length || CAT_COLORS.length))
  ];
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
  const [activeField, setActiveField] = useState("amount");

  // Unified form state — covers expense, income, and transfer
  const [form, setForm] = useState({
    type: "expense",       // "expense" | "income" | "transfer"
    amount: "",
    category: "",
    note: "",
    date: today,
    accountId: accounts?.[0]?.id || "",   // for expense/income; also "from" for transfer
    toAccountId: accounts?.[1]?.id || accounts?.[0]?.id || "",  // transfer destination
  });

  const [filterDate, setFilterDate] = useState(today);
  const [editEntry, setEditEntry] = useState(null);
  const [catModal, setCatModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catHistory, setCatHistory] = useState(null);
  const hasLoaded = useRef(false);
  const { suggestions, showSuggestions, setShowSuggestions } =
    useNoteSuggestions(entries, form);
  const [editTransfer, setEditTransfer] = useState(null);

  // AI state
  const [showAiCatBadge, setShowAiCatBadge] = useState(false);

  // ── Load categories ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    setLoading(true);
    try {
      const [expCatsRes, incCatsRes] = await Promise.all([
        supabase.from("expense_categories").select("*").eq("user_id", userId),
        supabase.from("income_categories").select("*").eq("user_id", userId),
      ]);
      const expData = expCatsRes.data || [];
      const incData = incCatsRes.data || [];
      setExpCats(expData);
      setIncCats(incData);
      setForm((f) => ({
        ...f,
        accountId: f.accountId || accounts?.[0]?.id || "",
        toAccountId: f.toAccountId || accounts?.[1]?.id || accounts?.[0]?.id || "",
        category: f.category || expData[0]?.name || "",
      }));
    } catch (err) {
      console.error("Failed to load categories:", err);
      hasLoaded.current = false;
    } finally {
      setLoading(false);
    }
  }, [userId, accounts]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!form.accountId && accounts?.length) {
      setForm((f) => ({
        ...f,
        accountId: accounts[0].id,
        toAccountId: f.toAccountId || accounts[1]?.id || accounts[0].id,
      }));
    }
  }, [accounts]);

  // Scroll lock
  useEffect(() => {
    const scrollEl = document.querySelector(".main-content");
    if (showForm || editTransfer) {
      if (scrollEl) scrollEl.style.overflow = "hidden";
    } else {
      if (scrollEl) scrollEl.style.overflow = "";
    }
    return () => { if (scrollEl) scrollEl.style.overflow = ""; };
  }, [showForm, editTransfer]);

  // AI auto-categorization
  useEffect(() => {
    if (!ai || !form.note || form.note.trim().length < 3 || form.type === "transfer") {
      setShowAiCatBadge(false);
      return;
    }
    ai.suggestCategory(form.note, form.type);
    setShowAiCatBadge(false);
  }, [form.note, form.type]);

  useEffect(() => {
    if (ai?.catSuggestion && showForm && form.type !== "transfer") {
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
    (type === "expense" ? expCats : incCats).find((c) => c.name === category)?.color || "#94a3b8";

  // ── Switch type tab ────────────────────────────────────────────
  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm((f) => ({
      ...f,
      type: t,
      category: t === "transfer" ? "" : (cats[0]?.name || ""),
    }));
    // When switching to transfer, go to "from" field; else amount
    setActiveField(t === "transfer" ? "from" : "amount");
  };

  // ── Close / reset form ─────────────────────────────────────────
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
      toAccountId: accounts?.[1]?.id || accounts?.[0]?.id || "",
    });
    setActiveField("amount");
  };

  // ── Category CRUD ──────────────────────────────────────────────
  const handleAddCat = async (type, cat) => {
    const table = type === "expense" ? "expense_categories" : "income_categories";
    const { data, error } = await supabase.from(table).insert({ ...cat, user_id: userId }).select().single();
    if (error) { console.error(error); return; }
    if (type === "expense") setExpCats((prev) => [...prev, data]);
    else setIncCats((prev) => [...prev, data]);
  };

  const handleDeleteCat = async (type, name) => {
    const table = type === "expense" ? "expense_categories" : "income_categories";
    const list = type === "expense" ? expCats : incCats;
    const record = list.find((c) => c.name === name);
    if (!record) return;
    const { error } = await supabase.from(table).delete().eq("id", record.id);
    if (error) { console.error(error); return; }
    if (type === "expense") setExpCats((prev) => prev.filter((c) => c.name !== name));
    else setIncCats((prev) => prev.filter((c) => c.name !== name));
  };

  // ── Save expense / income ──────────────────────────────────────
  const addEntry = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    setSaving(true);
    try {
      if (editEntry) {
        const { data, error } = await supabase
          .from("entries")
          .update({
            type: form.type,
            amount: +form.amount,
            category: form.category,
            note: form.note,
            date: form.date,
            account_id: form.accountId,
          })
          .eq("id", editEntry)
          .select()
          .single();
        if (error) throw error;
        onEntriesChange(entries.map((e) => (e.id === editEntry ? data : e)));
      } else {
        const { data, error } = await supabase
          .from("entries")
          .insert({
            type: form.type,
            amount: +form.amount,
            category: form.category,
            note: form.note,
            date: form.date,
            account_id: form.accountId,
            user_id: userId,
            is_transfer: false,
          })
          .select()
          .single();
        if (error) throw error;
        onEntriesChange([data, ...entries]);
      }
      closeForm();
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Save transfer ──────────────────────────────────────────────
  const addTransfer = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    if (form.accountId === form.toAccountId) return;
    setSaving(true);
    try {
      const fromAcc = accounts.find((a) => a.id === form.accountId);
      const toAcc   = accounts.find((a) => a.id === form.toAccountId);

      const { data: debit, error: e1 } = await supabase
        .from("entries")
        .insert({
          user_id: userId,
          type: "expense",
          amount: +form.amount,
          category: "Transfer",
          note: form.note
            ? `Transfer to ${toAcc?.name}: ${form.note}`
            : `Transfer to ${toAcc?.name}`,
          date: form.date,
          account_id: form.accountId,
          is_transfer: true,
        })
        .select()
        .single();

      const { data: credit, error: e2 } = await supabase
        .from("entries")
        .insert({
          user_id: userId,
          type: "income",
          amount: +form.amount,
          category: "Transfer",
          note: form.note
            ? `Transfer from ${fromAcc?.name}: ${form.note}`
            : `Transfer from ${fromAcc?.name}`,
          date: form.date,
          account_id: form.toAccountId,
          is_transfer: true,
        })
        .select()
        .single();

      if (e1 || e2) throw e1 || e2;
      onEntriesChange([debit, credit, ...entries]);
      closeForm();
    } catch (err) {
      console.error("Failed to save transfer:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (form.type === "transfer") addTransfer();
    else addEntry();
  };

  const startEdit = (e) => {
    setEditEntry(e.id);
    setShowForm(true);
    setActiveField("amount");
    setForm({
      type: e.type,
      amount: String(e.amount),
      category: e.category,
      note: e.note || "",
      date: e.date,
      accountId: e.account_id,
      toAccountId: accounts?.[1]?.id || accounts?.[0]?.id || "",
    });
  };

  // ── Delete entry ───────────────────────────────────────────────
  const handleDeleteEntry = async (id) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (entry.is_transfer) {
      const paired = entries.find(
        (e) =>
          e.id !== id &&
          Boolean(e.is_transfer) &&
          Number(e.amount) === Number(entry.amount) &&
          e.date === entry.date &&
          e.type !== entry.type,
      );
      await supabase.from("entries").delete().eq("id", id);
      if (paired) await supabase.from("entries").delete().eq("id", paired.id);
      onEntriesChange(entries.filter((e) => e.id !== id && e.id !== paired?.id));
    } else {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) { console.error(error); return; }
      onEntriesChange(entries.filter((e) => e.id !== id));
    }
  };

  // ── Derived stats ──────────────────────────────────────────────
  const ledgerMonth = filterDate.slice(0, 7);
  const totalIncome = entries
    .filter((e) => e.type === "income" && !Boolean(e.is_transfer) && e.date.slice(0, 7) === ledgerMonth)
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = entries
    .filter((e) => e.type === "expense" && !Boolean(e.is_transfer) && e.date.slice(0, 7) === ledgerMonth)
    .reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  const changeMonth = (dir) => {
    const d = new Date(filterDate + "T00:00:00");
    d.setMonth(d.getMonth() + dir);
    setFilterDate(d.toISOString().split("T")[0]);
  };
  const monthLabel = new Date(filterDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = ledgerMonth === today.slice(0, 7);

  // ── Group entries by date ──────────────────────────────────────
  const monthlyGrouped = useMemo(() => {
    const filtered = entries.filter((e) => e.date.slice(0, 7) === ledgerMonth);
    const seen = new Set();
    const collapsed = [];
    filtered.forEach((e) => {
      if (!Boolean(e.is_transfer)) { collapsed.push(e); return; }
      if (seen.has(e.id)) return;
      const pair = filtered.find(
        (p) => p.id !== e.id && Boolean(p.is_transfer) && p.amount === e.amount && p.date === e.date && p.type !== e.type,
      );
      if (pair) {
        seen.add(e.id); seen.add(pair.id);
        const fromEntry = e.type === "expense" ? e : pair;
        const toEntry   = e.type === "income"  ? e : pair;
        collapsed.push({ ...fromEntry, _transferTo: toEntry, _isPair: true });
      } else {
        collapsed.push(e);
      }
    });
    const groups = {};
    collapsed.forEach((e) => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((date) => ({ date, entries: groups[date] }));
  }, [entries, ledgerMonth]);

  if (loading) return <LoadingScreen />;

  // ── Edit Transfer Page ─────────────────────────────────────────
  if (editTransfer) {
    return (
      <EditTransferPage
        entry={editTransfer}
        accounts={accounts}
        entries={entries}
        onSave={async (amount, note, date, fromId, toId) => {
          const fromName = accounts.find((a) => a.id === fromId)?.name;
          const toName   = accounts.find((a) => a.id === toId)?.name;
          await supabase.from("entries").update({ amount, note: note ? `Transfer to ${toName}: ${note}` : `Transfer to ${toName}`, date, account_id: fromId }).eq("id", editTransfer.id);
          await supabase.from("entries").update({ amount, note: note ? `Transfer from ${fromName}: ${note}` : `Transfer from ${fromName}`, date, account_id: toId }).eq("id", editTransfer._transferTo.id);
          onEntriesChange(entries.map((e) => {
            if (e.id === editTransfer.id) return { ...e, amount, note, date, account_id: fromId };
            if (e.id === editTransfer._transferTo.id) return { ...e, amount, note, date, account_id: toId };
            return e;
          }));
          setEditTransfer(null);
        }}
        onDelete={async () => {
          await supabase.from("entries").delete().eq("id", editTransfer.id);
          await supabase.from("entries").delete().eq("id", editTransfer._transferTo.id);
          onEntriesChange(entries.filter((e) => e.id !== editTransfer.id && e.id !== editTransfer._transferTo.id));
          setEditTransfer(null);
        }}
        onClose={() => setEditTransfer(null)}
      />
    );
  }

  // ── Context-sensitive panel ────────────────────────────────────
  const renderContextPanel = () => {
    // Account picker — reused for both "from" / "to" / "account"
    const AccountGrid = ({ selectedId, onSelect, nextField }) => (
      <div style={{ padding: "8px 0 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
          {(accounts || []).map((a) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a.id); setActiveField(nextField); }}
              style={{
                padding: "16px 8px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                border: "none",
                background: selectedId === a.id ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
                color: selectedId === a.id ? "var(--accent)" : "var(--text)",
                textAlign: "center", lineHeight: 1.4,
              }}
            >
              <span style={{ display: "block", fontSize: 18, marginBottom: 2 }}>{a.icon}</span>
              <span style={{ fontSize: 11 }}>{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    );

    switch (activeField) {
      case "date":
        return (
          <MiniCalendar
            value={form.date}
            onChange={(ds) => {
              setForm((f) => ({ ...f, date: ds }));
              setActiveField(form.type === "transfer" ? "from" : "category");
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
                  onClick={() => { setForm((f) => ({ ...f, category: c.name })); setActiveField("account"); }}
                  style={{
                    padding: "16px 8px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    border: "none",
                    background: form.category === c.name ? "rgba(99,102,241,0.15)" : "var(--surface-2)",
                    color: form.category === c.name ? "var(--accent)" : "var(--text)",
                    textAlign: "center",
                  }}
                >{c.name}</button>
              ))}
              <button
                onClick={() => setCatModal(form.type)}
                style={{ padding: "16px 8px", fontSize: 13, cursor: "pointer", border: "none", background: "var(--surface-2)", color: "var(--text-muted)", textAlign: "center", fontWeight: 500 }}
              >+ Add</button>
            </div>
          </div>
        );

      case "account":
        return (
          <AccountGrid
            selectedId={form.accountId}
            onSelect={(id) => setForm((f) => ({ ...f, accountId: id }))}
            nextField="amount"
          />
        );

      // Transfer: FROM account
      case "from":
        return (
          <AccountGrid
            selectedId={form.accountId}
            onSelect={(id) => setForm((f) => ({ ...f, accountId: id }))}
            nextField="to"
          />
        );

      // Transfer: TO account
      case "to":
        return (
          <AccountGrid
            selectedId={form.toAccountId}
            onSelect={(id) => setForm((f) => ({ ...f, toAccountId: id }))}
            nextField="amount"
          />
        );

      case "note":
        return suggestions.length > 0 && showSuggestions ? (
          <div>
            <div style={{ padding: "8px 16px 4px", fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Suggestions
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => { setForm((f) => ({ ...f, note: s })); setShowSuggestions(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "13px 16px", fontSize: 14, color: "var(--text)",
                  background: "transparent", border: "none", cursor: "pointer",
                  borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >{s}</button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "var(--text-muted)", fontSize: 12 }}>
            ↑ Use the keyboard above to type your note
          </div>
        );

      case "amount":
      default:
        return (
          <NumericKeypadInline
            value={form.amount}
            onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
          />
        );
    }
  };

  // ── Save button label ──────────────────────────────────────────
  const saveLabel = () => {
    if (saving) return "Saving...";
    if (editEntry) return "Save Changes";
    if (form.type === "transfer") return form.amount ? `Transfer रु${form.amount}` : "Transfer";
    return `Add ${form.type === "expense" ? "Expense" : "Income"}`;
  };

  const saveColor = () => {
    if (form.type === "income") return "var(--green)";
    if (form.type === "transfer") return "var(--accent)";
    return "var(--red)";
  };

  // ── Add / Edit Form ────────────────────────────────────────────
  if (showForm) {
    const isTransfer = form.type === "transfer";
    const fromAcc = accounts.find((a) => a.id === form.accountId);
    const toAcc   = accounts.find((a) => a.id === form.toAccountId);

    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={closeForm} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>‹ Back</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {isTransfer ? "Transfer" : form.type === "expense" ? "Expense" : "Income"}
          </span>
          <div style={{ width: 60 }} />
        </div>

        {/* Type toggle — disabled when editing */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {["income", "expense", "transfer"].map((t) => {
            const color = t === "income" ? "var(--green)" : t === "expense" ? "var(--red)" : "var(--accent)";
            const label = t === "income" ? "Income" : t === "expense" ? "Expense" : "Transfer";
            const active = form.type === t;
            return (
              <button
                key={t}
                onClick={() => { if (!editEntry) handleTypeChange(t); }}
                style={{
                  flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600,
                  border: "none", cursor: editEntry ? "default" : "pointer", background: "transparent",
                  color: active ? color : "var(--text-muted)",
                  borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >{label}</button>
            );
          })}
        </div>

        {/* Scrollable fields */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "0 20px" }}>

            {/* Amount */}
            <FieldRow label="Amount" active={activeField === "amount"} onTap={() => setActiveField("amount")}>
              <span style={{ fontSize: 28, fontWeight: 700, color: form.amount ? "var(--text)" : "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                {form.amount || "0"}
              </span>
            </FieldRow>

            {/* Date */}
            <FieldRow label="Date" active={activeField === "date"} onTap={() => setActiveField("date")}>
              <span style={{ fontSize: 15, color: "var(--text)" }}>
                {new Date(form.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            </FieldRow>

            {/* Transfer: From + To */}
            {isTransfer ? (
              <>
                <FieldRow label="From" active={activeField === "from"} onTap={() => setActiveField("from")} showChevron>
                  <span style={{ fontSize: 15, color: fromAcc ? "var(--text)" : "var(--text-muted)" }}>
                    {fromAcc ? `${fromAcc.icon} ${fromAcc.name}` : "Select..."}
                  </span>
                </FieldRow>

                {/* Visual arrow between from/to */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>↓ to</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                <FieldRow label="To" active={activeField === "to"} onTap={() => setActiveField("to")} showChevron>
                  <span style={{ fontSize: 15, color: toAcc ? "var(--text)" : "var(--text-muted)" }}>
                    {toAcc ? `${toAcc.icon} ${toAcc.name}` : "Select..."}
                  </span>
                </FieldRow>

                {/* Warn if same account */}
                {form.accountId === form.toAccountId && form.accountId && (
                  <p style={{ fontSize: 12, color: "var(--red)", padding: "4px 0" }}>
                    ⚠ Source and destination must be different
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Category */}
                <FieldRow label="Category" active={activeField === "category"} onTap={() => setActiveField("category")} showChevron>
                  <span style={{ fontSize: 15, color: form.category ? "var(--text)" : "var(--text-muted)" }}>
                    {form.category || "Select..."}
                  </span>
                </FieldRow>

                {/* Account */}
                <FieldRow label="Account" active={activeField === "account"} onTap={() => setActiveField("account")} showChevron>
                  {(() => {
                    const acc = accounts.find((a) => a.id === form.accountId);
                    return <span style={{ fontSize: 15, color: acc ? "var(--text)" : "var(--text-muted)" }}>{acc ? `${acc.icon} ${acc.name}` : "Select..."}</span>;
                  })()}
                </FieldRow>
              </>
            )}

            {/* Note */}
            <FieldRow label="Note" active={activeField === "note"} onTap={() => setActiveField("note")} noBorder>
              <input
                type="text"
                placeholder="Add a note..."
                value={form.note}
                autoFocus={activeField === "note"}
                onFocus={() => setActiveField("note")}
                onChange={(e) => { setForm((f) => ({ ...f, note: e.target.value })); setShowSuggestions(true); }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", textAlign: "right" }}
              />
            </FieldRow>

            {/* AI category suggestion */}
            {!isTransfer && showAiCatBadge && ai?.catSuggestion && ai.catSuggestion !== form.category && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "7px 10px", borderRadius: "var(--radius-sm)", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
                <span style={{ fontSize: 12 }}>✨</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>AI suggests: <strong style={{ color: "var(--accent)" }}>{ai.catSuggestion}</strong></span>
                <button onClick={applyAiCategory} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Apply</button>
                <button onClick={() => setShowAiCatBadge(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            )}
          </div>
        </div>

        {/* Save / Delete */}
        <div style={{ padding: "10px 20px 8px", flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={saving || (isTransfer && form.accountId === form.toAccountId)}
            style={{
              width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
              background: saveColor(), color: "#fff", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              opacity: (isTransfer && form.accountId === form.toAccountId) ? 0.5 : 1,
            }}
          >
            {saveLabel()}
          </button>
          {editEntry && (
            <button
              onClick={async () => { await handleDeleteEntry(editEntry); closeForm(); }}
              style={{ width: "100%", padding: "11px", marginTop: 6, borderRadius: "var(--radius-md)", background: "transparent", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >🗑 Delete</button>
          )}
        </div>

        {/* Context panel */}
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

        {/* Category Manager */}
        {catModal && (
          <CategoryManager
            type={catModal}
            categories={catModal === "expense" ? expCats : incCats}
            onAdd={(cat) => handleAddCat(catModal, cat)}
            onDelete={(name) => handleDeleteCat(catModal, name)}
            onClose={() => setCatModal(null)}
          />
        )}
      </div>
    );
  }

  // ── Main Ledger View ───────────────────────────────────────────
  return (
    <div className="page" style={{ padding: "16px", gap: 0 }}>
      <ChartJsLoader />

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

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 }}>Finance</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {[
          { label: "Income",  value: `रु${totalIncome.toLocaleString()}`,          color: "var(--green)" },
          { label: "Expense", value: `रु${totalExpense.toLocaleString()}`,         color: "var(--red)" },
          { label: "Balance", value: `रु${Math.abs(balance).toLocaleString()}`,    color: balance >= 0 ? "var(--green)" : "var(--red)" },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: "12px 10px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Transactions</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", minWidth: 80, textAlign: "center" }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} disabled={isCurrentMonth} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: isCurrentMonth ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
        </div>
      </div>

      {/* Transaction list */}
      {monthlyGrouped.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No transactions for this month.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {monthlyGrouped.map(({ date, entries: dayEntries }) => {
            const d = new Date(date + "T00:00:00");
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayIncome  = dayEntries.filter((e) => e.type === "income"  && !Boolean(e.is_transfer) && !e._isPair).reduce((s, e) => s + Number(e.amount), 0);
            const dayExpense = dayEntries.filter((e) => e.type === "expense" && !Boolean(e.is_transfer) && !e._isPair).reduce((s, e) => s + Number(e.amount), 0);

            return (
              <div key={date} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 4px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{dayName}, {d.toLocaleDateString("en-US", { day: "numeric" })}</span>
                  <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                    {dayIncome  > 0 && <span style={{ color: "var(--green)", fontWeight: 600 }}>रु{dayIncome.toLocaleString()}</span>}
                    {dayExpense > 0 && <span style={{ color: "var(--red)",   fontWeight: 600 }}>रु{dayExpense.toLocaleString()}</span>}
                  </div>
                </div>

                {dayEntries.map((e, idx) => {
                  // Transfer pair row
                  if (e._isPair) {
                    const fromAcc = (accounts || []).find((a) => a.id === e.account_id);
                    const toAcc   = (accounts || []).find((a) => a.id === e._transferTo?.account_id);
                    return (
                      <div
                        key={`${e.id}-${idx}`}
                        onClick={() => setEditTransfer(e)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                        onMouseEnter={(el) => (el.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(el) => (el.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>↔</span>
                          <div>
                            <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{fromAcc?.name} → {toAcc?.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                              Transfer{e.note ? ` · ${e.note.replace(/Transfer (to|from) [^:]+: ?/i, "")}` : ""}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>रु{Number(e.amount).toLocaleString()}</span>
                      </div>
                    );
                  }

                  // Regular entry row
                  const acc = (accounts || []).find((a) => a.id === e.account_id);
                  return (
                    <div
                      key={e.id}
                      onClick={() => startEdit(e)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                      onMouseEnter={(el) => (el.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(el) => (el.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.note || e.category}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                            <span onClick={(ev) => { ev.stopPropagation(); setCatHistory({ category: e.category, type: e.type }); }} style={{ cursor: "pointer", textDecoration: "underline dotted" }}>{e.category}</span>
                            {acc && (
                              <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 99, background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 10, border: "1px solid var(--border)" }}>
                                {acc.icon} {acc.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: e.type === "income" ? "var(--green)" : "var(--red)" }}>
                        रु{Number(e.amount).toLocaleString()}
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
      <button className="fab-add" onClick={() => { setForm((f) => ({ ...f, type: "expense" })); setActiveField("amount"); setShowForm(true); }} title="Add transaction">+</button>
    </div>
  );
}
