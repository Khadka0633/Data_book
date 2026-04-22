import { useState, useMemo, useEffect, useCallback } from "react";
import pb from "../pb";

const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_COLOR = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const CATEGORIES = ["Personal", "Work", "Health", "Finance", "Other"];

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTop:"3px solid var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"var(--text-muted)", fontSize:14 }}>Loading your tasks...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function TodoList({ userId }) {
  const today = new Date().toISOString().split("T")[0];

  const [todos,     setTodos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [editId,    setEditId]    = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [form, setForm] = useState({
    text: "", priority: "medium", date: today, category: "Personal",
  });

  // ── Load from PocketBase ──────────────────────────────────────
  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const records = await pb.collection("todos").getFullList({
        filter: `userId = '${userId}'`,
        sort:   "-created",
      });
      setTodos(records);
    } catch (err) {
      console.error("Failed to load todos:", err);
      setError("Could not load tasks. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  // ── Add / Update ──────────────────────────────────────────────
  const addTodo = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editId) {
        const updated = await pb.collection("todos").update(editId, {
          text:     form.text.trim(),
          priority: form.priority,
          date:     form.date,
          category: form.category,
        });
        setTodos((prev) => prev.map((t) => t.id === editId ? updated : t));
        setEditId(null);
      } else {
        const created = await pb.collection("todos").create({
          userId,
          text:     form.text.trim(),
          priority: form.priority,
          date:     form.date,
          category: form.category,
          done:     false,
        });
        setTodos((prev) => [created, ...prev]);
      }
      setForm({ text: "", priority: "medium", date: today, category: "Personal" });
    } catch (err) {
      console.error("Failed to save todo:", err);
      setError("Failed to save task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle done ───────────────────────────────────────────────
  const toggleDone = async (id, currentDone) => {
    try {
      const updated = await pb.collection("todos").update(id, { done: !currentDone });
      setTodos((prev) => prev.map((t) => t.id === id ? updated : t));
    } catch (err) {
      console.error("Failed to toggle todo:", err);
    }
  };

  // ── Delete (double-confirm) ───────────────────────────────────
  const handleDelete = async (id) => {
    if (confirmId === id) {
      try {
        await pb.collection("todos").delete(id);
        setTodos((prev) => prev.filter((t) => t.id !== id));
        setConfirmId(null);
      } catch (err) {
        console.error("Failed to delete todo:", err);
      }
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  // ── Start edit ────────────────────────────────────────────────
  const startEdit = (t) => {
    setEditId(t.id);
    setForm({ text: t.text, priority: t.priority, date: t.date, category: t.category });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ text: "", priority: "medium", date: today, category: "Personal" });
  };

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return todos.filter((t) => {
      const matchSearch = t.text.toLowerCase().includes(search.toLowerCase());
      if (filter === "all")     return matchSearch;
      if (filter === "today")   return t.date === today && matchSearch;
      if (filter === "done")    return t.done && matchSearch;
      if (filter === "pending") return !t.done && matchSearch;
      return matchSearch;
    });
  }, [todos, filter, search, today]);

  const stats = {
    total: todos.length,
    done:  todos.filter((t) => t.done).length,
    today: todos.filter((t) => t.date === today).length,
    high:  todos.filter((t) => t.priority === "high" && !t.done).length,
  };

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  if (loading) return <LoadingScreen />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Manager</h1>
          <p className="page-sub">Stay organized, stay ahead</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-md)", padding:"12px 16px", color:"var(--red)", fontSize:13 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div><p className="stat-label">Total Tasks</p><p className="stat-value">{stats.total}</p></div>
        </div>
        <div className="stat-card income-card">
          <div className="stat-icon">✓</div>
          <div><p className="stat-label">Completed</p><p className="stat-value">{stats.done}</p></div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">!</div>
          <div><p className="stat-label">High Priority</p><p className="stat-value">{stats.high}</p></div>
        </div>
        <div className="stat-card balance-pos">
          <div className="stat-icon">◎</div>
          <div><p className="stat-label">Today's Tasks</p><p className="stat-value">{stats.today}</p></div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card progress-card">
        <div className="progress-header">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-pct">{progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width:`${progress}%` }} />
        </div>
        <p className="progress-sub">{stats.done} of {stats.total} tasks completed</p>
      </div>

      <div className="two-col">
        {/* Add / Edit form */}
        <div className="card">
          <h2 className="card-title">{editId ? "✏️ Edit Task" : "New Task"}</h2>
          <div className="form-group">
            <input
              type="text" placeholder="What needs to be done?"
              value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              className="input"
            />
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
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={addTodo} className="btn-primary" style={{ flex:1 }} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Task"}
              </button>
              {editId && <button onClick={cancelEdit} className="btn-cancel">Cancel</button>}
            </div>
          </div>
        </div>

        {/* Filter & Search */}
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

      {/* Task list */}
      <div className="card">
        <h2 className="card-title">Tasks ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="empty-msg">No tasks found.</p>
        ) : (
          <div className="todo-list">
            {filtered.map((t) => (
              <div key={t.id} className={`todo-item ${t.done ? "done" : ""}`}>
                <button onClick={() => toggleDone(t.id, t.done)}
                  className={`check-btn ${t.done ? "checked" : ""}`}>
                  {t.done ? "✓" : ""}
                </button>
                <div className="todo-body">
                  <p className="todo-text">{t.text}</p>
                  <div className="todo-meta">
                    <span className="todo-cat">{t.category}</span>
                    <span className="todo-date">
                      {new Date(t.date).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                    </span>
                    <span className="priority-tag" style={{ color: PRIORITY_COLOR[t.priority] }}>
                      ● {PRIORITY_LABEL[t.priority]}
                    </span>
                  </div>
                </div>
                <button onClick={() => startEdit(t)} className="edit-btn" title="Edit">✎</button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className={`del-btn ${confirmId === t.id ? "del-btn-confirm" : ""}`}
                  title={confirmId === t.id ? "Click again to confirm" : "Delete"}>
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
