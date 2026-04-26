import { useState, useEffect, useCallback, useMemo } from "react";
import pb from "./pb";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ExpenseTracker from "./components/ExpenseTracker";
import Account from "./components/Account";
import ChartsTab from "./components/ChartsTab";
import BudgetGoals from "./components/BudgetGoals";
import Insights from "./components/Insights";
import Journal from "./components/Journal";

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

export default function App() {
  const [user,      setUser]      = useState(() => pb.authStore.model);
  const [activeTab, setActiveTab] = useState("expense");
  const { theme, toggle: toggleTheme } = useTheme();

  const [entries,  setEntries]  = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expCats,  setExpCats]  = useState([]);
  const [incCats,  setIncCats]  = useState([]);
  const [appReady, setAppReady] = useState(false);

  const userId = user?.id;

  const loadShared = useCallback(async () => {
    if (!userId) return;
    try {
      const [entriesRes, accountsRes, expCatsRes, incCatsRes] = await Promise.all([
        pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }),
        pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }),
        pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
        pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }).catch(() => []),
      ]);
      setEntries(entriesRes);
      setAccounts(accountsRes.map(a => ({ ...a, group: a.group || "cash" })));
      setExpCats(expCatsRes);
      setIncCats(incCatsRes);
    } catch (err) {
      console.error("Failed to load shared data:", err);
    } finally {
      setAppReady(true);
    }
  }, [userId]);

  useEffect(() => { loadShared(); }, [loadShared]);

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
            userId={userId} accounts={accounts} entries={entries}
            onEntriesChange={setEntries}
          />
        );
      case "accounts":
        return (
          <Account
            accounts={accounts} accountBalances={accountBalances}
            entries={entries} userId={userId}
            onAccountsChange={setAccounts} onEntriesChange={setEntries}
            onShowTransfer={() => {}}
          />
        );
      case "charts":
        return <ChartsTab userId={userId} entries={entries} accounts={accounts} />;
      case "budget":
        return <BudgetGoals userId={userId} entries={entries} expCats={expCats} />;
      case "insights":
        return <Insights userId={userId} entries={entries} expCats={expCats} incCats={incCats} />;
      case "journal":
        return <Journal userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main-content">
        {appReady ? renderTab() : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            Loading…
          </div>
        )}
      </main>
    </div>
  );
}
