"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Bot,
  Brain,
  CheckCircle2,
  FileText,
  Link2,
  MessageSquare,
  Microscope,
  PenLine,
  Scale,
  Search,
  Target,
  Users,
  Zap
} from "lucide-react";


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
      <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
  @keyframes ripplePulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
  @keyframes synapseFire { 0% { stroke-dashoffset: 100; opacity: 0.3; } 50% { opacity: 1; } 100% { stroke-dashoffset: -100; opacity: 0.3; } }
  @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
  @keyframes brainPulse { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.05); filter: brightness(1.3); } }
  @keyframes ghostLine { 0% { stroke-dashoffset: 40; opacity: 0.1; } 100% { stroke-dashoffset: 0; opacity: 0.4; } }
  .float-particle {
    animation: floatUp 3s ease-in-out infinite;
  }

  .module-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: stretch;
  }

  @media (max-width: 900px) {
    .module-grid {
      grid-template-columns: 1fr;
    }
    .pipeline-node {
      width: 110px !important;
      padding: 6px 8px !important;
    }
    .pipeline-node-label {
      display: none;
    }
  }

  .preview-shell {
    border: 1px solid var(--border);
    background: var(--card);
    padding: 16px;
    min-height: 250px;
    position: relative;
    width: 100%;
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
    padding: 6px 8px;
    width: 110px;
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
// --- Module Preview: Chat Interface ---
function MetricBars({ confidence = 86, consistency = 82 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
      <div>
        <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>CONFIDENCE</div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div className="bar-fill" style={{ height: "100%", background: "var(--chart-2)", width: `${confidence}%`, "--fill-width": `${confidence}%` }} />
        </div>
        <div style={{ fontSize: 7, color: "var(--chart-2)", marginTop: 2 }}>{confidence}%</div>
      </div>
      <div>
        <div style={{ fontSize: 7, color: "var(--fg-dim)", marginBottom: 4 }}>LOGICAL CONSISTENCY</div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div className="bar-fill" style={{ height: "100%", background: "var(--primary)", width: `${consistency}%`, "--fill-width": `${consistency}%` }} />
        </div>
        <div style={{ fontSize: 7, color: "var(--primary)", marginTop: 2 }}>{consistency}%</div>
      </div>
    </div>
  );
}

function ChatPreview() {
  const [ref, inView] = useInView();
  const [mode, setMode] = useState(0);
  const [stdText, setStdText] = useState("");
  const [multiText, setMultiText] = useState("");
  const [multiDone, setMultiDone] = useState(false);
  const [agentStep, setAgentStep] = useState(0);

  // New states for DRS (Deep Research)
  const [drsText, setDrsText] = useState("");
  const [drsThinkingIdx, setDrsThinkingIdx] = useState(-1);
  const [drsDone, setDrsDone] = useState(false);

  const standardText = "I've drafted a compact 3-tier pricing structure for your service. Each tier includes a distinct price point and a clear focus on value delivery.";
  const drsThinkingSteps = ["Decomposing task", "Scanning knowledge base", "Cross-referencing vectors", "Synthesizing deep analysis"];
  const drsResponse = "Market Analysis: Demand is shifting toward low-latency AI tooling with strong privacy guarantees.\n\nKey Findings:\n1. Infrastructure spend is rising despite tightening budgets.\n2. Enterprises prioritize transparent governance over raw performance.\n\nRecommendation: Focus on compliance and measurable ROI for the Q2 roadmap.";
  const multiResponse = "Generated a hero, feature grid, and CTA section with responsive spacing.";

  useEffect(() => {
    if (!inView) return;
    let timer;
    const runCycle = (idx) => {
      setMode(idx);
      // STD: 6s, DRS: 12.5s, MAS: 8s
      const durations = [6000, 12500, 8000];
      timer = setTimeout(() => {
        runCycle((idx + 1) % 3);
      }, durations[idx]);
    };
    runCycle(0);
    return () => clearTimeout(timer);
  }, [inView]);

  useEffect(() => {
    if (!inView || mode !== 0) return;
    setStdText("");
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setStdText(standardText.slice(0, i));
      if (i >= standardText.length) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [inView, mode]);

  // Deep Research (DRS) effect
  useEffect(() => {
    if (!inView || mode !== 1) return;
    setDrsText("");
    setDrsThinkingIdx(-1);
    setDrsDone(false);

    let thinkingIv;
    let streamIv;

    // Start thinking after 500ms
    const thinkStart = setTimeout(() => {
      let tIdx = 0;
      setDrsThinkingIdx(0);
      thinkingIv = setInterval(() => {
        tIdx++;
        if (tIdx < drsThinkingSteps.length) {
          setDrsThinkingIdx(tIdx);
        } else {
          clearInterval(thinkingIv);
          setDrsThinkingIdx(-1); // Done thinking

          // Start streaming after thinking is done
          let sIdx = 0;
          streamIv = setInterval(() => {
            sIdx++;
            setDrsText(drsResponse.slice(0, sIdx));
            if (sIdx >= drsResponse.length) {
              clearInterval(streamIv);
              setDrsDone(true);
            }
          }, 15);
        }
      }, 1400); // 1.4s per step * 4 = 5.6s (Adds 2s total over original 3.6s)
    }, 500);

    return () => {
      clearTimeout(thinkStart);
      if (thinkingIv) clearInterval(thinkingIv);
      if (streamIv) clearInterval(streamIv);
    };
  }, [inView, mode]);

  useEffect(() => {
    if (!inView || mode !== 2) return;
    setMultiText("");
    setMultiDone(false);
    setAgentStep(0);
    const agentIv = setInterval(() => setAgentStep(s => (s + 1) % 3), 520);
    let typeIv;
    const startTyping = setTimeout(() => {
      let i = 0;
      typeIv = setInterval(() => {
        i += 1;
        setMultiText(multiResponse.slice(0, i));
        if (i >= multiResponse.length) { clearInterval(typeIv); setMultiDone(true); }
      }, 14);
    }, 700);
    return () => { clearInterval(agentIv); clearTimeout(startTyping); if (typeIv) clearInterval(typeIv); };
  }, [inView, mode]);

  const modes = [
    { key: "STD", label: "Standard", color: "var(--fg-dim)" },
    { key: "DRS", label: "Deep Research", color: "var(--chart-2)" },
    { key: "MAS", label: "Multi-Agent", color: "var(--chart-1)" },
  ];

  const promptText = mode === 0
    ? "Draft a compact pricing table."
    : mode === 1
      ? "Summarize market trends in 2024."
      : "Design a landing page hero with CTA.";

  return (
    <div ref={ref} className="preview-shell" style={{ position: "relative", height: 350 }}>
      <div style={{ position: "absolute", top: 5, left: 0, right: 0, bottom: 40, overflow: "hidden" }}>
        <div style={{ transform: "scale(0.92)", transformOrigin: "top center", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: "1px dashed var(--border)" }}>
            {modes.map((m, i) => (
              <span key={m.key} style={{
                fontSize: 7, letterSpacing: "0.1em", padding: "2px 6px",
                border: `1px solid ${mode === i ? m.color : "var(--border)"}`,
                background: mode === i ? "rgba(200,136,42,0.08)" : "transparent",
                color: mode === i ? m.color : "var(--fg-dim)",
                transition: "all 0.2s",
                textTransform: "uppercase"
              }}>{m.key}</span>
            ))}
            <span style={{ fontSize: 7, color: "var(--fg-dim)", marginLeft: "auto" }}>CHAT_INTERFACE</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 150 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, maxWidth: "75%" }}>
                <span style={{ fontSize: 7, color: "var(--fg-dim)", textTransform: "uppercase" }}>USER</span>
                <div style={{ border: "1px solid rgba(200,136,42,0.4)", background: "rgba(200,136,42,0.08)", padding: "6px 8px", fontSize: 8, lineHeight: 1.6 }}>
                  {promptText}
                </div>
              </div>
              <div style={{ width: 20, height: 20, border: "1px solid var(--border)", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "var(--fg-dim)" }}>ME</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 20, height: 20, border: "1px solid rgba(200,136,42,0.6)", background: "rgba(200,136,42,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "var(--primary)" }}>AI</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {(mode === 1 && drsThinkingIdx >= 0) ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeIn 0.3s ease" }}>
                      <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "var(--chart-2)", animation: "pulse 1s infinite" }} />
                      <span style={{ fontSize: 7, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Thinking: {drsThinkingSteps[drsThinkingIdx]}...
                      </span>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 7, color: "var(--fg-dim)", textTransform: "uppercase" }}>AMCAS</span>
                      {mode !== 0 && (
                        <span style={{ fontSize: 7, color: mode === 1 ? "var(--chart-2)" : "var(--chart-1)", border: `1px solid ${mode === 1 ? "var(--chart-2)" : "var(--chart-1)"}`, padding: "1px 4px", textTransform: "uppercase" }}>
                          {mode === 1 ? "DRS" : "MAS"}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {mode === 0 && (
                  <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "8px", fontSize: 8, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      {stdText}
                      {stdText.length < standardText.length && (
                        <span style={{ display: "inline-block", width: 4, height: 8, background: "var(--primary)", marginLeft: 3, animation: "blink 1s infinite" }} />
                      )}
                    </div>
                    {stdText.length === standardText.length && (
                      <div style={{ animation: "fadeIn 0.5s ease", border: "1px dashed var(--border)", background: "var(--bg)", padding: 6 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                          {[
                            { name: "BASIC", price: "$0", color: "var(--fg-dim)" },
                            { name: "PRO", price: "$29", color: "var(--primary)" },
                            { name: "ENT", price: "$99", color: "var(--chart-1)" }
                          ].map(tier => (
                            <div key={tier.name} style={{ border: "1px solid var(--border)", padding: "4px 2px", textAlign: "center" }}>
                              <div style={{ fontSize: 5, color: "var(--fg-dim)", marginBottom: 2 }}>{tier.name}</div>
                              <div style={{ fontSize: 7, fontWeight: "bold", color: tier.color, marginBottom: 3 }}>{tier.price}</div>
                              <div style={{ height: 2, background: "var(--border)", width: "60%", margin: "0 auto 2px" }} />
                              <div style={{ height: 2, background: "var(--border)", width: "40%", margin: "0 auto" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mode === 1 && (
                  <div>
                    {/* Response Bubble */}
                    {(drsThinkingIdx >= 0 || drsText || drsDone) && (
                      <div style={{ border: "1px solid var(--border)", background: "rgba(200,136,42,0.04)", padding: "8px", fontSize: 8, lineHeight: 1.6, whiteSpace: "pre-wrap", minHeight: 40 }}>
                        <div style={{ fontSize: 7, color: "var(--chart-2)", textTransform: "uppercase", marginBottom: 4 }}>Research Output</div>
                        {drsText}
                        {!drsDone && (
                          <span style={{ display: "inline-block", width: 4, height: 8, background: "var(--chart-2)", marginLeft: 3, animation: "blink 1s infinite" }} />
                        )}
                      </div>
                    )}

                    {drsDone && <MetricBars confidence={92} consistency={86} />}
                  </div>
                )}

                {mode === 2 && (
                  <div>
                    <div style={{ border: "1px solid var(--border)", background: "rgba(200,136,42,0.03)", padding: "6px 8px", marginBottom: 6 }}>
                      {["Planner", "Researcher", "Builder"].map((agent, i) => (
                        <div key={agent} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 7, color: i === agentStep ? "var(--primary)" : "var(--fg-dim)", marginBottom: 2 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === agentStep ? "var(--primary)" : "var(--border)", transition: "all 0.2s" }} />
                          {agent} {i === agentStep ? "generating" : "standby"}
                        </div>
                      ))}
                    </div>
                    <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "6px 8px", fontSize: 8, lineHeight: 1.6 }}>
                      {multiText}
                      {!multiDone && (
                        <span style={{ display: "inline-block", width: 4, height: 8, background: "var(--primary)", marginLeft: 3, animation: "blink 1s infinite" }} />
                      )}
                    </div>
                    {multiDone && (
                      <>
                        <MetricBars confidence={88} consistency={84} />
                        <div style={{ marginTop: 8, border: "1px solid var(--border)", background: "var(--secondary)", padding: 8 }}>
                          <div style={{ fontSize: 7, color: "var(--fg-dim)", textTransform: "uppercase", marginBottom: 4 }}>Generated UI</div>
                          <div style={{ border: "1px solid var(--border)", background: "var(--bg)", padding: 6 }}>
                            <div style={{ height: 6, background: "rgba(200,136,42,0.2)", marginBottom: 4 }} />
                            <div style={{ height: 4, background: "var(--border)", marginBottom: 4 }} />
                            <div style={{ height: 10, background: "rgba(74,175,122,0.2)", width: "60%" }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid var(--border)", background: "rgba(200,136,42,0.03)", backdropFilter: "blur(12px)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 6, zIndex: 10 }}>
        <div style={{ border: "1px solid var(--border)", padding: "4px 8px", fontSize: 8, color: "var(--primary)", background: "rgba(200,136,42,0.05)" }}>&gt;_</div>
        <div style={{ flex: 1, border: "1px solid var(--border)", background: "transparent", padding: "6px 10px", fontSize: 8, color: "var(--fg-dim)", borderRadius: 2 }}>Type your request...</div>
        <div style={{ border: "1px solid var(--primary)", background: "rgba(200,136,42,0.1)", padding: "4px 10px", fontSize: 8, color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase", cursor: "default" }}>Send</div>
      </div>
    </div>
  );
}

// --- Module Preview: Task Graph (pure SVG, no external library) ---
function TaskGraphPreview() {
  const [ref, inView] = useInView();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dashOffset, setDashOffset] = useState(0);
  const [showAppPreview, setShowAppPreview] = useState(false);
  const [appPreviewFrame, setAppPreviewFrame] = useState(0);

  // Animation sequence — tools share their agent's step (no separate slot)
  // Steps: orchestrator → agent1(+tool1) → agent2(+tool2) → agent3(+tool3) → debugger → output
  const order = ["orchestrator", "agent1", "agent2", "agent3", "debugger", "output"];

  // Map: which step each node ID is active on
  const nodeStep = {
    orchestrator: 0,
    agent1: 1, tool1: 1,   // tool1 active together with agent1
    agent2: 2, tool2: 2,   // tool2 active together with agent2
    agent3: 3, tool3: 3,   // tool3 active together with agent3
    debugger: 4,
    output: 5,
  };

  // Step through sequence - Output node active for 2 seconds, others for 900ms
  useEffect(() => {
    if (!inView) return;
    setActiveIndex(0);
    let timeoutId;
    const runStep = (index) => {
      setActiveIndex(index);
      const delay = order[index] === "output" ? 2000 : 900;
      timeoutId = setTimeout(() => {
        runStep((index + 1) % order.length);
      }, delay);
    };
    runStep(0);
    return () => clearTimeout(timeoutId);
  }, [inView]);

  // App preview visible exactly while output step is active
  useEffect(() => {
    if (order[activeIndex] === "output") {
      setShowAppPreview(true);
      setAppPreviewFrame(0);
    } else {
      setShowAppPreview(false);
    }
  }, [activeIndex]);

  // Animate app preview frames while visible
  useEffect(() => {
    if (!showAppPreview) return;
    const iv = setInterval(() => setAppPreviewFrame(f => (f + 1) % 4), 280);
    return () => clearInterval(iv);
  }, [showAppPreview]);

  // Flowing dash animation via rAF
  useEffect(() => {
    let frame;
    let off = 0;
    const tick = () => {
      off = (off - 0.6) % 20;
      setDashOffset(off);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const activeId = order[activeIndex];

  // A node is "active" if its assigned step matches current activeIndex
  const isActiveNode = (id) => nodeStep[id] === activeIndex;
  const VW = 810, VH = 460;

  const N = {
    orchestrator: { id: "orchestrator", label: "Orchestrator", sub: "ORCHESTRATOR · 0.2s", type: "orchestrator", cx: 70, cy: 230, w: 140, h: 50, kind: "rect", color: "#c8882a", glow: "rgba(200,136,42,0.6)", bg: "rgba(200,136,42,0.10)", abg: "rgba(200,136,42,0.22)" },
    agent1: { id: "agent1", label: "Coding Agent 1", sub: "AGENT · 1.1s", type: "agent", cx: 315, cy: 80, w: 140, h: 50, kind: "rect", color: "#c8882a", glow: "rgba(200,136,42,0.6)", bg: "rgba(200,136,42,0.08)", abg: "rgba(200,136,42,0.20)", activity: "Generating" },
    tool1: { id: "tool1", label: "Doc Tool", sub: "API", type: "agent", cx: 280, cy: 155, r: 24, kind: "tool", color: "#c8882a", glow: "rgba(200,136,42,0.6)", bg: "rgba(200,136,42,0.10)", abg: "rgba(200,136,42,0.24)" },
    agent2: { id: "agent2", label: "Coding Agent 2", sub: "AGENT · 0.9s", type: "agent", cx: 315, cy: 230, w: 140, h: 50, kind: "rect", color: "#4aaf7a", glow: "rgba(74,175,122,0.6)", bg: "rgba(74,175,122,0.08)", abg: "rgba(74,175,122,0.20)", activity: "Searching" },
    tool2: { id: "tool2", label: "Web Search", sub: "QUERY", type: "agent", cx: 345, cy: 155, r: 24, kind: "tool", color: "#4aaf7a", glow: "rgba(74,175,122,0.6)", bg: "rgba(74,175,122,0.10)", abg: "rgba(74,175,122,0.24)" },
    agent3: { id: "agent3", label: "Coding Agent 3", sub: "AGENT · 1.3s", type: "agent", cx: 315, cy: 360, w: 140, h: 50, kind: "rect", color: "#c8a42a", glow: "rgba(200,164,42,0.6)", bg: "rgba(200,164,42,0.08)", abg: "rgba(200,164,42,0.20)", activity: "Inspecting" },
    tool3: { id: "tool3", label: "Code Analyzer", sub: "SCAN", type: "agent", cx: 335, cy: 290, r: 24, kind: "tool", color: "#c8a42a", glow: "rgba(200,164,42,0.6)", bg: "rgba(200,164,42,0.10)", abg: "rgba(200,164,42,0.24)" },
    debugger: { id: "debugger", label: "Debugger", sub: "CRITIC · 0.7s", type: "critic", cx: 580, cy: 230, w: 140, h: 50, kind: "rect", color: "#c85a2a", glow: "rgba(200,90,42,0.6)", bg: "rgba(200,90,42,0.08)", abg: "rgba(200,90,42,0.20)", activity: "Verifying" },
    output: { id: "output", label: "Output", sub: "OUTPUT · done", type: "output", cx: 740, cy: 230, w: 140, h: 50, kind: "rect", color: "#7a9abf", glow: "rgba(122,154,191,0.6)", bg: "rgba(80,110,160,0.08)", abg: "rgba(80,110,160,0.22)" },
  };

  const isActive = id => isActiveNode(id);

  // Edge connection helpers
  const rL = n => ({ x: n.cx - n.w / 2, y: n.cy });
  const rR = n => ({ x: n.cx + n.w / 2, y: n.cy });
  const rT = n => ({ x: n.cx, y: n.cy - n.h / 2 });
  const rB = n => ({ x: n.cx, y: n.cy + n.h / 2 });
  const cT = n => ({ x: n.cx, y: n.cy - n.r });
  const cB = n => ({ x: n.cx, y: n.cy + n.r });

  // Compute all edges
  const buildEdges = () => {
    // An edge is active if any of its endpoint node IDs is currently active
    const e = (d, tx, ty, tdir, color, ids) => ({
      d, tx, ty, tdir, color,
      active: ids.some(id => isActiveNode(id)),
    });
    const n = N;
    return [
      // Orchestrator → Agent1 (elbow up-right)
      (() => { const f = rR(n.orchestrator), t = rL(n.agent1), mx = f.x + 40; return e(`M${f.x},${f.y} L${mx},${f.y} L${mx},${t.y} L${t.x},${t.y}`, t.x, t.y, "right", "#c8882a", ["orchestrator", "agent1"]); })(),
      // Orchestrator → Agent2 (straight)
      (() => { const f = rR(n.orchestrator), t = rL(n.agent2); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "right", "#4aaf7a", ["orchestrator", "agent2"]); })(),
      // Orchestrator → Agent3 (elbow down-right)
      (() => { const f = rR(n.orchestrator), t = rL(n.agent3), mx = f.x + 40; return e(`M${f.x},${f.y} L${mx},${f.y} L${mx},${t.y} L${t.x},${t.y}`, t.x, t.y, "right", "#c8a42a", ["orchestrator", "agent3"]); })(),
      // Agent1 → Tool1 (straight down - tool1 is now below agent1)
      (() => { const f = rB(n.agent1), t = cT(n.tool1); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "down", "#c8882a", ["agent1", "tool1"]); })(),
      // Agent2 → Tool2 (straight up - tool2 is now above agent2)
      (() => { const f = rT(n.agent2), t = cB(n.tool2); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "up", "#4aaf7a", ["agent2", "tool2"]); })(),
      // Agent3 → Tool3 (straight up)
      (() => { const f = rT(n.agent3), t = cB(n.tool3); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "up", "#c8a42a", ["agent3", "tool3"]); })(),
      // Agent1 → Debugger (elbow right-down)
      (() => { const f = rR(n.agent1), t = rL(n.debugger), mx = f.x + (t.x - f.x) * 0.5; return e(`M${f.x},${f.y} L${mx},${f.y} L${mx},${t.y} L${t.x},${t.y}`, t.x, t.y, "right", "#c85a2a", ["agent1", "debugger"]); })(),
      // Agent2 → Debugger (straight)
      (() => { const f = rR(n.agent2), t = rL(n.debugger); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "right", "#c85a2a", ["agent2", "debugger"]); })(),
      // Agent3 → Debugger (elbow right-up)
      (() => { const f = rR(n.agent3), t = rL(n.debugger), mx = f.x + (t.x - f.x) * 0.5; return e(`M${f.x},${f.y} L${mx},${f.y} L${mx},${t.y} L${t.x},${t.y}`, t.x, t.y, "right", "#c85a2a", ["agent3", "debugger"]); })(),
      // Debugger → Output (straight)
      (() => { const f = rR(n.debugger), t = rL(n.output); return e(`M${f.x},${f.y} L${t.x},${t.y}`, t.x, t.y, "right", "#7a9abf", ["debugger", "output"]); })(),
    ];
  };

  const edges = buildEdges();

  // Arrowhead (small circle at tip, matching TaskGraphPage style)
  const arrowDot = (x, y) => <circle key={`dot-${x}-${y}`} cx={x} cy={y} r={2.5} />;

  // Status color for nodes
  const statusOf = (id) => {
    const step = nodeStep[id];
    if (step < activeIndex) return "#4aaf7a";       // completed — green
    if (step === activeIndex) return "#c8a42a";     // running — amber
    return "rgba(120,110,100,0.4)";                 // pending — muted
  };

  // Render a rect node (matching TaskGraphPage style exactly)
  const renderRect = (n) => {
    const active = isActive(n.id);
    const x = n.cx - n.w / 2;
    const y = n.cy - n.h / 2;
    const col = n.color;
    const sc = statusOf(n.id);
    return (
      <g key={n.id} style={{ cursor: "default" }}>
        {/* Glow bloom behind active node */}
        {active && (
          <rect x={x - 8} y={y - 8} width={n.w + 16} height={n.h + 16} rx={4}
            fill={n.glow} opacity={0.15} style={{ filter: "blur(8px)" }} />
        )}
        {/* Node body */}
        <rect x={x} y={y} width={n.w} height={n.h} rx={0}
          fill={active ? n.abg : n.bg}
          stroke={active ? col : "var(--border)"}
          strokeWidth={active ? 1.5 : 1}
        />
        {/* Corner bracket accents when active — exactly like TaskGraphPage */}
        {active && (<>
          <line x1={x} y1={y + 7} x2={x} y2={y} stroke={col} strokeWidth={2} />
          <line x1={x} y1={y} x2={x + 7} y2={y} stroke={col} strokeWidth={2} />
          <line x1={x + n.w - 7} y1={y} x2={x + n.w} y2={y} stroke={col} strokeWidth={2} />
          <line x1={x + n.w} y1={y} x2={x + n.w} y2={y + 7} stroke={col} strokeWidth={2} />
          <line x1={x} y1={y + n.h - 7} x2={x} y2={y + n.h} stroke={col} strokeWidth={2} />
          <line x1={x} y1={y + n.h} x2={x + 7} y2={y + n.h} stroke={col} strokeWidth={2} />
          <line x1={x + n.w - 7} y1={y + n.h} x2={x + n.w} y2={y + n.h} stroke={col} strokeWidth={2} />
          <line x1={x + n.w} y1={y + n.h - 7} x2={x + n.w} y2={y + n.h} stroke={col} strokeWidth={2} />
        </>)}
        {/* Status dot (top-right, like TaskGraphPage) */}
        <circle cx={x + n.w - 10} cy={y + 10} r={3} fill={sc} />
        {/* Label */}
        <text x={n.cx} y={n.cy - 6} textAnchor="middle"
          fill={active ? col : "var(--fg)"}
          fontSize={9.5} fontWeight={600} fontFamily="JetBrains Mono,monospace">
          {n.label}
        </text>
        {/* Sub-label */}
        <text x={n.cx} y={n.cy + 9} textAnchor="middle"
          fill="var(--fg-dim)" fontSize={7.5} fontFamily="JetBrains Mono,monospace">
          {active && n.activity ? `▶ ${n.activity.toUpperCase()}...` : n.sub}
        </text>
      </g>
    );
  };

  // Render a tool circle node — r:24, text wrapped into 2 lines inside circle
  const renderTool = (n) => {
    const active = isActive(n.id);
    const col = n.color;
    // Smart split: "Doc Tool" → ["DOC", "TOOL"], "Web Search" → ["WEB", "SEARCH"], "Code Analyzer" → ["CODE", "ANALYZER"]
    const words = n.label.toUpperCase().split(" ");
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(" ");
    const line2 = words.slice(mid).join(" ");
    const hasTwo = line2.length > 0;
    // With r=24, text fits at fontSize 7.5 — two lines centered at cy±5, sub at cy+15
    return (
      <g key={n.id}>
        {active && <circle cx={n.cx} cy={n.cy} r={n.r + 10} fill={n.glow} opacity={0.16} style={{ filter: "blur(6px)" }} />}
        <circle cx={n.cx} cy={n.cy} r={n.r} fill={active ? n.abg : n.bg} stroke={active ? col : "var(--border)"} strokeWidth={active ? 1.5 : 1} />
        {/* Pulsing ring when active */}
        {active && <circle cx={n.cx} cy={n.cy} r={n.r} fill="none" stroke={col} strokeWidth={2} opacity={0.4} style={{ animation: "pulse 1s ease-in-out infinite" }} />}
        {/* Status dot — top-right of circle */}
        <circle cx={n.cx + n.r * 0.70} cy={n.cy - n.r * 0.70} r={2} fill={statusOf(n.id)} />
        {/* Label lines */}
        {hasTwo ? (
          <>
            <text x={n.cx} y={n.cy - 5} textAnchor="middle"
              fill={active ? col : "var(--fg)"} fontSize={7.5} fontWeight={700}
              fontFamily="JetBrains Mono,monospace">
              {line1}
            </text>
            <text x={n.cx} y={n.cy + 4} textAnchor="middle"
              fill={active ? col : "var(--fg)"} fontSize={7.5} fontWeight={700}
              fontFamily="JetBrains Mono,monospace">
              {line2}
            </text>
          </>
        ) : (
          <text x={n.cx} y={n.cy - 1.5} textAnchor="middle"
            fill={active ? col : "var(--fg)"} fontSize={7.5} fontWeight={700}
            fontFamily="JetBrains Mono,monospace">
            {line1}
          </text>
        )}
        {/* Sub-label below lines, still inside circle */}
        <text x={n.cx} y={n.cy + (hasTwo ? 15 : 12)} textAnchor="middle"
          fill="var(--fg-dim)" fontSize={6}
          fontFamily="JetBrains Mono,monospace">
          {n.sub}
        </text>
      </g>
    );
  };

  // Animated app preview (shown above Output node for 1.5s)
  const renderAppPreview = () => {
    if (!showAppPreview) return null;
    const ox = N.output.cx - N.output.w / 2;
    const oy = N.output.cy - N.output.h / 2;
    const pw = 140, ph = 96;
    const px = ox, py = oy - ph - 14;
    const col = N.output.color;
    const bars = [
      { w: appPreviewFrame >= 0 ? 56 : 0, col: "rgba(122,154,191,0.55)" },
      { w: appPreviewFrame >= 1 ? 80 : 0, col: "rgba(74,175,122,0.45)" },
      { w: appPreviewFrame >= 2 ? 40 : 0, col: "rgba(200,136,42,0.45)" },
      { w: appPreviewFrame >= 3 ? 65 : 0, col: "rgba(200,164,42,0.45)" },
    ];
    // Use foreignObject for full CSS var support inside SVG
    return (
      <g style={{ animation: "fadeIn 0.25s ease" }}>
        {/* connector line */}
        <line x1={N.output.cx} y1={oy} x2={N.output.cx} y2={py + ph}
          stroke={col} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        {/* Preview card background — uses CSS vars via rect fill */}
        <rect x={px} y={py} width={pw} height={ph} rx={0}
          fill="var(--card)" stroke={col} strokeWidth={1.2} />
        {/* Inner border (slightly inset) for depth */}
        <rect x={px + 1} y={py + 1} width={pw - 2} height={ph - 2} rx={0}
          fill="none" stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />
        {/* Corner bracket accents — like TaskGraphPage selected nodes */}
        <line x1={px} y1={py + 6} x2={px} y2={py} stroke={col} strokeWidth={1.5} />
        <line x1={px} y1={py} x2={px + 6} y2={py} stroke={col} strokeWidth={1.5} />
        <line x1={px + pw - 6} y1={py} x2={px + pw} y2={py} stroke={col} strokeWidth={1.5} />
        <line x1={px + pw} y1={py} x2={px + pw} y2={py + 6} stroke={col} strokeWidth={1.5} />
        <line x1={px} y1={py + ph - 6} x2={px} y2={py + ph} stroke={col} strokeWidth={1.5} />
        <line x1={px} y1={py + ph} x2={px + 6} y2={py + ph} stroke={col} strokeWidth={1.5} />
        <line x1={px + pw - 6} y1={py + ph} x2={px + pw} y2={py + ph} stroke={col} strokeWidth={1.5} />
        <line x1={px + pw} y1={py + ph - 6} x2={px + pw} y2={py + ph} stroke={col} strokeWidth={1.5} />
        {/* Header stripe — uses border color */}
        <rect x={px} y={py} width={pw} height={14} rx={0}
          fill={col} fillOpacity={0.10} />
        <line x1={px} y1={py + 14} x2={px + pw} y2={py + 14} stroke="var(--border)" strokeWidth={0.5} />
        {/* Window chrome dots */}
        <circle cx={px + 7} cy={py + 7} r={2.5} fill="rgba(200,90,42,0.7)" />
        <circle cx={px + 14} cy={py + 7} r={2.5} fill="rgba(200,164,42,0.6)" />
        <circle cx={px + 21} cy={py + 7} r={2.5} fill="rgba(74,175,122,0.7)" />
        {/* Title */}
        <text x={px + pw / 2} y={py + 9.5} textAnchor="middle"
          fill={col} fillOpacity={0.9}
          fontSize={5.5} fontFamily="JetBrains Mono,monospace" fontWeight={700}>
          GENERATED APP
        </text>
        {/* Bar tracks + fills */}
        {bars.map((b, i) => (
          <g key={i}>
            {/* Track */}
            <rect x={px + 8} y={py + 18 + i * 17} width={pw - 16} height={10} rx={1}
              fill="var(--border)" fillOpacity={0.3}
              stroke="var(--border)" strokeWidth={0.5} />
            {/* Fill */}
            <rect x={px + 8} y={py + 18 + i * 17} width={b.w} height={10} rx={1}
              fill={b.col}
              style={{ transition: "width 0.25s ease" }} />
          </g>
        ))}
        {/* "PREVIEW" stamp bottom-right */}
        <text x={px + pw - 6} y={py + ph - 5} textAnchor="end"
          fill={col} fillOpacity={0.45}
          fontSize={5} fontFamily="JetBrains Mono,monospace">
          PREVIEW
        </text>
      </g>
    );
  };

  return (
    <div ref={ref} className="preview-shell" style={{ display: "flex", flexDirection: "column", height: 350, overflow: "hidden", padding: "12px 12px 8px 12px" }}>
      {/* Header bar */}
      <div style={{ fontSize: 7, color: "var(--fg-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span>TASK_GRAPH_EXPLORER</span>
        <span style={{ color: "var(--primary)", letterSpacing: "0.1em" }}>
          {activeId === "agent1" ? "AGENT 1 + DOC TOOL"
            : activeId === "agent2" ? "AGENT 2 + WEB SEARCH"
              : activeId === "agent3" ? "AGENT 3 + CODE ANALYZER"
                : activeId === "orchestrator" ? "ORCHESTRATOR"
                  : activeId === "debugger" ? "DEBUGGER"
                    : activeId === "output" ? "OUTPUT"
                      : activeId.toUpperCase()}
        </span>
      </div>

      {/* SVG Graph — fills remaining space */}
      <div style={{ flex: 1, width: "100%", display: "flex", justifyContent: "center", overflow: "hidden", minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily: "JetBrains Mono,monospace" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="tg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--primary)" fillOpacity="0.25" />
            </pattern>
          </defs>

          {/* Dot-grid background (matching TaskGraphPage) */}
          <rect width={VW} height={VH} fill="url(#tg-grid)" />

          {/* ── Edges (drawn below nodes) ── */}
          {edges.map((e, i) => {
            const sw = e.active ? 2 : 1.2;
            return (
              <g key={i}>
                {/* Active glow trace */}
                {e.active && (
                  <path d={e.d} fill="none" stroke={e.color} strokeWidth={7} opacity={0.22} strokeLinecap="round" strokeLinejoin="round" />
                )}
                {/* Inactive: fully visible static dashed line */}
                {!e.active && (
                  <path d={e.d} fill="none" stroke={e.color}
                    strokeWidth={1.2} strokeDasharray="5 4" strokeDashoffset={0}
                    opacity={1} strokeLinecap="round" strokeLinejoin="round"
                  />
                )}
                {/* Active: animated flowing dashes */}
                {e.active && (
                  <path d={e.d} fill="none" stroke={e.color}
                    strokeWidth={sw} strokeDasharray="5 4"
                    strokeDashoffset={dashOffset}
                    opacity={1} strokeLinecap="round" strokeLinejoin="round"
                  />
                )}
                {/* Arrow tip dot */}
                <circle cx={e.tx} cy={e.ty} r={2.5} fill={e.color} opacity={1} />
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {Object.values(N).map(n => n.kind === "tool" ? renderTool(n) : renderRect(n))}

          {/* ── Animated App Preview on Output ── */}
          {renderAppPreview()}
        </svg>
      </div>

      {/* Progress rail */}
      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", paddingTop: 5, paddingBottom: 2, display: "flex", gap: 5, alignItems: "center", marginTop: 4 }}>
        {order.map((id, i) => {
          const isAct = activeId === id;
          const isPast = i < activeIndex;
          const n = N[id];
          const barColor = isAct ? n.color : isPast ? `${n.color}66` : "var(--border)";
          return (
            <div key={id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{
                width: "100%", height: 2, borderRadius: 2,
                background: barColor,
                transition: "background 0.35s ease",
                boxShadow: isAct ? `0 0 7px ${n.glow}` : "none",
              }} />
              <div style={{ fontSize: 5, color: isAct ? n.color : "var(--fg-dim)", letterSpacing: "0.04em", textTransform: "uppercase", transition: "color 0.3s", textAlign: "center", lineHeight: 1.2 }}>
                {id === "orchestrator" ? "ORCH" : id === "debugger" ? "DBG" : id === "output" ? "OUT" : id.replace("agent", "A").replace("tool", "T").toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Module Preview: Debate Arena ---
function DebatePreview() {
  const [ref, inView] = useInView();
  const [visibleCount, setVisibleCount] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);

  const messages = [
    { role: "proposer", text: "Multi-agent systems improve depth by dividing tasks among specialists." },
    { role: "critic", text: "Specialization can fragment context; coherence may degrade." },
    { role: "proposer", text: "Orchestration layers recompose insights and preserve a single narrative." },
    { role: "critic", text: "Recomposition adds latency and may obscure provenance of claims." },
    { role: "proposer", text: "Measured orchestration delivers better accuracy on complex workflows." },
    { role: "critic", text: "Only if verification loops are enforced and conflicts are resolved." },
  ];

  useEffect(() => {
    if (!inView) return;
    let timeouts = [];
    const run = () => {
      setVisibleCount(0);
      setShowVerdict(false);
      const schedule = [0, 500, 1400, 1900, 2800, 3300];
      schedule.forEach((t, idx) => {
        timeouts.push(setTimeout(() => setVisibleCount(idx + 1), t));
      });
      timeouts.push(setTimeout(() => setShowVerdict(true), 4000));
      timeouts.push(setTimeout(run, 5600));
    };
    run();
    return () => timeouts.forEach(clearTimeout);
  }, [inView]);

  const currentRound = Math.min(3, Math.max(1, Math.ceil(visibleCount / 2)));

  return (
    <div ref={ref} className="preview-shell" style={{ overflow: "hidden", height: 350, position: "relative" }}>
      <div style={{ transform: "scale(0.86)", transformOrigin: "top center", height: "100%", padding: "0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: "1px dashed var(--border)" }}>
          <span style={{ fontSize: 7, color: "var(--chart-1)", letterSpacing: "0.12em", textTransform: "uppercase" }}>PROPOSER</span>
          <span style={{ fontSize: 7, color: "var(--fg-dim)" }}>vs</span>
          <span style={{ fontSize: 7, color: "var(--chart-4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>CRITIC</span>
          <span style={{ fontSize: 7, color: "var(--fg-dim)", marginLeft: "auto" }}>Round {currentRound}/3</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 140 }}>
          {messages.slice(0, visibleCount).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "proposer" ? "flex-start" : "flex-end" }}>
              <div className="stream-line" style={{
                maxWidth: "85%",
                border: `1px solid ${m.role === "proposer" ? "rgba(200,136,42,0.4)" : "rgba(200,90,42,0.4)"}`,
                background: m.role === "proposer" ? "rgba(200,136,42,0.04)" : "rgba(200,90,42,0.04)",
                padding: "8px 10px",
                fontSize: 8,
                lineHeight: 1.4,
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                animation: "slideIn 0.3s ease-out"
              }}>
                <div style={{ fontSize: 6, color: m.role === "proposer" ? "var(--chart-1)" : "var(--chart-4)", textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em", opacity: 0.8 }}>
                  {m.role === "proposer" ? "Proposer" : "Critic"}
                </div>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {showVerdict && (
          <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8, animation: "fadeIn 0.4s ease" }}>
            <div style={{ fontSize: 7, color: "var(--fg-dim)", textTransform: "uppercase", marginBottom: 4 }}>Verifier Node Output</div>
            <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "rgba(74,175,122,0.08)", padding: "6px 8px", fontSize: 8, color: "var(--chart-2)" }}>
              Final evaluation: debate yields stronger solutions when synthesis and verification are enforced.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Module Preview: Memory + Reflection ---
function MemoryReflectionPreview() {
  const [ref, inView] = useInView();
  // Phase: 0=collecting, 1=scores, 2=reflecting, 3=report
  const [phase, setPhase] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [reflectProgress, setReflectProgress] = useState(0);
  const [reflectDots, setReflectDots] = useState(".");
  const [showReport, setShowReport] = useState(false);

  // Memory cluster: 12 circles scattered in a canvas
  const clusterNodes = [
    { id: 0, x: 18, y: 22, r: 4, col: "#c8882a", label: "CTX" },
    { id: 1, x: 38, y: 14, r: 5, col: "#4aaf7a", label: "MEM" },
    { id: 2, x: 60, y: 18, r: 3, col: "#c8a42a", label: "VEC" },
    { id: 3, x: 78, y: 28, r: 4, col: "#c85a2a", label: "SRC" },
    { id: 4, x: 12, y: 48, r: 4, col: "#7a9abf", label: "LOG" },
    { id: 5, x: 32, y: 54, r: 7, col: "#c8882a", label: "SEM" },
    { id: 6, x: 55, y: 46, r: 4, col: "#4aaf7a", label: "INF" },
    { id: 7, x: 74, y: 52, r: 6, col: "#c8a42a", label: "REF" },
    { id: 8, x: 20, y: 74, r: 3, col: "#c85a2a", label: "KNW" },
    { id: 9, x: 44, y: 78, r: 4, col: "#c8882a", label: "EPS" },
    { id: 10, x: 64, y: 72, r: 4, col: "#4aaf7a", label: "AGT" },
    { id: 11, x: 84, y: 68, r: 5, col: "#7a9abf", label: "OUT" },
  ];

  const reflectionIssues = [
    { id: "R01", sev: "high", issue: "Logical loop in reasoning chain #12", improvement: "Inserted circuit-breaker at depth 4", strategy: "Add loop-detection to all agent chains" },
    { id: "R02", sev: "medium", issue: "Conflicting source vectors detected", improvement: "Re-weighted embeddings by recency", strategy: "Periodic vector store deduplication" },
    { id: "R03", sev: "low", issue: "Tone inconsistency in response #09", improvement: "Applied consistency prompt injection", strategy: "Cross-check tone profile pre-output" },
  ];

  const SEV = {
    high: { col: "#c85a2a", bg: "rgba(200,90,42,0.08)", border: "rgba(200,90,42,0.35)", label: "HGH" },
    medium: { col: "#c8a42a", bg: "rgba(200,164,42,0.06)", border: "rgba(200,164,42,0.30)", label: "MED" },
    low: { col: "#4aaf7a", bg: "rgba(74,175,122,0.05)", border: "rgba(74,175,122,0.28)", label: "LOW" },
  };

  useEffect(() => {
    if (!inView) return;

    const runAnimation = () => {
      // Reset
      setPhase(0); setCollectedCount(0); setReflectProgress(0);
      setReflectDots("."); setShowReport(false);

      let t1, t2, t3, collectIv, progressIv, dotsIv;

      // Phase 0: collect memory nodes one by one (12 nodes × 300ms = 3.6s)
      collectIv = setInterval(() => {
        setCollectedCount(c => {
          if (c >= clusterNodes.length) { clearInterval(collectIv); return c; }
          return c + 1;
        });
      }, 300);

      // Phase 1: show scores after collection (3.6s + 0.4s gap = 4s)
      t1 = setTimeout(() => setPhase(1), 4000);

      // Phase 2: reflection loading bar starts at 5s
      t2 = setTimeout(() => {
        setPhase(2);
        dotsIv = setInterval(() => setReflectDots(d => d.length >= 3 ? "." : d + "."), 400);
        progressIv = setInterval(() => {
          setReflectProgress(p => {
            if (p >= 100) { clearInterval(progressIv); clearInterval(dotsIv); return 100; }
            return p + 4;
          });
        }, 100);
      }, 5000);

      // Phase 3: show report at ~7.5s
      t3 = setTimeout(() => { setPhase(3); setShowReport(true); }, 7500);

      // Restart cycle 5 seconds after phase 3 (at 12.5s total)
      const restart = setTimeout(() => {
        runAnimation();
      }, 12500);

      return () => {
        clearInterval(collectIv); clearInterval(progressIv); clearInterval(dotsIv);
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(restart);
      };
    };

    runAnimation();
  }, [inView]);

  // avg sim + quality scores (animate in when phase >= 1)
  const avgSim = 87;
  const qualScore = 94;

  return (
    <div ref={ref} className="preview-shell" style={{ overflow: "hidden", height: 350, padding: "12px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ fontSize: 7, color: "var(--primary)", letterSpacing: "0.18em", fontWeight: "bold", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span>MEMORY + REFLECTION UNIT</span>
        <span style={{ fontSize: 6, color: "var(--fg-dim)", fontWeight: "normal" }}>
          {phase === 0 ? `INDEXING ${collectedCount}/${clusterNodes.length}` : phase === 1 ? "SCORED" : phase === 2 ? `REFLECTING${reflectDots}` : "COMPLETE"}
        </span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Memory Cluster ── */}
        <div style={{ border: "1px solid var(--border)", padding: "8px", display: "flex", flexDirection: "column", gap: 6, background: "rgba(200,136,42,0.02)", overflow: "hidden" }}>
          <div style={{ fontSize: 6, color: "var(--fg-dim)", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0 }}>Memory Cluster</div>

          {/* SVG scatter cluster */}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {/* Connection lines between collected nodes (spider web) */}
              {clusterNodes.map((a, ai) => ai < collectedCount && clusterNodes.map((b, bi) => {
                if (bi <= ai || bi >= collectedCount) return null;
                const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                if (dist > 40) return null;
                return (
                  <line key={`${ai}-${bi}`}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={a.col} strokeWidth={0.4} opacity={0.25}
                    style={{ transition: "opacity 0.4s" }}
                  />
                );
              }))}

              {/* Cluster nodes */}
              {clusterNodes.map((n, i) => {
                const active = i < collectedCount;
                // When active: pulse to bigger radius
                const displayR = active ? n.r * 1.35 : n.r;
                return (
                  <g key={n.id}>
                    {/* Glow ring when collected */}
                    {active && (
                      <circle cx={n.x} cy={n.y} r={displayR + 4}
                        fill={n.col} opacity={0.12}
                        style={{ transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
                      />
                    )}
                    {/* Node - use opacity transition instead of fill/stroke to avoid transparency issues */}
                    <circle cx={n.x} cy={n.y} r={displayR}
                      fill={n.col}
                      stroke={n.col}
                      strokeWidth={0.8}
                      opacity={active ? 0.9 : 0.2}
                      style={{ transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
                    />
                    {active && (
                      <text x={n.x} y={n.y + 2.2} textAnchor="middle"
                        fontSize={displayR > 9 ? 4 : 3.5} fontWeight="700"
                        fill="#fff" fontFamily="JetBrains Mono,monospace"
                        style={{ transition: "all 0.3s", pointerEvents: "none" }}>
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ width: `${(collectedCount / clusterNodes.length) * 100}%`, height: "100%", background: "var(--primary)", transition: "width 0.3s ease" }} />
            </div>

            {/* Avg Similarity + Quality scores — fade in at phase >= 1 */}
            <div style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.6s ease" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 5.5, color: "var(--fg-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Avg Similarity</span>
                    <span style={{ fontSize: 5.5, color: "var(--primary)", fontWeight: "700" }}>{avgSim}%</span>
                  </div>
                  <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: phase >= 1 ? `${avgSim}%` : "0%", height: "100%", background: "var(--primary)", transition: "width 0.8s ease 0.2s" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 5.5, color: "var(--fg-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Quality Score</span>
                    <span style={{ fontSize: 5.5, color: "#4aaf7a", fontWeight: "700" }}>{qualScore}%</span>
                  </div>
                  <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: phase >= 1 ? `${qualScore}%` : "0%", height: "100%", background: "#4aaf7a", transition: "width 0.8s ease 0.4s" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Reflection ── */}
        <div style={{ border: "1px solid var(--border)", padding: "8px", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
          <div style={{ fontSize: 6, color: "var(--fg-dim)", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
            {phase >= 2 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", display: "inline-block", animation: phase === 2 ? "pulse 1s infinite" : "none" }} />}
            Reflection Engine
          </div>

          {/* Phase 2: searching bar */}
          {phase <= 2 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: 7, color: phase >= 2 ? "var(--primary)" : "var(--fg-dim)", letterSpacing: "0.08em", textAlign: "center", transition: "color 0.3s" }}>
                {phase < 2 ? "Awaiting memory index..." : `Searching for issues${reflectDots}`}
              </div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: phase < 2 ? "0%" : `${reflectProgress}%`,
                  height: "100%",
                  background: reflectProgress === 100 ? "#4aaf7a" : "var(--primary)",
                  transition: "width 0.1s linear, background 0.4s ease",
                }} />
              </div>
              {phase >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {["Scanning reasoning chains...", "Cross-referencing sources...", "Evaluating tone consistency..."].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, opacity: reflectProgress >= (i + 1) * 30 ? 1 : 0.25, transition: "opacity 0.3s" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: reflectProgress >= (i + 1) * 30 ? "#4aaf7a" : "var(--border)", flexShrink: 0, transition: "background 0.3s" }} />
                      <span style={{ fontSize: 6, color: "var(--muted)", letterSpacing: "0.05em" }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phase 3: structured report */}
          {showReport && (
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, animation: "fadeIn 0.4s ease" }}>
              {reflectionIssues.map((issue) => {
                const s = SEV[issue.sev];
                return (
                  <div key={issue.id} style={{ border: `1px solid ${s.border}`, background: s.bg, overflow: "hidden", flexShrink: 0 }}>
                    {/* Issue header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", borderBottom: `1px solid ${s.border}`, background: `${s.bg}` }}>
                      <span style={{ fontSize: 5.5, fontWeight: "700", letterSpacing: "0.12em", color: s.col, border: `1px solid ${s.border}`, padding: "1px 4px", textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontSize: 5.5, color: "var(--fg-dim)", letterSpacing: "0.08em" }}>{issue.id}</span>
                    </div>
                    {/* Issue body */}
                    <div style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div>
                        <div style={{ fontSize: 5, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1, opacity: 0.6 }}>Issue</div>
                        <div style={{ fontSize: 6.5, color: "var(--fg)", lineHeight: 1.4 }}>{issue.issue}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, borderTop: `1px solid ${s.border}`, paddingTop: 3 }}>
                        <div>
                          <div style={{ fontSize: 5, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1, opacity: 0.6 }}>Fix Applied</div>
                          <div style={{ fontSize: 6, color: "var(--muted)", lineHeight: 1.4 }}>{issue.improvement}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 5, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1, opacity: 0.6 }}>Strategy</div>
                          <div style={{ fontSize: 6, color: "var(--muted)", lineHeight: 1.4 }}>{issue.strategy}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ id, icon, title, desc, tags, preview, delay }) {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState(false);

  return (
    <div ref={ref} style={{
      position: "relative",
      border: "1px solid var(--border)",
      background: "var(--card)",
      transition: "all 0.5s ease",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 480,
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
      <div style={{ borderTop: "1px solid var(--border)", padding: 0, background: hovered ? "rgba(200,136,42,0.02)" : "transparent", transition: "background 0.3s", flexGrow: 1, display: "flex" }}>
        {preview}
      </div>
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────

// --- Informational Pipeline ---
function ThinkingPipeline() {
  const [ref, inView] = useInView();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");

  const nodes = [
    { id: "prompt", label: "User Prompt", desc: "Example query appears", x: 5, y: 50, color: "var(--primary)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "reason", label: "Reasoning Engine", desc: "Plans and decomposes tasks", x: 20, y: 50, color: "var(--chart-1)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "collab", label: "Multi-Agent Collaboration", desc: "Agents exchange messages", x: 42, y: 13, color: "var(--chart-2)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "research", label: "Deep Research", desc: "Retrieves and verifies sources", x: 42, y: 50, color: "var(--chart-3)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "debate", label: "Debate Intelligence", desc: "Proposer vs critic reasoning", x: 42, y: 87, color: "var(--chart-4)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "reflect", label: "Self-Reflection", desc: "Reviews and improves output", x: 65, y: 50, color: "var(--primary)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "task", label: "Task Graph Execution", desc: "Orchestrates DAG tasks", x: 80, y: 50, color: "var(--chart-2)", activeBg: "rgba(255,255,255,0.95)" },
    { id: "output", label: "Generated Output", desc: "Final UI preview", x: 95, y: 50, color: "var(--primary)", activeBg: "rgba(255,255,255,0.95)" },
  ];

  const order = ["prompt", "reason", "collab", "research", "debate", "reflect", "task", "output"];

  useEffect(() => {
    if (!inView) return;
    setStep(0);
    const iv = setInterval(() => setStep(s => (s + 1) % order.length), 760);
    return () => clearInterval(iv);
  }, [inView]);

  useEffect(() => {
    if (!inView || step !== 0) return;
    const prompt = "Build a booking dashboard";
    setTyped("");
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(prompt.slice(0, i));
      if (i >= prompt.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [inView, step]);

  const viewBox = { w: 1200, h: 300 };
  const point = (node) => ({ x: (node.x / 100) * viewBox.w, y: (node.y / 100) * viewBox.h });
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  const lines = [
    { from: "prompt", to: "reason", activeAt: 1 },
    { from: "reason", to: "collab", activeAt: 2 },
    { from: "reason", to: "research", activeAt: 3 },
    { from: "reason", to: "debate", activeAt: 4 },
    { from: "collab", to: "reflect", activeAt: 5 },
    { from: "research", to: "reflect", activeAt: 5 },
    { from: "debate", to: "reflect", activeAt: 5 },
    { from: "reflect", to: "task", activeAt: 6 },
    { from: "task", to: "output", activeAt: 7 },
  ];

  const renderDetail = (id, isActive) => {
    if (id === "prompt") {
      return (
        <div style={{ fontSize: 7, color: "var(--fg-dim)", border: "1px solid var(--border)", padding: "4px 6px", marginTop: 6 }}>
          &gt;_ {typed}
        </div>
      );
    }
    if (id === "reason") {
      return (
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 4, height: 6 + i * 2, background: isActive ? "var(--primary)" : "var(--border)", animation: isActive ? "pulse 1s infinite" : "none" }} />
          ))}
        </div>
      );
    }
    if (id === "collab") {
      return (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: "50%", background: "var(--chart-2)", opacity: isActive ? 0.9 : 0.4,
              animation: isActive ? `pulse 1s ease-in-out ${i * 0.2}s infinite` : "none"
            }} />
          ))}
        </div>
      );
    }
    if (id === "research") {
      return (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ width: 10, height: 12, border: "1px solid var(--border)", background: "rgba(200,164,42,0.1)" }} />
            ))}
          </div>
          <div className="flow-line" style={{ height: 2 }} />
        </div>
      );
    }
    if (id === "debate") {
      return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 6 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(200,136,42,0.2)", border: "1px solid rgba(200,136,42,0.4)" }} />
          <div style={{ flex: 1, height: 8, background: "rgba(200,90,42,0.2)", border: "1px solid rgba(200,90,42,0.4)" }} />
        </div>
      );
    }
    if (id === "reflect") {
      return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(200,136,42,0.4)", borderTopColor: isActive ? "rgba(200,136,42,0.9)" : "rgba(200,136,42,0.4)", animation: isActive ? "spinSlow 2.2s linear infinite" : "none" }} />
        </div>
      );
    }
    if (id === "task") {
      return (
        <svg width="48" height="24" style={{ display: "block", margin: "6px auto 0" }}>
          <circle cx="8" cy="12" r="3" fill="var(--chart-2)" />
          <circle cx="24" cy="6" r="3" fill="var(--chart-2)" />
          <circle cx="24" cy="18" r="3" fill="var(--chart-2)" />
          <line x1="8" y1="12" x2="24" y2="6" stroke="var(--border)" strokeWidth="1" />
          <line x1="8" y1="12" x2="24" y2="18" stroke="var(--border)" strokeWidth="1" />
        </svg>
      );
    }
    if (id === "output") {
      return (
        <div style={{ marginTop: 6, border: "1px solid var(--border)", background: "var(--bg)", padding: 4 }}>
          <div style={{ height: 4, background: "rgba(200,136,42,0.2)", marginBottom: 3 }} />
          <div style={{ height: 4, background: "var(--border)", marginBottom: 3 }} />
          <div style={{ height: 6, background: "rgba(74,175,122,0.2)", width: "60%" }} />
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={ref} style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", height: 300 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${viewBox.w} ${viewBox.h}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
          {lines.map((l, i) => {
            const from = point(nodeById[l.from]);
            const to = point(nodeById[l.to]);
            const active = step >= l.activeAt;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "rgba(200,136,42,0.7)" : "var(--border)"}
                strokeWidth={active ? 1.6 : 1}
                strokeDasharray={active ? "6 4" : "0"}
                style={{ animation: active ? "flowDash 1.6s linear infinite" : "none" }}
              />
            );
          })}
        </svg>

        {nodes.map((n, i) => {
          const isActive = step === i;
          return (
            <div key={n.id} style={{ position: "absolute", left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}>
              <div className="pipeline-node" style={{
                borderColor: isActive ? n.color : "var(--border)",
                borderWidth: isActive ? 2 : 1,
                background: isActive ? n.activeBg : "var(--card)",
                color: isActive ? n.color : "var(--fg)",
                opacity: 1,
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{n.label}</div>
                {renderDetail(n.id, isActive)}
                <div className="pipeline-node-label">{n.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
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
        <span style={{ color: "rgba(200,136,42,0.4)", fontSize: 12, padding: "0 8px", fontFamily: "inherit" }}>&gt;_</span>
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
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={48} style={{ color: "var(--chart-2)" }} /></div>
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
      <button style={s.backBtn} onClick={onBack}><ArrowLeft size={14} /> Agentrix.io</button>
      {ThemeBtn && <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}><ThemeBtn /></div>}
      <div style={s.card}>
        <div style={s.headerBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, border: "1px solid rgba(200,136,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>&gt;_</div>
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
            {loading ? `Authenticating${dots}` : isLogin ? <><ArrowRight size={14} /> Access Terminal</> : <><ArrowRight size={14} /> Initialize Profile</>}
          </button>
        </div>

        <div style={s.footer}>
          <span style={{ fontSize: 9, color: "var(--fg-dim)", letterSpacing: "0.08em" }}>{isLogin ? "No account?" : "Have an account?"}</span>
          <button style={{ background: "none", border: "none", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,136,42,0.7)", cursor: "pointer", fontFamily: "inherit" }} onClick={onSwitch}>
            {isLogin ? <>Register <ArrowRight size={14} /></> : <><ArrowLeft size={14} /> Sign In</>}
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
export default function Landing({ onEnterApp }) {
  const navigate = useNavigate();
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

  // ── Data ────────────────────────────────────────────────────────────────────
  const features = [
    {
      id: "MOD_01",
      icon: <MessageSquare size={24} />,
      title: "Chat Interface",
      desc: "Three reasoning modes: Standard, Multi-Agent, and Deep Research. Real-time streaming with a production-grade chat UI.",
      tags: ["LangGraph", "Groq", "Multi-Mode"],
      preview: <ChatPreview />
    },
    {
      id: "MOD_02",
      icon: <BarChart2 size={24} />,
      title: "Task Graph",
      desc: "Complex DAG visualization powered by React Flow. Track orchestration, tools, and output lineage in real-time.",
      tags: ["LangGraph", "Groq", "Multi-Agent", "DAG Viewer"],
      preview: <TaskGraphPreview />
    },
    {
      id: "MOD_03",
      icon: <Scale size={24} />,
      title: "Debate Arena",
      desc: "Proposer vs Critic debate interface with streaming rounds and verifier output for robust reasoning.",
      tags: ["AutoGen", "SSE Stream", "Adversarial"],
      preview: <DebatePreview />
    },
    {
      id: "MOD_04",
      icon: <Brain size={24} />,
      title: "Memory + Reflection",
      desc: "Unified memory retrieval and self-reflection loop that improves responses through feedback and verification.",
      tags: ["Memory", "Self-Reflection", "Metacognition"],
      preview: <MemoryReflectionPreview />
    },
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
              <div style={{ width: 28, height: 28, border: "1px solid rgba(200,136,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 8px var(--primary-glow)" }}>&gt;_</div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "var(--primary)", textTransform: "uppercase", textShadow: "0 0 8px var(--primary-glow)" }}>Agentrix.io</span>
              <span style={{ fontSize: 8, color: "var(--fg-dim)", letterSpacing: "0.1em" }}>v2.4.1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ThemeBtn style={{ marginRight: 4 }} />
              <button onClick={() => navigate("/login")} style={{ ...S.secondaryBtn, padding: "8px 16px" }}>Sign In</button>
              <button onClick={() => navigate("/register")} style={{ ...S.primaryBtn, padding: "8px 16px" }}>Get Started</button>
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
                  onClick={() => navigate("/register")}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.2)"; e.currentTarget.style.boxShadow = "0 0 28px -8px var(--primary-glow)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  &gt;_ Initialize Session
                </button>
                <button style={S.secondaryBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                ><>View Architecture <ArrowRight size={14} /></></button>
              </div>
            </RevealSection>

            {/* Stats */}
            <RevealSection delay={400}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
                {[{ val: 3, s: "", l: "Reasoning Modes" }, { val: 4, s: "", l: "Cognitive Modules" }, { val: 99, s: "%", l: "Uptime" }, { val: 4, s: "+", l: "Agent Types" }].map(({ val, s, l }) => (
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
            <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 50 }}>Four specialized interfaces. One unified intelligence.</p>
          </RevealSection>
          <div className="module-grid">
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
                  <div style={{ border: "1px solid rgba(200,136,42,0.5)", background: "rgba(200,136,42,0.08)", padding: "10px 24px", fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em", textShadow: "0 0 8px var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Target size={14} /> Orchestrator</div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, width: "100%" }}>
                    {[
                      [<Search size={18} />, "Researcher", "var(--chart-1)"],
                      [<BarChart2 size={18} />, "Analyst", "var(--chart-2)"],
                      [<PenLine size={18} />, "Writer", "var(--chart-3)"],
                      [<Microscope size={18} />, "Critic", "var(--chart-4)"]
                    ].map(([ic, lab, col]) => (
                      <div key={lab} style={{ border: `1px solid ${col}40`, padding: "12px 6px", textAlign: "center", transition: "all 0.3s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${col}80`; e.currentTarget.style.background = `${col}08`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${col}40`; e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", height: 18 }}>{ic}</div>
                        <p style={{ fontSize: 8, color: col, textTransform: "uppercase", letterSpacing: "0.1em" }}>{lab}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ border: "1px solid rgba(74,175,122,0.4)", background: "rgba(74,175,122,0.06)", padding: "10px 24px", fontSize: 10, fontWeight: 700, color: "var(--chart-2)", textTransform: "uppercase", letterSpacing: "0.12em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Link2 size={14} /> Aggregator</div>
                  <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                  <div style={{ border: "1px solid var(--border)", background: "var(--secondary)", padding: "10px 24px", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><FileText size={14} /> Final Response</div>
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
              { mode: "Standard", icon: <Zap size={20} />, color: "var(--chart-1)", depth: 2, desc: "Direct tool-calling with fast responses. Best for straightforward queries.", features: ["Tool Calling", "Fast Response", "Markdown Render"] },
              { mode: "Multi-Agent", icon: <Users size={20} />, color: "var(--chart-2)", depth: 4, desc: "Orchestrated specialist agents collaborate on complex problems.", features: ["Orchestration", "Task Decomposition", "Agent Collaboration"] },
              { mode: "Deep Research", icon: <Microscope size={20} />, color: "var(--chart-3)", depth: 6, desc: "Full decomposition with verification chains and source citation.", features: ["Verification Chains", "Source Citation", "Multi-Step Reasoning"] },
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
                        <CheckCircle2 size={12} style={{ color: m.color }} />
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
              ["Tool Calling", <CheckCircle2 size={12} style={{ color: "var(--chart-1)" }} />, <CheckCircle2 size={12} style={{ color: "var(--chart-2)" }} />, <CheckCircle2 size={12} style={{ color: "var(--chart-3)" }} />],
              ["Orchestration", "—", <CheckCircle2 size={12} style={{ color: "var(--chart-2)" }} />, <CheckCircle2 size={12} style={{ color: "var(--chart-3)" }} />],
              ["Task Decomposition", "—", <CheckCircle2 size={12} style={{ color: "var(--chart-2)" }} />, <CheckCircle2 size={12} style={{ color: "var(--chart-3)" }} />],
              ["Verification Chains", "—", "—", <CheckCircle2 size={12} style={{ color: "var(--chart-3)" }} />],
              ["Source Citation", "—", "—", <CheckCircle2 size={12} style={{ color: "var(--chart-3)" }} />],
              ["Reasoning Depth", "2", "4", "6"]].map((row, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: ri < 6 ? "1px solid var(--border)" : "none", background: ri === 0 ? "rgba(200,136,42,0.04)" : "transparent", transition: "background 0.2s" }}
                  onMouseEnter={e => { if (ri > 0) e.currentTarget.style.background = "rgba(200,136,42,0.02)"; }}
                  onMouseLeave={e => { if (ri > 0) e.currentTarget.style.background = "transparent"; }}
                >
                  {row.map((cell, ci) => (
                    <div key={ci} style={{ padding: "10px 16px", borderLeft: ci > 0 ? "1px solid var(--border)" : "none", color: ci === 0 ? "var(--muted)" : "var(--fg-dim)", textAlign: ci > 0 ? "center" : "left", fontWeight: ri === 0 ? 700 : 400, letterSpacing: ri === 0 ? "0.12em" : "0", textTransform: ri === 0 ? "uppercase" : "none", fontSize: ri === 0 ? 9 : 10, display: "flex", alignItems: "center", justifyContent: ci > 0 ? "center" : "flex-start", gap: 4 }}>
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </RevealSection>
        </section>



        {/* === HOW OUR AI THINKS AND BUILDS === */}
        <section style={{ ...S.section, borderTop: "1px solid var(--border)" }}>
          <RevealSection>
            <div style={S.sectionHeader}>
              <div style={S.divider} />
              <div style={S.badge}><span style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>How It Works</span></div>
              <div style={S.divider} />
            </div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
              How Our AI <span style={{ color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)" }}>Thinks and Builds</span>
            </h2>
            <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 40 }}>A transparent pipeline from prompt to generated output.</p>
          </RevealSection>
          <RevealSection delay={120}>
            <ThinkingPipeline />
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
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, marginBottom: 32 }}>
            {[{ v: 94, s: "%", l: "Multi-Agent Accuracy" }, { v: 3, s: "x", l: "Research Depth" }, { v: 147, s: "", l: "Knowledge Clusters" }, { v: 300, s: "ms", l: "Avg Response" }].map(({ v, s, l }, i) => {
              return (
                <RevealSection key={l} delay={i * 80}>
                  <div style={{ border: "1px solid var(--border)", background: "var(--card)", padding: 20, textAlign: "center", transition: "all 0.3s", minWidth: 170 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <p style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)", textShadow: "0 0 12px var(--primary-glow)", lineHeight: 1 }}><Counter target={v} suffix={s} /></p>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 6 }}>{l}</p>
                  </div>
                </RevealSection>
              );
            })}
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
                <button style={S.primaryBtn} onClick={() => navigate("/register")}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,136,42,0.22)"; e.currentTarget.style.boxShadow = "0 0 28px -8px rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,136,42,0.1)"; e.currentTarget.style.boxShadow = "none"; }}>
                  {">"}_ Initialize Profile
                </button>
                <button style={S.secondaryBtn} onClick={() => navigate("/login")}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,136,42,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >Sign In <ArrowRight size={14} /></button>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, border: "1px solid rgba(200,136,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--primary)" }}>&gt;_</div>
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