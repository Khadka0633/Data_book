import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import pb from "../pb";
import Transfermodal from "./Transfermodal";

// ─── Account Groups ───────────────────────────────────────────────
const ACCOUNT_GROUPS = [
  { key: "savings",    label: "Savings",     color: "#5fc20e", bg: "#190749" },
  { key: "cash",       label: "Cash",        color: "#bd6f10", bg: "#190749" },
  { key: "investment", label: "Investments", color: "#534AB7", bg: "#190749" },
  { key: "loan",       label: "Loans",       color: "#A32D2D", bg: "#190749" },
  { key: "bank",       label: "Bank",        color: "#0ab97f", bg: "#190749" },
  { key: "wallet",     label: "Digital_Wallet", color: "#ac9330", bg: "#190749" },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food",      color: "#f97316" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Health",    color: "#22c55e" },
  { name: "Rent",      color: "#f43f5e" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary",     color: "#22c55e" },
  { name: "Freelance",  color: "#10b981" },
  { name: "Investment", color: "#6366f1" },
];

const DEFAULT_ACCOUNTS = [
  { name: "Cash",   icon: "💵", color: "#22c55e", group: "cash" },
  { name: "eSewa",  icon: "📱", color: "#6366f1", group: "cash" },
  { name: "Khalti", icon: "💜", color: "#a855f7", group: "cash" },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── UPGRADED: Category History Modal ────────────────────────────
function CategoryHistoryModal({ category, type, entries, accounts, getCatColor, onClose }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const catEntries = entries
    .filter(e => e.category === category && e.type === type && !e.isTransfer)
    .sort((a, b) => b.date.localeCompare(a.date));

  const total  = catEntries.reduce((s, e) => s + e.amount, 0);
  const avg    = catEntries.length ? total / catEntries.length : 0;
  const color  = getCatColor(category, type);

  // ── Build last-12-months data (always show 12 bars, even if 0) ──
  const monthData = useMemo(() => {
    const now    = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months.push({ key, lbl, total: 0, count: 0 });
    }
    catEntries.forEach(e => {
      const key = e.date.slice(0, 7);
      const slot = months.find(m => m.key === key);
      if (slot) { slot.total += e.amount; slot.count += 1; }
    });
    return months;
  }, [catEntries]);

  const maxVal    = Math.max(...monthData.map(m => m.total), 1);
  const hasData   = monthData.some(m => m.total > 0);
  const peakMonth = monthData.reduce((a, b) => b.total > a.total ? b : a, monthData[0]);

  // ── Draw Chart.js bar chart ──
  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const rgb = hexToRgb(color.length === 7 ? color : "#6366f1");
    const barColor  = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
    const barHover  = `rgba(${rgb.r},${rgb.g},${rgb.b},1)`;
    const zeroColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;

    const initChart = () => {
      if (!window.Chart || !canvasRef.current) return;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: monthData.map(m => m.lbl),
          datasets: [{
            label: category,
            data: monthData.map(m => m.total),
            backgroundColor: monthData.map(m => m.total > 0 ? barColor : zeroColor),
            hoverBackgroundColor: monthData.map(m => m.total > 0 ? barHover : zeroColor),
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const slot = monthData[ctx.dataIndex];
                  if (slot.total === 0) return "No transactions";
                  return [`₹${slot.total.toLocaleString()}`, `${slot.count} transaction${slot.count !== 1 ? "s" : ""}`];
                },
              },
              backgroundColor: "#1e1e2e",
              titleColor: "#fff",
              bodyColor: "#ccc",
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 }, color: "#888", maxRotation: 45, autoSkip: false },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(128,128,128,0.1)" },
              border: { display: false, dash: [4, 4] },
              ticks: {
                font: { size: 11 },
                color: "#888",
                callback: v => v === 0 ? "0" : `₹${(v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)}`,
                maxTicksLimit: 5,
              },
            },
          },
          animation: { duration: 400 },
        },
      });
    };

    if (window.Chart) {
      initChart();
    } else {
      const interval = setInterval(() => {
        if (window.Chart) { clearInterval(interval); initChart(); }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [monthData, color, category, hasData]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: 520, width: "100%" }}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 12, height: 12, borderRadius: "50%",
              background: color, flexShrink: 0, display: "inline-block",
            }} />
            <h3 className="modal-title" style={{ marginBottom: 0 }}>{category}</h3>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: type === "expense" ? "var(--red)" : "var(--green)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {type}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {catEntries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0" }}>
            No transactions found for this category.
          </p>
        ) : (
          <>
            {/* ── Summary stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "All-time total",  value: `₹${total.toLocaleString()}` },
                { label: "Transactions",    value: catEntries.length },
                { label: "Avg per entry",   value: `₹${Math.round(avg).toLocaleString()}` },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--surface-2)", borderRadius: "var(--radius-md)",
                  padding: "10px 12px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ── Peak month callout ── */}
            {peakMonth && peakMonth.total > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: color + "14",
                border: `1px solid ${color}33`,
                borderRadius: "var(--radius-md)",
                padding: "9px 14px", marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Peak month</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {peakMonth.lbl} — ₹{peakMonth.total.toLocaleString()}
                </span>
              </div>
            )}

            {/* ── Chart.js bar chart ── */}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600 }}>
              Last 12 months
            </p>
            <div style={{ position: "relative", width: "100%", height: 200, marginBottom: 24 }}>
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Monthly spending for ${category} over last 12 months`}
              />
              {!hasData && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No data in the last 12 months</span>
                </div>
              )}
            </div>

            {/* ── Month-by-month breakdown table ── */}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
              Month-by-month
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {[...monthData].reverse().filter(m => m.total > 0).map((m) => {
                const pct = Math.round((m.total / maxVal) * 100);
                return (
                  <div key={m.key} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 56, flexShrink: 0 }}>{m.lbl}</span>
                    <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, opacity: 0.8 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text)", width: 80, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>
                      ₹{m.total.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right", flexShrink: 0 }}>
                      ×{m.count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Recent transactions ── */}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
              Recent transactions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {catEntries.slice(0, 20).map(e => {
                const acc = accounts.find(a => a.id === e.accountId);
                return (
                  <div key={e.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <div>
                      <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                        {e.note || e.category}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        {acc && (
                          <span style={{
                            fontSize: 10, padding: "1px 6px", borderRadius: 99,
                            background: acc.color + "22", color: acc.color,
                          }}>
                            {acc.icon} {acc.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: type === "expense" ? "var(--red)" : "var(--green)",
                    }}>
                      {type === "income" ? "+" : "−"}₹{e.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {catEntries.length > 20 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>
                  + {catEntries.length - 20} more transactions
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Load Chart.js from CDN once ── */}
      <ChartJsLoader />
    </div>
  );
}

// ── Lazy CDN loader — mounts a <script> tag once, resolves when window.Chart is ready ──
function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  return null;
}

// ─── Auto-suggest Hook ───────────────────────────────────────────
function useNoteSuggestions(entries, form) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const query = form.note.trim().toLowerCase();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const seen = new Set();
    const matches = entries
      .filter(e =>
        e.type === form.type &&
        (!form.category || e.category === form.category) &&
        e.note &&
        e.note.toLowerCase().includes(query) &&
        !seen.has(e.note) &&
        seen.add(e.note)
      )
      .slice(0, 5)
      .map(e => e.note);

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.note, form.type, form.category, entries]);

  return { suggestions, showSuggestions, setShowSuggestions };
}

// ─── Pie Chart ────────────────────────────────────────────────────
function PieChart({ data, label = "TOTAL", onSliceClick }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="pie-empty"><span>No data yet</span></div>;

  let cumAngle = -90;
  const radius = 80, cx = 100, cy = 100;
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const angle = pct * 360;
    const sa = (cumAngle * Math.PI) / 180;
    const ea = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(sa), y1 = cy + radius * Math.sin(sa);
    const x2 = cx + radius * Math.cos(ea), y2 = cy + radius * Math.sin(ea);
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
    cumAngle += angle;
    return { ...d, path, pct };
  });

  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            opacity="0.9"
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}
          >
            <title>{s.label}: ₹{s.value.toFixed(2)} ({(s.pct * 100).toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="var(--surface)" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
          ₹{total.toFixed(0)}
        </text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div
            key={i}
            className="legend-item"
            onClick={() => onSliceClick && onSliceClick(s.label)}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}
          >
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">₹{s.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────
function AccountCard({ account, balance, onClick, isSelected, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
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
            <button className="acc-menu-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}>⋯</button>
            {menuOpen && (
              <div className="acc-dropdown">
                <button className="acc-dropdown-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(account); }}>✎ Edit</button>
                <button className="acc-dropdown-item acc-dropdown-delete" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(account); }}>✕ Delete</button>
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

// ─── Account Groups Component ─────────────────────────────────────
function AccountGroups({ accounts, accountBalances, selectedAcc, setSelectedAcc, onEdit, onDelete, onShowAddAcc, onShowTransfer }) {
  const grandTotal = accounts.reduce((s, a) => s + (accountBalances[a.id] || 0), 0);

  return (
    <div className="card">
      <div className="card-header-row">
        <h2 className="card-title">Accounts</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {selectedAcc && (
            <button className="filter-chip active" onClick={() => setSelectedAcc(null)}>Clear Filter</button>
          )}
          <button className="btn-transfer" onClick={onShowTransfer}>↔ Transfer</button>
          <button className="btn-add-acc" onClick={onShowAddAcc}>+ Add Account</button>
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--surface-2)", borderRadius: "var(--radius-md)",
        padding: "12px 16px", marginBottom: 20,
      }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Total net worth</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.7 }}>across all accounts</p>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: grandTotal >= 0 ? "var(--green)" : "var(--red)" }}>
          {grandTotal >= 0 ? "+" : "−"}₹{Math.abs(grandTotal).toLocaleString()}
        </span>
      </div>

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
                    isSelected={selectedAcc === acc.id}
                    onClick={() => setSelectedAcc(selectedAcc === acc.id ? null : acc.id)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        <button
          key={icon}
          onClick={() => onChange(icon)}
          style={{
            fontSize: 20, padding: "6px", borderRadius: "var(--radius-sm)",
            border: value === icon ? "2px solid var(--accent)" : "2px solid transparent",
            background: value === icon ? "var(--accent)22" : "transparent",
            cursor: "pointer", lineHeight: 1, transition: "all 0.15s",
          }}
          title={icon}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────
function AddAccountForm({ onSave, onCancel }) {
  const [draft, setDraft] = useState({ name: "", icon: "🏦", color: "#6366f1", group: "cash" });
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!draft.name.trim()) return setError("Account name cannot be empty.");
    if (!draft.group) return setError("Please select a group.");
    onSave({ ...draft, name: draft.name.trim(), group: draft.group || "cash" });
  };

  return (
    <div className="card ledger-card">
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
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Account</button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────
function EditAccountModal({ account, onSave, onClose }) {
  const [draft, setDraft] = useState({
    name: account.name, icon: account.icon, color: account.color, group: account.group || "cash",
  });
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!draft.name.trim()) return setError("Account name cannot be empty.");
    onSave({ ...account, ...draft, name: draft.name.trim() });
  };

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
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Changes</button>
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
              <button className="btn-primary" disabled={!reassignTo}
                style={{ opacity: reassignTo ? 1 : 0.45 }}
                onClick={() => reassignTo && onReassignAndDelete(reassignTo)}>
                Reassign & Delete
              </button>
            )}
            <button
              style={{
                background: "rgba(239,68,68,0.12)", color: "var(--red)",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)",
                padding: "11px 20px", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
              }}
              onClick={onConfirmDelete}
            >
              {linkedCount > 0 ? `Delete Account + ${linkedCount} Transaction${linkedCount !== 1 ? "s" : ""}` : "Delete Account"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Manager Modal ───────────────────────────────────────
function CategoryManager({ type, categories, onAdd, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(type === "expense" ? "#f97316" : "#22c55e");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return setError("Please enter a category name.");
    if (categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())) return setError("This category already exists.");
    onAdd({ name: trimmed, color: newColor });
    setNewName("");
    setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{type === "expense" ? "❤️ Expense" : "💚 Income"} Categories</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cat-add-row">
          <input className="input" placeholder="New category name..." value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} style={{ flex: 1 }} />
          <input type="color" className="color-pick" value={newColor} onChange={e => setNewColor(e.target.value)} />
          <button className="btn-primary" onClick={handleAdd} style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>+ Add</button>
        </div>
        {error && <p className="cat-error">{error}</p>}
        <div className="cat-list">
          {categories.map((c, i) => (
            <div key={i} className="cat-item">
              <span className="cat-dot" style={{ background: c.color }} />
              <span className="cat-name">{c.name}</span>
              {categories.length > 1 && (
                <button className="cat-del-btn" onClick={() => onDelete(c.name)}>✕</button>
              )}
            </div>
          ))}
        </div>
        <p className="cat-hint">💡 Click outside to close.</p>
      </div>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading your data...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ExpenseTracker({ userId }) {
  const today = new Date().toISOString().split("T")[0];

  const [loading, setLoading]   = useState(true);
  const [entries, setEntries]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expCats, setExpCats]   = useState([]);
  const [incCats, setIncCats]   = useState([]);

  const [form, setForm] = useState({
    type: "expense", amount: "", category: "",
    note: "", date: today, accountId: "",
  });

  const [filterDate, setFilterDate]           = useState(today);
  const [confirmId, setConfirmId]             = useState(null);
  const [selectedAcc, setSelectedAcc]         = useState(null);
  const [showAddAcc, setShowAddAcc]           = useState(false);
  const [editEntry, setEditEntry]             = useState(null);
  const [catModal, setCatModal]               = useState(null);
  const [editingAccount, setEditingAccount]   = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [showTransfer, setShowTransfer]       = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [chartMonth, setChartMonth]           = useState(today.slice(0, 7));

  // ─── Category history state ──────────────────────────────────
  const [catHistory, setCatHistory] = useState(null);

  const hasLoaded = useRef(false);

  // ─── Auto-suggest hook ────────────────────────────────────────
  const { suggestions, showSuggestions, setShowSuggestions } = useNoteSuggestions(entries, form);

  // ─── Load data ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    setLoading(true);
    try {
      const [entriesRes, accountsRes, expCatsRes, incCatsRes] = await Promise.all([
        pb.collection("entries").getFullList({ filter: `userId = '${userId}'`, sort: "-date" }),
        pb.collection("accounts").getFullList({ filter: `userId = '${userId}'` }),
        pb.collection("expense_categories").getFullList({ filter: `userId = '${userId}'` }),
        pb.collection("income_categories").getFullList({ filter: `userId = '${userId}'` }),
      ]);
      setEntries(entriesRes);
      const normalizedAccounts = accountsRes.map(acc => ({ ...acc, group: acc.group || "cash" }));
      setAccounts(normalizedAccounts);
      setForm(f => ({ ...f, accountId: f.accountId || accountsRes[0]?.id || "" }));
      setExpCats(expCatsRes);
      setIncCats(incCatsRes);
    } catch (err) {
      console.error("Failed to load data:", err);
      hasLoaded.current = false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Helpers ──────────────────────────────────────────────────
  const currentCats = form.type === "expense" ? expCats : incCats;

  const getCatColor = (category, type) => {
    const list = type === "expense" ? expCats : incCats;
    return list.find(c => c.name === category)?.color || "#94a3b8";
  };

  const handleAddCat = async (type, cat) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const created = await pb.collection(collection).create({ ...cat, userId });
    if (type === "expense") setExpCats(prev => [...prev, created]);
    else setIncCats(prev => [...prev, created]);
  };

  const handleDeleteCat = async (type, name) => {
    const collection = type === "expense" ? "expense_categories" : "income_categories";
    const list = type === "expense" ? expCats : incCats;
    const record = list.find(c => c.name === name);
    if (!record) return;
    await pb.collection(collection).delete(record.id);
    if (type === "expense") setExpCats(prev => prev.filter(c => c.name !== name));
    else setIncCats(prev => prev.filter(c => c.name !== name));
  };

  const handleTypeChange = (t) => {
    const cats = t === "expense" ? expCats : incCats;
    setForm(f => ({ ...f, type: t, category: cats[0]?.name || "" }));
  };

  // ─── Balances ─────────────────────────────────────────────────
  const accountBalances = useMemo(() => {
    const map = {};
    accounts.forEach(a => { map[a.id] = 0; });
    entries.forEach(e => {
      if (!map.hasOwnProperty(e.accountId)) return;
      map[e.accountId] += e.type === "income" ? e.amount : -e.amount;
    });
    return map;
  }, [entries, accounts]);

  const totalIncome  = entries.filter(e => e.type === "income" && !e.isTransfer).reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense" && !e.isTransfer).reduce((s, e) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;

  // ─── Pie data (monthly) ──────────────────────────────────────
  const expensePieData = useMemo(() => {
    const map = {};
    entries.filter(e =>
      e.type === "expense" && !e.isTransfer &&
      e.date.slice(0, 7) === chartMonth &&
      (!selectedAcc || e.accountId === selectedAcc)
    ).forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return expCats.filter(c => c.name !== "Transfer").map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color })).filter(d => d.value > 0);
  }, [entries, selectedAcc, expCats, chartMonth]);

  const incomePieData = useMemo(() => {
    const map = {};
    entries.filter(e =>
      e.type === "income" && !e.isTransfer &&
      e.date.slice(0, 7) === chartMonth &&
      (!selectedAcc || e.accountId === selectedAcc)
    ).forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return incCats.filter(c => c.name !== "Transfer").map(c => ({ label: c.name, value: map[c.name] || 0, color: c.color })).filter(d => d.value > 0);
  }, [entries, selectedAcc, incCats, chartMonth]);

  // ─── Ledger (monthly, grouped by date) ──────────────────────
  const ledgerMonth = filterDate.slice(0, 7);

  const monthlyGrouped = useMemo(() => {
    const filtered = entries.filter(e =>
      e.date.slice(0, 7) === ledgerMonth && (!selectedAcc || e.accountId === selectedAcc)
    );
    const groups = {};
    filtered.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({ date, entries: groups[date] }));
  }, [entries, ledgerMonth, selectedAcc]);

  // ─── CRUD: Entries ────────────────────────────────────────────
  const addEntry = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    setSaving(true);
    try {
      if (editEntry) {
        const updated = await pb.collection("entries").update(editEntry, {
          type: form.type, amount: +form.amount, category: form.category,
          note: form.note, date: form.date, accountId: form.accountId, userId,
        });
        setEntries(prev => prev.map(e => e.id === editEntry ? updated : e));
        setEditEntry(null);
      } else {
        const created = await pb.collection("entries").create({
          type: form.type, amount: +form.amount, category: form.category,
          note: form.note, date: form.date, accountId: form.accountId, userId,
          isTransfer: false,
        });
        setEntries(prev => [created, ...prev]);
      }
      setForm(f => ({ ...f, amount: "", note: "" }));
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditEntry(e.id);
    setForm({ type: e.type, amount: String(e.amount), category: e.category, note: e.note, date: e.date, accountId: e.accountId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditEntry(null);
    setForm({ type: "expense", amount: "", category: expCats[0]?.name || "", note: "", date: today, accountId: accounts[0]?.id || "" });
  };

  const handleDelete = async (id) => {
    if (confirmId === id) {
      const entry = entries.find(e => e.id === id);
      if (entry?.isTransfer) {
        const paired = entries.find(e =>
          e.id !== id && e.isTransfer && e.amount === entry.amount &&
          e.date === entry.date && e.type !== entry.type
        );
        await pb.collection("entries").delete(id);
        if (paired) await pb.collection("entries").delete(paired.id);
        setEntries(prev => prev.filter(e => e.id !== id && e.id !== paired?.id));
      } else {
        await pb.collection("entries").delete(id);
        setEntries(prev => prev.filter(e => e.id !== id));
      }
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  const handleTransferDone = (newEntries) => {
    setEntries(prev => [...newEntries, ...prev]);
  };

  // ─── CRUD: Accounts ───────────────────────────────────────────
  const addAccount = async (draft) => {
    try {
      const payload = { ...draft, group: draft.group || "cash", userId };
      const created = await pb.collection("accounts").create(payload);
      setAccounts(prev => [...prev, created]);
      setShowAddAcc(false);
      setForm(f => ({ ...f, accountId: f.accountId || created.id }));
    } catch (err) {
      console.error("Failed to create account:", err);
    }
  };

  const handleSaveAccount = async (updated) => {
    try {
      const payload = { name: updated.name, icon: updated.icon, color: updated.color, group: updated.group || "cash" };
      const saved = await pb.collection("accounts").update(updated.id, payload);
      setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a));
      setEditingAccount(null);
    } catch (err) {
      console.error("Failed to update account:", err);
    }
  };

  const linkedEntryCount = (accId) => entries.filter(e => e.accountId === accId).length;

  const handleConfirmDeleteAccount = async (accId) => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").delete(e.id)));
    await pb.collection("accounts").delete(accId);
    setEntries(prev => prev.filter(e => e.accountId !== accId));
    setAccounts(prev => prev.filter(a => a.id !== accId));
    if (selectedAcc === accId) setSelectedAcc(null);
    setDeletingAccount(null);
  };

  const handleReassignAndDeleteAccount = async (accId, reassignToId) => {
    const linked = entries.filter(e => e.accountId === accId);
    await Promise.all(linked.map(e => pb.collection("entries").update(e.id, { accountId: reassignToId })));
    await pb.collection("accounts").delete(accId);
    setEntries(prev => prev.map(e => e.accountId === accId ? { ...e, accountId: reassignToId } : e));
    setAccounts(prev => prev.filter(a => a.id !== accId));
    if (selectedAcc === accId) setSelectedAcc(null);
    setDeletingAccount(null);
  };

  if (loading) return <LoadingScreen />;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="page">

      {catModal && (
        <CategoryManager
          type={catModal}
          categories={catModal === "expense" ? expCats : incCats}
          onAdd={(cat) => handleAddCat(catModal, cat)}
          onDelete={(name) => handleDeleteCat(catModal, name)}
          onClose={() => setCatModal(null)}
        />
      )}
      {editingAccount && (
        <EditAccountModal account={editingAccount} onSave={handleSaveAccount} onClose={() => setEditingAccount(null)} />
      )}
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
      {showTransfer && (
        <TransferModal
          accounts={accounts}
          userId={userId}
          today={today}
          onTransferDone={handleTransferDone}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {/* ── Category History Modal ── */}
      {catHistory && (
        <CategoryHistoryModal
          category={catHistory.category}
          type={catHistory.type}
          entries={entries}
          accounts={accounts}
          getCatColor={getCatColor}
          onClose={() => setCatHistory(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Tracker</h1>
          <p className="page-sub">Monitor income, expenses & accounts</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-transfer" onClick={() => setShowTransfer(true)}>↔ Transfer</button>
          <div className="date-badge">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card income-card">
          <div className="stat-icon">↑</div>
          <div><p className="stat-label">Total Income</p><p className="stat-value">₹{totalIncome.toLocaleString()}</p></div>
        </div>
        <div className="stat-card expense-card">
          <div className="stat-icon">↓</div>
          <div><p className="stat-label">Total Expenses</p><p className="stat-value">₹{totalExpense.toLocaleString()}</p></div>
        </div>
        <div className={`stat-card ${balance >= 0 ? "balance-pos" : "balance-neg"}`}>
          <div className="stat-icon">◈</div>
          <div><p className="stat-label">Net Balance</p><p className="stat-value">₹{balance.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Accounts grouped */}
      <AccountGroups
        accounts={accounts}
        accountBalances={accountBalances}
        selectedAcc={selectedAcc}
        setSelectedAcc={setSelectedAcc}
        onEdit={(a) => setEditingAccount(a)}
        onDelete={(a) => setDeletingAccount(a)}
        onShowAddAcc={() => setShowAddAcc(v => !v)}
        onShowTransfer={() => setShowTransfer(true)}
      />

      {showAddAcc && (
        <AddAccountForm onSave={addAccount} onCancel={() => setShowAddAcc(false)} />
      )}

      {/* Add / Edit + Charts */}
      <div className="two-col">
        <div className="card">
          <h2 className="card-title">{editEntry ? "✏️ Edit Transaction" : "Add Transaction"}</h2>
          <div className="form-group">
            <div className="type-toggle">
              {["expense", "income"].map(t => (
                <button key={t} onClick={() => handleTypeChange(t)} className={`toggle-btn ${form.type === t ? "active-" + t : ""}`}>
                  {t === "expense" ? "− Expense" : "+ Income"}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Amount" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} className="input" />
            <div className="cat-select-row">
              <select key={form.type} value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="input" style={{ flex: 1, minWidth: 0 }}>
                {currentCats.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
              <button className="btn-manage-cats" onClick={() => setCatModal(form.type)}>⚙ Manage</button>
            </div>
            <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="input">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>

            {/* ── Note input with auto-suggest ── */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Note (optional)"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="input"
              />
              {showSuggestions && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginTop: 4,
                }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => {
                        setForm(f => ({ ...f, note: s }));
                        setShowSuggestions(false);
                      }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "9px 14px", fontSize: 13, color: "var(--text)",
                        background: "transparent", border: "none", cursor: "pointer",
                        borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addEntry} className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? "Saving..." : editEntry ? "Save Changes" : "Add Transaction"}
              </button>
              {editEntry && <button onClick={cancelEdit} className="btn-cancel">Cancel</button>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing breakdown for</span>
            <input type="month" value={chartMonth} onChange={e => setChartMonth(e.target.value)}
              className="input compact" style={{ width: "auto" }} />
          </div>

          {/* ── Income chart — slices clickable ── */}
          <div className="card">
            <div className="card-header-row" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ color: "var(--green)", marginBottom: 0 }}>💚 Income Breakdown</h2>
              <button className="btn-manage-cats" onClick={() => setCatModal("income")}>⚙ Manage</button>
            </div>
            <PieChart
              data={incomePieData}
              label="INCOME"
              onSliceClick={(label) => setCatHistory({ category: label, type: "income" })}
            />
          </div>

          {/* ── Expense chart — slices clickable ── */}
          <div className="card">
            <div className="card-header-row" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ color: "var(--red)", marginBottom: 0 }}>❤️ Expense Breakdown</h2>
              <button className="btn-manage-cats" onClick={() => setCatModal("expense")}>⚙ Manage</button>
            </div>
            <PieChart
              data={expensePieData}
              label="EXPENSES"
              onSliceClick={(label) => setCatHistory({ category: label, type: "expense" })}
            />
          </div>
        </div>
      </div>

      {/* Monthly Ledger */}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">
            Monthly Ledger
            {selectedAcc && (
              <span className="breakdown-acc-tag">{accounts.find(a => a.id === selectedAcc)?.name}</span>
            )}
          </h2>
          <input type="month" value={ledgerMonth}
            onChange={e => setFilterDate(e.target.value + "-01")}
            className="input compact" style={{ width: "auto" }} />
        </div>

        {monthlyGrouped.length === 0 ? (
          <p className="empty-msg">No transactions for this month{selectedAcc ? " in this account" : ""}.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {monthlyGrouped.map(({ date, entries: dayEntries }) => {
              const d = new Date(date + "T00:00:00");
              const dayName   = d.toLocaleDateString("en-US", { weekday: "long" });
              const dayNum    = d.getDate();
              const monthName = d.toLocaleDateString("en-US", { month: "short" });
              const dayIncome  = dayEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
              const dayExpense = dayEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
              return (
                <div key={date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 4px 8px", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{dayNum}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{dayName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{monthName}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                      {dayIncome > 0 && <span style={{ color: "var(--green)" }}>+₹{dayIncome.toLocaleString()}</span>}
                      {dayExpense > 0 && <span style={{ color: "var(--red)" }}>−₹{dayExpense.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="entry-list" style={{ paddingBottom: 8 }}>
                    {dayEntries.map(e => {
                      const acc = accounts.find(a => a.id === e.accountId);
                      return (
                        <div key={e.id} className={`entry-row ${e.type} ${e.isTransfer ? "transfer-row" : ""}`}>
                          <div className="entry-left">
                            {e.isTransfer
                              ? <span className="transfer-badge">↔</span>
                              : <span className="entry-cat-dot" style={{ background: getCatColor(e.category, e.type) }} />
                            }
                            <div>
                              <p className="entry-note">
                                {e.note || e.category}
                                {e.isTransfer && <span className="transfer-tag">Transfer</span>}
                              </p>
                              <p className="entry-meta">
                                {/* ── Click category name to open history ── */}
                                <span
                                  onClick={() => !e.isTransfer && setCatHistory({ category: e.category, type: e.type })}
                                  style={{ cursor: e.isTransfer ? "default" : "pointer", textDecoration: e.isTransfer ? "none" : "underline dotted" }}
                                >
                                  {e.category}
                                </span>
                                {acc && (
                                  <span className="entry-acc-tag" style={{ background: acc.color + "22", color: acc.color }}>
                                    {acc.icon} {acc.name}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="entry-right">
                            <span className={`entry-amount ${e.type}`}>{e.type === "income" ? "+" : "−"}₹{e.amount}</span>
                            {!e.isTransfer && <button onClick={() => startEdit(e)} className="edit-btn" title="Edit">✎</button>}
                            <button
                              onClick={() => handleDelete(e.id)}
                              className={`del-btn ${confirmId === e.id ? "del-btn-confirm" : ""}`}
                              title={confirmId === e.id ? (e.isTransfer ? "Click again — will delete both legs" : "Click again to confirm") : "Delete"}
                            >
                              {confirmId === e.id ? "?" : "✕"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
