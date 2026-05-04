import { useState, useEffect, useCallback, useMemo } from "react";
import pb from "./pb";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ExpenseTracker from "./components/ExpenseTracker";
import Account from "./components/Account";
import ChartsTab from "./components/ChartsTab";
import BudgetGoals from "./components/BudgetGoals";
import Insights from "./components/Insights";
import useAI from "./useAI";

// ── Theme toggle ───────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nexus-theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nexus-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

// ── Proactive Alert Banner ─────────────────────────────────────────
function AlertBanner({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  const alert = alerts[0];
  const colors = {
    danger: { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   color: "#ef4444" },
    warn:   { bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.3)",  color: "#f97316" },
    info:   { bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.3)",  color: "#6366f1" },
  };
  const c = colors[alert.type] || colors.info;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px",
      background: c.bg, borderBottom: `1px solid ${c.border}`,
      position: "sticky", top: 0, zIndex: 200,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{alert.icon}</span>
      <p style={{ flex: 1, fontSize: 12, color: c.color, fontWeight: 500 }}>{alert.text}</p>
      {alerts.length > 1 && (
        <span style={{ fontSize: 11, color: c.color, opacity: 0.7, flexShrink: 0 }}>
          +{alerts.length - 1} more
        </span>
      )}
      <button onClick={onDismiss} style={{
        background: "none", border: "none", color: c.color,
        cursor: "pointer", fontSize: 14, flexShrink: 0, opacity: 0.7,
      }}>✕</button>
    </div>
  );
}

export default function App() {
  const [user,      setUser]      = useState(() => pb.authStore.model);
  const [activeTab, setActiveTab] = useState("expense");
  const { theme, toggle: toggleTheme } = useTheme();

  const [entries,      setEntries]      = useState([]);
  const [accounts,     setAccounts]     = useState([]);
  const [expCats,      setExpCats]      = useState([]);
  const [incCats,      setIncCats]      = useState([]);
  const [budgets,      setBudgets]      = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bills,        setBills]        = useState([]);
  const [appReady,     setAppReady]     = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const userId = user?.id;

  const loadShared = useCallback(async () => {
    if (!userId) return;
    try {
      const [entriesRes, accountsRes, expCatsRes, incCatsRes, budgetsRes, goalsRes, billsRes] = await Promise.all([
        pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }),
        pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }),
        pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
        pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
        pb.collection("budgets").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
        pb.collection("savings_goals").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
        pb.collection("bills").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
      ]);
      setEntries(entriesRes);
      setAccounts(accountsRes.map(a => ({ ...a, group: a.group || "cash" })));
      setExpCats(expCatsRes);
      setIncCats(incCatsRes);
      setBudgets(budgetsRes);
      setSavingsGoals(goalsRes);
      setBills(billsRes);
    } catch (err) {
      console.error("Failed to load shared data:", err);
    } finally {
      setAppReady(true);
    }
  }, [userId]);

  useEffect(() => { loadShared(); }, [loadShared]);

  // ── Unified AI Brain ───────────────────────────────────────────
  const ai = useAI({
    userId,
    entries,
    accounts,
    expCats,
    incCats,
    budgets,
    savingsGoals,
    bills,
    onEntriesChange:      updater => setEntries(prev => typeof updater === "function" ? updater(prev) : updater),
    onBudgetsChange:      updater => setBudgets(prev => typeof updater === "function" ? updater(prev) : updater),
    onSavingsGoalsChange: updater => setSavingsGoals(prev => typeof updater === "function" ? updater(prev) : updater),
    onBillsChange:        updater => setBills(prev => typeof updater === "function" ? updater(prev) : updater),
  });

  const accountBalances = useMemo(() => {
    const map = {};
    accounts.forEach(a => { map[a.id] = 0; });
    entries.forEach(e => {
      if (Object.prototype.hasOwnProperty.call(map, e.accountId)) {
        map[e.accountId] += e.type === "income" ? e.amount : -e.amount;
      }
    });
    return map;
  }, [entries, accounts]);

  const handleLogin  = (u) => setUser(u);
  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    setEntries([]);
    setAccounts([]);
    setAppReady(false);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderTab = () => {
    switch (activeTab) {
      case "expense":
        return (
          <ExpenseTracker
            userId={userId}
            accounts={accounts}
            entries={entries}
            onEntriesChange={setEntries}
            ai={ai}
          />
        );
      case "accounts":
        return (
          <Account
            accounts={accounts}
            accountBalances={accountBalances}
            entries={entries}
            userId={userId}
            onAccountsChange={setAccounts}
            onEntriesChange={setEntries}
            onShowTransfer={() => {}}
          />
        );
      case "charts":
        return <ChartsTab userId={userId} entries={entries} accounts={accounts} />;
      case "budget":
        return (
          <BudgetGoals
            userId={userId}
            entries={entries}
            expCats={expCats}
            budgets={budgets}
            savingsGoals={savingsGoals}
            onBudgetsChange={setBudgets}
            onSavingsGoalsChange={setSavingsGoals}
            ai={ai}
          />
        );
      case "insights":
        return (
          <Insights
            userId={userId}
            entries={entries}
            expCats={expCats}
            incCats={incCats}
            bills={bills}
            onBillsChange={setBills}
            ai={ai}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={tab => { setActiveTab(tab); setAlertsDismissed(false); }}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main-content">
        {appReady ? (
          <>
            {/* Proactive AI Alert Banner */}
            {!alertsDismissed && (
              <AlertBanner
                alerts={ai.alerts}
                onDismiss={() => setAlertsDismissed(true)}
              />
            )}
            {renderTab()}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            Loading…
          </div>
        )}
      </main>
    </div>
  );
}