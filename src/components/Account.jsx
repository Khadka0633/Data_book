import { useState, useEffect, useCallback } from "react";
import supabase from "../supabase";
import AccountDetailPage from "./Account/AccountDetailPage";
import AccountForm from "./Account/AccountForm";
import DeleteAccountModal from "./Account/DeleteAccountModal";
import { CURRENCIES, ACCOUNT_GROUPS, ACCOUNT_ICONS } from "./Constant/allConstant";
import useExchangeRates from "./Account/useExchangeRate";

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

// ─── Main Account Page ────────────────────────────────────────────
export default function Account({
  accounts,
  accountBalances,
  entries,
  userId,
  onAccountsChange,
  onEntriesChange,
  onShowTransfer,
}) {
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const { toNPR, format } = useExchangeRates();

  // ── Add account ─────────────────────────────────────────────────
  const addAccount = async (draft) => {
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
        group: draft.group || "cash",
        currency: draft.currency || "NPR",
        user_id: userId,
      })
      .select()
      .single();

    if (error) { console.error("Failed to create account:", error); return; }
    onAccountsChange([...accounts, data]);
    setShowAddAcc(false);
  };

  // ── Edit account ────────────────────────────────────────────────
  const handleSaveAccount = async (updated) => {
    const { data, error } = await supabase
      .from("accounts")
      .update({
        name: updated.name,
        icon: updated.icon,
        color: updated.color,
        group: updated.group || "cash",
        currency: updated.currency || "NPR",
      })
      .eq("id", updated.id)
      .select()
      .single();

    if (error) { console.error("Failed to update account:", error); return; }
    onAccountsChange(accounts.map((a) => (a.id === data.id ? data : a)));
    setEditingAccount(null);
    // If we were viewing this account's detail, update selectedAcc too
    if (selectedAcc?.id === data.id) setSelectedAcc(data);
  };

  // ── Delete account (with entries) ───────────────────────────────
  const handleConfirmDeleteAccount = async (accId) => {
    const { error } = await supabase.from("accounts").delete().eq("id", accId);
    if (error) { console.error("Failed to delete account:", error); return; }
    onEntriesChange(entries.filter((e) => e.account_id !== accId));
    onAccountsChange(accounts.filter((a) => a.id !== accId));
    setDeletingAccount(null);
  };

  // ── Reassign entries then delete ────────────────────────────────
  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const { error: reassignError } = await supabase
      .from("entries")
      .update({ account_id: reassignToId })
      .eq("account_id", accId);
    if (reassignError) { console.error("Failed to reassign entries:", reassignError); return; }

    const { error: deleteError } = await supabase.from("accounts").delete().eq("id", accId);
    if (deleteError) { console.error("Failed to delete account:", deleteError); return; }

    onEntriesChange(entries.map((e) => e.account_id === accId ? { ...e, account_id: reassignToId } : e));
    onAccountsChange(accounts.filter((a) => a.id !== accId));
    setDeletingAccount(null);
  };

  const linkedEntryCount = (accId) => entries.filter((e) => e.account_id === accId).length;

  // ── Sub-page routing ────────────────────────────────────────────
  if (selectedAcc) {
    return (
      <AccountDetailPage
        account={selectedAcc}
        entries={entries}
        userId={userId}
        toNPR={toNPR}
        format={format}
        accounts={accounts}
        onBack={() => setSelectedAcc(null)}
        onEntriesChange={onEntriesChange}
        onAccountsChange={onAccountsChange}
        // Pass edit/delete handlers into the detail page
        onEditAccount={(acc) => setEditingAccount(acc)}
        onDeleteAccount={(acc) => setDeletingAccount(acc)}
      />
    );
  }

  if (showAddAcc) {
    return (
      <div className="page" style={{ padding: 16, gap: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)",
        }}>
          <button
            onClick={() => setShowAddAcc(false)}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            ‹ Back
          </button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            New Account
          </h2>
        </div>
        <AccountForm
          onSave={addAccount}
          onCancel={() => setShowAddAcc(false)}
          title="Save Account"
        />
      </div>
    );
  }

  if (editingAccount) {
    return (
      <div className="page" style={{ padding: 16, gap: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)",
        }}>
          <button
            onClick={() => setEditingAccount(null)}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            ‹ Back
          </button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            Edit Account
          </h2>
        </div>
        <AccountForm
          initial={{
            name: editingAccount.name,
            icon: editingAccount.icon,
            color: editingAccount.color,
            group: editingAccount.group || "cash",
            currency: editingAccount.currency || "NPR",
          }}
          onSave={(draft) => handleSaveAccount({ ...editingAccount, ...draft })}
          onCancel={() => setEditingAccount(null)}
          title="Save Changes"
        />
      </div>
    );
  }

  // ── Main list view ──────────────────────────────────────────────
  return (
    <div className="page" style={{ padding: 16, gap: 0 }}>

      {/* Delete modal */}
      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          linkedCount={linkedEntryCount(deletingAccount.id)}
          accounts={accounts}
          onConfirmDelete={() => handleConfirmDeleteAccount(deletingAccount.id)}
          onReassignAndDelete={(id) => handleReassignAndDeleteAccount(deletingAccount.id, id)}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 14, gap: 8,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
            color: "var(--text)", letterSpacing: -0.5,
          }}>
            Accounts
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowAddAcc(true)}
          style={{
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: "var(--radius-sm)", padding: "6px 14px",
            fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", marginTop: 4,
          }}
        >
          + Add
        </button>
      </div>

      {/* Assets / Liabilities / Net Worth bar */}
      {(() => {
        const assets = accounts
          .filter((a) => a.group !== "loan")
          .reduce((s, a) => s + toNPR(Math.max(accountBalances[a.id] || 0, 0), a.currency || "NPR"), 0);

        const liabilities = accounts
          .filter((a) => a.group === "loan")
          .reduce((s, a) => s + toNPR(Math.abs(Math.min(accountBalances[a.id] || 0, 0)), a.currency || "NPR"), 0);

        const net = assets - liabilities;

        return (
          <div style={{
            display: "flex", gap: 0, marginBottom: 16,
            background: "var(--surface)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            {[
              { label: "Assets",      value: assets,      color: "var(--green)" },
              { label: "Liabilities", value: liabilities, color: "var(--red)" },
              { label: "Net Total",   value: net,         color: net >= 0 ? "var(--green)" : "var(--red)" },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: "12px 8px", textAlign: "center",
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
              }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: s.color }}>
                  रु{Math.abs(s.value).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Account list grouped by type */}
      {accounts.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>
          No accounts yet. Tap + to add one.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ACCOUNT_GROUPS.map((grp) => {
            const grpAccounts = accounts.filter((a) => a.group === grp.key);
            if (!grpAccounts.length) return null;

            const grpTotalNPR = grpAccounts.reduce(
              (s, a) => s + toNPR(accountBalances[a.id] || 0, a.currency || "NPR"),
              0,
            );

            return (
              <div key={grp.key} style={{ marginBottom: 4 }}>
                {/* Group header — matches expense tracker day header style */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0 4px", borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: grp.color }}>
                    {grp.label}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: grpTotalNPR >= 0 ? "var(--green)" : "var(--red)",
                  }}>
                    रु{Math.abs(grpTotalNPR).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Account rows — flat ledger style, no buttons */}
                {grpAccounts.map((acc) => {
                  const bal = accountBalances[acc.id] || 0;
                  const currency = acc.currency || "NPR";
                  const currMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.NPR;
                  const balNPR = toNPR(bal, currency);

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAcc(acc)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 0", borderBottom: "1px solid var(--border)",
                        cursor: "pointer", transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Left — name + optional currency pill */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 500, color: "var(--text)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {acc.name}
                          </p>
                          {currency !== "NPR" && (
                            <div style={{ marginTop: 3 }}>
                              <span style={{
                                fontSize: 10,
                                background: "rgba(99,102,241,0.08)", color: "var(--accent)",
                                border: "1px solid rgba(99,102,241,0.2)",
                                borderRadius: 99, padding: "1px 7px", fontWeight: 600,
                              }}>
                                {currMeta.flag} {currency}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right — balance */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 700,
                          color: bal >= 0 ? "var(--green)" : "var(--red)",
                        }}>
                          {currMeta.flag}{Math.abs(bal).toLocaleString()}
                        </p>
                        {currency !== "NPR" && (
                          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                            ≈ रु{Math.abs(balNPR).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
