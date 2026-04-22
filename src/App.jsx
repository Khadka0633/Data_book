import { useState } from "react";
import ExpenseTracker from "./components/ExpenseTracker";
import HealthMonitor from "./components/HealthMonitor";
import TodoList from "./components/TodoList";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";

export default function App() {
  const [activeTab, setActiveTab] = useState("expense");

  const [user, setUser] = useState(() => {
    try {
      const session = localStorage.getItem("nexus-session");
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("nexus-session");
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="main-content">
        {activeTab === "expense" && <ExpenseTracker userEmail={user.email} />}
        {activeTab === "health" && <HealthMonitor userEmail={user.email} />}
        {activeTab === "todo" && <TodoList userEmail={user.email} />}
      </main>
    </div>
  );
}
