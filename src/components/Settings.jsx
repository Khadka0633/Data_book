import { useState } from "react";
import pb from "../pb";

export default function Settings({ user, onUserUpdate, onLogout }) {
  const [activeSection, setActiveSection] = useState("profile");

  // ── Profile ────────────────────────────────────────────────────
  const [name,        setName]        = useState(user?.name  || "");
  const [email,       setEmail]       = useState(user?.email || "");
  const [profileMsg,  setProfileMsg]  = useState("");
  const [profileErr,  setProfileErr]  = useState("");
  const [profileSave, setProfileSave] = useState(false);

  // ── Password ───────────────────────────────────────────────────
  const [oldPass,   setOldPass]   = useState("");
  const [newPass,   setNewPass]   = useState("");
  const [confPass,  setConfPass]  = useState("");
  const [passMsg,   setPassMsg]   = useState("");
  const [passErr,   setPassErr]   = useState("");
  const [passSave,  setPassSave]  = useState(false);

  // ── Danger zone ────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const saveProfile = async () => {
    setProfileErr(""); setProfileMsg("");
    if (!name.trim()) return setProfileErr("Name cannot be empty.");
    if (!email.trim()) return setProfileErr("Email cannot be empty.");
    setProfileSave(true);
    try {
      const updated = await pb.collection("users").update(user.id, {
        name: name.trim(),
        email: email.trim(),
      });
      onUserUpdate({ ...user, name: updated.name, email: updated.email });
      setProfileMsg("Profile updated successfully!");
    } catch (err) {
      setProfileErr(err?.response?.message || "Failed to update profile.");
    } finally {
      setProfileSave(false);
    }
  };

  const savePassword = async () => {
    setPassErr(""); setPassMsg("");
    if (!oldPass)            return setPassErr("Enter your current password.");
    if (newPass.length < 8)  return setPassErr("New password must be at least 8 characters.");
    if (newPass !== confPass) return setPassErr("Passwords do not match.");
    setPassSave(true);
    try {
      await pb.collection("users").update(user.id, {
        oldPassword:     oldPass,
        password:        newPass,
        passwordConfirm: confPass,
      });
      setPassMsg("Password changed successfully!");
      setOldPass(""); setNewPass(""); setConfPass("");
    } catch (err) {
      setPassErr(err?.response?.message || "Failed to change password. Check your current password.");
    } finally {
      setPassSave(false);
    }
  };

  const sections = [
    { id: "profile",  label: "Profile",       icon: "👤" },
    { id: "password", label: "Password",      icon: "🔒" },
    { id: "danger",   label: "Danger Zone",   icon: "⚠️" },
  ];

  return (
    <div className="page" style={{ padding: 16, gap: 0, maxWidth: 520 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 }}>Settings</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Manage your account and preferences</p>
      </div>

      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{user?.name || "User"}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{user?.email}</p>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: 4 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 600,
            borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
            background: activeSection === s.id ? "var(--surface)" : "transparent",
            color: activeSection === s.id ? "var(--text)" : "var(--text-muted)",
            boxShadow: activeSection === s.id ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
            transition: "all 0.15s",
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── Profile Section ── */}
      {activeSection === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="input-label">Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="input-label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" />
          </div>
          {profileErr && <p style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)" }}>{profileErr}</p>}
          {profileMsg && <p style={{ fontSize: 12, color: "var(--green)", padding: "8px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-sm)" }}>✓ {profileMsg}</p>}
          <button className="btn-primary" onClick={saveProfile} disabled={profileSave}>
            {profileSave ? "Saving…" : "Save Profile"}
          </button>
        </div>
      )}

      {/* ── Password Section ── */}
      {activeSection === "password" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="input-label">Current Password</label>
            <input className="input" type="password" value={oldPass}
              onChange={e => setOldPass(e.target.value)} placeholder="••••••••" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="input-label">New Password</label>
            <input className="input" type="password" value={newPass}
              onChange={e => setNewPass(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="input-label">Confirm New Password</label>
            <input className="input" type="password" value={confPass}
              onChange={e => setConfPass(e.target.value)} placeholder="••••••••" />
          </div>
          {passErr && <p style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)" }}>{passErr}</p>}
          {passMsg && <p style={{ fontSize: 12, color: "var(--green)", padding: "8px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-sm)" }}>✓ {passMsg}</p>}
          <button className="btn-primary" onClick={savePassword} disabled={passSave}>
            {passSave ? "Saving…" : "Change Password"}
          </button>
        </div>
      )}

      {/* ── Danger Zone ── */}
      {activeSection === "danger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Sign Out</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
              You'll be signed out of your account on this device.
            </p>
            <button onClick={onLogout} style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Sign Out
            </button>
          </div>

          <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Delete Account</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
              Permanently delete your account and all data. This cannot be undone.
            </p>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  try {
                    await pb.collection("users").delete(user.id);
                    onLogout();
                  } catch (err) {
                    console.error("Delete failed:", err);
                  }
                }} style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Yes, Delete Everything
                </button>
                <button className="btn-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Delete Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
