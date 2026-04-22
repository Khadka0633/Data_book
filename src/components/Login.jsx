import { useState } from "react";

// Simple SHA-256 hash using Web Crypto API (built into all modern browsers)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (isRegister) {
      if (!form.name.trim()) return setError("Please enter your name.");
      if (!form.email.trim()) return setError("Please enter your email.");
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");

      const existing = JSON.parse(localStorage.getItem("nexus-users") || "[]");
      if (existing.find((u) => u.email === form.email)) {
        return setError("An account with this email already exists.");
      }

      // ✅ Hash password before storing — plain text never touches localStorage
      const hashedPassword = await hashPassword(form.password);
      const newUser = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: hashedPassword, // stored as hash, not plain text
      };

      localStorage.setItem("nexus-users", JSON.stringify([...existing, newUser]));
      // ✅ Session only stores name + email, never the password
      localStorage.setItem("nexus-session", JSON.stringify({ name: newUser.name, email: newUser.email }));

      setLoading(true);
      setTimeout(() => onLogin({ name: newUser.name, email: newUser.email }), 600);

    } else {
      if (!form.email.trim()) return setError("Please enter your email.");
      if (!form.password) return setError("Please enter your password.");

      const users = JSON.parse(localStorage.getItem("nexus-users") || "[]");

      // ✅ Hash the entered password and compare against stored hash
      const hashedPassword = await hashPassword(form.password);
      const user = users.find((u) => u.email === form.email && u.password === hashedPassword);

      if (!user) return setError("Invalid email or password.");

      // ✅ Session only stores name + email
      localStorage.setItem("nexus-session", JSON.stringify({ name: user.name, email: user.email }));
      setLoading(true);
      setTimeout(() => onLogin({ name: user.name, email: user.email }), 600);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-blob blob-1" />
      <div className="login-blob blob-2" />
      <div className="login-blob blob-3" />

      <div className="login-card">
        <div className="login-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">Nexus</span>
        </div>

        <h1 className="login-title">
          {isRegister ? "Create account" : "Welcome back"}
        </h1>
        <p className="login-sub">
          {isRegister
            ? "Start tracking your finances, health & tasks."
            : "Sign in to your personal dashboard."}
        </p>

        <div className="login-form">
          {isRegister && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            onClick={handleSubmit}
            className={`btn-primary login-btn ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Signing in..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </div>

        <p className="login-switch">
          {isRegister ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setForm({ name: "", email: "", password: "" });
            }}
            className="switch-btn"
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}
