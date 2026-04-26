// ─── App.jsx — required changes ───────────────────────────────────
//
// 1. Import Account component
// 2. Lift accounts + entries state up to App (if not already there)
// 3. Add "accounts" tab rendering
//
// Below is the full updated App.jsx structure.
// Replace your existing App.jsx with this, adjusting
// HealthMonitor / TodoList / ChartsTab imports to match your paths.

import { useState, useEffect, useCallback, useMemo } from "react";
import pb from "./pb";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ExpenseTracker from "./components/ExpenseTracker";
import Account from "./components/Account";
import HealthMonitor from "./components/HealthMonitor";
import TodoList from "./components/TodoList";
import ChartsTab from "./components/ChartsTab";
import Transfermodal from "./components/Transfermodal";

export default function App() {
  const [user,       setUser]       = useState(() => pb.authStore.model);
  const [activeTab,  setActiveTab]  = useState("expense");

  // ── Shared state (lifted from ExpenseTracker) ──────────────────
  const [entries,  setEntries]  = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [appReady, setAppReady] = useState(false);

  const userId = user?.id;

  // Load accounts + entries once on login
  const loadShared = useCallback(async () => {
    if (!userId) return;
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }),
        pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }),
      ]);
      setEntries(entriesRes);
      setAccounts(accountsRes.map(a => ({ ...a, group: a.group || "cash" })));
    } catch (err) {
      console.error("Failed to load shared data:", err);
    } finally {
      setAppReady(true);
    }
  }, [userId]);

  useEffect(() => { loadShared(); }, [loadShared]);

  // ── Account balances (shared between Finance + Accounts tabs) ──
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

  // ── Auth ────────────────────────────────────────────────────────
  const handleLogin = (loggedInUser) => setUser(loggedInUser);
  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    setEntries([]);
    setAccounts([]);
    setAppReady(false);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  // ── Tab rendering ───────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case "expense":
        return (
          <ExpenseTracker
            userId={userId}
            accounts={accounts}
            entries={entries}
            onEntriesChange={setEntries}
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
            onShowTransfer={() => {/* optionally open transfer modal */}}
          />
        );
      case "health":
        return <HealthMonitor userId={userId} />;
      case "todo":
        return <TodoList userId={userId} />;
      case "charts":
        return <ChartsTab userId={userId} entries={entries} accounts={accounts} />;
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
      />
      <main className="main-content">
        {appReady ? renderTab() : <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading…</div>}
      </main>
    </div>
  );
}
