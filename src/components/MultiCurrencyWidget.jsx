import { useState, useEffect, useCallback, useRef } from "react";

// ── Config ─────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_EXCHANGE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;
const CACHE_TTL = 3_600_000; // 1 hour

const DEFAULT_CURRENCIES = [
  "NPR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "JPY",
  "AUD",
  "HKD",
];

const CURRENCY_META = {
  NPR: { flag: "🇳🇵", name: "Nepali Rupee" },
  USD: { flag: "🇺🇸", name: "US Dollar" },
  EUR: { flag: "🇪🇺", name: "Euro" },
  GBP: { flag: "🇬🇧", name: "British Pound" },
  INR: { flag: "🇮🇳", name: "Indian Rupee" },
  CNY: { flag: "🇨🇳", name: "Chinese Yuan" },
  AED: { flag: "🇦🇪", name: "UAE Dirham" },
  JPY: { flag: "🇯🇵", name: "Japanese Yen" },
  AUD: { flag: "🇦🇺", name: "Australian Dollar" },
  SGD: { flag: "🇸🇬", name: "Singapore Dollar" },
  CAD: { flag: "🇨🇦", name: "Canadian Dollar" },
  CHF: { flag: "🇨🇭", name: "Swiss Franc" },
  KRW: { flag: "🇰🇷", name: "South Korean Won" },
  SAR: { flag: "🇸🇦", name: "Saudi Riyal" },
  QAR: { flag: "🇶🇦", name: "Qatari Riyal" },
  MYR: { flag: "🇲🇾", name: "Malaysian Ringgit" },
  THB: { flag: "🇹🇭", name: "Thai Baht" },
  HKD: { flag: "🇭🇰", name: "Hong Kong Dollar" },
};

const ALL_CURRENCIES = Object.keys(CURRENCY_META);

// ── In-memory rate cache ───────────────────────────────────────────
const ratesCache = {};
const cacheTime = {};

async function fetchRates(base) {
  const now = Date.now();
  if (ratesCache[base] && now - (cacheTime[base] || 0) < CACHE_TTL) {
    return ratesCache[base];
  }
  const res = await fetch(`${BASE_URL}/latest/${base}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error(data["error-type"]);
  ratesCache[base] = data.conversion_rates;
  cacheTime[base] = now;
  return data.conversion_rates;
}

// ── Component ──────────────────────────────────────────────────────
export default function MultiCurrencyWidget() {
  const [baseCurrency, setBaseCurrency] = useState("NPR");
  const [amount, setAmount] = useState("1");
  const [rates, setRates] = useState(null);
  const [prevRates, setPrevRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [searchCurrency, setSearchCurrency] = useState("");
  const [editingAmount, setEditingAmount] = useState(null);

  const refreshTimer = useRef(null);

  // ── Load rates ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newRates = await fetchRates(baseCurrency);
      setPrevRates(rates);
      setRates(newRates);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch rates. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [baseCurrency]);

  useEffect(() => {
    load();
    refreshTimer.current = setInterval(load, CACHE_TTL);
    return () => clearInterval(refreshTimer.current);
  }, [baseCurrency]);

  // ── Helpers ────────────────────────────────────────────────────
  const convertedAmount = (toCurrency) => {
    if (!rates || !amount) return "—";
    const num = parseFloat(amount);
    if (isNaN(num)) return "—";
    return (num * (rates[toCurrency] || 0)).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const handleCurrencyAmountEdit = (currency, value) => {
    if (!rates) return;
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setAmount(String(num / (rates[currency] || 1)));
    }
  };

  const getRateChange = (currency) => {
    if (!prevRates || !rates) return 0;
    const prev = prevRates[currency] || 0;
    const curr = rates[currency] || 0;
    return prev ? ((curr - prev) / prev) * 100 : 0;
  };

  const filteredCurrencies = ALL_CURRENCIES.filter(
    (c) =>
      !currencies.includes(c) &&
      (c.includes(searchCurrency.toUpperCase()) ||
        CURRENCY_META[c]?.name
          .toLowerCase()
          .includes(searchCurrency.toLowerCase())),
  );

  const addCurrency = (c) => {
    setCurrencies((prev) => [...prev, c]);
    setShowAddCurrency(false);
    setSearchCurrency("");
  };

  const removeCurrency = (c) =>
    setCurrencies((prev) => prev.filter((x) => x !== c));

  const closeAddPanel = () => {
    setShowAddCurrency(false);
    setSearchCurrency("");
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .mc-widget { font-family:'Syne',sans-serif; color:var(--text,#f1f1f1); padding:16px; max-width:480px; margin:0 auto; }
        .mc-header  { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .mc-title   { font-size:22px; font-weight:800; color:var(--text,#f1f1f1); letter-spacing:-0.5px; }
        .mc-subtitle{ font-size:12px; color:var(--text-muted,#888); margin-top:1px; }

        .mc-refresh-btn { background:transparent; border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; padding:6px 10px; color:var(--text-muted,#888); font-size:13px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:5px; }
        .mc-refresh-btn:hover { background:var(--surface-2,rgba(255,255,255,0.05)); color:var(--text,#f1f1f1); }
        .mc-refresh-btn.spinning svg { animation:spin 0.8s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .mc-base-card  { background:var(--surface,rgba(255,255,255,0.04)); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:14px; padding:14px 16px; margin-bottom:12px; display:flex; align-items:center; gap:12px; }
        .mc-flag       { font-size:28px; line-height:1; flex-shrink:0; }
        .mc-base-info  { flex:1; min-width:0; }
        .mc-base-label { font-size:11px; color:var(--text-muted,#888); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
        .mc-base-select{ background:transparent; border:none; color:var(--text,#f1f1f1); font-family:'Syne',sans-serif; font-size:16px; font-weight:700; cursor:pointer; padding:0; outline:none; width:100%; }
        .mc-base-select option { background:#1a1a2e; color:#f1f1f1; }
        .mc-amount-input{ background:transparent; border:none; border-bottom:2px solid var(--accent,#6366f1); color:var(--text,#f1f1f1); font-family:'Syne',sans-serif; font-size:22px; font-weight:800; width:140px; text-align:right; outline:none; padding:2px 0; }

        .mc-rate-list { display:flex; flex-direction:column; gap:2px; }
        .mc-rate-row  { display:flex; align-items:center; gap:10px; padding:10px 8px; border-radius:10px; cursor:pointer; transition:background 0.12s; border:1px solid transparent; position:relative; }
        .mc-rate-row:hover { background:var(--surface-2,rgba(255,255,255,0.04)); border-color:var(--border,rgba(255,255,255,0.06)); }
        .mc-rate-row.is-base { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.25); }
        .mc-rate-flag { font-size:20px; width:28px; text-align:center; flex-shrink:0; }
        .mc-rate-info { flex:1; min-width:0; }
        .mc-rate-code { font-size:13px; font-weight:700; color:var(--text,#f1f1f1); }
        .mc-rate-name { font-size:10px; color:var(--text-muted,#888); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mc-rate-right{ display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; }
        .mc-converted { font-size:15px; font-weight:700; color:var(--text,#f1f1f1); font-variant-numeric:tabular-nums; }
        .mc-converted-input { background:transparent; border:none; border-bottom:1px solid var(--accent,#6366f1); color:var(--text,#f1f1f1); font-family:'Syne',sans-serif; font-size:15px; font-weight:700; width:110px; text-align:right; outline:none; padding:1px 0; }
        .mc-unit-rate { font-size:10px; color:var(--text-muted,#888); margin-top:2px; }
        .mc-badge-up  { font-size:10px; color:#22c55e; margin-left:4px; }
        .mc-badge-down{ font-size:10px; color:#ef4444; margin-left:4px; }
        .mc-remove-btn{ background:transparent; border:none; color:var(--text-muted,#888); font-size:14px; cursor:pointer; padding:2px 5px; opacity:0; transition:opacity 0.15s; line-height:1; }
        .mc-rate-row:hover .mc-remove-btn { opacity:1; }

        .mc-add-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:11px; background:transparent; border:1px dashed var(--border,rgba(255,255,255,0.12)); border-radius:10px; color:var(--text-muted,#888); font-size:13px; font-family:'Syne',sans-serif; font-weight:600; cursor:pointer; transition:all 0.15s; margin-top:6px; }
        .mc-add-btn:hover { background:var(--surface-2,rgba(255,255,255,0.04)); color:var(--accent,#6366f1); border-color:rgba(99,102,241,0.3); }

        .mc-add-panel { background:var(--surface,rgba(255,255,255,0.04)); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:12px; padding:12px; margin-top:6px; }
        .mc-search-input { background:var(--surface-2,rgba(255,255,255,0.06)); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; color:var(--text,#f1f1f1); font-family:'Syne',sans-serif; font-size:13px; padding:8px 12px; width:100%; outline:none; margin-bottom:8px; box-sizing:border-box; }
        .mc-currency-grid { display:flex; flex-wrap:wrap; gap:6px; max-height:150px; overflow-y:auto; }
        .mc-currency-chip { background:var(--surface-2,rgba(255,255,255,0.06)); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:7px; padding:5px 10px; font-size:12px; color:var(--text,#f1f1f1); cursor:pointer; font-family:'Syne',sans-serif; font-weight:600; display:flex; align-items:center; gap:5px; transition:all 0.12s; }
        .mc-currency-chip:hover { background:rgba(99,102,241,0.12); border-color:rgba(99,102,241,0.3); color:var(--accent,#6366f1); }

        .mc-error { text-align:center; color:var(--red,#ef4444); font-size:13px; padding:20px 0; }
        .mc-skeleton { height:42px; background:linear-gradient(90deg,var(--surface,rgba(255,255,255,0.04)) 25%,var(--surface-2,rgba(255,255,255,0.08)) 50%,var(--surface,rgba(255,255,255,0.04)) 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:10px; margin-bottom:4px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div className="mc-widget">
        {/* Header */}
        <div className="mc-header">
          <div>
            <h1 className="mc-title">Currency</h1>
            <p className="mc-subtitle">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                : "Live exchange rates"}
            </p>
          </div>
          <button
            className={`mc-refresh-btn ${loading ? "spinning" : ""}`}
            onClick={load}
            disabled={loading}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {loading ? "Updating…" : "Refresh"}
          </button>
        </div>

        {/* Base selector + amount */}
        <div className="mc-base-card">
          <span className="mc-flag">
            {CURRENCY_META[baseCurrency]?.flag || "🌐"}
          </span>
          <div className="mc-base-info">
            <p className="mc-base-label">From</p>
            <select
              className="mc-base-select"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} — {CURRENCY_META[c]?.name || c}
                </option>
              ))}
            </select>
          </div>
          <input
            className="mc-amount-input"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            min="0"
          />
        </div>

        {/* Error */}
        {error && <p className="mc-error">⚠️ {error}</p>}

        {/* Skeleton */}
        {loading &&
          !rates &&
          DEFAULT_CURRENCIES.slice(0, 6).map((c) => (
            <div key={c} className="mc-skeleton" />
          ))}

        {/* Rate list */}
        {rates && (
          <div className="mc-rate-list">
            {currencies.map((currency) => {
              const isBase = currency === baseCurrency;
              const rate = rates[currency];
              const change = getRateChange(currency);
              const meta = CURRENCY_META[currency] || {
                flag: "🌐",
                name: currency,
              };
              const unitRate = isBase ? 1 : rate;

              return (
                <div
                  key={currency}
                  className={`mc-rate-row ${isBase ? "is-base" : ""}`}
                  onClick={() => {
                    if (!isBase) setBaseCurrency(currency);
                  }}
                >
                  <span className="mc-rate-flag">{meta.flag}</span>

                  <div className="mc-rate-info">
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="mc-rate-code">{currency}</span>
                      {isBase && (
                        <span
                          style={{
                            fontSize: 9,
                            background: "rgba(99,102,241,0.2)",
                            color: "var(--accent,#6366f1)",
                            borderRadius: 4,
                            padding: "1px 5px",
                            marginLeft: 6,
                            fontWeight: 700,
                          }}
                        >
                          BASE
                        </span>
                      )}
                      {!isBase && change !== 0 && (
                        <span
                          className={
                            change > 0 ? "mc-badge-up" : "mc-badge-down"
                          }
                        >
                          {change > 0 ? "▲" : "▼"}
                          {Math.abs(change).toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <p className="mc-rate-name">{meta.name}</p>
                  </div>

                  <div
                    className="mc-rate-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingAmount === currency ? (
                      <input
                        className="mc-converted-input"
                        autoFocus
                        defaultValue={
                          isBase
                            ? amount
                            : (parseFloat(amount) * rate).toFixed(4)
                        }
                        onBlur={(e) => {
                          if (!isBase)
                            handleCurrencyAmountEdit(currency, e.target.value);
                          setEditingAmount(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (!isBase)
                              handleCurrencyAmountEdit(
                                currency,
                                e.target.value,
                              );
                            setEditingAmount(null);
                          }
                          if (e.key === "Escape") setEditingAmount(null);
                        }}
                      />
                    ) : (
                      <span
                        className="mc-converted"
                        title="Tap to edit"
                        onClick={() => setEditingAmount(currency)}
                      >
                        {isBase
                          ? parseFloat(amount || 0).toLocaleString()
                          : convertedAmount(currency)}
                      </span>
                    )}
                    <span className="mc-unit-rate">
                      {isBase
                        ? "Base"
                        : `1 ${baseCurrency} = ${unitRate?.toFixed(4)}`}
                    </span>
                  </div>

                  {currency !== "NPR" && (
                    <button
                      className="mc-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCurrency(currency);
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add currency */}
        {rates &&
          (showAddCurrency ? (
            <div className="mc-add-panel">
              <input
                className="mc-search-input"
                placeholder="Search currency (e.g. EUR, Thai Baht…)"
                value={searchCurrency}
                onChange={(e) => setSearchCurrency(e.target.value)}
                autoFocus
              />
              <div className="mc-currency-grid">
                {filteredCurrencies.map((c) => (
                  <button
                    key={c}
                    className="mc-currency-chip"
                    onClick={() => addCurrency(c)}
                  >
                    {CURRENCY_META[c]?.flag || "🌐"} {c}
                  </button>
                ))}
                {filteredCurrencies.length === 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted,#888)",
                      padding: "8px 0",
                    }}
                  >
                    No more currencies to add
                  </p>
                )}
              </div>
              <button
                onClick={closeAddPanel}
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--text-muted,#888)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="mc-add-btn"
              onClick={() => setShowAddCurrency(true)}
            >
              + Add Currency
            </button>
          ))}
      </div>
    </>
  );
}
