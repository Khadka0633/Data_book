import { useState } from "react";
import pb from "../pb";

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!form.name.trim()) { setLoading(false); return setError("Please enter your name."); }
        if (!form.email.trim()) { setLoading(false); return setError("Please enter your email."); }
        if (form.password.length < 8) { setLoading(false); return setError("Password must be at least 8 characters."); }

        // Create user in PocketBase
        await pb.collection("users").create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          passwordConfirm: form.password,
        });

        // Auto login after register
        const authData = await pb.collection("users").authWithPassword(
          form.email.trim(),
          form.password
        );

        onLogin({ name: authData.record.name, email: authData.record.email, id: authData.record.id });

      } else {
        if (!form.email.trim()) { setLoading(false); return setError("Please enter your email."); }
        if (!form.password) { setLoading(false); return setError("Please enter your password."); }

        const authData = await pb.collection("users").authWithPassword(
          form.email.trim(),
          form.password
        );

        onLogin({ name: authData.record.name, email: authData.record.email, id: authData.record.id });
      }

    } catch (err) {
      const msg = err?.response?.message || err?.message || "";
      if (msg.toLowerCase().includes("failed to authenticate") || msg.toLowerCase().includes("invalid")) {
        setError("Invalid email or password.");
      } else if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("unique")) {
        setError("An account with this email already exists.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
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
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
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
