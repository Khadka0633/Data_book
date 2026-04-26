import { useState, useEffect, useRef } from "react";
import pb from "../pb";

// ─── Account Groups Config ────────────────────────────────────────
const ACCOUNT_GROUPS = [
  { key: "savings",    label: "Savings",        color: "#5fc20e", bg: "#190749" },
  { key: "cash",       label: "Cash",           color: "#bd6f10", bg: "#190749" },
  { key: "investment", label: "Investments",    color: "#534AB7", bg: "#190749" },
  { key: "loan",       label: "Loans",          color: "#A32D2D", bg: "#190749" },
  { key: "bank",       label: "Bank",           color: "#0ab97f", bg: "#190749" },
  { key: "wallet",     label: "Digital_Wallet", color: "#ac9330", bg: "#190749" },
];

// ─── Icon Picker ──────────────────────────────────────────────────
const ACCOUNT_ICONS = [
  "🏦","💵","💳","📱","💜","💰","🏧","💹","📈","🪙",
  "🏠","🚗","✈️","🎓","💊","🛒","⚡","🍔","🎮","💼",
  "🏪","🌐","📦","🎁","💎","🔑","🏋️","🌱","🎯","🤝",
];

function IconPicker({ value, onChange }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4,
      padding: "10px", background: "var(--surface-2)",
      borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
    }}>
      {ACCOUNT_ICONS.map(icon => (
        <button key={icon} onClick={() => onChange(icon)} style={{
          fontSize: 20, padding: "6px", borderRadius: "var(--radius-sm)",
          border: value === icon ? "2px solid var(--accent)" : "2px solid transparent",
          background: value === icon ? "var(--accent)22" : "transparent",
          cursor: "pointer", lineHeight: 1, transition: "all 0.15s",
        }}>{icon}</button>
      ))}
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────
function AccountCard({ account, balance, onClick, isSelected, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`account-card ${isSelected ? "account-card-active" : ""}`}
      style={{ "--acc-color": account.color }}
      onClick={onClick}
    >
      <div className="account-card-top">
        <span className="account-icon">{account.icon}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isSelected && <span className="account-selected-pip" />}
          <div ref={menuRef} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button className="acc-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}>⋯</button>
            {menuOpen && (
              <div className="acc-dropdown">
                <button className="acc-dropdown-item" onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(account); }}>✎ Edit</button>
                <button className="acc-dropdown-item acc-dropdown-delete" onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(account); }}>✕ Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="account-name">{account.name}</p>
      <p className={`account-balance ${balance >= 0 ? "pos" : "neg"}`}>
        {balance >= 0 ? "+" : ""}₹{balance.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────
function AddAccountForm({ onSave, onCancel }) {
  const [draft, setDraft] = useState({ name: "", icon: "🏦", color: "#6366f1", group: "cash" });
  const [error, setError] = useState("");

  return (
    <div className="card ledger-card" style={{ marginTop: 0 }}>
      <h2 className="card-title" style={{ marginBottom: 16 }}>New Account</h2>
      <div style={{
        background: "var(--surface-2)", border: `2px solid ${draft.color}`,
        borderRadius: "var(--radius-md)", padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
        boxShadow: `0 0 16px ${draft.color}22`,
      }}>
        <span style={{ fontSize: 26 }}>{draft.icon || "🏦"}</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{draft.name || "Account Name"}</p>
          <p style={{ fontSize: 11, color: draft.color, marginTop: 2 }}>
            {ACCOUNT_GROUPS.find(g => g.key === draft.group)?.label || "Group"}
          </p>
        </div>
        <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16, color: draft.color }}>₹0</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Account Name</label>
          <input className="input" placeholder="e.g. Bank Account" value={draft.name}
            onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setError(""); }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Group</label>
          <select className="input" value={draft.group} onChange={e => setDraft(d => ({ ...d, group: e.target.value }))}>
            {ACCOUNT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="input-label">Icon</label>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>tap to select</span>
          </div>
          <IconPicker value={draft.icon} onChange={icon => setDraft(d => ({ ...d, icon }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="input-label">Color</label>
          <input type="color" className="color-pick" value={draft.color}
            onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: "100%", height: 42 }} />
        </div>
        {error && <p className="cat-error">{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
            if (!draft.name.trim()) return setError("Account name cannot be empty.");
            onSave({ ...draft, name: draft.name.trim() });
          }}>Save Account</button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────
function EditAccountModal({ account, onSave, onClose }) {
  const [draft, setDraft] = useState({ name: account.name, icon: account.icon, color: account.color, group: account.group || "cash" });
  const [error, setError] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Account</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "var(--surface-2)", border: `2px solid ${draft.color}`,
            borderRadius: "var(--radius-md)", padding: "16px",
            display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 16px ${draft.color}33`,
          }}>
            <span style={{ fontSize: 28 }}>{draft.icon || "🏦"}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{draft.name || "Account Name"}</p>
              <p style={{ fontSize: 11, color: draft.color, marginTop: 2 }}>
                {ACCOUNT_GROUPS.find(g => g.key === draft.group)?.label || "Group"}
              </p>
            </div>
            <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16, color: draft.color }}>₹0</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Account Name</label>
            <input className="input" placeholder="e.g. Bank Account" value={draft.name}
              onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setError(""); }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Group</label>
            <select className="input" value={draft.group} onChange={e => setDraft(d => ({ ...d, group: e.target.value }))}>
              {ACCOUNT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="input-label">Icon</label>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>tap to select</span>
            </div>
            <IconPicker value={draft.icon} onChange={icon => setDraft(d => ({ ...d, icon }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="input-label">Color</label>
            <input type="color" className="color-pick" value={draft.color}
              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: "100%", height: 42 }} />
          </div>
          {error && <p className="cat-error">{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
              if (!draft.name.trim()) return setError("Account name cannot be empty.");
              onSave({ ...account, ...draft, name: draft.name.trim() });
            }}>Save Changes</button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────
function DeleteAccountModal({ account, linkedCount, onConfirmDelete, onReassignAndDelete, accounts, onClose }) {
  const [reassignTo, setReassignTo] = useState("");
  const otherAccounts = accounts.filter(a => a.id !== account.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--red)" }}>🗑 Delete Account</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{account.icon}</span>
            <div>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{account.name}</p>
              {linkedCount > 0 && (
                <p style={{ fontSize: 12, color: "var(--orange)", marginTop: 2 }}>
                  ⚠ {linkedCount} transaction{linkedCount !== 1 ? "s" : ""} linked
                </p>
              )}
            </div>
          </div>
          {linkedCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              This account has no transactions. It will be permanently deleted.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
                Choose what to do with the <strong style={{ color: "var(--text)" }}>{linkedCount} linked transaction{linkedCount !== 1 ? "s" : ""}</strong>:
              </p>
              {otherAccounts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="input-label">Reassign transactions to</label>
                  <select className="input" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                    <option value="">— select account —</option>
                    {otherAccounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {linkedCount > 0 && otherAccounts.length > 0 && (
              <button className="btn-primary" disabled={!reassignTo} style={{ opacity: reassignTo ? 1 : 0.45 }}
                onClick={() => reassignTo && onReassignAndDelete(reassignTo)}>
                Reassign & Delete
              </button>
            )}
            <button style={{
              background: "rgba(239,68,68,0.12)", color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)",
              padding: "11px 20px", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
            }} onClick={onConfirmDelete}>
              {linkedCount > 0 ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}` : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────
// Props:
//   accounts          - array of account objects
//   accountBalances   - { [accountId]: number }
//   entries           - all entries (for linked count calculation)
//   userId            - current user id
//   onAccountsChange  - (updatedAccounts) => void  (called after any mutation)
//   onEntriesChange   - (updatedEntries)  => void  (called when entries are reassigned/deleted)
//   onShowTransfer    - () => void
export default function Account({
  accounts,
  accountBalances,
  entries,
  userId,
  onAccountsChange,
  onEntriesChange,
  onShowTransfer,
}) {
  const [showAddAcc,      setShowAddAcc]      = useState(false);
  const [editingAccount,  setEditingAccount]  = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);

  const grandTotal = accounts.reduce((s, a) => s + (accountBalances[a.id] || 0), 0);

  // ── CRUD handlers ────────────────────────────────────────────
  const addAccount = async draft => {
    try {
      const created = await pb.collection("accounts").create({ ...draft, group: draft.group || "cash", userId });
      onAccountsChange([...accounts, created]);
      setShowAddAcc(false);
    } catch (err) { console.error("Failed to create account:", err); }
  };

  const handleSaveAccount = async updated => {
    try {
      const saved = await pb.collection("accounts").update(updated.id, {
        name: updated.name, icon: updated.icon, color: updated.color, group: updated.group || "cash",
      });
      onAccountsChange(accounts.map(a => a.id === saved.id ? saved : a));
      setEditingAccount(null);
    } catch (err) { console.error("Failed to update account:", err); }
  };

  const linkedEntryCount = accId => entries.filter(e => e.accountId === accId).length;

  const handleConfirmDeleteAccount = async accId => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").delete(e.id)));
    await pb.collection("accounts").delete(accId);
    onEntriesChange(entries.filter(e => e.accountId !== accId));
    onAccountsChange(accounts.filter(a => a.id !== accId));
    setDeletingAccount(null);
  };

  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").update(e.id, { accountId: reassignToId })));
    await pb.collection("accounts").delete(accId);
    onEntriesChange(entries.map(e => e.accountId === accId ? { ...e, accountId: reassignToId } : e));
    onAccountsChange(accounts.filter(a => a.id !== accId));
    setDeletingAccount(null);
  };

  return (
    <div className="page">
      {/* Modals */}
      {editingAccount && (
        <EditAccountModal account={editingAccount} onSave={handleSaveAccount} onClose={() => setEditingAccount(null)} />
      )}
      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          linkedCount={linkedEntryCount(deletingAccount.id)}
          accounts={accounts}
          onConfirmDelete={() => handleConfirmDeleteAccount(deletingAccount.id)}
          onReassignAndDelete={id => handleReassignAndDeleteAccount(deletingAccount.id, id)}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-sub">Manage your wallets, banks &amp; more</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-transfer" onClick={onShowTransfer}>↔ Transfer</button>
          <button className="btn-add-acc" onClick={() => setShowAddAcc(v => !v)}>+ Add Account</button>
        </div>
      </div>

      {/* Net Worth Banner */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--surface-2)", borderRadius: "var(--radius-md)",
        padding: "16px 20px", marginBottom: 20,
        border: "1px solid var(--border)",
      }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>Total net worth</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.7 }}>across all accounts</p>
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: grandTotal >= 0 ? "var(--green)" : "var(--red)" }}>
          {grandTotal >= 0 ? "+" : "−"}₹{Math.abs(grandTotal).toLocaleString()}
        </span>
      </div>

      {/* Add Account Form (inline, toggled) */}
      {showAddAcc && (
        <AddAccountForm onSave={addAccount} onCancel={() => setShowAddAcc(false)} />
      )}

      {/* Account Groups */}
      <div className="card">
        {accounts.length === 0 ? (
          <p className="empty-msg">No accounts yet. Add one to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ACCOUNT_GROUPS.map(grp => {
              const grpAccounts = accounts.filter(a => a.group === grp.key);
              if (grpAccounts.length === 0) return null;
              const grpTotal = grpAccounts.reduce((s, a) => s + (accountBalances[a.id] || 0), 0);
              return (
                <div key={grp.key} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: grp.bg + "99", borderBottom: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: grp.color }}>{grp.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {grpAccounts.length} account{grpAccounts.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: grpTotal >= 0 ? "var(--green)" : "var(--red)" }}>
                      {grpTotal >= 0 ? "+" : "−"}₹{Math.abs(grpTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="accounts-grid" style={{ padding: "10px" }}>
                    {grpAccounts.map(acc => (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        balance={accountBalances[acc.id] || 0}
                        isSelected={false}
                        onClick={() => {}}
                        onEdit={a => setEditingAccount(a)}
                        onDelete={a => setDeletingAccount(a)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
