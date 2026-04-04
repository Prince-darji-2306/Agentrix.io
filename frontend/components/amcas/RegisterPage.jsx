"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { register } from "@/lib/api";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

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
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--fg); font-family: 'JetBrains Mono', monospace; transition: background 0.25s, color 0.25s; }
  ::selection { background: rgba(200,136,42,0.3); }
  input { color: var(--fg); }
  input::placeholder { color: var(--muted); }
  input:focus { outline: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); }
`;

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
        <span style={{ color: "rgba(200,136,42,0.4)", fontSize: 12, padding: "0 8px", fontFamily: "inherit" }}>{">"}_</span>
        <input
          id={id} type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, background: "transparent", border: "none", fontSize: 11, fontFamily: "inherit", padding: "10px 12px 10px 0", color: "var(--fg)" }}
        />
      </div>
    </div>
  );
}

export default function RegisterPage({ onEnterApp }) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 400);
    return () => clearInterval(iv);
  }, [loading]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Handle required";
    if (!form.email.includes("@")) e.email = "Invalid email";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (form.password !== form.confirm) e.confirm = "No match";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const res = await register(form.email, form.password, form.name || null);
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        if (onEnterApp) { onEnterApp(res.token, res.user_id, res.display_name); return; }
        navigate("/chat");
      }, 1400);
    } catch (err) {
      setLoading(false);
      setErrors({ email: err.message || "Registration failed" });
    }
  };

  const ThemeBtn = () => (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ width: 36, height: 36, border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.5)"; e.currentTarget.style.color = "var(--primary)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  const s = {
    outer: { minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" },
    card: { width: "100%", maxWidth: 380, position: "relative", zIndex: 10 },
    headerBlock: { border: "1px solid var(--border)", borderBottom: "none", background: "var(--card)", padding: "20px 20px 16px" },
    body: { border: "1px solid var(--border)", background: "var(--card)", padding: "20px" },
    footer: { border: "1px solid var(--border)", borderTop: "none", background: "var(--secondary)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    btn: { width: "100%", padding: "12px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid rgba(200,136,42,0.5)", background: "rgba(200,136,42,0.1)", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", marginTop: 8, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    backBtn: { position: "absolute", top: 20, left: 20, zIndex: 20, background: "none", border: "none", color: "var(--muted)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 },
  };

  if (submitted) {
    return (
      <>
        <style>{STYLES}</style>
        <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
        <div style={s.outer}>
          <GridBg />
          <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>
          <div style={{ ...s.card, textAlign: "center" }}>
            <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "var(--card)", padding: 40 }}>
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={48} style={{ color: "var(--chart-2)" }} /></div>
              <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--chart-2)", textTransform: "uppercase", marginBottom: 8 }}>Profile initialized</p>
              <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 20 }}>Launching Agentrix.io terminal…</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Loading cognitive modules</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <style>{`:root{${isDark ? DARK_VARS : LIGHT_VARS}}`}</style>
      <div style={s.outer}>
        <GridBg />
        <button style={s.backBtn} onClick={() => navigate("/")}><ArrowLeft size={14} /> Agentrix.io</button>
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>
        <div style={s.card}>
          <div style={s.headerBlock}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, border: "1px solid rgba(200,136,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>{">"}_</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Agentrix.io / Auth Module</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.15em", textShadow: "0 0 10px var(--primary-glow)" }}>REGISTER.exe</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Secure</span>
              </div>
            </div>
            <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 12 }}>
              <p style={{ fontSize: 10, color: "var(--fg-dim)", lineHeight: 1.7 }}>Initialize a new agent profile. Handle must be unique.</p>
            </div>
          </div>

          <div style={s.body}>
            <Field label="HANDLE" id="name" type="text" placeholder="agent_identifier" value={form.name} error={errors.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            <Field label="EMAIL" id="email" type="email" placeholder="user@domain.com" value={form.email} error={errors.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
            <Field label="PASSKEY" id="password" type="password" placeholder="••••••••" value={form.password} error={errors.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
            <Field label="CONFIRM" id="confirm" type="password" placeholder="••••••••" value={form.confirm} error={errors.confirm} onChange={v => setForm(f => ({ ...f, confirm: v }))} />
            <button
              style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; }}
            >
              {loading ? `Authenticating${dots}` : <><ArrowRight size={14} /> Initialize Profile</>}
            </button>
          </div>

          <div style={s.footer}>
            <span style={{ fontSize: 9, color: "var(--fg-dim)", letterSpacing: "0.08em" }}>Have an account?</span>
            <button style={{ background: "none", border: "none", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,136,42,0.7)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} onClick={() => navigate("/login")}>
              <ArrowLeft size={14} /> Sign In
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 8, color: "rgba(90,78,64,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 16 }}>
            Agentrix.io v2.4.1 · End-to-end encrypted
          </p>
        </div>
      </div>
    </>
  );
}