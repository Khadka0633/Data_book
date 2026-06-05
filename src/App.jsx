import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "./supabase";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ExpenseTracker from "./components/ExpenseTracker";
import Account from "./components/Account";
import ChartsTab from "./components/ChartsTab";
import BudgetGoals from "./components/BudgetGoals";
import Insights from "./components/Insights";
import Settings from "./components/Settings";
import Health from "./components/Health";

import useAI from "./useAI";
import MultiCurrencyWidget from "./components/MultiCurrencyWidget";

// ── Theme ──────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("nexus-theme") || "dark",
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nexus-theme", theme);
  }, [theme]);
  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

// ── Alert Banner ───────────────────────────────────────────────────
const ALERT_COLORS = {
  danger: {
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    color: "#ef4444",
  },
  warn: {
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.3)",
    color: "#f97316",
  },
  info: {
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.3)",
    color: "#6366f1",
  },
};

function AlertBanner({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  const alert = alerts[0];
  const c = ALERT_COLORS[alert.type] || ALERT_COLORS.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{alert.icon}</span>
      <p style={{ flex: 1, fontSize: 12, color: c.color, fontWeight: 500 }}>
        {alert.text}
      </p>
      {alerts.length > 1 && (
        <span
          style={{ fontSize: 11, color: c.color, opacity: 0.7, flexShrink: 0 }}
        >
          +{alerts.length - 1} more
        </span>
      )}
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: c.color,
          cursor: "pointer",
          fontSize: 14,
          flexShrink: 0,
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expCats, setExpCats] = useState([]);
  const [incCats, setIncCats] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [appReady, setAppReady] = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const { theme, toggle: toggleTheme } = useTheme();
  const userId = user?.id;
  const today = new Date().toISOString().split("T")[0];

  // ── Auth listener — keeps session in sync ──────────────────────
  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
        });
      }
      setAuthChecked(true);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email,
          });
        } else {
          setUser(null);
          setAppReady(false);
          setEntries([]);
          setAccounts([]);
          setExpCats([]);
          setIncCats([]);
          setBudgets([]);
          setSavingsGoals([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Data loading ───────────────────────────────────────────────
  const loadShared = useCallback(async () => {
    if (!userId) return;
    try {
      const [
        { data: entriesRes },
        { data: accountsRes },
        { data: expCatsRes },
        { data: incCatsRes },
        { data: budgetsRes },
        { data: goalsRes },
      ] = await Promise.all([
        supabase
          .from("entries")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false }),
        supabase
          .from("accounts")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("expense_categories")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("income_categories")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", userId),
      ]);

      // Normalize snake_case from Supabase to camelCase for components
      setEntries(
        (entriesRes || []).map((e) => ({
          ...e,
          accountId: e.account_id,
          userId: e.user_id,
          isTransfer: e.is_transfer,
        }))
      );
      setAccounts(
        (accountsRes || []).map((a) => ({
          ...a,
          userId: a.user_id,
          group: a.group || "cash",
        }))
      );
      setExpCats(expCatsRes || []);
      setIncCats(incCatsRes || []);
      setBudgets(
        (budgetsRes || []).map((b) => ({
          ...b,
          userId: b.user_id,
        }))
      );
      setSavingsGoals(
        (goalsRes || []).map((g) => ({
          ...g,
          userId: g.user_id,
          accountId: g.account_id,
        }))
      );
    } catch (err) {
      console.error("Failed to load shared data:", err);
    } finally {
      setAppReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadShared();
  }, [loadShared, userId]);

  // ── Unified AI Brain ───────────────────────────────────────────
  const ai = useAI({
    userId,
    entries,
    accounts,
    expCats,
    incCats,
    budgets,
    savingsGoals,
    onEntriesChange: (u) =>
      setEntries((p) => (typeof u === "function" ? u(p) : u)),
    onBudgetsChange: (u) =>
      setBudgets((p) => (typeof u === "function" ? u(p) : u)),
    onSavingsGoalsChange: (u) =>
      setSavingsGoals((p) => (typeof u === "function" ? u(p) : u)),
    
  });

  // ── Account balances ───────────────────────────────────────────
  const accountBalances = useMemo(() => {
    const map = {};
    accounts.forEach((a) => { map[a.id] = 0; });
    entries.forEach((e) => {
      if (Object.prototype.hasOwnProperty.call(map, e.accountId)) {
        map[e.accountId] += e.type === "income" ? e.amount : -e.amount;
      }
    });
    return map;
  }, [entries, accounts]);

  // ── Auth ───────────────────────────────────────────────────────
  const handleLogin = (u) => setUser(u);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setAccounts([]);
    setExpCats([]);
    setIncCats([]);
    setBudgets([]);
    setSavingsGoals([]);
    setAppReady(false);
  };

  const handleUserUpdate = (updated) => setUser(updated);

  // ── Show nothing until auth is checked ─────────────────────────
  if (!authChecked) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg)",
          color: "var(--text-muted)",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 40, color: "var(--accent)" }}>⬡</span>
        <p style={{ fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  // ── Tab renderer ───────────────────────────────────────────────
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
            onShowTransfer={() => setShowTransfer(true)}
          />
        );
      case "charts":
        return (
          <ChartsTab userId={userId} entries={entries} accounts={accounts} />
        );
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
            accounts={accounts}
            expCats={expCats}
            incCats={incCats}
            ai={ai}
          />
        );
      case "currency":
        return <MultiCurrencyWidget />;



        case "health":
  return (
    <Health
      userId={userId}
      entries={entries}
      accounts={accounts}
    />
  );






      case "settings":
        return (
          <Settings
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────
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
        {appReady ? (
          <>
            {!alertsDismissed && (
              <AlertBanner
                alerts={ai.alerts}
                onDismiss={() => setAlertsDismissed(true)}
              />
            )}
            {renderTab()}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
            }}
          >
            Loading…
          </div>
        )}
      </main>
    </div>
  );
}
