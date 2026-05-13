import { useState } from "react";
import pb from "../pb";

export default function Login({ onLogin }) {
  const [view, setView] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = (nextView) => {
    setError("");
    setForm({ name: "", email: "", password: "" });
    setView(nextView);
  };

  // ── Login ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError("");
    if (!form.email.trim()) return setError("Please enter your email.");
    if (!form.password) return setError("Please enter your password.");
    setLoading(true);
    try {
      const authData = await pb
        .collection("users")
        .authWithPassword(form.email.trim(), form.password);
      onLogin({
        name: authData.record.name,
        email: authData.record.email,
        id: authData.record.id,
      });
    } catch (err) {
      const msg = err?.response?.message || err?.message || "";
      if (
        msg.toLowerCase().includes("failed to authenticate") ||
        msg.toLowerCase().includes("invalid")
      ) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────
  const handleRegister = async () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!form.email.trim()) return setError("Please enter your email.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await pb.collection("users").create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        passwordConfirm: form.password,
      });
      const authData = await pb
        .collection("users")
        .authWithPassword(form.email.trim(), form.password);
      onLogin({
        name: authData.record.name,
        email: authData.record.email,
        id: authData.record.id,
      });
    } catch (err) {
      const msg = err?.response?.message || err?.message || "";
      if (
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("unique")
      ) {
        setError("An account with this email already exists.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────────
  const handleForgot = async () => {
    setError("");
    if (!form.email.trim()) return setError("Please enter your email.");
    setLoading(true);
    try {
      await pb.collection("users").requestPasswordReset(form.email.trim());
      setView("forgot-sent");
    } catch (err) {
      setView("forgot-sent");
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
        {/* Brand */}
        <div className="login-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">Nexus</span>
        </div>

        {/* ── Login View ── */}
        {view === "login" && (
          <>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-sub">Sign in to your personal dashboard.</p>
            <div className="login-form">
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <button
                onClick={() => reset("forgot")}
                style={{
                  alignSelf: "flex-end",
                  fontSize: 12,
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginTop: -4,
                }}
              >
                Forgot password?
              </button>
              {error && <p className="login-error">{error}</p>}
              <button
                onClick={handleLogin}
                className={`btn-primary login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
            <p className="login-switch">
              Don't have an account?
              <button onClick={() => reset("register")} className="switch-btn">
                Register
              </button>
            </p>
          </>
        )}

        {/* ── Register View ── */}
        {view === "register" && (
          <>
            <h1 className="login-title">Create account</h1>
            <p className="login-sub">
              Start tracking your finances, goals &amp; more.
            </p>
            <div className="login-form">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button
                onClick={handleRegister}
                className={`btn-primary login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </div>
            <p className="login-switch">
              Already have an account?
              <button onClick={() => reset("login")} className="switch-btn">
                Sign in
              </button>
            </p>
          </>
        )}

        {/* ── Forgot Password View ── */}
        {view === "forgot" && (
          <>
            <h1 className="login-title" style={{ fontSize: 22 }}>
              Reset password
            </h1>
            <p className="login-sub">
              Enter your email and we'll send you a reset link.
            </p>
            <div className="login-form">
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                  autoFocus
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button
                onClick={handleForgot}
                className={`btn-primary login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
            <p className="login-switch">
              Remember it?
              <button onClick={() => reset("login")} className="switch-btn">
                Back to sign in
              </button>
            </p>
          </>
        )}

        {/* ── Forgot Sent View ── */}
        {view === "forgot-sent" && (
          <>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
              <h1 className="login-title" style={{ fontSize: 22 }}>
                Check your email
              </h1>
              <p className="login-sub" style={{ marginBottom: 0 }}>
                If an account exists for{" "}
                <strong style={{ color: "var(--text)" }}>{form.email}</strong>,
                a password reset link has been sent.
              </p>
            </div>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              💡 The link expires in 30 minutes. Check your spam folder if you
              don't see it.
            </div>
            <p className="login-switch" style={{ marginTop: 16 }}>
              <button onClick={() => reset("login")} className="switch-btn">
                Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}