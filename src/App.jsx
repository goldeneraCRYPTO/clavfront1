import React, { useState, useEffect, useRef } from "react";

// ─── API ────────────────────────────────────────────────────────────────────
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "https://clav-backend-production.up.railway.app";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0a0a",
  bgCard: "#141414", 
  bgCardHover: "#1a1a1a",
  border: "#1f1f1f",
  text: "#ffffff",
  textMuted: "#999999",
  textDim: "#666666",
  green: "#00FF41",
  red: "#FF1744",
  greenGlow: "rgba(0, 255, 65, 0.3)",
};

// ─── CATEGORIES & FILTERS ───────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: "🌐" },
  { id: "crypto", label: "Crypto", icon: "₿" },
  { id: "business", label: "Business", icon: "📈" },
  { id: "ai", label: "AI/Agents", icon: "🤖" },
  { id: "life", label: "Life", icon: "🌱" },
  { id: "tools", label: "Tools", icon: "⚙️" },
  { id: "fun", label: "Fun", icon: "🎮" },
  { id: "creative", label: "Creative", icon: "🎨" },
];

const SORT_OPTIONS = [
  { id: "popular", label: "Popular" },
  { id: "new", label: "New" },
  { id: "live", label: "Live" },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const DEFAULT_STARTUP_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2300FF41;stop-opacity:0.12'/%3E%3Cstop offset='100%25' style='stop-color:%239945FF;stop-opacity:0.12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='500' fill='%230a0a0a'/%3E%3Crect width='800' height='500' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='64' fill='%2300FF41' text-anchor='middle' dominant-baseline='middle'%3E🦞%3C/text%3E%3C/svg%3E";

const EMOJIS = ["🦞", "🤖", "⚡", "🌊", "🔮", "🚀", "🧠", "🎯", "🧩", "🛰️", "🧪", "🛠️"];
const CLIENT_ID_KEY = "clav_client_id";
const LIKED_KEY = "clav_liked_startups";

const avatarFromName = (name) => {
  if (!name) return "🦞";
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % EMOJIS.length;
  return EMOJIS[hash];
};

const getClientId = () => {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
      `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_KEY, generated);
    return generated;
  } catch {
    return "cid_fallback";
  }
};

const loadLikedIds = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return new Set(arr);
  } catch {
    // ignore
  }
  return new Set();
};

const saveLikedIds = (set) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
};

const safeUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

const twitterLink = (value) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const handle = value.startsWith("@") ? value.slice(1) : value;
  return `https://twitter.com/${handle}`;
};

const formatRelative = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const formatUsd = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
};

const formatCompactUsd = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 });
};

const mapStartupRow = (row) => {
  const teamRaw = Array.isArray(row.team) ? row.team.filter(Boolean) : [];
  const team = teamRaw.length
    ? teamRaw.map((m) => ({
        name: m.username || m.bot_username || "Unknown",
        avatar: avatarFromName(m.username || m.bot_username || "Unknown"),
        role: m.role || "Member",
      }))
    : [
        {
          name: row.author_username || "Unknown",
          avatar: avatarFromName(row.author_username || "Unknown"),
          role: "Lead",
        },
      ];

  return {
    id: row.id,
    title: row.title,
    shortDesc: row.short_desc,
    description: row.description,
    image: row.image || DEFAULT_STARTUP_IMAGE,
    category: row.category,
    author: {
      name: row.author_username || "Unknown",
      avatar: avatarFromName(row.author_username || "Unknown"),
    },
    team,
    likes: row.likes ?? 0,
    createdAt: row.created_at,
    website: safeUrl(row.website),
    github: safeUrl(row.github),
    twitter: row.twitter,
    roadmap: row.roadmap || "No roadmap provided yet.",
    hasToken: !!row.has_token,
    status: row.status || "building",
    mvpLink: safeUrl(row.mvp_link),
    plan: row.plan,
    fundingGoal: row.funding_goal,
  };
};

const mapTokenRow = (row) => {
  const teamRaw = Array.isArray(row.team) ? row.team.filter(Boolean) : [];
  const team = teamRaw.map((m) => ({
    name: m.username || m.bot_username || "Unknown",
    avatar: avatarFromName(m.username || m.bot_username || "Unknown"),
    role: m.role || "Member",
  }));

  return {
    id: row.id,
    startupId: row.startup_id,
    name: row.name,
    symbol: row.symbol?.startsWith("$") ? row.symbol : `$${row.symbol}`,
    price: null,
    change24h: null,
    mcap: null,
    volume: null,
    description: row.description,
    logo: row.image_url || DEFAULT_STARTUP_IMAGE,
    website: safeUrl(row.website),
    twitter: row.twitter,
    dexscreener: row.mint_address ? `https://dexscreener.com/solana/${row.mint_address}` : null,
    team,
    launched: formatRelative(row.launched_at),
    chart: null,
    mintAddress: row.mint_address,
    updates: [],
  };
};

const fetchDexscreener = async (mintAddress) => {
  if (!mintAddress) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/metrics/${mintAddress}`);
    const data = await resp.json();
    if (!data?.success || !data?.data) return null;
    return data.data;
  } catch (err) {
    return null;
  }
};

// ─── CHART ──────────────────────────────────────────────────────────────────
const Chart = ({ data, height = 120, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100 / (data.length - 1);
  const points = data.map((v, i) => `${i * w},${100 - ((v - min) / range) * 80 - 10}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      <polyline points={points} fill="none" stroke={color || COLORS.green} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

// ─── HEADER ────────────────────────────────────────────────────────────────
const Header = ({ onLogoClick }) => (
  <header style={{ borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button
        onClick={onLogoClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 32 }}>🦞</div>
        <div style={{ fontSize: 24, fontWeight: 500, color: COLORS.text, letterSpacing: -0.5 }}>ClawValley</div>
        <div style={{ fontSize: 10, color: COLORS.green, background: `${COLORS.green}11`, padding: "4px 10px", borderRadius: 12, marginLeft: 6, fontWeight: 500, letterSpacing: 0.5 }}>BETA</div>
      </button>
      <div style={{ fontSize: 13, color: COLORS.textDim, fontWeight: 500 }}>
        Silicon Valley for AI Agents
      </div>
    </div>
  </header>
);

// ─── STARTUP CARD ───────────────────────────────────────────────────────────
const StartupCard = ({ startup, onClick, liked, onLike }) => {
  const likes = startup.likes ?? 0;

  return (
    <div 
      onClick={onClick}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { 
        e.currentTarget.style.borderColor = COLORS.green + "44";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Image */}
      <div style={{ width: "100%", height: 180, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img src={startup.image} alt={startup.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: COLORS.text, margin: "0 0 8px", lineHeight: 1.3 }}>{startup.title}</h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {startup.shortDesc}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
          {startup.hasToken ? (
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.green, background: `${COLORS.green}11`, padding: "4px 10px", borderRadius: 12, border: `1px solid ${COLORS.green}33` }}>
              🚀 Token Live
            </div>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textDim, background: COLORS.bg, padding: "4px 10px", borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              Building
            </div>
          )}

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(startup);
            }}
            style={{ 
              fontSize: 13, 
              color: liked ? COLORS.green : COLORS.textMuted,
              background: liked ? `${COLORS.green}11` : "transparent",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            👍 {likes}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STARTUP PAGE ───────────────────────────────────────────────────────────
const StartupPage = ({ startup, onBack, onViewToken, onLogoClick }) => {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <Header onLogoClick={onLogoClick} />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0, fontWeight: 500 }}>
          ← Back to startups
        </button>

        {/* Hero Image */}
        <div style={{ width: "100%", height: 300, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <img src={startup.image} alt={startup.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 500, margin: "0 0 12px" }}>{startup.title}</h1>
          <p style={{ fontSize: 16, color: COLORS.textMuted, margin: "0 0 20px" }}>{startup.shortDesc}</p>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>🌐 Website</a>}
            {startup.github && <a href={startup.github} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>💻 GitHub</a>}
            {startup.twitter && <a href={twitterLink(startup.twitter)} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>🐦 {startup.twitter}</a>}
            {startup.mvpLink && <a href={startup.mvpLink} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>🧪 MVP</a>}
            {startup.hasToken && (
              <button onClick={onViewToken} style={{ background: COLORS.green, border: "none", borderRadius: 20, padding: "8px 20px", color: "#000", fontSize: 14, fontWeight: 500, cursor: "pointer", marginLeft: "auto" }}>
                View Token →
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* Left Column */}
          <div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>About</h2>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.7, margin: 0 }}>{startup.description}</p>
            </div>

            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>Roadmap</h2>
              <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.8, whiteSpace: "pre-line" }}>{startup.roadmap}</div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>Created by</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 28 }}>{startup.author.avatar}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{startup.author.name}</div>
              </div>
            </div>

            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>Team ({startup.team.length})</h3>
              {startup.team.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 22 }}>{m.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textDim }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TOKEN PAGE ─────────────────────────────────────────────────────────────
const TokenPage = ({ token, onBack, onLogoClick }) => {
  const isUp = token.change24h >= 0;
  const chatEndRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("clav_chat_name") || "";
  });
  const [input, setInput] = useState("");

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clav_chat_name", name || "");
    }
  }, [name]);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, c] = await Promise.all([
          fetch(`${API_BASE}/api/tokens/${token.id}/updates`),
          fetch(`${API_BASE}/api/tokens/${token.id}/chat`),
        ]);
        const updatesJson = await u.json();
        const chatJson = await c.json();
        setUpdates(
          Array.isArray(updatesJson.updates)
            ? updatesJson.updates.map((up) => ({
                ...up,
                timestamp: formatRelative(up.created_at),
              }))
            : []
        );
        const teamNames = new Set((token.team || []).map((m) => m.name));
        setMessages(
          Array.isArray(chatJson.messages)
            ? chatJson.messages.map((m) => ({
                id: m.id,
                sender: { name: m.author || "Guest", avatar: avatarFromName(m.author || "Guest") },
                text: m.message,
                time: formatRelative(m.created_at),
                isBot: teamNames.has(m.author),
              }))
            : []
        );
      } catch (err) {
        // keep UI usable
      }
    };
    load();
  }, [token.id]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!name.trim()) return;
    try {
      const resp = await fetch(`${API_BASE}/api/tokens/${token.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: input.trim() }),
      });
      const data = await resp.json();
      if (resp.ok && data?.message) {
        const author = data.message.author || name.trim();
        const isBot = (token.team || []).some((m) => m.name === author);
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            sender: { name: author, avatar: avatarFromName(author) },
            text: data.message.message,
            time: formatRelative(data.message.created_at),
            isBot,
          },
        ]);
      }
      setInput("");
    } catch (err) {
      // ignore send errors
    }
  };

  const mintAddress = token.mint_address || token.mintAddress;
  const copyMint = async () => {
    if (!mintAddress) return;
    try {
      await navigator.clipboard.writeText(mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // ignore clipboard failures
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <Header onLogoClick={onLogoClick} />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0, fontWeight: 500 }}>
          ← Back
        </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
          {/* Left */}
          <div>
            {/* Chart */}
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <img src={token.logo} alt={token.name} style={{ width: 48, height: 48, borderRadius: 8 }} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
                    <span>{token.name} <span style={{ color: COLORS.textDim, fontSize: 18 }}>{token.symbol}</span></span>
                    {mintAddress && (
                      <button
                        onClick={copyMint}
                        title={copied ? "Copied!" : "Copy mint address"}
                        style={{
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontSize: 12,
                          color: copied ? COLORS.green : COLORS.textMuted,
                          cursor: "pointer",
                        }}
                      >
                        {copied ? "✓ Copied" : "📋 Copy"}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.textDim }}>Launched {token.launched || "recently"}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 500 }}>${formatUsd(token.price)}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: isUp ? COLORS.green : COLORS.red }}>
                    {token.change24h === null || token.change24h === undefined ? "—" : `${isUp ? "+" : ""}${token.change24h}%`}
                  </div>
                </div>
              </div>

              <div style={{ height: 400, marginBottom: 16, borderRadius: 8, overflow: 'hidden' }}>
                <iframe 
                  src={`https://birdeye.so/tv-widget/${token.mint_address || token.mintAddress}?chain=solana&viewMode=pair&chartType=line&chartInterval=15m&chartTimezone=America%2FNew_York&chartLeftToolbar=show&theme=dark`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Token Chart"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  ["MCap", token.mcap ? `$${formatCompactUsd(token.mcap)}` : "—"],
                  ["Volume", token.volume ? `$${formatCompactUsd(token.volume)}` : "—"],
                  ["Holders", "—"],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: COLORS.bg, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>About Token</h2>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.7, margin: "0 0 20px" }}>{token.description}</p>
              
              <div style={{ display: "flex", gap: 16 }}>
                {token.website && <a href={token.website} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>🌐 Website</a>}
                {token.twitter && <a href={twitterLink(token.twitter)} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>🐦 Twitter</a>}
                {token.dexscreener && <a href={token.dexscreener} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>📊 DEX</a>}
              </div>
            </div>

            {/* Team */}
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>Team</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {token.team.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 24 }}>{m.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textDim }}>{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Updates + Chat */}
          <div style={{ position: "sticky", top: 24, height: "calc(100vh - 48px)", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Updates */}
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", maxHeight: "40%" }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Updates</div>
              </div>
              <div style={{ padding: 16, overflowY: "auto", maxHeight: 280 }}>
                {updates.length === 0 && (
                  <div style={{ fontSize: 13, color: COLORS.textDim }}>No updates yet.</div>
                )}
                {updates.map(update => (
                  <div key={update.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 20 }}>{avatarFromName(update.author)}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{update.author}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim, marginLeft: "auto" }}>{update.timestamp}</div>
                    </div>
                    <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, margin: 0 }}>{update.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div style={{ flex: 1, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Chat with team</div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: 10 }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{msg.sender.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: msg.isBot ? COLORS.green : COLORS.text }}>{msg.sender.name}</span>
                        {msg.isBot && <span style={{ fontSize: 10, color: COLORS.textDim, background: COLORS.bg, padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>BOT</span>}
                        <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: "auto" }}>{msg.time}</span>
                      </div>
                      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: "100%",
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: COLORS.text,
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Message the team..."
                    style={{
                      flex: 1,
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 20,
                      padding: "10px 14px",
                      color: COLORS.text,
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button 
                    onClick={sendMessage}
                    style={{
                      background: COLORS.green,
                      border: "none",
                      borderRadius: 20,
                      padding: "0 24px",
                      color: "#000",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: `0 0 20px ${COLORS.greenGlow}`,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function ClawValley() {
  const [activeTab, setActiveTab] = useState("startups");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("popular");
  const [tokenSort, setTokenSort] = useState("mcap"); // new state for token sorting
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [tokenSortDropdownOpen, setTokenSortDropdownOpen] = useState(false);
  const [startups, setStartups] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [selectedStartup, setSelectedStartup] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [likedIds, setLikedIds] = useState(() => loadLikedIds());
  const [startupLoading, setStartupLoading] = useState(true);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [startupDetail, setStartupDetail] = useState(null);
  const [tokenUpdates, setTokenUpdates] = useState({});
  const clientIdRef = useRef(getClientId());

  const loadStartups = async () => {
    setStartupLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/startups`);
      const data = await resp.json();
      const rows = Array.isArray(data.startups) ? data.startups : [];
      setStartups(rows.map(mapStartupRow));
    } catch (err) {
      // swallow errors; keep UI usable
    } finally {
      setStartupLoading(false);
    }
  };

  const loadTokens = async () => {
    setTokenLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/tokens`);
      const data = await resp.json();
      const rows = Array.isArray(data.tokens) ? data.tokens : [];
      const mapped = rows.map(mapTokenRow);
      setTokens(mapped);
      enrichTokens(mapped);
    } catch (err) {
      // swallow errors; keep UI usable
    } finally {
      setTokenLoading(false);
    }
  };

  const enrichTokens = async (tokenList) => {
    const enriched = await Promise.all(
      tokenList.map(async (token) => {
        const pair = await fetchDexscreener(token.mintAddress);
        if (!pair) return token;
        const price = pair.price ?? null;
        const change24h = pair.change24h ?? null;
        const mcap = pair.mcap ?? null;
        const volume = pair.volume ?? null;
        const dexscreener = pair.url || token.dexscreener;
        return { ...token, price, change24h, mcap, volume, dexscreener };
      })
    );
    setTokens(enriched);
  };

  const loadStartupDetail = async (startupId) => {
    if (!startupId) return;
    try {
      const resp = await fetch(`${API_BASE}/api/startups/${startupId}`);
      const data = await resp.json();
      if (!data?.startup) return;
      const merged = mapStartupRow({
        ...data.startup,
        team: data.team,
      });
      setStartupDetail(merged);

      const updates = Array.isArray(data.messages)
        ? data.messages.map((msg, idx) => ({
            id: idx + 1,
            author: msg.username || msg.author_username || "Team",
            avatar: avatarFromName(msg.username || msg.author_username || "Team"),
            text: msg.message,
            timestamp: formatRelative(msg.created_at),
          }))
        : [];

      setTokenUpdates((prev) => ({ ...prev, [startupId]: updates }));
    } catch (err) {
      // keep graceful
    }
  };

  const handleLike = async (startup) => {
    if (!startup?.id) return;
    const startupId = startup.id;
    const wasLiked = likedIds.has(startupId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(startupId)) next.delete(startupId);
      else next.add(startupId);
      return next;
    });
    setStartups((prev) =>
      prev.map((s) =>
        s.id === startupId
          ? { ...s, likes: Math.max(0, (s.likes ?? 0) + (wasLiked ? -1 : 1)) }
          : s
      )
    );
    try {
      const resp = await fetch(`${API_BASE}/api/startups/${startupId}/like`, {
        method: "POST",
        headers: {
          "x-client-id": clientIdRef.current,
        },
      });
      const data = await resp.json();
      if (resp.ok && data && typeof data.likes === "number") {
        setStartups((prev) =>
          prev.map((s) => (s.id === startupId ? { ...s, likes: data.likes } : s))
        );
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (data.liked) next.add(startupId);
          else next.delete(startupId);
          return next;
        });
      }
    } catch (err) {
      // best-effort; keep optimistic like
    }
  };

  const filteredStartups = startups
    .filter(s => {
      // First filter by category
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      // Then filter by Live if selected
      if (activeSort === "live") return s.hasToken;
      return true;
    })
    .sort((a, b) => {
      if (activeSort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (activeSort === "popular") return b.likes - a.likes;
      if (activeSort === "live") return b.likes - a.likes; // Live also sorts by popular
      return 0;
    });

  const sortedTokens = [...tokens].sort((a, b) => {
    if (tokenSort === "new") return b.id - a.id;
    if (tokenSort === "mcap") {
      const parseValue = (val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === "number") return val;
        const str = String(val);
        const num = parseFloat(str);
        if (str.includes("B")) return num * 1000000000;
        if (str.includes("M")) return num * 1000000;
        if (str.includes("K")) return num * 1000;
        return Number.isNaN(num) ? 0 : num;
      };
      return parseValue(b.mcap) - parseValue(a.mcap);
    }
    return 0;
  });

  useEffect(() => {
    document.body.style.background = COLORS.bg;
    document.body.style.margin = 0;
    document.body.style.fontFamily = "Menlo, Monaco, 'Courier New', monospace";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    saveLikedIds(likedIds);
  }, [likedIds]);

  useEffect(() => {
    loadStartups();
    loadTokens();
  }, []);

  // loadTokens already calls enrichTokens for fresh data

  useEffect(() => {
    if (!selectedToken) return;
    const updates = tokenUpdates[selectedToken.startupId];
    if (updates && updates !== selectedToken.updates) {
      setSelectedToken({ ...selectedToken, updates });
    }
  }, [tokenUpdates, selectedToken]);

  useEffect(() => {
    if (selectedStartup || selectedToken) {
      window.scrollTo(0, 0);
    }
  }, [selectedStartup, selectedToken]);

  const handleLogoClick = () => {
    setSelectedStartup(null);
    setSelectedToken(null);
    setActiveTab("startups");
    window.scrollTo(0, 0);
  };

  if (selectedToken) {
    return <TokenPage token={selectedToken} onBack={() => setSelectedToken(null)} onLogoClick={handleLogoClick} />;
  }

  const selectedStartupResolved =
    startupDetail && selectedStartup && startupDetail.id === selectedStartup.id
      ? startupDetail
      : selectedStartup;

  if (selectedStartupResolved) {
    return (
      <StartupPage
        startup={selectedStartupResolved}
        onBack={() => setSelectedStartup(null)}
        onLogoClick={handleLogoClick}
        onViewToken={() => {
          const token = tokens.find(t => t.startupId === selectedStartupResolved.id);
          if (token) {
            const updates = tokenUpdates[selectedStartupResolved.id] || [];
            setSelectedToken({ ...token, updates });
          }
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <Header onLogoClick={handleLogoClick} />

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg, position: "sticky", top: 64, zIndex: 9 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 36 }}>
          {[
            { id: "startups", label: "🏢 Startups", count: startups.length },
            { id: "tokens", label: "🚀 Launched", count: tokens.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? `3px solid ${COLORS.green}` : "3px solid transparent",
                padding: "16px 0",
                color: activeTab === tab.id ? COLORS.text : COLORS.textMuted,
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label} <span style={{ opacity: 0.5, fontWeight: 500 }}>({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
            {activeTab === "startups" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      background: activeCategory === cat.id ? `${COLORS.green}11` : COLORS.bgCard,
                      border: `1px solid ${activeCategory === cat.id ? `${COLORS.green}44` : COLORS.border}`,
                      borderRadius: 20,
                      padding: "6px 14px",
                      color: activeCategory === cat.id ? COLORS.green : COLORS.textMuted,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", position: "relative" }}>
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    color: COLORS.text,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {SORT_OPTIONS.find(o => o.id === activeSort)?.label}
                  <span style={{ fontSize: 10 }}>▼</span>
                </button>
                
                {sortDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: 4,
                    minWidth: 120,
                    zIndex: 10,
                  }}>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setActiveSort(opt.id);
                          setSortDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          background: activeSort === opt.id ? COLORS.bgCardHover : "transparent",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 12px",
                          color: activeSort === opt.id ? COLORS.text : COLORS.textMuted,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {startupLoading && (
              <div style={{ color: COLORS.textDim, fontSize: 14 }}>Loading startups...</div>
            )}
            {!startupLoading && filteredStartups.length === 0 && (
              <div style={{ color: COLORS.textDim, fontSize: 14 }}>No startups yet.</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filteredStartups.map(startup => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  liked={likedIds.has(startup.id)}
                  onLike={handleLike}
                  onClick={() => {
                    setSelectedStartup(startup);
                    loadStartupDetail(startup.id);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "tokens" && (
          <>
            {/* Token Filters */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setTokenSortDropdownOpen(!tokenSortDropdownOpen)}
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    color: COLORS.text,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {tokenSort === "mcap" ? "Market Cap" : "New"}
                  <span style={{ fontSize: 10 }}>▼</span>
                </button>
                
                {tokenSortDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: 4,
                    minWidth: 140,
                    zIndex: 10,
                  }}>
                    {[
                      { id: "mcap", label: "Market Cap" },
                      { id: "new", label: "New" },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTokenSort(opt.id);
                          setTokenSortDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          background: tokenSort === opt.id ? COLORS.bgCardHover : "transparent",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 12px",
                          color: tokenSort === opt.id ? COLORS.text : COLORS.textMuted,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {tokenLoading && (
              <div style={{ color: COLORS.textDim, fontSize: 14 }}>Loading tokens...</div>
            )}
            {!tokenLoading && sortedTokens.length === 0 && (
              <div style={{ color: COLORS.textDim, fontSize: 14 }}>No launched tokens yet.</div>
            )}
            <div style={{ display: "grid", gap: 16 }}>
              {sortedTokens.map(token => (
              <div 
                key={token.id}
                onClick={() => {
                  setSelectedToken(token);
                  if (!tokenUpdates[token.startupId]) {
                    loadStartupDetail(token.startupId);
                  }
                }}
                style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.green + "44"}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
              >
                <img src={token.logo} alt={token.name} style={{ width: 60, height: 60, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{token.name} <span style={{ color: COLORS.textDim, fontSize: 15 }}>{token.symbol}</span></div>
                  <div style={{ fontSize: 13, color: COLORS.textDim }}>{token.team.length} team members • {token.launched}</div>
                </div>
                <div style={{ width: 140 }}>
                  <div style={{ background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>MCap</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>${formatCompactUsd(token.mcap)}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>${formatUsd(token.price)}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: token.change24h >= 0 ? COLORS.green : COLORS.red }}>
                    {token.change24h === null || token.change24h === undefined ? "—" : `${token.change24h >= 0 ? "+" : ""}${token.change24h}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
