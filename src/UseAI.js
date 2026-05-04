import { useState, useEffect, useCallback, useRef } from "react";
import pb from "./pb";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

// ── Groq caller ────────────────────────────────────────────────────
async function callGroq(messages, { temperature = 0.4, max_tokens = 1000 } = {}) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature, max_tokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

// ── Parse JSON safely ──────────────────────────────────────────────
function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// ── Build full financial context for AI ────────────────────────────
function buildFinancialContext({ entries, accounts, budgets, savingsGoals, bills, expCats, incCats }) {
  const today     = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const summarize = (list) => {
    const byCategory = {};
    let income = 0, expense = 0;
    list.filter(e => !e.isTransfer).forEach(e => {
      if (e.type === "income") income += e.amount;
      else { expense += e.amount; byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; }
    });
    return { income, expense, byCategory, net: income - expense };
  };

  const thisSum = summarize(entries.filter(e => e.date.slice(0, 7) === thisMonth));
  const lastSum = summarize(entries.filter(e => e.date.slice(0, 7) === lastMonth));
  const allSum  = summarize(entries);

  const recent = [...entries]
    .filter(e => !e.isTransfer)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map(e => `${e.date} ${e.type === "income" ? "+" : "-"}रु${e.amount} (${e.category}${e.note ? ": " + e.note : ""})`)
    .join("\n");

  const budgetStatus = budgets.map(b => {
    const spent = entries
      .filter(e => e.category === b.category && e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === thisMonth)
      .reduce((s, e) => s + e.amount, 0);
    const pct = Math.round((spent / b.limit) * 100);
    return `${b.category}: spent रु${spent} of रु${b.limit} limit (${pct}%)`;
  }).join("\n");

  const goalsStatus = savingsGoals.map(g =>
    `${g.name}: रु${g.current} of रु${g.target} (${Math.round((g.current / g.target) * 100)}%)`
  ).join("\n");

  const billsStatus = bills.map(b => {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    const days = Math.ceil((due - now) / 86400000);
    return `${b.name} रु${b.amount} — due in ${days} days`;
  }).join("\n");

  const accountsSummary = accounts.map(a => {
    const bal = entries
      .filter(e => e.accountId === a.id)
      .reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
    return `${a.icon} ${a.name} (${a.group}): रु${bal.toLocaleString()}`;
  }).join("\n");

  return `You are Nexus AI — a unified financial brain for a personal finance app used in Nepal. Currency is NPR (रु).
You have FULL access to the user's financial data and can TAKE ACTIONS (create transactions, budgets, goals).
Be warm, specific, and concise. Reference actual numbers from the data.

TODAY: ${today}
THIS MONTH (${thisMonth}):
  Income: रु${thisSum.income.toLocaleString()}, Expenses: रु${thisSum.expense.toLocaleString()}, Net: रु${thisSum.net.toLocaleString()}
  By category: ${JSON.stringify(thisSum.byCategory)}

LAST MONTH (${lastMonth}):
  Income: रु${lastSum.income.toLocaleString()}, Expenses: रु${lastSum.expense.toLocaleString()}
  By category: ${JSON.stringify(lastSum.byCategory)}

ALL TIME: Income रु${allSum.income.toLocaleString()}, Expenses रु${allSum.expense.toLocaleString()}, Net रु${allSum.net.toLocaleString()}

ACCOUNTS:
${accountsSummary || "No accounts"}

BUDGETS THIS MONTH:
${budgetStatus || "No budgets set"}

SAVINGS GOALS:
${goalsStatus || "No savings goals"}

BILLS:
${billsStatus || "No bills"}

EXPENSE CATEGORIES: ${expCats.map(c => c.name).join(", ")}
INCOME CATEGORIES: ${incCats.map(c => c.name).join(", ")}

RECENT 30 TRANSACTIONS:
${recent}

AVAILABLE ACTIONS — if user asks you to do something, respond with JSON action:
- Add transaction: {"action":"add_transaction","type":"expense|income","amount":number,"category":"name","note":"text","date":"YYYY-MM-DD","accountId":"id"}
- Add budget: {"action":"add_budget","category":"name","limit":number}
- Add savings goal: {"action":"add_goal","name":"text","target":number,"current":number}
- Add bill: {"action":"add_bill","name":"text","amount":number,"dueDay":number}
- No action needed: {"action":"none"}

When taking an action, ALWAYS respond in this format:
REPLY: <your friendly message to the user>
ACTION: <JSON object>

If no action, just respond normally without ACTION line.`;
}

// ── Main hook ──────────────────────────────────────────────────────
export default function useAI({
  userId,
  entries,
  accounts,
  expCats,
  incCats,
  budgets,
  savingsGoals,
  bills,
  onEntriesChange,
  onBudgetsChange,
  onSavingsGoalsChange,
  onBillsChange,
}) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  // ── Chat state ─────────────────────────────────────────────────
  const STORAGE_KEY = `nexus-ai-chat-${userId}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [{
        role: "assistant",
        content: "Hey! I'm your Nexus AI 👋\n\nI know everything about your finances and can take actions for you. Try:\n• \"spent 500 on food today\"\n• \"set food budget to 3000\"\n• \"how much did I spend this month?\"\n• \"create savings goal Laptop 30000\"",
      }];
    } catch { return []; }
  });
  const [chatLoading, setChatLoading] = useState(false);

  // ── Proactive alerts ───────────────────────────────────────────
  const [alerts, setAlerts] = useState([]);

  // ── Auto-categorization ────────────────────────────────────────
  const [catSuggestion, setCatSuggestion]   = useState(null);
  const [catLoading,    setCatLoading]      = useState(false);
  const catDebounceRef = useRef(null);

  // ── Persist chat to localStorage ──────────────────────────────
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // ── Generate proactive alerts ──────────────────────────────────
  useEffect(() => {
    if (!entries.length) return;
    const newAlerts = [];

    // Budget alerts
    budgets.forEach(b => {
      const spent = entries
        .filter(e => e.category === b.category && e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === thisMonth)
        .reduce((s, e) => s + e.amount, 0);
      const pct = (spent / b.limit) * 100;
      if (pct >= 100) {
        newAlerts.push({ type: "danger", icon: "🚨", text: `${b.category} budget exceeded! Spent रु${spent.toLocaleString()} of रु${b.limit.toLocaleString()}` });
      } else if (pct >= 80) {
        newAlerts.push({ type: "warn", icon: "⚠️", text: `${b.category} budget at ${Math.round(pct)}% — रु${(b.limit - spent).toLocaleString()} remaining` });
      }
    });

    // Bill alerts
    bills.forEach(b => {
      const now = new Date();
      const due = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
      if (due < now) due.setMonth(due.getMonth() + 1);
      const days = Math.ceil((due - now) / 86400000);
      if (days <= 3) {
        newAlerts.push({ type: days === 0 ? "danger" : "warn", icon: "📅", text: `${b.name} रु${b.amount.toLocaleString()} ${days === 0 ? "due today!" : `due in ${days} day${days !== 1 ? "s" : ""}!`}` });
      }
    });

    // Spending spike
    const lastMonth = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    const thisExp = entries.filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0);
    const lastExp = entries.filter(e => e.type === "expense" && !e.isTransfer && e.date.slice(0, 7) === lastMonth).reduce((s, e) => s + e.amount, 0);
    if (lastExp > 0 && thisExp > lastExp * 1.3) {
      const pct = Math.round(((thisExp - lastExp) / lastExp) * 100);
      newAlerts.push({ type: "warn", icon: "📈", text: `Spending is ${pct}% higher than last month` });
    }

    // Savings goal pace
    savingsGoals.forEach(g => {
      const pct = (g.current / g.target) * 100;
      if (pct < 25 && g.target > 1000) {
        newAlerts.push({ type: "info", icon: "🎯", text: `"${g.name}" goal is at ${Math.round(pct)}% — keep saving!` });
      }
    });

    setAlerts(newAlerts.slice(0, 3));
  }, [entries, budgets, bills, savingsGoals, thisMonth]);

  // ── Auto-categorize note ───────────────────────────────────────
  const suggestCategory = useCallback((note, type = "expense") => {
    if (!note || note.trim().length < 3) { setCatSuggestion(null); return; }
    if (catDebounceRef.current) clearTimeout(catDebounceRef.current);
    catDebounceRef.current = setTimeout(async () => {
      setCatLoading(true);
      try {
        const cats = type === "expense" ? expCats : incCats;
        const catNames = cats.map(c => c.name).join(", ");
        const content = await callGroq([{
          role: "user",
          content: `Given this transaction note: "${note}" and type: "${type}"
Available categories: ${catNames}
Which category fits best? Respond ONLY with the category name, nothing else. If none fit well, respond with the closest match.`,
        }], { temperature: 0.1, max_tokens: 20 });
        const suggested = content.trim();
        const match = cats.find(c => c.name.toLowerCase() === suggested.toLowerCase());
        if (match) setCatSuggestion(match.name);
        else setCatSuggestion(suggested);
      } catch { setCatSuggestion(null); }
      finally { setCatLoading(false); }
    }, 600);
  }, [expCats, incCats]);

  const clearCatSuggestion = () => setCatSuggestion(null);

  // ── Execute AI action ──────────────────────────────────────────
  const executeAction = useCallback(async (actionObj) => {
    if (!actionObj || actionObj.action === "none") return null;

    try {
      switch (actionObj.action) {
        case "add_transaction": {
          const accountId = actionObj.accountId || accounts[0]?.id;
          if (!accountId) return "⚠️ No account found to add transaction to.";
          const created = await pb.collection("entries").create({
            type: actionObj.type,
            amount: actionObj.amount,
            category: actionObj.category,
            note: actionObj.note || "",
            date: actionObj.date || today,
            accountId,
            userId,
            isTransfer: false,
          });
          onEntriesChange(prev => [created, ...prev]);
          return `✅ Added ${actionObj.type} of रु${actionObj.amount} (${actionObj.category})`;
        }

        case "add_budget": {
          const existing = budgets.find(b => b.category === actionObj.category);
          if (existing) return `⚠️ Budget for ${actionObj.category} already exists (रु${existing.limit}).`;
          const created = await pb.collection("budgets").create({
            userId, category: actionObj.category, limit: actionObj.limit,
          });
          onBudgetsChange(prev => [...prev, created]);
          return `✅ Created budget: ${actionObj.category} — रु${actionObj.limit}/month`;
        }

        case "add_goal": {
          const created = await pb.collection("savings_goals").create({
            userId, name: actionObj.name, target: actionObj.target,
            current: actionObj.current || 0,
            accountId: accounts[0]?.id || "",
          });
          onSavingsGoalsChange(prev => [...prev, created]);
          return `✅ Created savings goal: "${actionObj.name}" — रु${actionObj.target} target`;
        }

        case "add_bill": {
          const created = await pb.collection("bills").create({
            userId, name: actionObj.name, amount: actionObj.amount, dueDay: actionObj.dueDay,
          });
          onBillsChange(prev => [...prev, created]);
          return `✅ Added bill reminder: ${actionObj.name} — रु${actionObj.amount} on day ${actionObj.dueDay}`;
        }

        default:
          return null;
      }
    } catch (err) {
      console.error("AI action failed:", err);
      return `⚠️ Action failed: ${err.message}`;
    }
  }, [accounts, budgets, userId, today, onEntriesChange, onBudgetsChange, onSavingsGoalsChange, onBillsChange]);

  // ── Send chat message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || chatLoading) return;

    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const context = buildFinancialContext({ entries, accounts, budgets, savingsGoals, bills, expCats, incCats });
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const reply = await callGroq([
        { role: "system", content: context },
        ...history,
        { role: "user", content: text },
      ], { temperature: 0.5, max_tokens: 800 });

      // Parse reply + action
      let displayReply = reply;
      let actionResult = null;

      if (reply.includes("ACTION:")) {
        const parts   = reply.split("ACTION:");
        displayReply  = parts[0].replace("REPLY:", "").trim();
        const jsonStr = parts[1]?.trim();
        const action  = parseJSON(jsonStr);
        if (action && action.action !== "none") {
          actionResult = await executeAction(action);
        }
      } else if (reply.startsWith("REPLY:")) {
        displayReply = reply.replace("REPLY:", "").trim();
      }

      const finalReply = actionResult
        ? `${displayReply}\n\n${actionResult}`
        : displayReply;

      setMessages(prev => [...prev, { role: "assistant", content: finalReply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [messages, chatLoading, entries, accounts, budgets, savingsGoals, bills, expCats, incCats, executeAction]);

  // ── Natural language transaction parser ────────────────────────
  const parseNaturalTransaction = useCallback(async (text) => {
    const context = buildFinancialContext({ entries, accounts, budgets, savingsGoals, bills, expCats, incCats });
    const reply = await callGroq([
      { role: "system", content: context },
      {
        role: "user", content: `Parse this natural language into a transaction. Text: "${text}"
Respond ONLY with JSON:
{"type":"expense|income","amount":number,"category":"from available categories","note":"text","date":"YYYY-MM-DD","accountId":"${accounts[0]?.id || ""}","confidence":0-1}
If you cannot parse it as a transaction, respond: {"confidence":0}
Today is ${today}.`,
      },
    ], { temperature: 0.1, max_tokens: 200 });
    return parseJSON(reply);
  }, [entries, accounts, budgets, savingsGoals, bills, expCats, incCats, today]);

  const clearChat = () => {
    const initial = [{
      role: "assistant",
      content: "Hey! I'm your Nexus AI 👋\n\nI know everything about your finances and can take actions for you. Try:\n• \"spent 500 on food today\"\n• \"set food budget to 3000\"\n• \"how much did I spend this month?\"\n• \"create savings goal Laptop 30000\"",
    }];
    setMessages(initial);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    // Chat
    messages,
    chatLoading,
    sendMessage,
    clearChat,

    // Proactive alerts
    alerts,

    // Auto-categorization
    catSuggestion,
    catLoading,
    suggestCategory,
    clearCatSuggestion,

   
    parseNaturalTransaction,

    
    executeAction,
  };
}