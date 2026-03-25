"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

// ─── Theme CSS ────────────────────────────────────────────────────────────────
const DARK_VARS = `
  --bg: #0f0d0b; --card: #161310; --border: #2a2420;
  --primary: #c8882a; --primary-dim: rgba(200,136,42,0.12); --primary-glow: rgba(200,136,42,0.18);
  --muted: #5a4e40; --muted-fg: #3d3228; --fg: #e8c97a; --fg-dim: #7a6a52;
  --chart-1: #c8882a; --chart-2: #4aaf7a; --chart-3: #c8a42a; --chart-4: #c85a2a;
  --scanline: rgba(232,201,122,0.022); --glow: rgba(200,136,42,0.15);
  --secondary: #1a1612; --secondary-fg: #8a7a62;
`;
const LIGHT_VARS = `
  --bg: #faf7f2; --card: #f5f0e8; --border: #d8cfc0;
  --primary: #8a5a14; --primary-dim: rgba(138,90,20,0.1); --primary-glow: rgba(138,90,20,0.15);
  --muted: #7a6a52; --muted-fg: #a09080; --fg: #2a2018; --fg-dim: #6a5a42;
  --chart-1: #8a5a14; --chart-2: #2a7a4a; --chart-3: #8a6a14; --chart-4: #8a3a14;
  --scanline: rgba(42,32,24,0.018); --glow: rgba(138,90,20,0.12);
  --secondary: #ede8de; --secondary-fg: #6a5a42;
`;

// Sun icon
function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  );
}
// Moon icon
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

// ─── CSS injection ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--fg); font-family: 'JetBrains Mono', monospace; transition: background 0.25s, color 0.25s; }
  ::selection { background: rgba(200,136,42,0.3); }

  .phosphor { text-shadow: 0 0 10px var(--primary-glow); }
  .scanlines { position: relative; }
  .scanlines::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(to bottom, transparent, transparent 3px, var(--scanline) 3px, var(--scanline) 4px);
    pointer-events: none;
    z-index: 1;
  }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  .fade-up { animation: fadeUp 0.6s ease both; }

  input { color: var(--fg); }
  input::placeholder { color: var(--muted); }
  input:focus { outline: none; }
  select { color: var(--fg); background: transparent; outline: none; cursor: pointer; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); }
`;

// ─── useTypewriter ────────────────────────────────────────────────────────────
function useTypewriter(text, speed = 38, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setDisplayed(text.slice(0, ++i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, startDelay);
    return () => clearTimeout(t);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 80;
    const iv = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

// ─── GridBg ───────────────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--primary)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 3px, var(--scanline) 3px, var(--scanline) 4px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, var(--bg) 100%)" }} />
    </div>
  );
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────
function FeatureCard({ id, icon, title, desc, tags, delay }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div ref={ref} style={{
      position: "relative",
      border: "1px solid var(--border)",
      background: "var(--card)",
      padding: "20px",
      transition: "all 0.5s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.4)"; e.currentTarget.style.background = "rgba(200,136,42,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
    >
      {/* Corner */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "1px solid rgba(200,136,42,0.3)", borderRight: "1px solid rgba(200,136,42,0.3)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "1px solid rgba(200,136,42,0.3)", borderLeft: "1px solid rgba(200,136,42,0.3)" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--fg-dim)", border: "1px solid var(--border)", padding: "2px 6px", textTransform: "uppercase" }}>{id}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>{desc}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize: 8, letterSpacing: "0.12em", color: "var(--primary)", border: "1px solid rgba(200,136,42,0.2)", background: "rgba(200,136,42,0.05)", padding: "2px 6px", textTransform: "uppercase" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ label, id, type, placeholder, value, error, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>{label}</span>
        {error && <span style={{ fontSize: 9, color: "var(--chart-4)", letterSpacing: "0.05em" }}>— {error}</span>}
      </label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${error ? "rgba(200,90,42,0.5)" : "var(--border)"}`,
        background: "var(--bg)",
        transition: "border-color 0.15s"
      }}>
        <span style={{ color: "rgba(200,136,42,0.4)", fontSize: 12, padding: "0 8px", fontFamily: "inherit" }}>&gt;</span>
        <input
          id={id} type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, background: "transparent", border: "none", fontSize: 11, fontFamily: "inherit", padding: "10px 12px 10px 0", color: "var(--fg)" }}
        />
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ mode, onSwitch, onBack, onAuth, ThemeBtn }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState(".");
  const isLogin = mode === "login";

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 400);
    return () => clearInterval(iv);
  }, [loading]);

  const validate = () => {
    const e = {};
    if (!isLogin && !form.name.trim()) e.name = "Handle required";
    if (!form.email.includes("@")) e.email = "Invalid email";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (!isLogin && form.password !== form.confirm) e.confirm = "No match";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); setTimeout(() => onAuth(), 1400); }, 1800);
  };

  const s = { // shared styles
    outer: { minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" },
    card: { width: "100%", maxWidth: 380, position: "relative", zIndex: 10 },
    headerBlock: { border: "1px solid var(--border)", borderBottom: "none", background: "var(--card)", padding: "20px 20px 16px" },
    body: { border: "1px solid var(--border)", background: "var(--card)", padding: "20px" },
    footer: { border: "1px solid var(--border)", borderTop: "none", background: "var(--secondary)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    btn: { width: "100%", padding: "12px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid rgba(200,136,42,0.5)", background: "rgba(200,136,42,0.1)", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", marginTop: 8, transition: "all 0.2s" },
    backBtn: { position: "absolute", top: 20, left: 20, zIndex: 20, background: "none", border: "none", color: "var(--muted)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" },
  };

  if (submitted) {
    return (
      <div style={s.outer}>
        <GridBg />
        {ThemeBtn && <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>}
        <div style={{ ...s.card, textAlign: "center" }}>
          <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "var(--card)", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--chart-2)", textTransform: "uppercase", marginBottom: 8 }}>
              {isLogin ? "Authentication successful" : "Profile initialized"}
            </p>
            <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 20 }}>Launching AMCAS terminal…</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Loading cognitive modules</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.outer}>
      <GridBg />
      <button style={s.backBtn} onClick={onBack}>← AMCAS</button>
      {ThemeBtn && <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>}
      <div style={s.card}>
        {/* Header */}
        <div style={s.headerBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, border: "1px solid rgba(200,136,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>&gt;_</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>AMCAS / Auth Module</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.15em", textShadow: "0 0 10px var(--primary-glow)" }}>
                {isLogin ? "SIGN_IN.exe" : "REGISTER.exe"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Secure</span>
            </div>
          </div>
          <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 12 }}>
            <p style={{ fontSize: 10, color: "var(--fg-dim)", lineHeight: 1.7 }}>
              {isLogin ? "Enter credentials to access the cognitive platform." : "Initialize a new agent profile. Handle must be unique."}
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={s.body}>
          {!isLogin && <Field label="HANDLE" id="name" type="text" placeholder="agent_identifier" value={form.name} error={errors.name} onChange={v => setForm(f => ({ ...f, name: v }))} />}
          <Field label="EMAIL" id="email" type="email" placeholder="user@domain.com" value={form.email} error={errors.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <Field label="PASSKEY" id="password" type="password" placeholder="••••••••" value={form.password} error={errors.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          {!isLogin && <Field label="CONFIRM" id="confirm" type="password" placeholder="••••••••" value={form.confirm} error={errors.confirm} onChange={v => setForm(f => ({ ...f, confirm: v }))} />}
          <button
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; }}
          >
            {loading ? `Authenticating${dots}` : isLogin ? "→ Access Terminal" : "→ Initialize Profile"}
          </button>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <span style={{ fontSize: 9, color: "var(--fg-dim)", letterSpacing: "0.08em" }}>{isLogin ? "No account?" : "Have an account?"}</span>
          <button style={{ background: "none", border: "none", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,136,42,0.7)", cursor: "pointer", fontFamily: "inherit" }} onClick={onSwitch}>
            {isLogin ? "Register →" : "← Sign In"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 8, color: "rgba(90,78,64,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 16 }}>
          AMCAS v2.4.1 · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export default function App({ onEnterApp }) {
  const [view, setView] = useState("landing");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const headline = useTypewriter("AUTONOMOUS MULTI-AGENT COGNITIVE SYSTEM", 40, 400);
  const sub = useTypewriter("v2.4.1 — LangGraph · Groq · AutoGen · ChromaDB", 25, 2400);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const el = document.getElementById("app-root");
    const handler = () => {
      const rootScroll = el?.scrollTop ?? 0;
      const winScroll = window.scrollY ?? 0;
      setScrollY(Math.max(rootScroll, winScroll));
    };
    el?.addEventListener("scroll", handler);
    window.addEventListener("scroll", handler);
    handler();
    return () => {
      el?.removeEventListener("scroll", handler);
      window.removeEventListener("scroll", handler);
    };
  }, []);

  // Theme toggle button (reusable)
  const ThemeBtn = ({ style = {} }) => (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ width: 36, height: 36, border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", ...style }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.5)"; e.currentTarget.style.color = "var(--primary)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  const handleAuth = () => {
    if (onEnterApp) {
      onEnterApp();
      return;
    }
    setView("app");
  };

  if (view === "login") return (
    <>
      <style>{STYLES}</style>
      <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
      <AuthScreen mode="login" onSwitch={() => setView("register")} onBack={() => setView("landing")} onAuth={handleAuth} ThemeBtn={ThemeBtn} />
    </>
  );
  if (view === "register") return (
    <>
      <style>{STYLES}</style>
      <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
      <AuthScreen mode="register" onSwitch={() => setView("login")} onBack={() => setView("landing")} onAuth={handleAuth} ThemeBtn={ThemeBtn} />
    </>
  );
  if (view === "app") return (
    <>
      <style>{STYLES}</style>
      <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeBtn /></div>
        <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "var(--card)", padding: 40, maxWidth: 420, width: "100%", textAlign: "center", margin: 24 }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>🤖</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Welcome to AMCAS</p>
          <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginBottom: 20 }}>
            Your agent profile has been initialized. In the full application this would launch the Chat Interface, Task Graph, Debate Arena, Memory Intelligence, and Self-Reflection modules.
          </p>
          <button onClick={() => setView("landing")} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", padding: "8px 20px", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to landing
          </button>
        </div>
      </div>
    </>
  );

  // ── LANDING ────────────────────────────────────────────────────────────────
  const features = [
    { id: "MOD_01", icon: "⚡", title: "Chat Interface", desc: "Three reasoning modes: Standard (tool-calling), Multi-Agent (orchestrated specialists), Deep Research (decomposition + verification). Real-time streaming with markdown rendering.", tags: ["LangGraph", "Groq", "Multi-Mode"] },
    { id: "MOD_02", icon: "🕸", title: "Task Graph", desc: "Live DAG visualization of agent execution. Watch orchestrators spawn sub-agents, track node timing, status, and retry counts in real-time.", tags: ["DAG Viewer", "Real-Time", "Agent Flow"] },
    { id: "MOD_03", icon: "⚔️", title: "Debate Arena", desc: "Adversarial agents — Proposer vs Critic — debate any topic over configurable rounds via SSE streaming. Impartial judge delivers live verdicts.", tags: ["AutoGen", "SSE Stream", "Adversarial"] },
    { id: "MOD_04", icon: "🧠", title: "Memory Intel", desc: "ChromaDB-backed episodic memory. Semantic clusters, similarity scoring, and knowledge quality timelines that evolve with every session.", tags: ["ChromaDB", "Embeddings", "Semantic"] },
    { id: "MOD_05", icon: "🔬", title: "Self-Reflection", desc: "Post-task metacognitive analysis. Radar-chart scoring across planning, reasoning, verification, and adaptation dimensions.", tags: ["Metacognition", "Self-Correction"] },
    { id: "MOD_06", icon: "🛠", title: "Tool Arsenal", desc: "Calculator, knowledge retriever, datetime — plus extensible tool interface via LangChain. The agent decides when and how to call each.", tags: ["Calculator", "KnowledgeBase", "Extensible"] },
  ];

  const S = {
    page: { background: "var(--bg)", color: "var(--fg)", fontFamily: "'JetBrains Mono', monospace", overflowX: "hidden" },
    nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: scrollY > 40 ? "1px solid var(--border)" : "1px solid transparent", background: scrollY > 40 ? (isDark ? "rgba(15,13,11,0.75)" : "rgba(250,247,242,0.75)") : "transparent", transition: "all 0.3s", backdropFilter: scrollY > 40 ? "blur(10px)" : "none", WebkitBackdropFilter: scrollY > 40 ? "blur(10px)" : "none" },
    navInner: { maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    section: { maxWidth: 1200, margin: "0 auto", padding: "96px 24px" },
    sectionHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 56 },
    divider: { flex: 1, height: 1, background: "var(--border)" },
    badge: { border: "1px solid var(--border)", background: "var(--card)", padding: "8px 16px" },
    primaryBtn: { padding: "14px 32px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, border: "1px solid rgba(200,136,42,0.6)", background: "rgba(200,136,42,0.1)", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
    secondaryBtn: { padding: "14px 28px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-fg)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
  };

  return (
    <>
      <style>{STYLES}</style>
      <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
      <div id="app-root" style={{ ...S.page, height: "100vh", overflowY: "auto" }}>

        {/* NAV */}
        <nav style={S.nav}>
          <div style={S.navInner}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, border: "1px solid rgba(200,136,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 8px var(--primary-glow)" }}>&gt;_</div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "var(--primary)", textTransform: "uppercase", textShadow: "0 0 8px var(--primary-glow)" }}>AMCAS</span>
              <span style={{ fontSize: 8, color: "var(--fg-dim)", letterSpacing: "0.1em" }}>v2.4.1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ThemeBtn style={{ marginRight: 4 }} />
              <button onClick={() => setView("login")} style={{ ...S.secondaryBtn, padding: "8px 16px" }}>Sign In</button>
              <button onClick={() => setView("register")} style={{ ...S.primaryBtn, padding: "8px 16px" }}>Get Started</button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", overflow: "hidden" }}>
          <GridBg />
          <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, borderRadius: "50%", opacity: 0.08, filter: "blur(80px)", pointerEvents: "none", background: "radial-gradient(ellipse, var(--primary) 0%, transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 900, width: "100%" }}>
            {/* Status */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", background: "var(--card)", padding: "8px 16px", marginBottom: 40 }}>
              <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>System Online</span>
              <span style={{ color: "var(--border)" }}>|</span>
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--primary)", textTransform: "uppercase" }}>All Agents Ready</span>
            </div>

            {/* Boot block */}
            <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "24px", marginBottom: 28, textAlign: "left" }}>
              <p style={{ fontSize: 8, letterSpacing: "0.2em", color: "var(--fg-dim)", marginBottom: 8, textTransform: "uppercase" }}>SYS_BOOT / v2.4.1 / AMCAS_CORE</p>
              <h1 style={{ fontSize: "clamp(16px, 3vw, 26px)", fontWeight: 700, letterSpacing: "0.15em", color: "var(--primary)", textTransform: "uppercase", textShadow: "0 0 16px var(--primary-glow)", lineHeight: 1.3 }}>
                {headline.displayed}
                {!headline.done && <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--primary)", marginLeft: 4, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </h1>
              <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 10 }}>
                {sub.displayed}
                {headline.done && !sub.done && <span style={{ display: "inline-block", width: 2, height: "0.9em", background: "var(--muted)", marginLeft: 4, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </p>
            </div>

            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 36px" }}>
              An advanced AI platform that orchestrates specialist agents for reasoning, research, adversarial debate, and metacognitive self-reflection — with a retro terminal interface built for cognitive depth.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 56 }}>
              <button style={S.primaryBtn}
                onClick={() => setView("register")}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.2)"; e.currentTarget.style.boxShadow = "0 0 28px -8px var(--primary-glow)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                &gt;_ Initialize Session
              </button>
              <button style={S.secondaryBtn}>View Architecture →</button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
              {[{ val: 3, s: "", l: "Reasoning Modes" }, { val: 4, s: "+", l: "Agent Types" }, { val: 99, s: "%", l: "Uptime" }, { val: 5, s: "", l: "Modules" }].map(({ val, s, l }) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)", lineHeight: 1 }}><Counter target={val} suffix={s} /></p>
                  <p style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--fg-dim)", textTransform: "uppercase", marginTop: 6 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <div style={S.sectionHeader}>
            <div style={S.divider} />
            <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Module Index</span></div>
            <div style={S.divider} />
          </div>
          <h2 style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
            Cognitive <span style={{ color: "var(--primary)", textShadow: "0 0 10px var(--primary-glow)" }}>Modules</span>
          </h2>
          <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 50 }}>Five specialized interfaces. One unified intelligence.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {features.map((f, i) => <FeatureCard key={f.id} {...f} delay={i * 80 + 200} />)}
          </div>
        </section>

        {/* AGENT ARCHITECTURE */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <div style={S.sectionHeader}>
            <div style={S.divider} />
            <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Agent Architecture</span></div>
            <div style={S.divider} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            {/* Diagram */}
            <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 24, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: "1px solid rgba(200,136,42,0.3)", borderRight: "1px solid rgba(200,136,42,0.3)" }} />
              <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--fg-dim)", textTransform: "uppercase", marginBottom: 20 }}>ORCHESTRATION_GRAPH</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                <div style={{ border: "1px solid rgba(200,136,42,0.5)", background: "rgba(200,136,42,0.08)", padding: "8px 20px", fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em", textShadow: "0 0 8px var(--primary-glow)" }}>🎯 Orchestrator</div>
                <div style={{ width: 1, height: 20, background: "var(--border)" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, width: "100%" }}>
                  {[["🔍", "Researcher", "var(--chart-1)"], ["📊", "Analyst", "var(--chart-2)"], ["✍️", "Writer", "var(--chart-3)"], ["🔬", "Critic", "var(--chart-4)"]].map(([ic, lab, col]) => (
                    <div key={lab} style={{ border: `1px solid ${col}40`, padding: "10px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{ic}</div>
                      <p style={{ fontSize: 8, color: col, textTransform: "uppercase", letterSpacing: "0.1em" }}>{lab}</p>
                    </div>
                  ))}
                </div>
                <div style={{ width: 1, height: 20, background: "var(--border)" }} />
                <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "rgba(74,175,122,0.06)", padding: "8px 20px", fontSize: 10, fontWeight: 700, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.12em" }}>🔗 Aggregator</div>
                <div style={{ width: 1, height: 20, background: "var(--border)" }} />
                <div style={{ border: "1px solid var(--border)", background: "var(--secondary)", padding: "8px 20px", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>📄 Final Response</div>
              </div>
            </div>
            {/* Text */}
            <div>
              <h2 style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
                Specialist Agents,{" "}
                <span style={{ color: "var(--primary)", textShadow: "0 0 10px var(--primary-glow)" }}>Unified Output</span>
              </h2>
              <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 20 }}>
                Every multi-agent query runs a full orchestration pipeline. The Orchestrator decomposes, assigns specialists, and an Aggregator synthesizes a coherent final answer.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Researcher", "var(--chart-1)", "Gathers facts, explores topic depth comprehensively"],
                  ["Analyst", "var(--chart-2)", "Identifies patterns, data-driven evaluations"],
                  ["Writer", "var(--chart-3)", "Structures and articulates the output clearly"],
                  ["Critic", "var(--chart-4)", "Flags logical gaps and suggests improvements"]].map(([a, col, d]) => (
                  <div key={a} style={{ display: "flex", gap: 12, border: "1px solid var(--border)", background: "var(--card)", padding: "10px 14px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: col, width: 70, flexShrink: 0, paddingTop: 2 }}>{a}</span>
                    <p style={{ fontSize: 10, color: "var(--muted)" }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <div style={S.sectionHeader}>
            <div style={S.divider} />
            <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Performance Metrics</span></div>
            <div style={S.divider} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
            {[{ v: 94, s: "%", l: "Multi-Agent Accuracy" }, { v: 3, s: "x", l: "Research Depth" }, { v: 147, s: "", l: "Knowledge Clusters" }, { v: 300, s: "ms", l: "Avg Response" }].map(({ v, s, l }) => (
              <div key={l} style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 20, textAlign: "center" }}>
                <p style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)", lineHeight: 1 }}><Counter target={v} suffix={s} /></p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 6 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={{ border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
            {[["Feature", "Standard", "Multi-Agent", "Deep Research"],
              ["Tool Calling", "✓", "✓", "✓"],
              ["Orchestration", "—", "✓", "✓"],
              ["Task Decomposition", "—", "✓", "✓"],
              ["Verification", "—", "—", "✓"],
              ["Reasoning Depth", "2", "4", "6"]].map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: ri < 5 ? "1px solid var(--border)" : "none", background: ri === 0 ? "rgba(200,136,42,0.04)" : "transparent" }}>
                {row.map((cell, ci) => (
                  <div key={ci} style={{ padding: "10px 16px", borderLeft: ci > 0 ? "1px solid var(--border)" : "none", color: ci === 0 ? "var(--muted)" : ci === 2 ? "var(--chart-1)" : ci === 3 ? "var(--chart-2)" : "var(--fg-dim)", textAlign: ci > 0 ? "center" : "left", fontWeight: ri === 0 ? 700 : 400, letterSpacing: ri === 0 ? "0.12em" : "0", textTransform: ri === 0 ? "uppercase" : "none", fontSize: ri === 0 ? 9 : 10 }}>
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(200,136,42,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 600, margin: "0 auto", border: "1px solid var(--border)", background: "var(--card)", padding: 40, textAlign: "center", position: "relative" }}>
            {[
              { top: 0, left: 0, borderTop: "2px solid rgba(200,136,42,0.4)", borderLeft: "2px solid rgba(200,136,42,0.4)" },
              { top: 0, right: 0, borderTop: "2px solid rgba(200,136,42,0.4)", borderRight: "2px solid rgba(200,136,42,0.4)" },
              { bottom: 0, left: 0, borderBottom: "2px solid rgba(200,136,42,0.4)", borderLeft: "2px solid rgba(200,136,42,0.4)" },
              { bottom: 0, right: 0, borderBottom: "2px solid rgba(200,136,42,0.4)", borderRight: "2px solid rgba(200,136,42,0.4)" },
            ].map((corner, i) => (
              <div key={i} style={{ position: "absolute", width: 32, height: 32, ...corner }} />
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, background: "var(--primary)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(200,136,42,0.7)", textTransform: "uppercase" }}>System Ready</span>
            </div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
              Ready to enter the{" "}
              <span style={{ color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)" }}>terminal?</span>
            </h2>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
              Initialize your agent profile and access the full suite of cognitive modules. Free to start. No credit card required.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={S.primaryBtn} onClick={() => setView("register")}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.22)"; e.currentTarget.style.boxShadow = "0 0 28px -8px rgba(200,136,42,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}>
                &gt;_ Initialize Profile
              </button>
              <button style={S.secondaryBtn} onClick={() => setView("login")}>Sign In →</button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, border: "1px solid rgba(200,136,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--primary)" }}>&gt;_</div>
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--fg-dim)", textTransform: "uppercase" }}>AMCAS v2.4.1 — Autonomous Multi-Agent Cognitive System</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Docs", "GitHub", "API", "Privacy"].map(item => (
                <span key={item} style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(90,78,64,0.5)", textTransform: "uppercase", cursor: "pointer" }}>{item}</span>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 1200, margin: "16px auto 0", paddingTop: 16, borderTop: "1px solid rgba(42,36,32,0.5)", textAlign: "center" }}>
            <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "rgba(90,78,64,0.3)", textTransform: "uppercase" }}>
              Built with LangGraph · Groq · FastAPI · Next.js · ChromaDB · All rights reserved © 2025
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
