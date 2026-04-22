import { useState, useMemo, useEffect } from "react";

const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_COLOR = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const DEFAULT_TODOS = (today) => [
  { id: 1, text: "Review monthly budget", priority: "high", done: false, date: today, category: "Finance" },
  { id: 2, text: "Go for a 30-min walk", priority: "medium", done: false, date: today, category: "Health" },
  { id: 3, text: "Read for 20 minutes", priority: "low", done: true, date: today, category: "Personal" },
];

// ✅ Safe localStorage save with error handling
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

export default function TodoList({ userEmail }) {
  const today = new Date().toISOString().split("T")[0];
  const STORAGE_KEY = `nexus-todos-${userEmail}`;

  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TODOS(today);
    } catch {
      return DEFAULT_TODOS(today);
    }
  });

  const [form, setForm] = useState({ text: "", priority: "medium", date: today, category: "Personal" });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ✅ Delete confirmation state
  const [confirmId, setConfirmId] = useState(null);

  // ✅ Safe useEffect with error handling
  useEffect(() => {
    saveToStorage(STORAGE_KEY, todos);
  }, [todos, STORAGE_KEY]);

  const CATEGORIES = ["Personal", "Work", "Health", "Finance", "Other"];

  const addTodo = () => {
    if (!form.text.trim()) return;
    setTodos([...todos, { ...form, id: Date.now(), done: false }]);
    setForm({ ...form, text: "" });
  };

  const toggleDone = (id) => setTodos(todos.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  // ✅ Two-step delete: first click shows "?" confirm, second click deletes
  const handleDelete = (id) => {
    if (confirmId === id) {
      setTodos(todos.filter((t) => t.id !== id));
      setConfirmId(null);
    } else {
      setConfirmId(id);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      const matchSearch = t.text.toLowerCase().includes(search.toLowerCase());
      if (filter === "all") return matchSearch;
      if (filter === "today") return t.date === today && matchSearch;
      if (filter === "done") return t.done && matchSearch;
      if (filter === "pending") return !t.done && matchSearch;
      return matchSearch;
    });
  }, [todos, filter, search, today]);

  const stats = {
    total: todos.length,
    done: todos.filter((t) => t.done).length,
    today: todos.filter((t) => t.date === today).length,
    high: todos.filter((t) => t.priority === "high" && !t.done).length,
  };

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Manager</h1>
          <p className="page-sub">Stay organized, stay ahead</p>
        </div>
        <div className="date-badge">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <p className="stat-label">Total Tasks</p>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card income-card">
          <div className="stat-icon">✓</div>
          <div>
            <p className="stat-label">Completed</p>
            <p className="stat-value">{stats.done}</p>
          </div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">!</div>
          <div>
            <p className="stat-label">High Priority</p>
            <p className="stat-value">{stats.high}</p>
          </div>
        </div>
        <div className="stat-card balance-pos">
          <div className="stat-icon">◎</div>
          <div>
            <p className="stat-label">Today's Tasks</p>
            <p className="stat-value">{stats.today}</p>
          </div>
        </div>
      </div>

      <div className="card progress-card">
        <div className="progress-header">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-pct">{progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-sub">{stats.done} of {stats.total} tasks completed</p>
      </div>

      <div className="two-col">
        <div className="card">
          <h2 className="card-title">New Task</h2>
          <div className="form-group">
            <input type="text" placeholder="What needs to be done?"
              value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addTodo()} className="input" />
            <div className="priority-row">
              {PRIORITIES.map((p) => (
                <button key={p} onClick={() => setForm({ ...form, priority: p })}
                  className={`priority-btn ${form.priority === p ? "active" : ""}`}
                  style={{ "--p-color": PRIORITY_COLOR[p] }}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            <button onClick={addTodo} className="btn-primary">Add Task</button>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Filter & Search</h2>
          <input type="text" placeholder="Search tasks..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="input" />
          <div className="filter-chips">
            {["all", "today", "pending", "done"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`filter-chip ${filter === f ? "active" : ""}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="priority-summary">
            {PRIORITIES.map((p) => {
              const count = todos.filter((t) => t.priority === p && !t.done).length;
              return (
                <div key={p} className="priority-pill" style={{ "--p-color": PRIORITY_COLOR[p] }}>
                  <span className="p-dot" />
                  <span>{PRIORITY_LABEL[p]}</span>
                  <span className="p-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Tasks ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="empty-msg">No tasks found.</p>
        ) : (
          <div className="todo-list">
            {filtered.map((t) => (
              <div key={t.id} className={`todo-item ${t.done ? "done" : ""}`}>
                <button onClick={() => toggleDone(t.id)} className={`check-btn ${t.done ? "checked" : ""}`}>
                  {t.done ? "✓" : ""}
                </button>
                <div className="todo-body">
                  <p className="todo-text">{t.text}</p>
                  <div className="todo-meta">
                    <span className="todo-cat">{t.category}</span>
                    <span className="todo-date">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span className="priority-tag" style={{ color: PRIORITY_COLOR[t.priority] }}>
                      ● {PRIORITY_LABEL[t.priority]}
                    </span>
                  </div>
                </div>
                {/* ✅ Two-step delete button */}
                <button
                  onClick={() => handleDelete(t.id)}
                  className={`del-btn ${confirmId === t.id ? "del-btn-confirm" : ""}`}
                  title={confirmId === t.id ? "Click again to confirm" : "Delete"}
                >
                  {confirmId === t.id ? "?" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
