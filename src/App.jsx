import { useState } from "react";
import ExpenseTracker from "./components/ExpenseTracker";
import HealthMonitor from "./components/HealthMonitor";
import TodoList from "./components/TodoList";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import pb from "./pb";

export default function App() {
  const [activeTab, setActiveTab] = useState("expense");

  // PocketBase automatically persists auth in localStorage via pb.authStore
  const [user, setUser] = useState(() => {
    if (pb.authStore.isValid) {
      const record = pb.authStore.model;
      return { name: record.name, email: record.email, id: record.id };
    }
    return null;
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    pb.authStore.clear(); // clears PocketBase session
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="main-content">
        {activeTab === "expense" && <ExpenseTracker userId={user.id} />}
        {activeTab === "health"  && <HealthMonitor  userEmail={user.email} />}
        {activeTab === "todo"    && <TodoList        userEmail={user.email} />}
      </main>
    </div>
  );
}
