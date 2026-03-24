import { useState, useRef, useEffect } from "react";

/* ─── constantes layout SVG ─── */
const SW = 1380, SH = 860;
const RX = 530, RY = 210, RW = 190, RH = 340;
const LP = RX, RP = RX + RW;            // x sortie broches gauche / droite
const pY = (r) => RY + 34 + r * 23;     // y d'une rangée de broches

/* couleurs câbles */
const C = {
  sda:"#9b59b6", scl:"#8e44ad",
  g17:"#27ae60", g27:"#2ecc71",
  g22:"#e74c3c", g23:"#c0392b",
  g24:"#f39c12", g18:"#3498db",
  g25:"#e67e22",
  v5:"#c0392b", gnd:"#556",
  usb:"#1abc9c",
};

/* composants à sélectionner */
const COMPS = [
  { id:"lcd",     label:"LCD I2C 16×2",      color:C.sda,  cat:"affichage"   },
  { id:"led_v1",  label:"LED Verte 1",        color:C.g17,  cat:"feedback"    },
  { id:"led_v2",  label:"LED Verte 2",        color:C.g27,  cat:"feedback"    },
  { id:"led_r1",  label:"LED Rouge 1",        color:C.g22,  cat:"feedback"    },
  { id:"led_r2",  label:"LED Rouge 2",        color:C.g23,  cat:"feedback"    },
  { id:"servo",   label:"Servo SG90",         color:C.g18,  cat:"actionneur"  },
  { id:"buzzer",  label:"Buzzer Actif",        color:C.g24,  cat:"feedback"    },
  { id:"relay",   label:"Module Relais",      color:C.g25,  cat:"actionneur"  },
  { id:"scanner", label:"Scanner USB",        color:C.usb,  cat:"entrée"      },
  { id:"porte",   label:"Porte + Gâche",      color:"#7f8c8d", cat:"actionneur"},
];

/* infos détaillées */
const INFO = {
  lcd:    { wiring:"VCC → 5V (pin 2)\nGND → GND (pin 6)\nSDA → GPIO 2 (pin 3)\nSCL → GPIO 3 (pin 5)", note:"Module I2C PCF8574. Adresse 0x27. Utilisez des câbles femelle-femelle." },
  led_v1: { wiring:"GPIO 17 (pin 11) → 220Ω → Anode (+)\nCathode (−) → GND", note:"LED verte, s'allume sur accès autorisé." },
  led_v2: { wiring:"GPIO 27 (pin 13) → 220Ω → Anode (+)\nCathode (−) → GND", note:"Seconde LED verte pour visibilité accrue." },
  led_r1: { wiring:"GPIO 22 (pin 15) → 220Ω → Anode (+)\nCathode (−) → GND", note:"LED rouge, s'allume sur accès refusé." },
  led_r2: { wiring:"GPIO 23 (pin 16) → 220Ω → Anode (+)\nCathode (−) → GND", note:"Seconde LED rouge." },
  servo:  { wiring:"Fil rouge  → 5V (pin 4)\nFil marron → GND (pin 6)\nFil orange → GPIO 18 (pin 12)", note:"Signal PWM 50 Hz. Duty 2.5 %=0°, 7.5 %=90°." },
  buzzer: { wiring:"(+) → GPIO 24 (pin 18)\n(−) → GND (pin 20)", note:"Buzzer ACTIF. 1 bip=autorisé, 3 bips=refusé." },
  relay:  { wiring:"IN  → GPIO 25 (pin 22)\nVCC → 5V (pin 4)\nGND → GND (pin 20)", note:"Contact NO + COM pour la gâche 12 V." },
  scanner:{ wiring:"Brancher sur n'importe quel port USB", note:"HID USB — émule un clavier. Aucun pilote." },
  porte:  { wiring:"COM + NO du relais → Gâche 12 V\nAlimentation 12 V externe requise", note:"S'ouvre quand le relais est activé (GPIO 25 HIGH)." },
};

/* étapes de montage */
const STEPS = [
  { n:1, title:"Préparer la breadboard",      color:"#e67e22", t:"2 min",  desc:"Rail rouge (+) → 5V pin 2, rail bleu (−) → GND pin 6." },
  { n:2, title:"Câbler les LEDs vertes",       color:"#27ae60", t:"5 min",  desc:"GPIO 17 → 220Ω → LED V1. GPIO 27 → 220Ω → LED V2. Cathodes → GND." },
  { n:3, title:"Câbler les LEDs rouges",       color:"#e74c3c", t:"5 min",  desc:"GPIO 22 → 220Ω → LED R1. GPIO 23 → 220Ω → LED R2." },
  { n:4, title:"Câbler le buzzer",             color:"#f39c12", t:"2 min",  desc:"(+) → GPIO 24 (pin 18). (−) → GND. Pas de résistance." },
  { n:5, title:"Test LEDs + buzzer",           color:"#5dade2", t:"5 min",  desc:"Lancez test_leds_buzzer.py. Vérifiez chaque LED et le buzzer." },
  { n:6, title:"Brancher l'écran LCD I2C",     color:"#9b59b6", t:"3 min",  desc:"SDA → GPIO 2, SCL → GPIO 3, VCC → 5V, GND → GND. Vérifiez avec i2cdetect." },
  { n:7, title:"Brancher le servo SG90",       color:"#3498db", t:"2 min",  desc:"Rouge → 5V, marron → GND, orange (signal) → GPIO 18." },
  { n:8, title:"Brancher le scanner USB",      color:"#1abc9c", t:"1 min",  desc:"Port USB — détection automatique comme clavier HID." },
  { n:9, title:"Module relais (optionnel)",    color:"#e67e22", t:"3 min",  desc:"IN → GPIO 25, VCC → 5V, GND → GND. Gâche sur NO + COM." },
  { n:10,title:"Test complet",                 color:"#27ae60", t:"10 min", desc:"Lancez scanner.py. Scan autorisé → LEDs vertes + bip + porte ouvre. Refusé → rouge + 3 bips." },
];

/* ─── composant Fil animé ─── */
function Wire({ d, color, active, width = 2 }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={active ? width + 1 : width}
      strokeLinecap="round"
      opacity={active ? 1 : 0.55}
      style={active ? {
        strokeDasharray: "10 6",
        animation: "flowDash 0.6s linear infinite",
        filter: `drop-shadow(0 0 3px ${color})`,
      } : {}}
    />
  );
}

/* ─── résistance SVG inline ─── */
function InlineRes({ x, y, color }) {
  return (
    <g>
      <rect x={x - 6} y={y - 14} width={12} height={28} rx="2"
        fill="#0b1218" stroke={color} strokeWidth="1" />
      <path d={`M${x},${y-12} L${x+5},${y-6} L${x-5},${y} L${x+5},${y+6} L${x-5},${y+12}`}
        fill="none" stroke={color} strokeWidth="0.9" />
    </g>
  );
}

/* ─── symbole LED SVG ─── */
function LedSym({ x, y, color, on }) {
  return (
    <g>
      <polygon points={`${x-10},${y-12} ${x+10},${y-12} ${x},${y+4}`}
        fill={on ? color : "#0b1218"} stroke={color} strokeWidth="1.2"
        style={on ? { filter: `drop-shadow(0 0 6px ${color})` } : {}} />
      <line x1={x - 10} y1={y + 4} x2={x + 10} y2={y + 4} stroke={color} strokeWidth="1.5" />
      {on && <>
        <line x1={x+12} y1={y-8}  x2={x+20} y2={y-14} stroke={color} strokeWidth="0.9" opacity="0.9"/>
        <line x1={x+15} y1={y-1}  x2={x+23} y2={y-4}  stroke={color} strokeWidth="0.9" opacity="0.9"/>
      </>}
    </g>
  );
}

export default function App() {
  const [sel,     setSel]     = useState(null);
  const [view,    setView]    = useState("schema");
  const [doorOpen,setDoorOpen]= useState(false);
  const [scanRes, setScanRes] = useState(null);   // null | "ok" | "ko"
  const [zoom,    setZoom]    = useState(0.72);
  const [pan,     setPan]     = useState({ x: 0, y: 0 });
  const [drag,    setDrag]    = useState(false);
  const [ds,      setDs]      = useState({ x:0, y:0 });
  const svgRef = useRef(null);
  const timerRef = useRef(null);

  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(2.2, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };
  useEffect(() => {
    const el = svgRef.current;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });
    return () => el?.removeEventListener("wheel", onWheel);
  }, []);

  const onMD = (e) => {
    if (e.button === 0 && !e.target.closest(".selectable")) {
      setDrag(true); setDs({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const onMM = (e) => { if (drag) setPan({ x: e.clientX - ds.x, y: e.clientY - ds.y }); };
  const onMU = () => setDrag(false);

  const simulate = (ok) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanRes(ok ? "ok" : "ko");
    setDoorOpen(ok);
    setSel(ok ? "led_v1" : "led_r1");
    timerRef.current = setTimeout(() => {
      setScanRes(null); setDoorOpen(false); setSel(null);
    }, 4000);
  };

  /* helper : câble actif? */
  const active = (id) => {
    if (sel === id) return true;
    if (scanRes === "ok"  && (id === "led_v1" || id === "led_v2" || id === "servo" || id === "relay" || id === "porte")) return true;
    if (scanRes === "ko"  && (id === "led_r1" || id === "led_r2" || id === "buzzer")) return true;
    return false;
  };

  /* LEDs allumées ? */
  const gOn = scanRes === "ok";
  const rOn = scanRes === "ko";

  const selInfo = sel ? INFO[sel] : null;

  return (
    <div style={{ minHeight:"100vh", background:"#080b14", color:"#e0e0e0",
      fontFamily:"'IBM Plex Mono','Courier New',monospace", display:"flex", flexDirection:"column" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#2a3a5c;border-radius:4px}
        @keyframes flowDash { to { stroke-dashoffset:-16; } }
        @keyframes glow { 0%,100%{opacity:1}50%{opacity:.6} }
        .card{background:#0d1220;border:1px solid #141e33;border-radius:12px}
        .comp-btn{padding:9px 12px;background:#080c16;border:1px solid #141e33;
          border-radius:8px;cursor:pointer;transition:all .18s;display:flex;
          align-items:center;gap:10px;width:100%;text-align:left;
          color:#c0c8d8;font-family:inherit;font-size:12px}
        .comp-btn:hover{border-color:#2471a3;background:#0c1628}
        .comp-btn.active{border-color:#2471a3;background:#0d1830;
          box-shadow:0 0 12px rgba(36,113,163,.18)}
        .tab-btn{padding:7px 15px;background:transparent;border:1px solid #1a2744;
          color:#6a7a9a;cursor:pointer;font-family:inherit;font-size:12px;
          border-radius:6px;transition:all .18s}
        .tab-btn.active{background:#1a2744;color:#5dade2;border-color:#2471a3}
        .selectable{cursor:pointer}
        .door-leaf{transition:transform 1.1s cubic-bezier(.34,1.56,.64,1)}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"#0c1120", borderBottom:"1px solid #1a2744", padding:"12px 22px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700,
              fontSize:18, color:"#e8ecf2" }}>Schéma de Câblage Réel</div>
            <div style={{ fontSize:11, color:"#4a5a7a" }}>
              Montage physique — Raspberry Pi 4 GPIO — 9 composants
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button className={`tab-btn ${view==="schema"?"active":""}`}  onClick={()=>setView("schema")}>Schéma interactif</button>
            <button className={`tab-btn ${view==="etapes"?"active":""}`}  onClick={()=>setView("etapes")}>Étapes de montage</button>
          </div>
        </div>
      </div>

      {/* ── SCHEMA VIEW ── */}
      {view === "schema" && (
        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr 270px",
          flex:1, overflow:"hidden", gap:0 }}>

          {/* LEFT: component list */}
          <div style={{ padding:"14px 12px", display:"flex", flexDirection:"column",
            gap:6, background:"#0a0e18", borderRight:"1px solid #1a2744",
            overflowY:"auto" }}>
            <div style={{ fontSize:10, color:"#3a4a6a", textTransform:"uppercase",
              letterSpacing:".1em", marginBottom:4 }}>Composants</div>

            {/* scan buttons */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
              <button onClick={()=>simulate(true)} style={{
                padding:"8px 0", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
                fontSize:12, fontWeight:700, border:"1px solid #27ae60",
                background: scanRes==="ok" ? "#0d3a1a":"#050f07", color:"#27ae60" }}>
                ✓ Scan autorisé
              </button>
              <button onClick={()=>simulate(false)} style={{
                padding:"8px 0", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
                fontSize:12, fontWeight:700, border:"1px solid #e74c3c",
                background: scanRes==="ko" ? "#3a0d0d":"#0f0505", color:"#e74c3c" }}>
                ✗ Scan refusé
              </button>
              {scanRes && (
                <div style={{ fontSize:11, fontWeight:700, textAlign:"center",
                  padding:"6px 0", borderRadius:6,
                  color: scanRes==="ok"?"#4ade80":"#f87171",
                  background: scanRes==="ok"?"#0a2a12":"#2a0a0a",
                  border:`1px solid ${scanRes==="ok"?"#27ae60":"#e74c3c"}` }}>
                  Porte {scanRes==="ok" ? "OUVERTE":"FERMÉE"}
                </div>
              )}
            </div>

            <div style={{ width:"100%", height:1, background:"#141e33", margin:"2px 0 6px" }}/>

            {COMPS.map(c => (
              <button key={c.id}
                className={`comp-btn ${sel===c.id?"active":""}`}
                onClick={()=>setSel(sel===c.id ? null : c.id)}>
                <div style={{ width:10, height:10, borderRadius:"50%",
                  background:c.color, flexShrink:0,
                  boxShadow: (active(c.id)||sel===c.id) ? `0 0 8px ${c.color}`:"none",
                  animation: active(c.id) ? "glow 0.8s infinite":"none" }} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:12}}>{c.label}</div>
                  <div style={{fontSize:10,color:"#3a4a6a"}}>{c.cat}</div>
                </div>
              </button>
            ))}

            {/* zoom */}
            <div style={{ marginTop:"auto", paddingTop:10, borderTop:"1px solid #141e33",
              display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={()=>setZoom(z=>Math.min(2.2,z+0.1))}
                style={{ flex:1, padding:"4px 0", background:"#141e33",
                  border:"1px solid #1a2744", borderRadius:4, color:"#8aa",
                  cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>+</button>
              <span style={{ fontSize:10, color:"#4a5a7a",
                minWidth:38, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.1))}
                style={{ flex:1, padding:"4px 0", background:"#141e33",
                  border:"1px solid #1a2744", borderRadius:4, color:"#8aa",
                  cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>−</button>
              <button onClick={()=>{setZoom(0.72);setPan({x:0,y:0})}}
                style={{ padding:"4px 8px", background:"#141e33",
                  border:"1px solid #1a2744", borderRadius:4, color:"#6a8aaa",
                  cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>↺</button>
            </div>
          </div>

          {/* CENTER: SVG diagram */}
          <div ref={svgRef} style={{ overflow:"hidden", background:"#060910",
            cursor: drag ? "grabbing":"grab" }}
            onMouseDown={onMD} onMouseMove={onMM}
            onMouseUp={onMU} onMouseLeave={onMU}>
            <svg width="100%" height="100%" style={{display:"block"}}>
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                {/* ── fond grille ── */}
                <g opacity="0.05">
                  {Array.from({length:50},(_,i)=>(
                    <line key={`gv${i}`} x1={i*30} y1={0} x2={i*30} y2={SH} stroke="#4a6a8a" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:32},(_,i)=>(
                    <line key={`gh${i}`} x1={0} y1={i*30} x2={SW} y2={i*30} stroke="#4a6a8a" strokeWidth="0.5"/>
                  ))}
                </g>

                {/* ══ CÂBLES ══ — dessinés AVANT les composants pour passer dessous */}

                {/* LCD SDA */}
                <Wire color={C.sda} active={active("lcd")}
                  d={`M${LP},${pY(1)} C${LP-60},${pY(1)} 340,140 320,135`}/>
                {/* LCD SCL */}
                <Wire color={C.scl} active={active("lcd")}
                  d={`M${LP},${pY(2)} C${LP-70},${pY(2)} 340,152 320,148`}/>
                {/* LCD VCC */}
                <Wire color={C.v5} active={active("lcd")} width={1.4}
                  d={`M${LP},${pY(0)} C${LP-40},${pY(0)} 120,80 105,75`}/>
                {/* LCD GND */}
                <Wire color={C.gnd} active={active("lcd")} width={1.4}
                  d={`M${LP},${pY(2)} C${LP-50},${pY(2)+20} 120,185 105,175`}/>

                {/* LED V1 signal */}
                <Wire color={C.g17} active={active("led_v1")}
                  d={`M${LP},${pY(5)} C${LP-50},${pY(5)} 250,330 210,330`}/>
                {/* LED V2 signal */}
                <Wire color={C.g27} active={active("led_v2")}
                  d={`M${LP},${pY(6)} C${LP-50},${pY(6)} 250,400 210,400`}/>
                {/* LED R1 signal */}
                <Wire color={C.g22} active={active("led_r1")}
                  d={`M${LP},${pY(7)} C${LP-50},${pY(7)} 250,470 210,470`}/>

                {/* GND commun gauche — rail bas breadboard */}
                <Wire color={C.gnd} active={false} width={1.4}
                  d={`M${LP},${pY(4)} C${LP-30},${pY(4)} 100,700 100,715`}/>

                {/* Servo signal */}
                <Wire color={C.g18} active={active("servo")}
                  d={`M${RP},${pY(5)} C${RP+60},${pY(5)} 760,130 800,128`}/>
                {/* Servo VCC */}
                <Wire color={C.v5} active={active("servo")} width={1.4}
                  d={`M${RP},${pY(1)} C${RP+40},${pY(1)} 790,80 800,80`}/>
                {/* Servo GND */}
                <Wire color={C.gnd} active={active("servo")} width={1.4}
                  d={`M${RP},${pY(2)} C${RP+40},${pY(2)} 800,200 800,210`}/>

                {/* LED R2 signal */}
                <Wire color={C.g23} active={active("led_r2")}
                  d={`M${RP},${pY(7)} C${RP+60},${pY(7)} 810,340 820,345`}/>

                {/* Buzzer signal */}
                <Wire color={C.g24} active={active("buzzer")}
                  d={`M${RP},${pY(8)} C${RP+60},${pY(8)} 820,430 820,440`}/>
                {/* Buzzer GND */}
                <Wire color={C.gnd} active={active("buzzer")} width={1.4}
                  d={`M${RP},${pY(9)} C${RP+50},${pY(9)} 870,530 870,540`}/>

                {/* Relay signal */}
                <Wire color={C.g25} active={active("relay")||active("porte")}
                  d={`M${RP},${pY(10)} C${RP+60},${pY(10)} 820,550 820,560`}/>
                {/* Relay VCC */}
                <Wire color={C.v5} active={active("relay")} width={1.4}
                  d={`M${RP},${pY(1)} C${RP+80},${pY(1)-20} 870,470 880,475`}/>
                {/* Relay GND */}
                <Wire color={C.gnd} active={active("relay")} width={1.4}
                  d={`M${RP},${pY(9)} C${RP+60},${pY(9)+20} 900,630 900,640`}/>

                {/* Relay → Porte (câble tirets = 12V) */}
                <path d={`M960,590 C1010,590 1050,540 1070,540`}
                  fill="none" stroke="#7f8c8d" strokeWidth="1.8" strokeDasharray="6 3"
                  opacity={active("porte") ? 1 : 0.4}
                  style={active("porte")?{filter:"drop-shadow(0 0 3px #7f8c8d)"}:{}}/>
                {/* label 12V câble */}
                <text x={1010} y={572} fill="#7f8c8d" fontSize="9" opacity="0.7">12V</text>

                {/* Scanner USB */}
                <Wire color={C.usb} active={active("scanner")}
                  d={`M${RX+RW/2},${RY+RH+4} C${RX+RW/2},730 980,730 1020,720`}/>

                {/* ══ RASPBERRY PI 4 ══ */}
                <g className="selectable" onClick={()=>setSel(null)}>
                  {/* carte PCB */}
                  <rect x={RX} y={RY} width={RW} height={RH} rx="8"
                    fill="#061210" stroke="#1a6a2a" strokeWidth="2"/>
                  {/* header */}
                  <rect x={RX+8} y={RY+8} width={RW-16} height={44} rx="4"
                    fill="#093518" stroke="#156028" strokeWidth="1"/>
                  <text x={RX+RW/2} y={RY+26}
                    fill="#4ade80" fontSize="13" textAnchor="middle"
                    fontWeight="800" fontFamily="'Outfit',sans-serif">RASPBERRY PI 4</text>
                  <text x={RX+RW/2} y={RY+44}
                    fill="#2a7a4a" fontSize="8" textAnchor="middle">BCM2711 — 4 GB RAM</text>

                  {/* ports USB / ETH */}
                  {[{dx:14,w:42,l:"USB"},{dx:60,w:42,l:"USB"},{dx:106,w:36,l:"ETH"},{dx:146,w:36,l:"HDMI"}].map(p=>(
                    <g key={p.l}>
                      <rect x={RX+p.dx} y={RY+RH-40} width={p.w} height={22} rx="2"
                        fill="#141422" stroke="#2a3a5c" strokeWidth="1"/>
                      <text x={RX+p.dx+p.w/2} y={RY+RH-25}
                        fill="#3a4a5a" fontSize="7" textAnchor="middle">{p.l}</text>
                    </g>
                  ))}

                  {/* broches gauche */}
                  {[
                    {r:0,l:"3V3",      c:"#e67e22",used:false},
                    {r:1,l:"GPIO2 SDA",c:C.sda,    used:true },
                    {r:2,l:"GPIO3 SCL",c:C.scl,    used:true },
                    {r:3,l:"GPIO4",    c:"#1a2a4a", used:false},
                    {r:4,l:"GND",      c:C.gnd,    used:true },
                    {r:5,l:"GPIO17",   c:C.g17,    used:true },
                    {r:6,l:"GPIO27",   c:C.g27,    used:true },
                    {r:7,l:"GPIO22",   c:C.g22,    used:true },
                    {r:8,l:"3V3",      c:"#e67e22", used:false},
                    {r:9,l:"GPIO10",   c:"#1a2a4a", used:false},
                    {r:10,l:"GPIO9",   c:"#1a2a4a", used:false},
                    {r:11,l:"GPIO11",  c:"#1a2a4a", used:false},
                    {r:12,l:"GND",     c:C.gnd,    used:false},
                  ].map(p=>(
                    <g key={`lp${p.r}`}>
                      <circle cx={LP+8} cy={pY(p.r)} r="5.5" fill={p.c}
                        opacity={p.used?1:0.4}/>
                      <text x={LP+18} y={pY(p.r)+4}
                        fill={p.c} fontSize="7.5" opacity={p.used?1:0.4}
                        fontWeight={p.used?"600":"400"}>{p.l}</text>
                      <text x={LP+4} y={pY(p.r)+3}
                        fill="#fff" fontSize="6" textAnchor="middle">
                        {[1,3,5,7,9,11,13,15,17,19,21,23,25][p.r]}
                      </text>
                    </g>
                  ))}

                  {/* broches droite */}
                  {[
                    {r:0, l:"5V",        c:C.v5,    used:true },
                    {r:1, l:"5V",        c:C.v5,    used:true },
                    {r:2, l:"GND",       c:C.gnd,   used:true },
                    {r:3, l:"GPIO14",    c:"#1a2a4a",used:false},
                    {r:4, l:"GPIO15",    c:"#1a2a4a",used:false},
                    {r:5, l:"GPIO18 PWM",c:C.g18,   used:true },
                    {r:6, l:"GND",       c:C.gnd,   used:false},
                    {r:7, l:"GPIO23",    c:C.g23,   used:true },
                    {r:8, l:"GPIO24",    c:C.g24,   used:true },
                    {r:9, l:"GND",       c:C.gnd,   used:true },
                    {r:10,l:"GPIO25",    c:C.g25,   used:true },
                    {r:11,l:"GPIO8",     c:"#1a2a4a",used:false},
                    {r:12,l:"GPIO7",     c:"#1a2a4a",used:false},
                  ].map(p=>(
                    <g key={`rp${p.r}`}>
                      <circle cx={RP-8} cy={pY(p.r)} r="5.5" fill={p.c}
                        opacity={p.used?1:0.4}/>
                      <text x={RP-18} y={pY(p.r)+4}
                        fill={p.c} fontSize="7.5" textAnchor="end"
                        opacity={p.used?1:0.4}
                        fontWeight={p.used?"600":"400"}>{p.l}</text>
                      <text x={RP-4} y={pY(p.r)+3}
                        fill="#fff" fontSize="6" textAnchor="middle">
                        {[2,4,6,8,10,12,14,16,18,20,22,24,26][p.r]}
                      </text>
                    </g>
                  ))}
                </g>

                {/* ══ LCD 16×2 I2C ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="lcd"?null:"lcd")}>
                  <rect x={60} y={60} width={260} height={120} rx="6"
                    fill={sel==="lcd"?"#180a28":"#08050f"}
                    stroke={sel==="lcd"?"#9b59b6":"#3a2a5a"} strokeWidth={sel==="lcd"?2:1.2}/>
                  {/* écran LCD vert */}
                  <rect x={76} y={74} width={228} height={60} rx="3"
                    fill="#072a0e" stroke="#103820" strokeWidth="1"/>
                  <text x={190} y={100} fill="#00ff66" fontSize="11"
                    textAnchor="middle" fontFamily="'IBM Plex Mono'">Prenom Nom      </text>
                  <text x={190} y={118} fill="#00ff66" fontSize="11"
                    textAnchor="middle" fontFamily="'IBM Plex Mono'">Acces Autorise  </text>
                  <text x={190} y={162} fill="#7a4aaa" fontSize="9"
                    textAnchor="middle">LCD 16×2 I2C — PCF8574 @ 0x27</text>
                  {/* connecteurs SDA/SCL/VCC/GND */}
                  <circle cx={105} cy={175} r="4" fill={C.v5}/>
                  <text x={105} y={188} fill={C.v5}  fontSize="7" textAnchor="middle">VCC</text>
                  <circle cx={135} cy={175} r="4" fill={C.gnd}/>
                  <text x={135} y={188} fill={C.gnd} fontSize="7" textAnchor="middle">GND</text>
                  <circle cx={165} cy={175} r="4" fill={C.sda}/>
                  <text x={165} y={188} fill={C.sda} fontSize="7" textAnchor="middle">SDA</text>
                  <circle cx={195} cy={175} r="4" fill={C.scl}/>
                  <text x={195} y={188} fill={C.scl} fontSize="7" textAnchor="middle">SCL</text>
                </g>
                {/* points de connexion LCD → câbles */}
                <circle cx={320} cy={135} r="3" fill={C.sda}/>
                <circle cx={320} cy={148} r="3" fill={C.scl}/>

                {/* ══ LEDs GAUCHE ══ */}
                {/* LED V1 */}
                <g className="selectable" onClick={()=>setSel(s=>s==="led_v1"?null:"led_v1")}>
                  <rect x={70} y={302} width={140} height={58} rx="5"
                    fill={sel==="led_v1"?"#0a200e":"#060c08"}
                    stroke={gOn||sel==="led_v1" ? C.g17:"#1a3a20"} strokeWidth={gOn||sel==="led_v1"?2:1}
                    style={gOn?{filter:`drop-shadow(0 0 8px ${C.g17})`}:{}}/>
                  <InlineRes x={130} y={331} color={C.g17}/>
                  <LedSym x={172} y={325} color={C.g17} on={gOn}/>
                  <text x={82} y={322} fill={C.g17} fontSize="8">GPIO17</text>
                  <text x={82} y={348} fill={C.g17} fontSize="8" fontWeight="600">LED V1</text>
                  <text x={82} y={358} fill="#2a5a30" fontSize="7.5">220Ω</text>
                  <circle cx={210} cy={330} r="3.5" fill={C.g17}/>
                </g>

                {/* LED V2 */}
                <g className="selectable" onClick={()=>setSel(s=>s==="led_v2"?null:"led_v2")}>
                  <rect x={70} y={372} width={140} height={58} rx="5"
                    fill={sel==="led_v2"?"#0a200e":"#060c08"}
                    stroke={gOn||sel==="led_v2" ? C.g27:"#1a3a20"} strokeWidth={gOn||sel==="led_v2"?2:1}
                    style={gOn?{filter:`drop-shadow(0 0 8px ${C.g27})`}:{}}/>
                  <InlineRes x={130} y={401} color={C.g27}/>
                  <LedSym x={172} y={395} color={C.g27} on={gOn}/>
                  <text x={82} y={392} fill={C.g27} fontSize="8">GPIO27</text>
                  <text x={82} y={418} fill={C.g27} fontSize="8" fontWeight="600">LED V2</text>
                  <text x={82} y={428} fill="#2a5a30" fontSize="7.5">220Ω</text>
                  <circle cx={210} cy={400} r="3.5" fill={C.g27}/>
                </g>

                {/* LED R1 */}
                <g className="selectable" onClick={()=>setSel(s=>s==="led_r1"?null:"led_r1")}>
                  <rect x={70} y={442} width={140} height={58} rx="5"
                    fill={sel==="led_r1"?"#200808":"#0c0606"}
                    stroke={rOn||sel==="led_r1" ? C.g22:"#3a1a1a"} strokeWidth={rOn||sel==="led_r1"?2:1}
                    style={rOn?{filter:`drop-shadow(0 0 8px ${C.g22})`}:{}}/>
                  <InlineRes x={130} y={471} color={C.g22}/>
                  <LedSym x={172} y={465} color={C.g22} on={rOn}/>
                  <text x={82} y={462} fill={C.g22} fontSize="8">GPIO22</text>
                  <text x={82} y={488} fill={C.g22} fontSize="8" fontWeight="600">LED R1</text>
                  <text x={82} y={498} fill="#5a2a2a" fontSize="7.5">220Ω</text>
                  <circle cx={210} cy={470} r="3.5" fill={C.g22}/>
                </g>

                {/* GND commun gauche */}
                <line x1={100} y1={680} x2={460} y2={680}
                  stroke={C.gnd} strokeWidth="2" opacity="0.6" strokeDasharray="none"/>
                <text x={160} y={694} fill={C.gnd} fontSize="8" opacity="0.7">Rail GND commun (breadboard)</text>
                {/* tiges GND composants gauche */}
                <line x1={120} y1={360} x2={120} y2={680} stroke={C.gnd} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"/>
                <line x1={120} y1={430} x2={120} y2={680} stroke={C.gnd} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"/>
                <line x1={120} y1={500} x2={120} y2={680} stroke={C.gnd} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"/>

                {/* ══ SERVO SG90 ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="servo"?null:"servo")}>
                  <rect x={800} y={68} width={160} height={150} rx="6"
                    fill={sel==="servo"?"#04101e":"#020a14"}
                    stroke={sel==="servo"?C.g18:"#1a3a5c"} strokeWidth={sel==="servo"?2:1.2}/>
                  {/* corps servo */}
                  <rect x={818} y={84} width={80} height={60} rx="3"
                    fill="#0a1a30" stroke="#1a3a5c" strokeWidth="1"/>
                  <circle cx={858} cy={114} r="16" fill="none" stroke={C.g18} strokeWidth="1.2"/>
                  <text x={858} y={118} fill={C.g18} fontSize="11" textAnchor="middle" fontWeight="700">M</text>
                  {/* oreilles servo */}
                  <rect x={810} y={100} width={8} height={28} rx="2" fill="#0a1a30" stroke="#1a3a5c" strokeWidth="1"/>
                  <rect x={898} y={100} width={8} height={28} rx="2" fill="#0a1a30" stroke="#1a3a5c" strokeWidth="1"/>
                  {/* fils servo */}
                  <line x1={820} y1={148} x2={820} y2={172} stroke={C.v5}  strokeWidth="2"/>
                  <line x1={840} y1={148} x2={840} y2={172} stroke={C.gnd} strokeWidth="2"/>
                  <line x1={860} y1={148} x2={860} y2={172} stroke={C.g18} strokeWidth="2"/>
                  <text x={818} y={184} fill={C.v5}  fontSize="7.5">VCC</text>
                  <text x={836} y={184} fill={C.gnd} fontSize="7.5">GND</text>
                  <text x={854} y={184} fill={C.g18} fontSize="7.5">SIG</text>
                  <text x={858} y={210} fill={C.g18} fontSize="9" textAnchor="middle" fontWeight="600">SERVO SG90</text>
                </g>
                <circle cx={800} cy={128} r="3.5" fill={C.g18}/>

                {/* ══ LED R2 ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="led_r2"?null:"led_r2")}>
                  <rect x={800} y={320} width={140} height={58} rx="5"
                    fill={sel==="led_r2"?"#200808":"#0c0606"}
                    stroke={rOn||sel==="led_r2" ? C.g23:"#3a1a1a"} strokeWidth={rOn||sel==="led_r2"?2:1}
                    style={rOn?{filter:`drop-shadow(0 0 8px ${C.g23})`}:{}}/>
                  <InlineRes x={860} y={349} color={C.g23}/>
                  <LedSym x={902} y={343} color={C.g23} on={rOn}/>
                  <text x={812} y={340} fill={C.g23} fontSize="8">GPIO23</text>
                  <text x={812} y={366} fill={C.g23} fontSize="8" fontWeight="600">LED R2</text>
                  <text x={812} y={376} fill="#5a2a2a" fontSize="7.5">220Ω</text>
                  <circle cx={820} cy={345} r="3.5" fill={C.g23}/>
                </g>

                {/* ══ BUZZER ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="buzzer"?null:"buzzer")}>
                  <rect x={800} y={410} width={130} height={100} rx="6"
                    fill={sel==="buzzer"?"#201804":"#0c0c03"}
                    stroke={active("buzzer")||sel==="buzzer" ? C.g24:"#3a3a10"} strokeWidth={active("buzzer")||sel==="buzzer"?2:1.2}/>
                  <circle cx={865} cy={455} r="32"
                    fill="#0d0d04" stroke={C.g24} strokeWidth="1.5"
                    style={active("buzzer")?{filter:`drop-shadow(0 0 8px ${C.g24})`}:{}}/>
                  <circle cx={865} cy={455} r="18" fill="none"
                    stroke={C.g24} strokeWidth="0.7" strokeDasharray="3 2"/>
                  <text x={865} y={452} fill={C.g24} fontSize="12"
                    textAnchor="middle" fontWeight="700">BUZ</text>
                  <text x={865} y={466} fill="#6a5a1a" fontSize="7.5" textAnchor="middle">TMB12A05</text>
                  <text x={865} y={500} fill={C.g24} fontSize="8.5"
                    textAnchor="middle" fontWeight="600">BUZZER ACTIF</text>
                  <circle cx={820} cy={440} r="3.5" fill={C.g24}/>
                </g>

                {/* ══ MODULE RELAIS ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="relay"?null:"relay")}>
                  <rect x={800} y={530} width={160} height={120} rx="6"
                    fill={sel==="relay"?"#201404":"#0c0804"}
                    stroke={active("relay")||sel==="relay" ? C.g25:"#3a2a10"} strokeWidth={active("relay")||sel==="relay"?2:1.2}/>
                  {/* bobine */}
                  <rect x={820} y={558} width={44} height={56} rx="2"
                    fill="none" stroke={C.g25} strokeWidth="1.2"/>
                  <text x={842} y={591} fill={C.g25} fontSize="10" textAnchor="middle" fontWeight="600">COIL</text>
                  {/* contacts */}
                  <line x1={872} y1={572} x2={900} y2={572} stroke={C.g25} strokeWidth="1"/>
                  <line x1={872} y1={600} x2={900} y2={600} stroke={C.g25} strokeWidth="1"/>
                  <circle cx={902} cy={572} r="4" fill="none" stroke={C.g25} strokeWidth="1"/>
                  <circle cx={902} cy={600} r="4" fill="none" stroke={C.g25} strokeWidth="1"/>
                  {/* bras animé */}
                  <line x1={906} y1={572}
                    x2={924} y2={doorOpen?572:596}
                    stroke={C.g25} strokeWidth="2"
                    style={{transition:"all 0.5s ease"}}/>
                  <text x={928} y={576} fill={C.g25} fontSize="8">NO</text>
                  <text x={928} y={604} fill={C.g25} fontSize="8">COM</text>
                  <text x={864} y={640} fill={C.g25} fontSize="9"
                    textAnchor="middle" fontWeight="600">RELAIS K1 — GPIO25</text>
                  <circle cx={820} cy={560} r="3.5" fill={C.g25}/>
                </g>

                {/* ══ SCANNER USB ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="scanner"?null:"scanner")}>
                  <rect x={1020} y={690} width={200} height={80} rx="6"
                    fill={sel==="scanner"?"#03181a":"#020c0c"}
                    stroke={sel==="scanner"?C.usb:"#0a3a38"} strokeWidth={sel==="scanner"?2:1.2}/>
                  <text x={1120} y={726} fill={C.usb} fontSize="13"
                    textAnchor="middle" fontWeight="700">SCANNER USB</text>
                  <text x={1120} y={744} fill="#0a5a4a" fontSize="9" textAnchor="middle">Code-barres HID</text>
                  <text x={1120} y={760} fill={C.usb}  fontSize="7.5" textAnchor="middle">Auto-détecté — aucun pilote</text>
                  {/* connecteur USB */}
                  <rect x={1020} y={718} width={16} height={28} rx="2"
                    fill="#1a1a2a" stroke={C.usb} strokeWidth="1"/>
                  <circle cx={1028} cy={730} r="4" fill="none" stroke={C.usb} strokeWidth="0.8"/>
                </g>
                <circle cx={1028} cy={720} r="3.5" fill={C.usb}/>

                {/* ══ PORTE ANIMÉE ══ */}
                <g className="selectable" onClick={()=>setSel(s=>s==="porte"?null:"porte")}>

                  {/* sol */}
                  <line x1={1060} y1={770} x2={1310} y2={770}
                    stroke="#5a5a6a" strokeWidth="3"/>

                  {/* cadre de porte */}
                  <rect x={1080} y={480} width={220} height={290} rx="4"
                    fill="none" stroke="#6a6a7a" strokeWidth="2.5"/>

                  {/* label */}
                  <text x={1190} y={472} fill="#6a6a7a" fontSize="9.5"
                    textAnchor="middle" fontWeight="600">PORTE + GÂCHE 12V</text>

                  {/* ombre portée (quand porte ouverte) */}
                  {doorOpen && (
                    <ellipse cx={1130} cy={768} rx={80} ry={12}
                      fill="rgba(0,0,0,0.5)"
                      style={{filter:"blur(6px)"}}/>
                  )}

                  {/* ── feuille de porte ── */}
                  <g className="door-leaf"
                    style={{
                      transformOrigin:"1083px 482px",
                      transform: doorOpen
                        ? "perspective(700px) rotateY(-82deg)"
                        : "rotateY(0deg)",
                    }}>
                    {/* panneau bois */}
                    <rect x={1083} y={482} width={214} height={286} rx="3"
                      fill={doorOpen ? "#0d2a3a" : "#1e1206"}
                      stroke={doorOpen ? "#3498db" : "#8a6030"}
                      strokeWidth="2"/>
                    {/* moulure haut */}
                    <rect x={1098} y={497} width={184} height={100} rx="2"
                      fill="none"
                      stroke={doorOpen ? "#5dade2" : "#6a4a20"}
                      strokeWidth="1"/>
                    {/* vitre / panneau bas */}
                    <rect x={1098} y={612} width={184} height={136} rx="2"
                      fill={doorOpen ? "rgba(52,152,219,0.15)" : "rgba(180,130,50,0.12)"}
                      stroke={doorOpen ? "#5dade2" : "#6a4a20"}
                      strokeWidth="1"/>
                    {/* poignée */}
                    <circle cx={1272} cy={638} r="10"
                      fill={doorOpen ? "#3498db" : "#c08030"}
                      style={{transition:"fill .5s"}}/>
                    <rect x={1268} cy={648} x2={1276} width={8} height={28} rx="3"
                      fill={doorOpen ? "#2980b9" : "#8a5a20"}
                      style={{transition:"fill .5s"}}/>
                    {/* charnière */}
                    <rect x={1083} y={500} width={8} height={18} rx="2" fill="#555"/>
                    <rect x={1083} y={680} width={8} height={18} rx="2" fill="#555"/>
                    {/* statut texte */}
                    <text x={1190} y={762}
                      fill={doorOpen ? "#5dade2" : "#c08030"}
                      fontSize="13" textAnchor="middle" fontWeight="800"
                      style={{transition:"fill .5s"}}>
                      {doorOpen ? "▶ OUVERTE" : "■ FERMÉE"}
                    </text>
                  </g>

                  {/* verrou (fixe, sur le cadre) */}
                  <rect x={1080} y={634} width={14} height={30} rx="3"
                    fill={doorOpen ? "#27ae60" : "#e74c3c"}
                    style={{transition:"fill .5s",filter: doorOpen ? "drop-shadow(0 0 6px #27ae60)" : "drop-shadow(0 0 4px #e74c3c)"}}/>

                  {/* indicateur d'état */}
                  <rect x={1085} y={780} width={210} height={28} rx="6"
                    fill={doorOpen ? "#0a2a12" : "#2a0a0a"}
                    stroke={doorOpen ? "#27ae60" : "#e74c3c"}
                    strokeWidth="1.2"/>
                  <text x={1190} y={799}
                    fill={doorOpen ? "#4ade80" : "#f87171"}
                    fontSize="11" textAnchor="middle" fontWeight="700">
                    {doorOpen ? "● ACCÈS AUTORISÉ" : "● ACCÈS REFUSÉ"}
                  </text>

                  {/* point connexion câble 12V */}
                  <circle cx={1070} cy={540} r="4" fill="#7f8c8d"/>
                </g>

              </g>
            </svg>
          </div>

          {/* RIGHT: info panel */}
          <div style={{ padding:"14px 14px", background:"#0a0e18",
            borderLeft:"1px solid #1a2744", overflowY:"auto",
            display:"flex", flexDirection:"column", gap:12 }}>

            {/* état porte */}
            <div style={{ padding:"12px 14px",
              background: doorOpen ? "#071a0e":"#1a0707", borderRadius:10,
              border:`1.5px solid ${doorOpen?"#27ae60":"#e74c3c"}` }}>
              <div style={{ fontSize:10, color:"#5a6a7a",
                textTransform:"uppercase", marginBottom:6 }}>État porte</div>
              <div style={{ fontSize:20, fontWeight:800,
                color: doorOpen?"#4ade80":"#f87171" }}>
                {doorOpen ? "● OUVERTE" : "● FERMÉE"}
              </div>
              {scanRes && (
                <div style={{ fontSize:10, marginTop:6,
                  color: scanRes==="ok"?"#4ade80":"#f87171" }}>
                  {scanRes==="ok" ? "Scan autorisé — relais activé" : "Scan refusé — porte verrouillée"}
                </div>
              )}
            </div>

            {/* détails composant */}
            {selInfo ? (
              <div className="card" style={{ padding:16 }}>
                <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700,
                  fontSize:15, color:"#e8ecf2", marginBottom:4 }}>
                  {COMPS.find(c=>c.id===sel)?.label}
                </div>
                <div style={{ fontSize:10, color:"#3a4a6a",
                  textTransform:"uppercase", marginBottom:6 }}>Câblage</div>
                <div style={{ background:"#070b14", borderRadius:8, padding:12,
                  border:"1px solid #121c30",
                  fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:11.5, color:"#c0c8d8",
                  lineHeight:1.9, whiteSpace:"pre-line" }}>
                  {selInfo.wiring}
                </div>
                <div style={{ marginTop:12, fontSize:11, color:"#8a9aba",
                  lineHeight:1.75, padding:"10px 12px",
                  background:"#070b14", borderRadius:8,
                  border:"1px solid #121c30" }}>
                  {selInfo.note}
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding:16, textAlign:"center" }}>
                <div style={{ color:"#2a3a5c", fontSize:36, marginBottom:8 }}>↙</div>
                <div style={{ color:"#4a5a7a", fontSize:12, lineHeight:1.7 }}>
                  Cliquez sur un composant dans le schéma ou dans la liste pour voir son câblage.
                </div>
              </div>
            )}

            {/* légende câbles */}
            <div className="card" style={{ padding:14 }}>
              <div style={{ fontSize:10, color:"#3a4a6a",
                textTransform:"uppercase", marginBottom:10 }}>Légende câbles</div>
              {[
                {c:C.sda, l:"SDA (LCD)"},
                {c:C.scl, l:"SCL (LCD)"},
                {c:C.g17, l:"GPIO 17 — LED V1"},
                {c:C.g27, l:"GPIO 27 — LED V2"},
                {c:C.g22, l:"GPIO 22 — LED R1"},
                {c:C.g23, l:"GPIO 23 — LED R2"},
                {c:C.g18, l:"GPIO 18 — Servo"},
                {c:C.g24, l:"GPIO 24 — Buzzer"},
                {c:C.g25, l:"GPIO 25 — Relais"},
                {c:C.v5,  l:"+5V alimentation"},
                {c:C.gnd, l:"GND masse"},
                {c:C.usb, l:"USB Scanner"},
              ].map(x=>(
                <div key={x.l} style={{ display:"flex", alignItems:"center",
                  gap:8, marginBottom:5 }}>
                  <div style={{ width:24, height:3, background:x.c,
                    borderRadius:2, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"#6a7a9a" }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPES VIEW ── */}
      {view === "etapes" && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px",
          display:"flex", justifyContent:"center" }}>
          <div style={{ maxWidth:780, width:"100%" }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22,
              fontWeight:700, color:"#e8ecf2", marginBottom:24 }}>
              Étapes de montage — ordre recommandé
            </div>
            {STEPS.map(s=>(
              <div key={s.n} style={{ display:"flex", gap:16, marginBottom:20 }}>
                <div style={{ display:"flex", flexDirection:"column",
                  alignItems:"center", flexShrink:0 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%",
                    background:`${s.color}22`, border:`2px solid ${s.color}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'Outfit',sans-serif", fontWeight:700,
                    fontSize:16, color:s.color }}>
                    {s.n}
                  </div>
                  {s.n < STEPS.length && (
                    <div style={{ width:2, height:36, background:"#141e33", marginTop:4 }}/>
                  )}
                </div>
                <div className="card" style={{ padding:16, flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontFamily:"'Outfit',sans-serif",
                      fontWeight:600, fontSize:15, color:"#e8ecf2" }}>
                      {s.title}
                    </div>
                    <span style={{ fontSize:10, color:"#4a5a7a",
                      background:"#080c16", padding:"2px 8px",
                      borderRadius:4, border:"1px solid #141e33" }}>
                      {s.t}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:"#8a9aba", lineHeight:1.75 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ padding:16, textAlign:"center",
              borderColor:"#1a5276", marginTop:8 }}>
              <div style={{ fontFamily:"'Outfit',sans-serif",
                fontWeight:700, fontSize:16, color:"#5dade2" }}>
                Temps total estimé : ~38 minutes
              </div>
              <div style={{ fontSize:12, color:"#4a5a7a", marginTop:4 }}>
                Pour le premier montage. Les montages suivants seront plus rapides.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
