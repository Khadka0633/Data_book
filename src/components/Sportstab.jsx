import { useState, useEffect, useCallback } from "react";

const API_KEY = "6de4bb42c1e746ffb58c92eb452cdbbc";
const BASE = "https://api.football-data.org/v4";

const LEAGUES = [
  { id: "PL",  name: "Premier League",     flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "CL",  name: "Champions League",   flag: "⭐" },
  { id: "PD",  name: "La Liga",            flag: "🇪🇸" },
  { id: "BL1", name: "Bundesliga",         flag: "🇩🇪" },
  { id: "SA",  name: "Serie A",            flag: "🇮🇹" },
  { id: "FL1", name: "Ligue 1",            flag: "🇫🇷" },
  { id: "MLS", name: "MLS",               flag: "🇺🇸" },
  { id: "WC",  name: "World Cup",          flag: "🌍" },
];

const TABS = [
  { id: "results",   label: "Results",   icon: "📋" },
  { id: "fixtures",  label: "Fixtures",  icon: "📅" },
  { id: "standings", label: "Standings", icon: "🏆" },
];

function fetchFootball(path) {
  return fetch(`/api/football?path=${encodeURIComponent(path.slice(1))}`)
    .then(r => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const map = {
    FINISHED:   { label: "FT",   bg: "rgba(34,197,94,0.12)",   color: "var(--green)" },
    IN_PLAY:    { label: "LIVE", bg: "rgba(239,68,68,0.15)",   color: "var(--red)",  pulse: true },
    PAUSED:     { label: "HT",   bg: "rgba(249,115,22,0.12)",  color: "#f97316" },
    SCHEDULED:  { label: "TBD",  bg: "rgba(99,102,241,0.1)",   color: "var(--accent)" },
    TIMED:      { label: "TBD",  bg: "rgba(99,102,241,0.1)",   color: "var(--accent)" },
    POSTPONED:  { label: "PST",  bg: "rgba(148,163,184,0.12)", color: "var(--text-muted)" },
    CANCELLED:  { label: "CAN",  bg: "rgba(239,68,68,0.1)",    color: "var(--red)" },
  };
  const s = map[status] || { label: status, bg: "var(--surface-2)", color: "var(--text-muted)" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 99,
      background: s.bg, color: s.color, letterSpacing: 0.5,
      animation: s.pulse ? "livePulse 1.2s ease-in-out infinite" : "none",
    }}>
      {s.label}
    </span>
  );
}

function MatchCard({ match }) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const score = match.score;
  const finished = match.status === "FINISHED";
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";

  const homeScore = score?.fullTime?.home ?? score?.halfTime?.home ?? null;
  const awayScore = score?.fullTime?.away ?? score?.halfTime?.away ?? null;

  return (
    <div style={{
      background: "var(--surface-2)", borderRadius: "var(--radius-md)",
      padding: "12px 14px", border: live ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border)",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {match.competition?.name} · {formatDate(match.utcDate)}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {home.crest && <img src={home.crest} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{home.shortName || home.name}</span>
        </div>

        {/* Score */}
        <div style={{ flexShrink: 0, minWidth: 60, textAlign: "center" }}>
          {(finished || live) && homeScore !== null ? (
            <span style={{ fontSize: 18, fontWeight: 800, color: live ? "var(--red)" : "var(--text)", fontFamily: "'Syne', sans-serif" }}>
              {homeScore} – {awayScore}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>vs</span>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{away.shortName || away.name}</span>
          {away.crest && <img src={away.crest} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
        </div>
      </div>

      {/* Scorers */}
      {finished && match.goals?.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {match.goals.map((g, i) => (
            <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface)", padding: "2px 6px", borderRadius: 99, border: "1px solid var(--border)" }}>
              ⚽ {g.scorer?.name} {g.minute}'
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsTable({ standings }) {
  if (!standings?.length) return <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No standings available.</p>;

  const table = standings[0]?.table || [];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map(h => (
              <th key={h} style={{ padding: "8px 6px", color: "var(--text-muted)", fontWeight: 600, textAlign: h === "Team" ? "left" : "center", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.map((row, i) => (
            <tr key={row.team.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              <td style={{ padding: "9px 6px", textAlign: "center", color: i < 4 ? "var(--accent)" : i < 6 ? "var(--green)" : i >= table.length - 3 ? "var(--red)" : "var(--text-muted)", fontWeight: 700 }}>{row.position}</td>
              <td style={{ padding: "9px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {row.team.crest && <img src={row.team.crest} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />}
                  <span style={{ color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{row.team.shortName || row.team.name}</span>
                </div>
              </td>
              <td style={{ padding: "9px 6px", textAlign: "center", color: "var(--text-muted)" }}>{row.playedGames}</td>
              <td style={{ padding: "9px 6px", textAlign: "center", color: "var(--green)" }}>{row.won}</td>
              <td style={{ padding: "9px 6px", textAlign: "center", color: "var(--text-muted)" }}>{row.draw}</td>
              <td style={{ padding: "9px 6px", textAlign: "center", color: "var(--red)" }}>{row.lost}</td>
              <td style={{ padding: "9px 6px", textAlign: "center", color: row.goalDifference >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td>
              <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: "var(--text)", fontFamily: "'Syne', sans-serif" }}>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        {[
          { color: "var(--accent)", label: "Champions League" },
          { color: "var(--green)", label: "Europa League" },
          { color: "var(--red)", label: "Relegation" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SportsTab() {
  const [league, setLeague] = useState("PL");
  const [activeTab, setActiveTab] = useState("results");
  const [results, setResults] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (leagueId, tab) => {
    setLoading(true);
    setError("");
    try {
      if (tab === "results") {
        const data = await fetchFootball(`/competitions/${leagueId}/matches?status=FINISHED&limit=20`);
        setResults((data.matches || []).reverse());
      } else if (tab === "fixtures") {
        const data = await fetchFootball(`/competitions/${leagueId}/matches?status=SCHEDULED,TIMED&limit=20`);
        setFixtures(data.matches || []);
      } else if (tab === "standings") {
        const data = await fetchFootball(`/competitions/${leagueId}/standings`);
        setStandings(data.standings || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(league, activeTab);
  }, [league, activeTab, loadData]);

  const currentData = activeTab === "results" ? results : activeTab === "fixtures" ? fixtures : standings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .league-pill { padding: 7px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted); white-space: nowrap; transition: all 0.15s; }
        .league-pill.active { background: rgba(99,102,241,0.15); color: var(--accent); border-color: rgba(99,102,241,0.4); }
        .league-pill:hover { color: var(--text); }
      `}</style>

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>⚽ Football</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Live results, fixtures & standings</p>
      </div>

      {/* League selector */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
        {LEAGUES.map(l => (
          <button key={l.id} className={`league-pill${league === l.id ? " active" : ""}`} onClick={() => setLeague(l.id)}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display: "flex", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              background: "transparent", color: activeTab === t.id ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              borderRight: i < TABS.length - 1 ? "1px solid var(--border)" : "none",
              marginBottom: "-1px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 72, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border)", opacity: 1 - i * 0.15 }}>
              <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)", color: "var(--red)", fontSize: 13, textAlign: "center" }}>
          ⚠️ {error}
          <button onClick={() => loadData(league, activeTab)} style={{ display: "block", margin: "10px auto 0", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>
            ↻ Retry
          </button>
        </div>
      ) : activeTab === "standings" ? (
        <div className="card" style={{ padding: "14px 12px" }}>
          <StandingsTable standings={standings} />
        </div>
      ) : currentData.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
          No {activeTab === "results" ? "recent results" : "upcoming fixtures"} found.
        </p>
      ) : (
        <div>
          {currentData.map(match => <MatchCard key={match.id} match={match} />)}
        </div>
      )}

      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
        Data from football-data.org
      </p>
    </div>
  );
}
