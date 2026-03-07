import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// COLOUR & STYLE
// ═══════════════════════════════════════════════════════════════════════════
const RC = {
  HIGH:     { bg:"rgba(30,5,5,0.95)",  border:"rgba(239,68,68,0.45)",  text:"#f87171", dot:"#ef4444", glow:"rgba(239,68,68,0.3)"  },
  MODERATE: { bg:"rgba(28,18,4,0.95)", border:"rgba(245,158,11,0.35)", text:"#fbbf24", dot:"#f59e0b", glow:"rgba(245,158,11,0.2)" },
  LOW:      { bg:"rgba(4,18,10,0.95)", border:"rgba(34,197,94,0.25)",  text:"#4ade80", dot:"#22c55e", glow:"rgba(34,197,94,0.15)" },
};
const M = "'DM Mono','Fira Code','Courier New',monospace";

// ═══════════════════════════════════════════════════════════════════════════
// SPARKLINE
// ═══════════════════════════════════════════════════════════════════════════
function Spark({ data, color, w = 80, h = 28, alert }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * (h - 4) - 2}`).join(" ");
  const last = data[data.length - 1];
  const lx = w, ly = h - ((last - mn) / rng) * (h - 4) - 2;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={alert ? "#ef4444" : color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={lx} cy={ly} r="2.5" fill={alert ? "#ef4444" : color} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE RING
// ═══════════════════════════════════════════════════════════════════════════
function Ring({ score, level, size = 90 }) {
  const c = RC[level], r = size * 0.37, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, filled = (score / 100) * circ * 0.75;
  return (
    <svg width={size} height={size * 0.72}>
      <defs>
        <filter id={`rg${score}${level}`}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.075}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.dot} strokeWidth={size * 0.075}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} filter={`url(#rg${score}${level})`} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={c.text} fontSize={size * 0.23} fontWeight="800" fontFamily={M}>{score}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT ROW
// ═══════════════════════════════════════════════════════════════════════════
function PatientRow({ patient, scoreHistory, selected, onClick }) {
  const { prediction: pred, vitals: v } = patient;
  const c = RC[pred.level];
  const scoreHist = scoreHistory || [];
  const dScore = scoreHist.length > 3 ? scoreHist[scoreHist.length - 1] - scoreHist[scoreHist.length - 4] : 0;

  return (
    <div onClick={onClick} style={{ display: "grid", gridTemplateColumns: "160px 72px 56px 56px 56px 56px 56px 56px 56px 56px 90px 100px", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", background: selected ? c.bg : "transparent", borderLeft: selected ? `3px solid ${c.dot}` : "3px solid transparent", transition: "all 0.15s", position: "relative", overflow: "hidden" }}>
      {pred.level === "HIGH" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg,transparent,${c.dot},transparent)`, animation: "scanRow 3s linear infinite" }} />}

      {/* Patient ID */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb", fontFamily: M }}>{patient.id}</div>
        <div style={{ fontSize: 9, color: "#4b5563", marginTop: 1 }}>{patient.bed} · {patient.dx}</div>
      </div>

      {/* Score */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: c.text, fontFamily: M, lineHeight: 1 }}>{pred.score}</div>
        <div style={{ fontSize: 7, color: c.text, letterSpacing: 1, marginTop: 1 }}>{pred.level}</div>
      </div>

      {/* Vitals */}
      {[
        [v.HR,      v.HR > 100 || v.HR < 50,  "#60a5fa"],
        [v.O2Sat,   v.O2Sat < 95,              "#22d3ee"],
        [v.SBP,     v.SBP < 100,               "#a78bfa"],
        [v.MAP,     v.MAP < 65,                "#e879f9"],
        [v.Temp,    v.Temp > 38,               "#fb923c"],
        [v.Resp,    v.Resp > 20,               "#34d399"],
        [v.Lactate, v.Lactate >= 2,            "#f87171"],
        [v.WBC,     v.WBC > 11,               "#fbbf24"],
      ].map(([val, alert, col], i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: alert ? "#f87171" : "#d1d5db", fontFamily: M }}>
            {typeof val === "number" ? (val % 1 ? val.toFixed(1) : val) : "—"}
          </div>
          {alert && <div style={{ fontSize: 7, color: "#f87171", fontFamily: M }}>⚠</div>}
        </div>
      ))}

      {/* Sparkline */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Spark data={scoreHist.slice(-20)} color={c.dot} w={80} h={26} alert={pred.level === "HIGH"} />
      </div>

      {/* Trend */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: dScore > 5 ? "rgba(239,68,68,0.2)" : dScore < -5 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: dScore > 5 ? "#f87171" : dScore < -5 ? "#4ade80" : "#6b7280", fontFamily: M, letterSpacing: 1 }}>
          {dScore > 5 ? "↑ RISING" : dScore < -5 ? "↓ FALLING" : "→ STABLE"}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════════════════
function DetailDrawer({ patient, scoreHistory }) {
  const { prediction: pred, vitals: v } = patient;
  const c = RC[pred.level];

  const flags = [];
  if (v.HR > 120)         flags.push({ p: "Heart Rate",  val: `${v.HR} bpm`,          sev: "critical", note: "Severe tachycardia" });
  else if (v.HR > 100)    flags.push({ p: "Heart Rate",  val: `${v.HR} bpm`,          sev: "warning",  note: "Tachycardia" });
  if (v.SBP < 90)         flags.push({ p: "Systolic BP", val: `${v.SBP} mmHg`,        sev: "critical", note: "Hypotension — septic shock risk" });
  else if (v.SBP < 100)   flags.push({ p: "Systolic BP", val: `${v.SBP} mmHg`,        sev: "warning",  note: "Low-normal BP" });
  if (v.O2Sat < 90)       flags.push({ p: "SpO₂",        val: `${v.O2Sat}%`,          sev: "critical", note: "Critical hypoxemia" });
  else if (v.O2Sat < 95)  flags.push({ p: "SpO₂",        val: `${v.O2Sat}%`,          sev: "warning",  note: "Low saturation" });
  if (v.Lactate >= 4)     flags.push({ p: "Lactate",     val: `${v.Lactate} mmol/L`,  sev: "critical", note: "Severe hyperlactatemia — Sepsis-3" });
  else if (v.Lactate >= 2)flags.push({ p: "Lactate",     val: `${v.Lactate} mmol/L`,  sev: "warning",  note: "Elevated lactate" });
  if (v.MAP < 65)         flags.push({ p: "MAP",         val: `${v.MAP} mmHg`,        sev: "critical", note: "Critical — organ perfusion risk" });
  if (v.WBC > 15)         flags.push({ p: "WBC",         val: `${v.WBC} ×10⁹/L`,     sev: "critical", note: "Severe leukocytosis" });

  const eng = pred.engineered || {};

  return (
    <div style={{ width: 300, borderLeft: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)", overflowY: "auto", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: c.bg, boxShadow: `inset 0 0 30px ${c.glow}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: M }}>{patient.id}</div>
            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>Age {patient.age} · {patient.ward}</div>
            <div style={{ fontSize: 9, color: "#4b5563", marginTop: 1 }}>{patient.dx} · {patient.iculos}h ICU</div>
          </div>
          <Ring score={pred.score} level={pred.level} size={80} />
        </div>
        <div style={{ fontSize: 8, color: c.text, fontFamily: M, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
          <span>SEPSIS PROBABILITY</span><span>{(pred.prob * 100).toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pred.prob * 100}%`, height: "100%", background: c.dot, borderRadius: 3, transition: "width 0.5s", boxShadow: `0 0 8px ${c.dot}` }} />
        </div>
      </div>

      {/* Score trend */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 8, color: "#374151", fontFamily: M, letterSpacing: 2, marginBottom: 8 }}>RISK SCORE (LIVE)</div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
          <Spark data={(scoreHistory || []).slice(-40)} color={c.dot} w={258} h={50} alert={pred.level === "HIGH"} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 7, color: "#374151", fontFamily: M }}>40 reads ago</span>
            <span style={{ fontSize: 7, color: "#374151", fontFamily: M }}>now</span>
          </div>
        </div>
      </div>

      {/* Vitals grid */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 8, color: "#374151", fontFamily: M, letterSpacing: 2, marginBottom: 8 }}>LIVE VITALS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            ["HR",      `${v.HR} bpm`,          v.HR > 100,    "#60a5fa"],
            ["SpO₂",    `${v.O2Sat}%`,          v.O2Sat < 95,  "#22d3ee"],
            ["BP",      `${v.SBP}/${v.DBP}`,    v.SBP < 100,   "#a78bfa"],
            ["MAP",     `${v.MAP} mmHg`,         v.MAP < 65,    "#e879f9"],
            ["Temp",    `${v.Temp}°C`,           v.Temp > 38,   "#fb923c"],
            ["Resp",    `${v.Resp}/min`,          v.Resp > 20,   "#34d399"],
            ["Lactate", `${v.Lactate} mmol/L`,   v.Lactate >= 2,"#f87171"],
            ["WBC",     `${v.WBC} ×10⁹/L`,      v.WBC > 11,   "#fbbf24"],
          ].map(([lbl, val, alert, col]) => (
            <div key={lbl} style={{ background: alert ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${alert ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 6, padding: "6px 8px" }}>
              <div style={{ fontSize: 7, color: "#4b5563", fontFamily: M, letterSpacing: 1 }}>{lbl}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: alert ? "#f87171" : col, fontFamily: M, marginTop: 1 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineered features */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 8, color: "#374151", fontFamily: M, letterSpacing: 2, marginBottom: 8 }}>MODEL FEATURES (ENGINEERED)</div>
        {[
          ["Shock Index",  eng.ShockIndex,    eng.ShockIndex > 1.0,  "HR÷SBP"],
          ["O₂ Stress",   eng.OxygenStress,  eng.OxygenStress > 1.1,"HR÷SpO₂"],
          ["Resp×HR",      eng.Resp_Shock,    eng.Resp_Shock > 2200, "Resp×HR"],
          ["Pulse Pr.",    eng.PulsePressure, eng.PulsePressure < 30,"SBP−DBP"],
        ].map(([lbl, val, alert, formula]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <span style={{ fontSize: 9, color: "#6b7280", fontFamily: M }}>{lbl}</span>
              <span style={{ fontSize: 7, color: "#374151", fontFamily: M, marginLeft: 6 }}>({formula})</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: alert ? "#f87171" : "#9ca3af", fontFamily: M }}>
              {val != null ? (typeof val === "number" ? val.toFixed(val > 100 ? 0 : 3) : val) : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Clinical flags */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 8, color: "#374151", fontFamily: M, letterSpacing: 2, marginBottom: 8 }}>CLINICAL FLAGS ({flags.length})</div>
        {flags.length === 0
          ? <div style={{ fontSize: 10, color: "#1f2937", fontFamily: M, padding: "8px 0" }}>✓ No critical flags</div>
          : flags.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
              <span style={{ fontSize: 10 }}>{f.sev === "critical" ? "🔴" : "🟡"}</span>
              <div>
                <span style={{ fontSize: 9, color: f.sev === "critical" ? "#f87171" : "#fbbf24", fontFamily: M, fontWeight: 700 }}>{f.p}</span>
                <span style={{ fontSize: 9, color: "#6b7280", fontFamily: M, marginLeft: 6 }}>{f.val}</span>
                <div style={{ fontSize: 8, color: "#4b5563", marginTop: 1 }}>{f.note}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [patients, setPatients]       = useState([]);
  const [scoreHistories, setScoreHistories] = useState({});
  const [selectedId, setSelectedId]   = useState(null);
  const [paused, setPaused]           = useState(false);
  const [speed, setSpeed]             = useState(2000);
  const [alerts, setAlerts]           = useState([]);
  const [apiStatus, setApiStatus]     = useState("connecting");
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [tick, setTick]               = useState(0);
  const intervalRef = useRef(null);

  const fetchPatients = async () => {
    try {
      const res  = await fetch("/api/patients");
      const data = await res.json();
      setPatients(data);
      setApiStatus("connected");
      setLastUpdate(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setTick(t => t + 1);

      // Update score histories
      setScoreHistories(prev => {
        const updated = { ...prev };
        data.forEach(p => {
          const hist = updated[p.id] || [];
          updated[p.id] = [...hist.slice(-80), p.prediction.score];
        });
        return updated;
      });

      // Detect HIGH risk alerts
      const high = data.filter(p => p.prediction.level === "HIGH");
      setAlerts(high.map(p => ({ id: p.id, score: p.prediction.score, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) })));

      // Auto-select first patient
      setSelectedId(prev => prev || (data[0]?.id));

    } catch {
      setApiStatus("error");
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(fetchPatients, speed);
    return () => clearInterval(intervalRef.current);
  }, [paused, speed]);

  const selected = patients.find(p => p.id === selectedId);
  const counts = {
    HIGH:     patients.filter(p => p.prediction?.level === "HIGH").length,
    MODERATE: patients.filter(p => p.prediction?.level === "MODERATE").length,
    LOW:      patients.filter(p => p.prediction?.level === "LOW").length,
  };

  return (
    <div style={{ background: "#080b0f", minHeight: "100vh", color: "#e5e7eb", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0 }
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes scanRow{from{transform:translateX(-100%)}to{transform:translateX(200%)}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: apiStatus === "connected" ? "#22c55e" : apiStatus === "error" ? "#ef4444" : "#f59e0b", animation: "pulse 1.5s infinite", boxShadow: `0 0 8px ${apiStatus === "connected" ? "#22c55e" : "#f59e0b"}` }} />
            <span style={{ fontSize: 11, color: apiStatus === "connected" ? "#22c55e" : "#f59e0b", fontFamily: M, letterSpacing: 2 }}>
              {apiStatus === "connected" ? "LIVE" : apiStatus === "error" ? "API ERROR" : "CONNECTING"}
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9", fontFamily: M, letterSpacing: 1 }}>SEPSIS AI · ICU MONITOR</div>
          <div style={{ fontSize: 9, color: "#374151", fontFamily: M }}>LightGBM · Real model predictions · Flask API</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {[["HIGH", counts.HIGH, "#ef4444"], ["MOD", counts.MODERATE, "#f59e0b"], ["LOW", counts.LOW, "#4ade80"]].map(([l, n, col]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: col, fontFamily: M, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 7, color: "#374151", letterSpacing: 2 }}>{l}</div>
            </div>
          ))}
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", gap: 4 }}>
            {[["SLOW", 3000], ["NORMAL", 2000], ["FAST", 800]].map(([lbl, ms]) => (
              <button key={lbl} onClick={() => setSpeed(ms)} style={{ fontSize: 8, padding: "3px 8px", background: speed === ms ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${speed === ms ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 4, color: speed === ms ? "#e5e7eb" : "#6b7280", cursor: "pointer", fontFamily: M }}>{lbl}</button>
            ))}
          </div>
          <button onClick={() => setPaused(p => !p)} style={{ padding: "5px 14px", background: paused ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)", border: `1px solid ${paused ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`, borderRadius: 6, color: paused ? "#4ade80" : "#f87171", cursor: "pointer", fontSize: 10, fontFamily: M, letterSpacing: 1 }}>
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>
          <div style={{ fontSize: 9, color: "#374151", fontFamily: M }}>{lastUpdate || "—"}</div>
        </div>
      </div>

      {/* ALERT STRIP */}
      {alerts.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.2)", padding: "6px 20px", display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: "#f87171", fontFamily: M, animation: "blink 1s infinite", letterSpacing: 3, flexShrink: 0 }}>⚠ ALERT</span>
          {alerts.map(a => (
            <span key={a.id} style={{ fontSize: 10, color: "#fca5a5", background: "rgba(239,68,68,0.15)", padding: "2px 10px", borderRadius: 4, fontFamily: M }}>
              {a.id} — Score {a.score} · {a.time}
            </span>
          ))}
        </div>
      )}

      {/* TABLE HEADER */}
      <div style={{ display: "grid", gridTemplateColumns: "160px 72px 56px 56px 56px 56px 56px 56px 56px 56px 90px 100px", padding: "6px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
        {["PATIENT", "SCORE", "HR", "SpO₂", "SBP", "MAP", "TEMP", "RESP", "LACT", "WBC", "TREND", "STATUS"].map(h => (
          <div key={h} style={{ fontSize: 7, color: "#374151", fontFamily: M, letterSpacing: 2, textAlign: h === "PATIENT" ? "left" : "center" }}>{h}</div>
        ))}
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {apiStatus === "error" ? (
            <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
              <div style={{ fontSize: 13, fontFamily: M, color: "#f87171", marginBottom: 8 }}>Cannot connect to backend</div>
              <div style={{ fontSize: 10, color: "#374151" }}>Make sure <code style={{ color: "#fbbf24" }}>python backend.py</code> is running on port 5000</div>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#4b5563", fontSize: 11, fontFamily: M }}>Connecting to live feed...</div>
          ) : (
            patients.map(p => (
              <PatientRow key={p.id} patient={p} scoreHistory={scoreHistories[p.id] || []}
                selected={p.id === selectedId} onClick={() => setSelectedId(p.id)} />
            ))
          )}

          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 8, color: "#374151", fontFamily: M }}>REAL LightGBM PREDICTIONS</span>
            </div>
            <span style={{ fontSize: 8, color: "#1f2937", fontFamily: M }}>Update #{tick} · {speed / 1000}s interval · GET /api/patients</span>
          </div>
        </div>

        {selected && (
          <DetailDrawer patient={selected} scoreHistory={scoreHistories[selected.id] || []} />
        )}
      </div>
    </div>
  );
}
