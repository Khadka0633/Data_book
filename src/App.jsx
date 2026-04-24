import { useState, useEffect } from "react";
import ExpenseTracker from "./components/ExpenseTracker";
import HealthMonitor from "./components/HealthMonitor";
import TodoList from "./components/TodoList";
import ChartsTab from "./components/ChartsTab";  
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import pb from "./pb";

export default function App() {
  const [activeTab, setActiveTab] = useState("expense");

  const [user, setUser] = useState(() => {
    if (pb.authStore.isValid) {
      const record = pb.authStore.model;
      return { name: record.name, email: record.email, id: record.id };
    }
    return null;
  });

  useEffect(() => {
    if (pb.authStore.isValid) {
      pb.collection("users").authRefresh().catch(() => {
        pb.authStore.clear();
        setUser(null);
      });
    }
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {activeTab === "expense" && <ExpenseTracker userId={user.id} />}
        {activeTab === "health"  && <HealthMonitor  userId={user.id} />}
        {activeTab === "todo"    && <TodoList        userId={user.id} />}
        {activeTab === "charts"  && <ChartsTab       userId={user.id} />}  {/* ← add this */}
      </main>
    </div>
  );
}