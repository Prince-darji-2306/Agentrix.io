"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import ReactFlow, { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";

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

// ─── Icons ────────────────────────────────────────────────────────────────────
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
  @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideRight { from{width:0} to{width:100%} }
  @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(200,136,42,0.2)} 50%{box-shadow:0 0 20px rgba(200,136,42,0.4)} }
  @keyframes scanDown { 0%{top:-4px} 100%{top:100%} }
  @keyframes typing { from{width:0} to{width:100%} }
  @keyframes nodeAppear { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
  @keyframes connectionDraw { 0%{stroke-dashoffset:100} 100%{stroke-dashoffset:0} }
  @keyframes radarSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes barFill { from{width:0} to{width:var(--fill-width,100%)} }
  @keyframes dotPulse { 0%,100%{r:2;opacity:0.6} 50%{r:4;opacity:1} }
  @keyframes streamType { 0%{opacity:0;height:0} 100%{opacity:1;height:auto} }
  @keyframes tickerScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes flowDash { 0%{stroke-dashoffset:32} 100%{stroke-dashoffset:0} }
  @keyframes lineFlow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes spinSlow { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

  .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  .fade-up { animation: fadeUp 0.6s ease both; }
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  input { color: var(--fg); }
  input::placeholder { color: var(--muted); }
  input:focus { outline: none; }
  select { color: var(--fg); background: transparent; outline: none; cursor: pointer; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); }

  /* Module Preview Styles */
  .preview-terminal { position: relative; overflow: hidden; }
  .preview-terminal::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 4px;
    background: rgba(200,136,42,0.15);
    animation: scanDown 3s linear infinite;
    pointer-events: none;
  }

  .stream-line {
    animation: streamType 0.3s ease forwards;
    overflow: hidden;
  }

  .bar-fill {
    animation: barFill 1.5s ease forwards;
  }

  .radar-container {
    animation: radarSpin 12s linear infinite;
  }

  @keyframes floatUp { 0%{transform:translateY(0);opacity:0.6} 50%{opacity:1} 100%{transform:translateY(-120px);opacity:0} }
  .float-particle {
    animation: floatUp 3s ease-in-out infinite;
  }

  .module-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: stretch;
  }

  .preview-shell {
    border: 1px solid var(--border);
    background: var(--card);
    padding: 16px;
    min-height: 250px;
    position: relative;
  }

  .flow-line {
    height: 2px;
    background: linear-gradient(90deg, rgba(200,136,42,0.1), rgba(200,136,42,0.6), rgba(200,136,42,0.1));
    background-size: 200% 100%;
    animation: lineFlow 1.6s linear infinite;
    opacity: 0.6;
  }

  .pipeline-node {
    border: 1px solid var(--border);
    background: var(--card);
    padding: 10px 12px;
    width: 150px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .pipeline-node-label {
    font-size: 8px;
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 6px;
  }

  .react-flow {
    background: transparent;
  }
  .react-flow__attribution { display: none; }
  .react-flow__node { font-family: 'JetBrains Mono', monospace; }
  .react-flow__pane { cursor: default; }
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

// ─── useIntersectionObserver ──────────────────────────────────────────────────
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.15, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 80;
    const iv = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [target, inView]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
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

// ─── Section Wrapper with Scroll Reveal ───────────────────────────────────────
function RevealSection({ children, style = {}, delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Module Preview: Chat Interface ───────────────────────────────────────────
function ChatPreview() {
  const [ref, inView] = useInView();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setStep(s => (s + 1) % 5), 1200);
    return () => clearInterval(iv);
  }, [inView]);

  return (
    <div ref={ref} className="preview-terminal" style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingBottom: 8, borderBottom: "1px dashed var(--border)" }}>
        {["STD", "MAS", "DRS"].map((m, i) => (
          <span key={m} style={{
            fontSize: 7, letterSpacing: "0.1em", padding: "2px 6px",
            border: `1px solid ${i === step % 3 ? "rgba(200,136,42,0.5)" : "var(--border)"}`,
            background: i === step % 3 ? "rgba(200,136,42,0.1)" : "transparent",
            color: i === step % 3 ? "var(--primary)" : "var(--fg-dim)",
            transition: "all 0.3s",
            textTransform: "uppercase"
          }}>{m}</span>
        ))}
        <span style={{ fontSize: 7, color: "var(--fg-dim)", marginLeft: "auto" }}>MODE_SELECT</span>
      </div>
      <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 8 }}>
        <span style={{ color: "var(--primary)", opacity: 0.6 }}>></span> What is multi-agent reasoning?
      </div>
      {step >= 1 && (
        <div style={{ animation: "fadeIn 0.4s ease", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 7, color: "var(--chart-2)" }}>● Processing</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 7, color: "var(--fg-dim)" }}>orchestrator</span>
          </div>
          <div style={{ fontSize: 8, color: "var(--fg-dim)", paddingLeft: 8, lineHeight: 1.6 }}>
            <div style={{ color: "var(--chart-1)" }}>→ Researcher agent spawning...</div>
            {step >= 2 && <div style={{ color: "var(--chart-2)" }}>→ Analyst agent spawning...</div>}
            {step >= 3 && <div style={{ color: "var(--chart-3)" }}>→ Aggregating results...</div>}
          </div>
        </div>
      )}
      {step >= 4 && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>CONFIDENCE</div>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div className="bar-fill" style={{ height: "100%", background: "var(--chart-2)", width: "87%", "--fill-width": "87%" }} />
              </div>
              <div style={{ fontSize: 7, color: "var(--chart-2)", marginTop: 2 }}>87%</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>DEPTH</div>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 8, background: i <= 3 ? "var(--primary)" : "var(--border)", opacity: i <= 3 ? 0.8 : 0.3 }} />
                ))}
              </div>
              <div style={{ fontSize: 7, color: "var(--primary)", marginTop: 2 }}>Level 3</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module Preview: Task Graph ───────────────────────────────────────────────
function TaskGraphPreview() {
  const [ref, inView] = useInView();
  const [activeNode, setActiveNode] = useState(-1);
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setActiveNode(n => (n + 1) % 6), 800);
    return () => clearInterval(iv);
  }, [inView]);

  const nodes = [
    { x: 140, y: 20, label: "Orchestrator", col: "var(--primary)" },
    { x: 40, y: 70, label: "Researcher", col: "var(--chart-1)" },
    { x: 240, y: 70, label: "Analyst", col: "var(--chart-2)" },
    { x: 140, y: 120, label: "Aggregator", col: "var(--chart-3)" },
    { x: 140, y: 165, label: "Critic", col: "var(--chart-4)" },
    { x: 140, y: 210, label: "Output", col: "var(--fg-dim)" },
  ];
  const edges = [[0,1],[0,2],[1,3],[2,3],[3,4],[4,5]];

  return (
    <div ref={ref} style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180 }}>
      <div style={{ fontSize: 7, color: "var(--fg-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>DAG_EXECUTION_VIEW</div>
      <svg width="100%" viewBox="0 0 280 240" style={{ display: "block" }}>
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y + 12} x2={nodes[b].x} y2={nodes[b].y - 4}
            stroke="var(--border)" strokeWidth="1"
            strokeDasharray={activeNode >= Math.min(a, b) ? "0" : "4 4"}
            style={{ transition: "all 0.4s ease" }}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i} style={{
            opacity: activeNode >= i ? 1 : 0.2,
            transform: activeNode === i ? "scale(1.1)" : "scale(1)",
            transformOrigin: `${n.x}px ${n.y}px`,
            transition: "all 0.4s ease",
          }}>
            <rect x={n.x - 50} y={n.y - 8} width={100} height={24} rx={2}
              fill={activeNode === i ? `${n.col}15` : "transparent"}
              stroke={n.col} strokeWidth={activeNode === i ? 1.5 : 0.5}
              style={{ transition: "all 0.3s" }}
            />
            <text x={n.x} y={n.y + 7} textAnchor="middle" fill={n.col} fontSize="8" fontFamily="inherit" letterSpacing="0.08em">
              {n.label}
            </text>
            {activeNode === i && (
              <circle cx={n.x + 42} cy={n.y} r={3} fill="var(--chart-2)" style={{ animation: "pulse 1s infinite" }} />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Module Preview: Debate Arena ─────────────────────────────────────────────
function DebatePreview() {
  const [ref, inView] = useInView();
  const [round, setRound] = useState(0);
  const messages = [
    { role: "proposer", text: "Multi-agent systems provide superior reasoning depth through specialization." },
    { role: "critic", text: "Specialization risks fragmentation. Single coherent models avoid contradiction." },
    { role: "proposer", text: "Aggregation protocols resolve conflicts. Parallel processing scales better." },
    { role: "critic", text: "Aggregation adds latency. Simpler pipelines are more predictable." },
  ];
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setRound(r => (r + 1) % 8), 1500);
    return () => clearInterval(iv);
  }, [inView]);

  return (
    <div ref={ref} className="preview-terminal" style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: "1px dashed var(--border)" }}>
        <span style={{ fontSize: 7, color: "var(--chart-1)", letterSpacing: "0.1em", textTransform: "uppercase" }}>⚔ PROPOSER</span>
        <span style={{ fontSize: 7, color: "var(--fg-dim)" }}>vs</span>
        <span style={{ fontSize: 7, color: "var(--chart-4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>🔬 CRITIC</span>
        <span style={{ fontSize: 7, color: "var(--fg-dim)", marginLeft: "auto" }}>Round {Math.floor(round / 2) + 1}/4</span>
      </div>
      {messages.slice(0, Math.floor(round / 2) + 1).map((m, i) => (
        <div key={i} className="stream-line" style={{
          fontSize: 8, lineHeight: 1.6, padding: "6px 8px", marginBottom: 4,
          borderLeft: `2px solid ${m.role === "proposer" ? "var(--chart-1)" : "var(--chart-4)"}`,
          background: m.role === "proposer" ? "rgba(200,136,42,0.04)" : "rgba(200,90,42,0.04)",
          color: "var(--fg-dim)",
          animationDelay: `${i * 0.1}s`,
        }}>
          <span style={{ color: m.role === "proposer" ? "var(--chart-1)" : "var(--chart-4)", fontWeight: 700 }}>
            {m.role === "proposer" ? "P" : "C"}:
          </span> {m.text}
        </div>
      ))}
      {round >= 7 && (
        <div style={{ marginTop: 8, padding: "8px", border: "1px solid rgba(74,175,122,0.3)", background: "rgba(74,175,122,0.05)", fontSize: 8, color: "var(--chart-2)" }}>
          <span style={{ fontWeight: 700 }}>⚖ VERDICT:</span> Multi-agent systems show advantage in complex reasoning tasks.
        </div>
      )}
    </div>
  );
}

// ─── Module Preview: Memory Intel ─────────────────────────────────────────────
function MemoryPreview() {
  const [ref, inView] = useInView();
  const dots = Array.from({ length: 18 }, (_, i) => ({
    cx: 30 + Math.cos(i * 0.35) * (40 + (i % 3) * 25),
    cy: 80 + Math.sin(i * 0.35) * (30 + (i % 2) * 20),
    r: 2 + (i % 3),
    cluster: i % 4,
  }));
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <div ref={ref} style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180 }}>
      <div style={{ fontSize: 7, color: "var(--fg-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>SEMANTIC_CLUSTER_MAP</div>
      <svg width="100%" viewBox="0 0 280 120" style={{ display: "block" }}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
            fill={colors[d.cluster]}
            style={{
              opacity: inView ? 0.7 : 0,
              animation: inView ? `dotPulse ${2 + (i % 3)}s ease-in-out infinite` : "none",
              animationDelay: `${i * 0.1}s`,
              transition: "opacity 0.5s ease",
            }}
          />
        ))}
        {inView && dots.slice(0, 12).map((d, i) => {
          const next = dots[(i + 1) % 12];
          return (
            <line key={`l${i}`} x1={d.cx} y1={d.cy} x2={next.cx} y2={next.cy}
              stroke={colors[d.cluster]} strokeWidth="0.5" opacity="0.2"
              style={{ animation: "fadeIn 1s ease", animationDelay: `${i * 0.15}s` }}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>SIMILARITY</div>
          <div style={{ height: 4, background: "var(--border)", overflow: "hidden" }}>
            <div className="bar-fill" style={{ height: "100%", background: "var(--chart-2)", width: "92%", "--fill-width": "92%" }} />
          </div>
          <div style={{ fontSize: 7, color: "var(--chart-2)", marginTop: 2 }}>0.92</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>CLUSTERS</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 8px var(--primary-glow)" }}>147</div>
        </div>
      </div>
    </div>
  );
}

// ─── Module Preview: Self-Reflection Radar ────────────────────────────────────
function ReflectionPreview() {
  const [ref, inView] = useInView();
  const [scores, setScores] = useState([0, 0, 0, 0, 0]);
  const labels = ["Planning", "Reasoning", "Verification", "Adaptation", "Coherence"];
  useEffect(() => {
    if (!inView) return;
    const targets = [85, 92, 78, 88, 90];
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setScores(targets.map(t => Math.min(t, Math.floor(t * frame / 30))));
      if (frame >= 30) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [inView]);

  const cx = 100, cy = 100, maxR = 70;
  const angle = (i) => (i * 2 * Math.PI) / 5 - Math.PI / 2;
  const point = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });

  return (
    <div ref={ref} style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180 }}>
      <div style={{ fontSize: 7, color: "var(--fg-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>METACOGNITIVE_RADAR</div>
      <svg width="100%" viewBox="0 0 200 200" style={{ display: "block", margin: "0 auto" }}>
        {[0.25, 0.5, 0.75, 1].map((s, i) => (
          <polygon key={i}
            points={[0,1,2,3,4].map(j => { const p = point(j, maxR * s); return `${p.x},${p.y}`; }).join(" ")}
            fill="none" stroke="var(--border)" strokeWidth="0.5" opacity={0.5 + i * 0.1}
          />
        ))}
        {[0,1,2,3,4].map(i => {
          const p = point(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />;
        })}
        <polygon
          points={scores.map((s, i) => { const p = point(i, (s / 100) * maxR); return `${p.x},${p.y}`; }).join(" ")}
          fill="rgba(200,136,42,0.15)" stroke="var(--primary)" strokeWidth="1.5"
          style={{ transition: "all 0.1s linear" }}
        />
        {labels.map((l, i) => {
          const p = point(i, maxR + 18);
          return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--fg-dim)" fontSize="7" fontFamily="inherit">{l}</text>;
        })}
        {scores.map((s, i) => {
          const p = point(i, (s / 100) * maxR);
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--primary)" style={{ transition: "all 0.1s linear" }} />;
        })}
      </svg>
      <div style={{ textAlign: "center", fontSize: 8, color: "var(--muted)", marginTop: 4 }}>
        Overall Score: <span style={{ color: "var(--primary)", fontWeight: 700 }}>{Math.round(scores.reduce((a,b)=>a+b,0)/5)}%</span>
      </div>
    </div>
  );
}

// ─── Module Preview: Tool Arsenal ─────────────────────────────────────────────
function ToolPreview() {
  const [ref, inView] = useInView();
  const [step, setStep] = useState(0);
  const tools = [
    { name: "calculator", icon: "🔢", input: "142 * 3.14", output: "445.88" },
    { name: "knowledge", icon: "📚", input: "quantum computing", output: "Retrieved 12 docs" },
    { name: "datetime", icon: "🕐", input: "current time", output: "2025-03-19 09:42:15" },
  ];
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setStep(s => (s + 1) % 6), 1000);
    return () => clearInterval(iv);
  }, [inView]);

  const toolIdx = Math.floor(step / 2);
  const showOutput = step % 2 === 1;

  return (
    <div ref={ref} className="preview-terminal" style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 16, minHeight: 180 }}>
      <div style={{ fontSize: 7, color: "var(--fg-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>TOOL_INVOCATION_LOG</div>
      {tools.map((t, i) => (
        <div key={i} style={{
          opacity: toolIdx >= i ? 1 : 0.2,
          padding: "8px",
          marginBottom: 4,
          border: "1px solid var(--border)",
          background: toolIdx === i ? "rgba(200,136,42,0.04)" : "transparent",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span>{t.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.name}</span>
            {toolIdx === i && <span style={{ width: 4, height: 4, borderRadius: "50%", background: showOutput ? "var(--chart-2)" : "var(--chart-3)", animation: "pulse 1s infinite", marginLeft: "auto" }} />}
          </div>
          <div style={{ fontSize: 8, color: "var(--muted)" }}>
            <span style={{ color: "var(--fg-dim)" }}>in:</span> {t.input}
          </div>
          {toolIdx > i || (toolIdx === i && showOutput) ? (
            <div style={{ fontSize: 8, color: "var(--chart-2)", marginTop: 2, animation: "fadeIn 0.3s ease" }}>
              <span style={{ color: "var(--fg-dim)" }}>out:</span> {t.output}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ id, icon, title, desc, tags, preview, delay }) {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState(false);

  return (
    <div ref={ref} style={{
      position: "relative",
      border: "1px solid var(--border)",
      background: "var(--card)",
      transition: "all 0.5s ease",
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(20px)",
      transitionDelay: `${delay}ms`,
      cursor: "default",
      overflow: "hidden",
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Corner decorations */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "1px solid rgba(200,136,42,0.3)", borderRight: "1px solid rgba(200,136,42,0.3)", transition: "all 0.3s", borderColor: hovered ? "rgba(200,136,42,0.6)" : "rgba(200,136,42,0.3)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "1px solid rgba(200,136,42,0.3)", borderLeft: "1px solid rgba(200,136,42,0.3)", transition: "all 0.3s", borderColor: hovered ? "rgba(200,136,42,0.6)" : "rgba(200,136,42,0.3)" }} />

      {/* Header */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--fg-dim)", border: "1px solid var(--border)", padding: "2px 6px", textTransform: "uppercase" }}>{id}</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{title}</h3>
        <p style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>{desc}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {tags.map(t => (
            <span key={t} style={{ fontSize: 7, letterSpacing: "0.1em", color: "var(--primary)", border: "1px solid rgba(200,136,42,0.2)", background: "rgba(200,136,42,0.05)", padding: "2px 5px", textTransform: "uppercase" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div style={{ borderTop: "1px solid var(--border)", padding: 0, background: hovered ? "rgba(200,136,42,0.02)" : "transparent", transition: "background 0.3s" }}>
        {preview}
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
        <span style={{ color: "rgba(200,136,42,0.4)", fontSize: 12, padding: "0 8px", fontFamily: "inherit" }}>>_</span>
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

  const s = {
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
            <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 20 }}>Launching Agentrix.io terminal…</p>
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
      <button style={s.backBtn} onClick={onBack}>← Agentrix.io</button>
      {ThemeBtn && <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>}
      <div style={s.card}>
        <div style={s.headerBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, border: "1px solid rgba(200,136,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>>_</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Agentrix.io / Auth Module</p>
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

        <div style={s.footer}>
          <span style={{ fontSize: 9, color: "var(--fg-dim)", letterSpacing: "0.08em" }}>{isLogin ? "No account?" : "Have an account?"}</span>
          <button style={{ background: "none", border: "none", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,136,42,0.7)", cursor: "pointer", fontFamily: "inherit" }} onClick={onSwitch}>
            {isLogin ? "Register →" : "← Sign In"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 8, color: "rgba(90,78,64,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 16 }}>
          Agentrix.io v2.4.1 · End-to-end encrypted
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
    if (onEnterApp) { onEnterApp(); return; }
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
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Welcome to Agentrix.io</p>
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

  // ── Data ────────────────────────────────────────────────────────────────────
  const features = [
    { id: "MOD_01", icon: "⚡", title: "Chat Interface", desc: "Three reasoning modes: Standard (tool-calling), Multi-Agent (orchestrated specialists), Deep Research (decomposition + verification). Real-time streaming with markdown rendering.", tags: ["LangGraph", "Groq", "Multi-Mode"], preview: <ChatPreview /> },
    { id: "MOD_02", icon: "🕸", title: "Task Graph", desc: "Live DAG visualization of agent execution. Watch orchestrators spawn sub-agents, track node timing, status, and retry counts in real-time.", tags: ["DAG Viewer", "Real-Time", "Agent Flow"], preview: <TaskGraphPreview /> },
    { id: "MOD_03", icon: "⚔️", title: "Debate Arena", desc: "Adversarial agents — Proposer vs Critic — debate any topic over configurable rounds via SSE streaming. Impartial judge delivers live verdicts.", tags: ["AutoGen", "SSE Stream", "Adversarial"], preview: <DebatePreview /> },
    { id: "MOD_04", icon: "🧠", title: "Memory Intel", desc: "ChromaDB-backed episodic memory. Semantic clusters, similarity scoring, and knowledge quality timelines that evolve with every session.", tags: ["ChromaDB", "Embeddings", "Semantic"], preview: <MemoryPreview /> },
    { id: "MOD_05", icon: "🔬", title: "Self-Reflection", desc: "Post-task metacognitive analysis. Radar-chart scoring across planning, reasoning, verification, and adaptation dimensions.", tags: ["Metacognition", "Self-Correction"], preview: <ReflectionPreview /> },
    { id: "MOD_06", icon: "🛠", title: "Tool Arsenal", desc: "Calculator, knowledge retriever, datetime — plus extensible tool interface via LangChain. The agent decides when and how to call each.", tags: ["Calculator", "KnowledgeBase", "Extensible"], preview: <ToolPreview /> },
  ];

  const techStack = ["LangGraph", "Groq", "AutoGen", "ChromaDB", "FastAPI", "Next.js", "Zustand", "SSE", "Pydantic", "LangChain", "Radar Charts", "DAG Viewer"];

  const S = {
    page: { background: "var(--bg)", color: "var(--fg)", fontFamily: "'JetBrains Mono', monospace", overflowX: "hidden" },
    nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: scrollY > 40 ? "1px solid var(--border)" : "1px solid transparent", background: scrollY > 40 ? (isDark ? "rgba(15,13,11,0.85)" : "rgba(250,247,242,0.85)") : "transparent", transition: "all 0.3s", backdropFilter: scrollY > 40 ? "blur(12px)" : "none", WebkitBackdropFilter: scrollY > 40 ? "blur(12px)" : "none" },
    navInner: { maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    section: { maxWidth: 1200, margin: "0 auto", padding: "96px 24px" },
    sectionHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 56 },
    divider: { flex: 1, height: 1, background: "var(--border)" },
    badge: { border: "1px solid var(--border)", background: "var(--card)", padding: "8px 16px" },
    primaryBtn: { padding: "14px 32px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, border: "1px solid rgba(200,136,42,0.6)", background: "rgba(200,136,42,0.1)", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s" },
    secondaryBtn: { padding: "14px 28px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-fg)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s" },
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
              <div style={{ width: 28, height: 28, border: "1px solid rgba(200,136,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 8px var(--primary-glow)" }}>>_</div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "var(--primary)", textTransform: "uppercase", textShadow: "0 0 8px var(--primary-glow)" }}>Agentrix.io</span>
              <span style={{ fontSize: 8, color: "var(--fg-dim)", letterSpacing: "0.1em" }}>v2.4.1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ThemeBtn style={{ marginRight: 4 }} />
              <button onClick={() => setView("login")} style={{ ...S.secondaryBtn, padding: "8px 16px" }}>Sign In</button>
              <button onClick={() => setView("register")} style={{ ...S.primaryBtn, padding: "8px 16px" }}>Get Started</button>
            </div>
          </div>
        </nav>

        {/* ═══ HERO ═══ */}
        <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px", overflow: "hidden" }}>
          <GridBg />
          <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, borderRadius: "50%", opacity: 0.08, filter: "blur(80px)", pointerEvents: "none", background: "radial-gradient(ellipse, var(--primary) 0%, transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 900, width: "100%" }}>
            {/* Status */}
            <RevealSection>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", background: "var(--card)", padding: "8px 16px", marginBottom: 40 }}>
                <span style={{ width: 6, height: 6, background: "var(--chart-2)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>System Online</span>
                <span style={{ color: "var(--border)" }}>|</span>
                <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--primary)", textTransform: "uppercase" }}>All Agents Ready</span>
              </div>
            </RevealSection>

            {/* Boot block */}
            <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "24px", marginBottom: 28, textAlign: "left" }}>
              <p style={{ fontSize: 8, letterSpacing: "0.2em", color: "var(--fg-dim)", marginBottom: 8, textTransform: "uppercase" }}>SYS_BOOT / v2.4.1 / Agentrix.io_CORE</p>
              <h1 style={{ fontSize: "clamp(16px, 3vw, 28px)", fontWeight: 700, letterSpacing: "0.15em", color: "var(--primary)", textTransform: "uppercase", textShadow: "0 0 20px var(--primary-glow)", lineHeight: 1.3 }}>
                {headline.displayed}
                {!headline.done && <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--primary)", marginLeft: 4, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </h1>
              <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 10 }}>
                {sub.displayed}
                {headline.done && !sub.done && <span style={{ display: "inline-block", width: 2, height: "0.9em", background: "var(--muted)", marginLeft: 4, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </p>
            </div>

            <RevealSection delay={200}>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 36px" }}>
                An advanced AI platform that orchestrates specialist agents for reasoning, research, adversarial debate, and metacognitive self-reflection — with a retro terminal interface built for cognitive depth.
              </p>
            </RevealSection>

            {/* CTAs */}
            <RevealSection delay={300}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 56 }}>
                <button style={S.primaryBtn}
                  onClick={() => setView("register")}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.2)"; e.currentTarget.style.boxShadow = "0 0 28px -8px var(--primary-glow)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  >_ Initialize Session
                </button>
                <button style={S.secondaryBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >View Architecture →</button>
              </div>
            </RevealSection>

            {/* Stats */}
            <RevealSection delay={400}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
                {[{ val: 3, s: "", l: "Reasoning Modes" }, { val: 6, s: "", l: "Cognitive Modules" }, { val: 99, s: "%", l: "Uptime" }, { val: 4, s: "+", l: "Agent Types" }].map(({ val, s, l }) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)", lineHeight: 1 }}><Counter target={val} suffix={s} /></p>
                    <p style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--fg-dim)", textTransform: "uppercase", marginTop: 6 }}>{l}</p>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>

          {/* Tech Ticker */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid var(--border)", background: isDark ? "rgba(15,13,11,0.9)" : "rgba(250,247,242,0.9)", overflow: "hidden", padding: "10px 0" }}>
            <div style={{ display: "flex", animation: "tickerScroll 20s linear infinite", whiteSpace: "nowrap" }}>
              {[...techStack, ...techStack].map((t, i) => (
                <span key={i} style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--fg-dim)", textTransform: "uppercase", padding: "0 24px", flexShrink: 0 }}>
                  <span style={{ color: "var(--primary)", marginRight: 8 }}>◆</span>{t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ MODULE PREVIEWS ═══ */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <RevealSection>
            <div style={S.sectionHeader}>
              <div style={S.divider} />
              <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Module Index</span></div>
              <div style={S.divider} />
            </div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
              Cognitive <span style={{ color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)" }}>Modules</span>
            </h2>
            <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 50 }}>Six specialized interfaces. One unified intelligence.</p>
          </RevealSection>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {features.map((f, i) => <FeatureCard key={f.id} {...f} delay={i * 100 + 200} />)}
          </div>
        </section>

        {/* ═══ AGENT ARCHITECTURE ═══ */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <RevealSection>
            <div style={S.sectionHeader}>
              <div style={S.divider} />
              <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Agent Architecture</span></div>
              <div style={S.divider} />
            </div>
          </RevealSection>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            <RevealSection delay={100}>
              <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 24, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: "1px solid rgba(200,136,42,0.3)", borderRight: "1px solid rgba(200,136,42,0.3)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: "1px solid rgba(200,136,42,0.3)", borderLeft: "1px solid rgba(200,136,42,0.3)" }} />
                <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--fg-dim)", textTransform: "uppercase", marginBottom: 20 }}>ORCHESTRATION_GRAPH</p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <div style={{ border: "1px solid rgba(200,136,42,0.5)", background: "rgba(200,136,42,0.08)", padding: "10px 24px", fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em", textShadow: "0 0 8px var(--primary-glow)" }}>🎯 Orchestrator</div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, width: "100%" }}>
                    {[["🔍", "Researcher", "var(--chart-1)"], ["📊", "Analyst", "var(--chart-2)"], ["✍️", "Writer", "var(--chart-3)"], ["🔬", "Critic", "var(--chart-4)"]].map(([ic, lab, col]) => (
                      <div key={lab} style={{ border: `1px solid ${col}40`, padding: "12px 6px", textAlign: "center", transition: "all 0.3s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${col}80`; e.currentTarget.style.background = `${col}08`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${col}40`; e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{ic}</div>
                        <p style={{ fontSize: 8, color: col, textTransform: "uppercase", letterSpacing: "0.1em" }}>{lab}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "rgba(74,175,122,0.06)", padding: "10px 24px", fontSize: 10, fontWeight: 700, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.12em" }}>🔗 Aggregator</div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ border: "1px solid var(--border)", background: "var(--secondary)", padding: "10px 24px", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>📄 Final Response</div>
                </div>
              </div>
            </RevealSection>
            <RevealSection delay={200}>
              <div>
                <h2 style={{ fontSize: "clamp(16px, 2.5vw, 24px)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
                  Specialist Agents,{" "}
                  <span style={{ color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)" }}>Unified Output</span>
                </h2>
                <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 20 }}>
                  Every multi-agent query runs a full orchestration pipeline. The Orchestrator decomposes, assigns specialists, and an Aggregator synthesizes a coherent final answer with critic verification.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[["Researcher", "var(--chart-1)", "Gathers facts, explores topic depth comprehensively"],
                    ["Analyst", "var(--chart-2)", "Identifies patterns, data-driven evaluations"],
                    ["Writer", "var(--chart-3)", "Structures and articulates the output clearly"],
                    ["Critic", "var(--chart-4)", "Flags logical gaps and suggests improvements"]].map(([a, col, d]) => (
                    <div key={a} style={{ display: "flex", gap: 12, border: "1px solid var(--border)", background: "var(--card)", padding: "12px 14px", alignItems: "flex-start", transition: "all 0.3s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${col}60`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: col, width: 70, flexShrink: 0, paddingTop: 2 }}>{a}</span>
                      <p style={{ fontSize: 10, color: "var(--muted)" }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══ REASONING MODES ═══ */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <RevealSection>
            <div style={S.sectionHeader}>
              <div style={S.divider} />
              <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Reasoning Modes</span></div>
              <div style={S.divider} />
            </div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
              Three Modes of <span style={{ color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)" }}>Intelligence</span>
            </h2>
            <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 40 }}>From quick answers to deep research. Choose your depth.</p>
          </RevealSection>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
            {[
              { mode: "Standard", icon: "⚡", color: "var(--chart-1)", depth: 2, desc: "Direct tool-calling with fast responses. Best for straightforward queries.", features: ["Tool Calling", "Fast Response", "Markdown Render"] },
              { mode: "Multi-Agent", icon: "🤝", color: "var(--chart-2)", depth: 4, desc: "Orchestrated specialist agents collaborate on complex problems.", features: ["Orchestration", "Task Decomposition", "Agent Collaboration"] },
              { mode: "Deep Research", icon: "🔬", color: "var(--chart-3)", depth: 6, desc: "Full decomposition with verification chains and source citation.", features: ["Verification Chains", "Source Citation", "Multi-Step Reasoning"] },
            ].map((m, i) => (
              <RevealSection key={m.mode} delay={i * 100}>
                <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 20, position: "relative", transition: "all 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${m.color}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `1px solid ${m.color}40`, borderRight: `1px solid ${m.color}40` }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: "0.12em" }}>{m.mode}</p>
                      <p style={{ fontSize: 8, color: "var(--fg-dim)", letterSpacing: "0.1em" }}>DEPTH LEVEL {m.depth}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>{m.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {m.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 8, color: m.color }}>✓</span>
                        <span style={{ fontSize: 9, color: "var(--fg-dim)", letterSpacing: "0.05em" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Comparison Table */}
          <RevealSection>
            <div style={{ border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
              {[["Feature", "Standard", "Multi-Agent", "Deep Research"],
                ["Tool Calling", "✓", "✓", "✓"],
                ["Orchestration", "—", "✓", "✓"],
                ["Task Decomposition", "—", "✓", "✓"],
                ["Verification Chains", "—", "—", "✓"],
                ["Source Citation", "—", "—", "✓"],
                ["Reasoning Depth", "2", "4", "6"]].map((row, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: ri < 6 ? "1px solid var(--border)" : "none", background: ri === 0 ? "rgba(200,136,42,0.04)" : "transparent", transition: "background 0.2s" }}
                  onMouseEnter={e => { if (ri > 0) e.currentTarget.style.background = "rgba(200,136,42,0.02)"; }}
                  onMouseLeave={e => { if (ri > 0) e.currentTarget.style.background = "transparent"; }}
                >
                  {row.map((cell, ci) => (
                    <div key={ci} style={{ padding: "10px 16px", borderLeft: ci > 0 ? "1px solid var(--border)" : "none", color: ci === 0 ? "var(--muted)" : ci === 2 ? "var(--chart-1)" : ci === 3 ? "var(--chart-2)" : "var(--fg-dim)", textAlign: ci > 0 ? "center" : "left", fontWeight: ri === 0 ? 700 : 400, letterSpacing: ri === 0 ? "0.12em" : "0", textTransform: ri === 0 ? "uppercase" : "none", fontSize: ri === 0 ? 9 : 10 }}>
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </RevealSection>
        </section>

        {/* ═══ PERFORMANCE METRICS ═══ */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <RevealSection>
            <div style={S.sectionHeader}>
              <div style={S.divider} />
              <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>Performance Metrics</span></div>
              <div style={S.divider} />
            </div>
          </RevealSection>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
            {[{ v: 94, s: "%", l: "Multi-Agent Accuracy" }, { v: 3, s: "x", l: "Research Depth" }, { v: 147, s: "", l: "Knowledge Clusters" }, { v: 300, s: "ms", l: "Avg Response" }].map(({ v, s, l }, i) => (
              <RevealSection key={l} delay={i * 80}>
                <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 20, textAlign: "center", transition: "all 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <p style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)", lineHeight: 1 }}><Counter target={v} suffix={s} /></p>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 6 }}>{l}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(200,136,42,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <RevealSection>
            <div style={{ maxWidth: 600, margin: "0 auto", border: "1px solid var(--border)", background: "var(--card)", padding: 48, textAlign: "center", position: "relative" }}>
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
              <h2 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                Ready to enter the{" "}
                <span style={{ color: "var(--primary)", textShadow: "0 0 14px var(--primary-glow)" }}>terminal?</span>
              </h2>
              <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
                Initialize your agent profile and access the full suite of cognitive modules. Free to start. No credit card required.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={S.primaryBtn} onClick={() => setView("register")}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.22)"; e.currentTarget.style.boxShadow = "0 0 28px -8px rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}>
                  >_ Initialize Profile
                </button>
                <button style={S.secondaryBtn} onClick={() => setView("login")}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >Sign In →</button>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, border: "1px solid rgba(200,136,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--primary)" }}>>_</div>
              <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--fg-dim)", textTransform: "uppercase" }}>Agentrix.io v2.4.1 — Autonomous Multi-Agent Cognitive System</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Docs", "GitHub", "API", "Privacy"].map(item => (
                <span key={item} style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(90,78,64,0.5)", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "rgba(200,136,42,0.7)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(90,78,64,0.5)"; }}
                >{item}</span>
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
