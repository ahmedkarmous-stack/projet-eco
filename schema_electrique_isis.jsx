import { useState, useRef, useEffect } from "react";

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;

/* ── petit composant : symbole GND ── */
function GndSym({ x, y }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#556" strokeWidth="1.2" />
      <line x1={x - 10} y1={y + 10} x2={x + 10} y2={y + 10} stroke="#556" strokeWidth="1.5" />
      <line x1={x - 6}  y1={y + 15} x2={x + 6}  y2={y + 15} stroke="#556" strokeWidth="1.1" />
      <line x1={x - 3}  y1={y + 20} x2={x + 3}  y2={y + 20} stroke="#556" strokeWidth="0.8" />
    </g>
  );
}

/* ── symbole +VCC ── */
function VccSym({ x, y, label, color }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 10} stroke={color} strokeWidth="1.2" />
      <line x1={x - 10} y1={y - 10} x2={x + 10} y2={y - 10} stroke={color} strokeWidth="1.5" />
      <text x={x} y={y - 14} fill={color} fontSize="8" textAnchor="middle" fontWeight="700">{label}</text>
    </g>
  );
}

/* ── net flag (flèche de net label ISIS) ── */
function NetFlag({ x, y, name, color, dir = "right" }) {
  const w = name.length * 6 + 14;
  const pts = dir === "right"
    ? `${x},${y-7} ${x+w},${y-7} ${x+w+8},${y} ${x+w},${y+7} ${x},${y+7}`
    : `${x},${y-7} ${x-w},${y-7} ${x-w-8},${y} ${x-w},${y+7} ${x},${y+7}`;
  return (
    <g>
      <polygon points={pts} fill="#080e1a" stroke={color} strokeWidth="0.9" />
      <text
        x={dir === "right" ? x + 5 : x - 5}
        y={y + 4}
        fill={color} fontSize="8" fontWeight="700"
        textAnchor={dir === "right" ? "start" : "end"}
      >{name}</text>
    </g>
  );
}

/* ── résistance verticale ── */
function Resistor({ x, y, label, value, color, sel, onCk }) {
  return (
    <g className="comp-click" onClick={onCk}>
      <rect x={x-12} y={y} width={24} height={58} rx="2"
        fill={sel ? "#1a2a1a" : "#0b1218"} stroke={color} strokeWidth="1" />
      <path
        d={`M${x},${y+3} L${x+6},${y+11} L${x-6},${y+19} L${x+6},${y+27} L${x-6},${y+35} L${x+6},${y+43} L${x-6},${y+51} L${x},${y+55}`}
        fill="none" stroke={color} strokeWidth="1" />
      <text x={x+16} y={y+22} fill={color} fontSize="9" fontWeight="600">{label}</text>
      <text x={x+16} y={y+34} fill={color} fontSize="8" opacity="0.7">{value}</text>
    </g>
  );
}

/* ── LED verticale (anode haut, cathode bas) ── */
function LED({ x, y, label, sublabel, color, sel, onCk }) {
  return (
    <g className="comp-click" onClick={onCk}>
      <polygon points={`${x-13},${y} ${x+13},${y} ${x},${y+34}`}
        fill={sel ? "#162a18" : "#07130a"} stroke={color} strokeWidth="1" />
      <line x1={x-13} y1={y+34} x2={x+13} y2={y+34} stroke={color} strokeWidth="1.5" />
      <line x1={x+15} y1={y+7}  x2={x+25} y2={y+1}  stroke={color} strokeWidth="0.9" />
      <polygon points={`${x+25},${y+1} ${x+21},${y+7} ${x+27},${y+5}`} fill={color} />
      <line x1={x+18} y1={y+17} x2={x+28} y2={y+11} stroke={color} strokeWidth="0.9" />
      <polygon points={`${x+28},${y+11} ${x+24},${y+17} ${x+30},${y+15}`} fill={color} />
      <text x={x-17} y={y+14} fill={color} fontSize="9"  textAnchor="end" fontWeight="600">{label}</text>
      <text x={x-17} y={y+26} fill={color} fontSize="7.5" textAnchor="end" opacity="0.8">{sublabel}</text>
    </g>
  );
}

const btnS = {
  width: 28, height: 28, background: "#1a2744", border: "1px solid #2a3a5c",
  borderRadius: 4, color: "#8aa", cursor: "pointer", fontSize: 16,
  display: "flex", alignItems: "center", justifyContent: "center",
};

export default function App() {
  const [zoom, setZoom]       = useState(0.62);
  const [pan,  setPan]        = useState({ x: 30, y: 20 });
  const [drag, setDrag]       = useState(false);
  const [ds,   setDs]         = useState({ x: 0, y: 0 });
  const [sel,  setSel]        = useState(null);
  const [grid, setGrid]       = useState(true);
  const [lbl,  setLbl]        = useState(true);
  const [doorOpen, setDoorOpen] = useState(false);
  const [scanRes,  setScanRes]  = useState(null); // null | "ok" | "ko"
  const svgRef  = useRef(null);
  const timerRef = useRef(null);

  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };
  useEffect(() => {
    const el = svgRef.current;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", onWheel); };
  }, []);

  const onMD = (e) => {
    if (e.button === 0 && !e.target.closest(".comp-click")) {
      setDrag(true); setDs({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const onMM = (e) => { if (drag) setPan({ x: e.clientX - ds.x, y: e.clientY - ds.y }); };
  const onMU = () => setDrag(false);

  const simulate = (ok) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanRes(ok ? "ok" : "ko");
    setDoorOpen(ok);
    timerRef.current = setTimeout(() => { setScanRes(null); setDoorOpen(false); }, 3500);
  };

  const INFO = {
    rpi:     { name: "Raspberry Pi 4 Model B", ref: "RPi4-4GB",           desc: "Processeur ARM Cortex-A72 quad-core 1.5GHz, 4GB RAM. Cerveau du systeme. 40 broches GPIO." },
    r1:      { name: "Résistance R1",           ref: "220Ω 1/4W",          desc: "Protection LED Verte 1 (GPIO17). Calcul: (3.3V-2V)/220Ω ≈ 6mA." },
    r2:      { name: "Résistance R2",           ref: "220Ω 1/4W",          desc: "Protection LED Verte 2 (GPIO27)." },
    r3:      { name: "Résistance R3",           ref: "220Ω 1/4W",          desc: "Protection LED Rouge 1 (GPIO22)." },
    r4:      { name: "Résistance R4",           ref: "220Ω 1/4W",          desc: "Protection LED Rouge 2 (GPIO23)." },
    r5:      { name: "Résistance R5 pull-down", ref: "10kΩ 1/4W",          desc: "Pull-down sur GPIO25 pour éviter déclenchement parasite du relais." },
    ledv1:   { name: "LED Verte D1",            ref: "5mm diffuse",         desc: "Accès autorisé. Vf=2.0V, pilotée par GPIO17 via R1." },
    ledv2:   { name: "LED Verte D2",            ref: "5mm diffuse",         desc: "Accès autorisé (redondante). GPIO27 via R2." },
    ledr1:   { name: "LED Rouge D3",            ref: "5mm diffuse",         desc: "Accès refusé. GPIO22 via R3. Vf=1.8V." },
    ledr2:   { name: "LED Rouge D4",            ref: "5mm diffuse",         desc: "Accès refusé (redondante). GPIO23 via R4." },
    buz:     { name: "Buzzer Actif BZ1",        ref: "TMB12A05 5V",         desc: "HIGH=bip, LOW=silence. 1 bip=autorisé, 3 bips=refusé. Oscillateur intégré." },
    servo:   { name: "Servo-moteur SG90",       ref: "TowerPro SG90",       desc: "PWM 50Hz sur GPIO18. 2.5%=0°, 7.5%=90°, 12.5%=180°. Couple 1.8 kg/cm." },
    lcd:     { name: "Ecran LCD 16×2 I2C",      ref: "HD44780 + PCF8574",   desc: "Bus I2C (SDA=GPIO2, SCL=GPIO3). Adresse 0x27. Affiche nom + statut." },
    relay:   { name: "Module Relais K1",        ref: "SRD-05VDC-SL-C",      desc: "Commandé par GPIO25. Contacts NO/NC/COM. Alimente la gâche 12V." },
    gache:   { name: "Gâche + Porte",           ref: "12V DC",              desc: "Serrure électrique reliée au contact NO du relais. S'ouvre quand relais activé." },
    scanner: { name: "Scanner Code-barres",     ref: "HID USB générique",   desc: "Interface USB HID (émule clavier). Détection automatique par Raspberry Pi OS." },
    alim:    { name: "Alimentation USB-C",      ref: "5V / 3A officielle",  desc: "Alimentation officielle RPi. 5.1V/3A. Protection courts-circuits." },
    sd:      { name: "Carte microSD",           ref: "SanDisk Ultra 32GB",  desc: "Classe 10. Stocke RPi OS, SQLite, code Python." },
    c1:      { name: "Condensateur C1",         ref: "100µF électrolytique",desc: "Découplage sur rail +5V." },
    c2:      { name: "Condensateur C2",         ref: "100µF électrolytique",desc: "Découplage sur rail +3.3V." },
  };

  const selInfo = sel ? INFO[sel] : null;

  /* RPi geometry */
  const RX = 660, RY = 200, RW = 320, RH = 740;
  const LX = RX;           // left-pin exit x
  const RRX = RX + RW;     // right-pin exit x  = 980
  const pY  = (row) => RY + 100 + row * 44;

  /* Left GPIO rows */
  const LP = [
    { row:0, pin:1,  label:"3V3",          color:"#e67e22", id:null },
    { row:1, pin:3,  label:"GPIO2 SDA",    color:"#9b59b6", id:"sda" },
    { row:2, pin:5,  label:"GPIO3 SCL",    color:"#8e44ad", id:"scl" },
    { row:3, pin:7,  label:"GPIO4",        color:"#2a3a5c", id:null },
    { row:4, pin:9,  label:"GND",          color:"#556",    id:null },
    { row:5, pin:11, label:"GPIO17",       color:"#27ae60", id:"g17" },
    { row:6, pin:13, label:"GPIO27",       color:"#2ecc71", id:"g27" },
    { row:7, pin:15, label:"GPIO22",       color:"#e74c3c", id:"g22" },
    { row:8, pin:17, label:"3V3",          color:"#e67e22", id:null },
    { row:9, pin:19, label:"GPIO10",       color:"#2a3a5c", id:null },
    { row:10,pin:21, label:"GPIO9",        color:"#2a3a5c", id:null },
    { row:11,pin:23, label:"GPIO11",       color:"#2a3a5c", id:null },
    { row:12,pin:25, label:"GND",          color:"#556",    id:null },
  ];

  /* Right GPIO rows */
  const RP = [
    { row:0, pin:2,  label:"5V",           color:"#c0392b", id:null },
    { row:1, pin:4,  label:"5V",           color:"#c0392b", id:"5v4" },
    { row:2, pin:6,  label:"GND",          color:"#556",    id:null },
    { row:3, pin:8,  label:"GPIO14",       color:"#2a3a5c", id:null },
    { row:4, pin:10, label:"GPIO15",       color:"#2a3a5c", id:null },
    { row:5, pin:12, label:"GPIO18 PWM",   color:"#3498db", id:"g18" },
    { row:6, pin:14, label:"GND",          color:"#556",    id:null },
    { row:7, pin:16, label:"GPIO23",       color:"#c0392b", id:"g23" },
    { row:8, pin:18, label:"GPIO24",       color:"#f39c12", id:"g24" },
    { row:9, pin:20, label:"GND",          color:"#556",    id:null },
    { row:10,pin:22, label:"GPIO25",       color:"#e67e22", id:"g25" },
    { row:11,pin:24, label:"GPIO8",        color:"#2a3a5c", id:null },
    { row:12,pin:26, label:"GPIO7",        color:"#2a3a5c", id:null },
  ];

  /* active LED colors (brighter during scan) */
  const gCol  = scanRes === "ok" ? "#00ff88" : "#27ae60";
  const g2Col = scanRes === "ok" ? "#00ff88" : "#2ecc71";
  const rCol  = scanRes === "ko" ? "#ff3333" : "#e74c3c";
  const r2Col = scanRes === "ko" ? "#ff3333" : "#c0392b";

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
      background:"#080b14", color:"#c8d0e0",
      fontFamily:"'IBM Plex Mono', monospace", overflow:"hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2a3a5c;border-radius:3px}
        .comp-click{cursor:pointer}
        .comp-click:hover rect,.comp-click:hover circle,
        .comp-click:hover polygon,.comp-click:hover ellipse{filter:brightness(1.35)}
        .door-leaf{transition:transform .9s cubic-bezier(.4,0,.2,1)}
      `}</style>

      {/* ── TOOLBAR ── */}
      <div style={{ background:"#0c1120", borderBottom:"1px solid #1a2744",
        padding:"7px 14px", display:"flex", alignItems:"center",
        gap:14, flexShrink:0, zIndex:10, flexWrap:"wrap" }}>

        <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700,
          fontSize:15, color:"#e8ecf2" }}>
          Schéma Électrique — ISIS
        </span>

        <div style={{ width:1, height:20, background:"#1a2744" }} />

        {/* zoom */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <button style={btnS} onClick={() => setZoom(z=>Math.min(ZOOM_MAX,z+0.12))}>+</button>
          <span style={{ fontSize:11, color:"#5a7a9a", minWidth:38, textAlign:"center" }}>
            {Math.round(zoom*100)}%
          </span>
          <button style={btnS} onClick={() => setZoom(z=>Math.max(ZOOM_MIN,z-0.12))}>−</button>
          <button style={{ ...btnS, width:"auto", padding:"0 10px", fontSize:10 }}
            onClick={() => { setZoom(0.62); setPan({x:30,y:20}); }}>Reset</button>
        </div>

        <div style={{ width:1, height:20, background:"#1a2744" }} />

        <label style={{ fontSize:11, color:"#5a7a9a", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
          <input type="checkbox" checked={grid} onChange={()=>setGrid(!grid)} style={{accentColor:"#2471a3"}} /> Grille
        </label>
        <label style={{ fontSize:11, color:"#5a7a9a", display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
          <input type="checkbox" checked={lbl}  onChange={()=>setLbl(!lbl)}   style={{accentColor:"#2471a3"}} /> Valeurs
        </label>

        <div style={{ width:1, height:20, background:"#1a2744" }} />

        {/* scan sim */}
        <span style={{ fontSize:11, color:"#5a7a9a" }}>Simuler scan :</span>
        <button onClick={()=>simulate(true)} style={{
          padding:"4px 13px", borderRadius:4, cursor:"pointer",
          fontFamily:"inherit", fontSize:11, fontWeight:700, border:"1px solid #27ae60",
          background: scanRes==="ok" ? "#0d3a1a" : "#050e08", color:"#27ae60" }}>
          ✓ Autorisé
        </button>
        <button onClick={()=>simulate(false)} style={{
          padding:"4px 13px", borderRadius:4, cursor:"pointer",
          fontFamily:"inherit", fontSize:11, fontWeight:700, border:"1px solid #e74c3c",
          background: scanRes==="ko" ? "#3a0d0d" : "#0e0505", color:"#e74c3c" }}>
          ✗ Refusé
        </button>
        {scanRes && (
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:4,
            color: scanRes==="ok" ? "#4ade80":"#f87171",
            background: scanRes==="ok" ? "#0a2a12":"#2a0a0a",
            border:`1px solid ${scanRes==="ok"?"#27ae60":"#e74c3c"}` }}>
            {scanRes==="ok" ? "Porte OUVERTE" : "Accès REFUSÉ"}
          </span>
        )}
        <div style={{flex:1}} />
        <span style={{ fontSize:10, color:"#3a4a6a" }}>Scroll=zoom · Glisser=déplacer · Clic=détails</span>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── SVG CANVAS ── */}
        <div ref={svgRef} style={{ flex:1, overflow:"hidden",
          cursor: drag ? "grabbing":"grab", background:"#060910" }}
          onMouseDown={onMD} onMouseMove={onMM}
          onMouseUp={onMU} onMouseLeave={onMU}>

          <svg width="100%" height="100%" style={{display:"block"}}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

              {/* grid */}
              {grid && (
                <g opacity="0.06">
                  {Array.from({length:80},(_,i)=>(
                    <line key={`gv${i}`} x1={i*30} y1={0} x2={i*30} y2={2600} stroke="#4a6a8a" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:90},(_,i)=>(
                    <line key={`gh${i}`} x1={0} y1={i*30} x2={2400} y2={i*30} stroke="#4a6a8a" strokeWidth="0.5"/>
                  ))}
                </g>
              )}

              {/* border */}
              <rect x="20" y="20" width="2200" height="1380" fill="none"
                stroke="#1a2744" strokeWidth="1.5" rx="4"/>

              {/* title block */}
              <rect x="1500" y="1310" width="720" height="90"
                fill="#0b1020" stroke="#1a2744" strokeWidth="1"/>
              <text x="1510" y="1334" fill="#4a5a7a" fontSize="10">Titre : Système Contrôle Accès Code-Barres</text>
              <text x="1510" y="1352" fill="#4a5a7a" fontSize="10">Auteur : Projet Embarqué 2024-2025  |  Rév : 2.0</text>
              <text x="1510" y="1370" fill="#2471a3" fontSize="10">Plateforme : Raspberry Pi 4 Model B</text>

              {/* ══ POWER RAILS ══ */}
              <line x1="40" y1="60"   x2="2200" y2="60"   stroke="#c0392b" strokeWidth="1.5"/>
              <text x="30" y="64" fill="#c0392b" fontSize="12" fontWeight="700" textAnchor="end">+5V</text>

              <line x1="40" y1="112"  x2="1700" y2="112"  stroke="#e67e22" strokeWidth="1.2"/>
              <text x="30" y="116" fill="#e67e22" fontSize="12" fontWeight="700" textAnchor="end">+3.3V</text>

              {/* ══ ALIMENTATION ══ */}
              <g className="comp-click" onClick={()=>setSel("alim")}>
                <rect x="40" y="32" width="130" height="44" rx="4"
                  fill={sel==="alim"?"#1a2744":"#0c1220"} stroke="#c0392b" strokeWidth="1"/>
                <text x="105" y="52" fill="#c0392b" fontSize="11" textAnchor="middle" fontWeight="600">ALIM USB-C</text>
                <text x="105" y="66" fill="#6a4a3a" fontSize="9"  textAnchor="middle">5V / 3A</text>
              </g>
              <line x1="170" y1="54" x2="200" y2="54" stroke="#c0392b" strokeWidth="1"/>
              <line x1="200" y1="54" x2="200" y2="60" stroke="#c0392b" strokeWidth="1"/>
              <circle cx="200" cy="60" r="3" fill="#c0392b"/>

              {/* ══ RASPBERRY PI 4 ══ */}
              <g className="comp-click" onClick={()=>setSel("rpi")}>
                <rect x={RX} y={RY} width={RW} height={RH} rx="8"
                  fill={sel==="rpi"?"#0a2a1a":"#050f0a"} stroke="#27ae60" strokeWidth="2"/>
                <rect x={RX+10} y={RY+10} width={RW-20} height={46} rx="4"
                  fill="#093518" stroke="#156028" strokeWidth="1"/>
                <text x={RX+RW/2} y={RY+30}
                  fill="#4ade80" fontSize="14" textAnchor="middle"
                  fontWeight="800" fontFamily="'Outfit',sans-serif">RASPBERRY PI 4</text>
                <text x={RX+RW/2} y={RY+48}
                  fill="#2a7a4a" fontSize="8.5" textAnchor="middle">BCM2711 — ARM Cortex-A72 — 4 GB RAM</text>

                {/* USB/ETH ports */}
                {[
                  {dx:20, w:62, lbl:"USB 3.0"},
                  {dx:90, w:62, lbl:"USB 2.0"},
                  {dx:160,w:50, lbl:"ETH"},
                  {dx:218,w:58, lbl:"HDMI"},
                ].map(p=>(
                  <g key={p.lbl}>
                    <rect x={RX+p.dx} y={RY+RH-60} width={p.w} height={22} rx="2"
                      fill="#141422" stroke="#2a3a5c" strokeWidth="1"/>
                    <text x={RX+p.dx+p.w/2} y={RY+RH-44}
                      fill="#4a5a7a" fontSize="7.5" textAnchor="middle">{p.lbl}</text>
                  </g>
                ))}

                {/* Left pins */}
                {LP.map(p=>{
                  const py = pY(p.row);
                  return (
                    <g key={`lp${p.pin}`}>
                      <circle cx={LX+9} cy={py} r="5.5" fill={p.color}/>
                      <text x={LX+20} y={py+4} fill={p.color} fontSize="8.5"
                        fontWeight={p.id?"600":"400"}>{p.label}</text>
                      <text x={LX+5}  y={py+3} fill="#fff" fontSize="6.5" textAnchor="middle">{p.pin}</text>
                      {/* short exit stub for used pins */}
                      {p.id && <line x1={LX} y1={py} x2={LX+9} y2={py} stroke={p.color} strokeWidth="1.2"/>}
                    </g>
                  );
                })}

                {/* Right pins */}
                {RP.map(p=>{
                  const py = pY(p.row);
                  return (
                    <g key={`rp${p.pin}`}>
                      <circle cx={RRX-9} cy={py} r="5.5" fill={p.color}/>
                      <text x={RRX-20} y={py+4} fill={p.color} fontSize="8.5"
                        textAnchor="end" fontWeight={p.id?"600":"400"}>{p.label}</text>
                      <text x={RRX-5} y={py+3} fill="#fff" fontSize="6.5" textAnchor="middle">{p.pin}</text>
                      {p.id && <line x1={RRX} y1={py} x2={RRX-9} y2={py} stroke={p.color} strokeWidth="1.2"/>}
                    </g>
                  );
                })}
              </g>

              {/* microSD */}
              <g className="comp-click" onClick={()=>setSel("sd")}>
                <rect x={RX+90} y={RY+RH+20} width={140} height={36} rx="3"
                  fill={sel==="sd"?"#1a2744":"#0c1220"} stroke="#3498db" strokeWidth="1"/>
                <text x={RX+160} y={RY+RH+37} fill="#3498db" fontSize="9.5" textAnchor="middle" fontWeight="500">microSD 32 GB</text>
                <text x={RX+160} y={RY+RH+50} fill="#1a3a5a" fontSize="8"   textAnchor="middle">SanDisk Ultra</text>
              </g>

              {/* ══ NET FLAGS from GPIO pins ══ */}
              {/* Left side */}
              <line x1={LX} y1={pY(1)} x2={LX-8} y2={pY(1)} stroke="#9b59b6" strokeWidth="1"/>
              <NetFlag x={LX-8} y={pY(1)} name="SDA" color="#9b59b6" dir="left"/>

              <line x1={LX} y1={pY(2)} x2={LX-8} y2={pY(2)} stroke="#8e44ad" strokeWidth="1"/>
              <NetFlag x={LX-8} y={pY(2)} name="SCL" color="#8e44ad" dir="left"/>

              <line x1={LX} y1={pY(5)} x2={LX-8} y2={pY(5)} stroke="#27ae60" strokeWidth="1"/>
              <NetFlag x={LX-8} y={pY(5)} name="G17" color="#27ae60" dir="left"/>

              <line x1={LX} y1={pY(6)} x2={LX-8} y2={pY(6)} stroke="#2ecc71" strokeWidth="1"/>
              <NetFlag x={LX-8} y={pY(6)} name="G27" color="#2ecc71" dir="left"/>

              <line x1={LX} y1={pY(7)} x2={LX-8} y2={pY(7)} stroke="#e74c3c" strokeWidth="1"/>
              <NetFlag x={LX-8} y={pY(7)} name="G22" color="#e74c3c" dir="left"/>

              {/* Right side */}
              <line x1={RRX} y1={pY(5)} x2={RRX+8} y2={pY(5)} stroke="#3498db" strokeWidth="1"/>
              <NetFlag x={RRX+8} y={pY(5)} name="G18" color="#3498db"/>

              <line x1={RRX} y1={pY(7)} x2={RRX+8} y2={pY(7)} stroke="#c0392b" strokeWidth="1"/>
              <NetFlag x={RRX+8} y={pY(7)} name="G23" color="#c0392b"/>

              <line x1={RRX} y1={pY(8)} x2={RRX+8} y2={pY(8)} stroke="#f39c12" strokeWidth="1"/>
              <NetFlag x={RRX+8} y={pY(8)} name="G24" color="#f39c12"/>

              <line x1={RRX} y1={pY(10)} x2={RRX+8} y2={pY(10)} stroke="#e67e22" strokeWidth="1"/>
              <NetFlag x={RRX+8} y={pY(10)} name="G25" color="#e67e22"/>

              {/* ══ LCD 16x2 I2C ══
                  Positionné en haut à gauche, relié par SDA/SCL nets  */}
              {/* SDA net → LCD */}
              <line x1={130} y1={148} x2={130} y2={160} stroke="#9b59b6" strokeWidth="1"/>
              <NetFlag x={130} y={148} name="SDA" color="#9b59b6" dir="right"/>
              {/* SCL net → LCD */}
              <line x1={200} y1={148} x2={200} y2={160} stroke="#8e44ad" strokeWidth="1"/>
              <NetFlag x={200} y={148} name="SCL" color="#8e44ad" dir="right"/>

              <g className="comp-click" onClick={()=>setSel("lcd")}>
                <rect x={60} y={160} width={360} height={100} rx="5"
                  fill={sel==="lcd"?"#190830":"#08050f"} stroke="#9b59b6" strokeWidth="1.5"/>
                <rect x={80} y={175} width={320} height={56} rx="2"
                  fill="#082a10" stroke="#154022" strokeWidth="1"/>
                <text x={240} y={200} fill="#00ff55" fontSize="12" textAnchor="middle"
                  fontFamily="'IBM Plex Mono'">Prenom Nom       </text>
                <text x={240} y={218} fill="#00ff55" fontSize="12" textAnchor="middle"
                  fontFamily="'IBM Plex Mono'">Acces Autorise   </text>
                {lbl && <text x={240} y={248} fill="#7a4aaa" fontSize="9" textAnchor="middle">
                  LCD 16×2 I2C — HD44780 + PCF8574 (0x27)
                </text>}
                {/* connector dots */}
                <circle cx={130} cy={260} r="3" fill="#9b59b6"/>
                <circle cx={200} cy={260} r="3" fill="#8e44ad"/>
                <text x={130} y={272} fill="#9b59b6" fontSize="7.5" textAnchor="middle">SDA</text>
                <text x={200} y={272} fill="#8e44ad" fontSize="7.5" textAnchor="middle">SCL</text>
              </g>
              {/* LCD power */}
              <VccSym x={80}  y={160} label="+3.3V" color="#e67e22"/>
              <GndSym x={400} y={260}/>

              {/* ══ LED VERTES — colonne gauche (x=120, x=240) ══ */}
              {/* --- D1 + R1 (GPIO17 → G17) --- */}
              <NetFlag x={120} y={310} name="G17" color="#27ae60" dir="right"/>
              <line x1={120} y1={310} x2={120} y2={322} stroke="#27ae60" strokeWidth="1"/>
              <Resistor x={120} y={322} label="R1" value="220Ω"
                color={gCol} sel={sel==="r1"} onCk={()=>setSel("r1")}/>
              <line x1={120} y1={380} x2={120} y2={398} stroke={gCol} strokeWidth="1"/>
              <LED x={120} y={398} label="D1" sublabel="Verte"
                color={gCol} sel={sel==="ledv1"} onCk={()=>setSel("ledv1")}/>
              <line x1={120} y1={432} x2={120} y2={442} stroke="#445" strokeWidth="1"/>
              <GndSym x={120} y={442}/>

              {/* --- D2 + R2 (GPIO27 → G27) --- */}
              <NetFlag x={250} y={310} name="G27" color="#2ecc71" dir="right"/>
              <line x1={250} y1={310} x2={250} y2={322} stroke="#2ecc71" strokeWidth="1"/>
              <Resistor x={250} y={322} label="R2" value="220Ω"
                color={g2Col} sel={sel==="r2"} onCk={()=>setSel("r2")}/>
              <line x1={250} y1={380} x2={250} y2={398} stroke={g2Col} strokeWidth="1"/>
              <LED x={250} y={398} label="D2" sublabel="Verte"
                color={g2Col} sel={sel==="ledv2"} onCk={()=>setSel("ledv2")}/>
              <line x1={250} y1={432} x2={250} y2={442} stroke="#445" strokeWidth="1"/>
              <GndSym x={250} y={442}/>

              {/* ══ LED ROUGES ══ */}
              {/* --- D3 + R3 (GPIO22 → G22) — même colonne gauche, décalé en y --- */}
              <NetFlag x={120} y={530} name="G22" color="#e74c3c" dir="right"/>
              <line x1={120} y1={530} x2={120} y2={542} stroke="#e74c3c" strokeWidth="1"/>
              <Resistor x={120} y={542} label="R3" value="220Ω"
                color={rCol} sel={sel==="r3"} onCk={()=>setSel("r3")}/>
              <line x1={120} y1={600} x2={120} y2={618} stroke={rCol} strokeWidth="1"/>
              <LED x={120} y={618} label="D3" sublabel="Rouge"
                color={rCol} sel={sel==="ledr1"} onCk={()=>setSel("ledr1")}/>
              <line x1={120} y1={652} x2={120} y2={662} stroke="#445" strokeWidth="1"/>
              <GndSym x={120} y={662}/>

              {/* --- D4 + R4 (GPIO23 → G23) --- */}
              <NetFlag x={250} y={530} name="G23" color="#c0392b" dir="right"/>
              <line x1={250} y1={530} x2={250} y2={542} stroke="#c0392b" strokeWidth="1"/>
              <Resistor x={250} y={542} label="R4" value="220Ω"
                color={r2Col} sel={sel==="r4"} onCk={()=>setSel("r4")}/>
              <line x1={250} y1={600} x2={250} y2={618} stroke={r2Col} strokeWidth="1"/>
              <LED x={250} y={618} label="D4" sublabel="Rouge"
                color={r2Col} sel={sel==="ledr2"} onCk={()=>setSel("ledr2")}/>
              <line x1={250} y1={652} x2={250} y2={662} stroke="#445" strokeWidth="1"/>
              <GndSym x={250} y={662}/>

              {/* ══ SERVO SG90 — haut droite ══ */}
              <NetFlag x={1100} y={180} name="G18" color="#3498db" dir="right"/>
              <line x1={1100} y1={180} x2={1100} y2={192} stroke="#3498db" strokeWidth="1"/>
              <g className="comp-click" onClick={()=>setSel("servo")}>
                <rect x={1040} y={192} width={180} height={140} rx="6"
                  fill={sel==="servo"?"#091830":"#040c1a"} stroke="#3498db" strokeWidth="1.5"/>
                <circle cx={1130} cy={256} r="32" fill="none" stroke="#3498db" strokeWidth="1.2"/>
                <text x={1130} y={261} fill="#3498db" fontSize="14"
                  textAnchor="middle" fontWeight="700">M</text>
                <line x1={1130} y1={288} x2={1130} y2={310} stroke="#3498db" strokeWidth="1"/>
                {lbl && <>
                  <text x={1130} y={322} fill="#3498db"  fontSize="10" textAnchor="middle" fontWeight="600">SERVO SG90</text>
                  <text x={1130} y={335} fill="#1a4a6a" fontSize="8"  textAnchor="middle">PWM 50Hz — GPIO18</text>
                </>}
                <VccSym x={1060} y={192} label="+5V"   color="#c0392b"/>
                <GndSym x={1200} y={332}/>
              </g>

              {/* ══ BUZZER TMB12A05 ══ */}
              <NetFlag x={1100} y={430} name="G24" color="#f39c12" dir="right"/>
              <line x1={1100} y1={430} x2={1100} y2={448} stroke="#f39c12" strokeWidth="1"/>
              <text x={1092} y={445} fill="#f39c12" fontSize="9" textAnchor="end">+</text>
              <g className="comp-click" onClick={()=>setSel("buz")}>
                <circle cx={1130} cy={510} r="52"
                  fill={sel==="buz"?"#201e04":"#0b0b03"} stroke="#f39c12" strokeWidth="1.5"/>
                <circle cx={1130} cy={510} r="30" fill="none"
                  stroke="#f39c12" strokeWidth="0.6" strokeDasharray="3 2"/>
                <text x={1130} y={506} fill="#f39c12" fontSize="13"
                  textAnchor="middle" fontWeight="700">BUZ</text>
                <text x={1130} y={522} fill="#6a5a1a" fontSize="8.5" textAnchor="middle">TMB12A05</text>
                {lbl && <text x={1130} y={580} fill="#f39c12" fontSize="9"
                  textAnchor="middle" fontWeight="600">BZ1 — Buzzer Actif 5V</text>}
                <VccSym x={1090} y={458} label="+5V" color="#c0392b"/>
                <line x1={1130} y1={562} x2={1130} y2={574} stroke="#445" strokeWidth="1"/>
                <GndSym x={1130} y={574}/>
              </g>

              {/* ══ MODULE RELAIS K1 ══ */}
              <NetFlag x={1100} y={660} name="G25" color="#e67e22" dir="right"/>
              <line x1={1100} y1={660} x2={1100} y2={680} stroke="#e67e22" strokeWidth="1"/>

              {/* R5 pull-down */}
              <g className="comp-click" onClick={()=>setSel("r5")}>
                <line x1={1100} y1={660} x2={1060} y2={660} stroke="#8a6a2a" strokeWidth="0.9"/>
                <rect x={1048} y={660} width={24} height={46} rx="2" fill="none" stroke="#8a6a2a" strokeWidth="0.8"/>
                <path d={`M1060,664 L1065,670 L1055,676 L1065,682 L1055,688 L1065,694 L1055,700 L1060,704`}
                  fill="none" stroke="#8a6a2a" strokeWidth="0.8"/>
                {lbl && <text x={1040} y={688} fill="#8a6a2a" fontSize="8" textAnchor="end">R5 10kΩ</text>}
                <line x1={1060} y1={706} x2={1060} y2={718} stroke="#445" strokeWidth="0.8"/>
                <GndSym x={1060} y={718}/>
              </g>

              <g className="comp-click" onClick={()=>setSel("relay")}>
                <rect x={1040} y={680} width={200} height={180} rx="5"
                  fill={sel==="relay"?"#221504":"#0c0804"} stroke="#e67e22" strokeWidth="1.5"/>
                {/* bobine */}
                <rect x={1070} y={720} width={60} height={80} rx="3"
                  fill="none" stroke="#e67e22" strokeWidth="1.2"/>
                <text x={1100} y={768} fill="#e67e22" fontSize="11"
                  textAnchor="middle" fontWeight="600">COIL</text>
                {/* contacts NO / COM */}
                <line x1={1140} y1={738} x2={1175} y2={738} stroke="#e67e22" strokeWidth="1"/>
                <line x1={1140} y1={778} x2={1175} y2={778} stroke="#e67e22" strokeWidth="1"/>
                <circle cx={1177} cy={738} r="4.5" fill="none" stroke="#e67e22" strokeWidth="1"/>
                <circle cx={1177} cy={778} r="4.5" fill="none" stroke="#e67e22" strokeWidth="1"/>
                {/* switch arm animé */}
                <line x1={1182} y1={738}
                  x2={1200} y2={doorOpen ? 738 : 770}
                  stroke="#e67e22" strokeWidth="2"
                  style={{transition:"all 0.5s ease"}}/>
                <text x={1206} y={742} fill="#e67e22" fontSize="8.5">NO</text>
                <text x={1206} y={782} fill="#e67e22" fontSize="8.5">COM</text>
                {lbl && <>
                  <text x={1040} y={676} fill="#7a5020" fontSize="8.5">K1 — GPIO25 (pin 22)</text>
                  <text x={1040} y={872} fill="#e67e22" fontSize="10" fontWeight="600">K1 — SRD-05VDC-SL-C</text>
                </>}
                <VccSym x={1070} y={680} label="+5V" color="#c0392b"/>
                <line x1={1120} y1={860} x2={1120} y2={872} stroke="#445" strokeWidth="1"/>
                <GndSym x={1120} y={872}/>
              </g>

              {/* ══ GACHE + PORTE ANIMÉE ══ */}
              {/* Fils NO → gâche */}
              <line x1={1240} y1={738} x2={1310} y2={738}
                stroke="#7f8c8d" strokeWidth="1.2" strokeDasharray="4 2"/>
              <line x1={1240} y1={778} x2={1310} y2={778}
                stroke="#7f8c8d" strokeWidth="1.2" strokeDasharray="4 2"/>

              <g className="comp-click" onClick={()=>setSel("gache")}>
                {/* cadre mur */}
                <rect x={1310} y={620} width={260} height={320} rx="4"
                  fill="none" stroke="#5a5a6a" strokeWidth="1.5" strokeDasharray="6 3"/>
                {lbl && <text x={1440} y={614} fill="#6a6a7a" fontSize="9"
                  textAnchor="middle">GÂCHE 12V + PORTE</text>}

                {/* encadrement de porte */}
                <rect x={1340} y={640} width={200} height={280} rx="3"
                  fill="none" stroke="#7f8c8d" strokeWidth="2"/>
                {/* sol */}
                <line x1={1330} y1={920} x2={1550} y2={920}
                  stroke="#7f8c8d" strokeWidth="2.5"/>

                {/* ── FEUILLE DE PORTE ANIMÉE ── */}
                <g className="door-leaf"
                  style={{
                    transformOrigin:"1343px 642px",
                    transform: doorOpen ? "perspective(400px) rotateY(-75deg)" : "rotateY(0deg)"
                  }}>
                  <rect x={1343} y={642} width={194} height={276} rx="2"
                    fill={doorOpen ? "#0d2a3a" : "#1e0e06"}
                    stroke={doorOpen ? "#3498db" : "#c0a050"}
                    strokeWidth="1.5"/>
                  {/* vitre */}
                  <rect x={1380} y={680} width={110} height={90} rx="2"
                    fill={doorOpen ? "rgba(52,152,219,0.2)" : "rgba(180,160,80,0.15)"}
                    stroke={doorOpen ? "#5dade2" : "#8a7a4a"} strokeWidth="1"/>
                  {/* poignée */}
                  <circle cx={1520} cy={790} r="9"
                    fill={doorOpen ? "#3498db" : "#c0a050"}/>
                  <rect x={1516} y={800} width={8} height={22} rx="3"
                    fill={doorOpen ? "#2980b9" : "#a08030"}/>
                  {/* statut porte */}
                  <text x={1440} y={860}
                    fill={doorOpen ? "#5dade2" : "#c0a050"}
                    fontSize="11" textAnchor="middle" fontWeight="700">
                    {doorOpen ? "▶ OUVERTE" : "■ FERMÉE"}
                  </text>
                </g>

                {/* verrou indicateur */}
                <rect x={1340} y={775} width={14} height={26} rx="3"
                  fill={doorOpen ? "#27ae60" : "#e74c3c"}/>

                {/* alimentation 12V externe */}
                <line x1={1440} y1={620} x2={1440} y2={600} stroke="#c0392b" strokeWidth="1"/>
                <text x={1440} y={596} fill="#c0392b" fontSize="8" textAnchor="middle">+12V ext.</text>
              </g>

              {/* ══ SCANNER USB ══ */}
              <g className="comp-click" onClick={()=>setSel("scanner")}>
                <rect x={1040} y={960} width={240} height={90} rx="6"
                  fill={sel==="scanner"?"#051e1e":"#030c0c"} stroke="#1abc9c" strokeWidth="1.5"/>
                <text x={1160} y={991} fill="#1abc9c" fontSize="13"
                  textAnchor="middle" fontWeight="700">SCANNER USB</text>
                <text x={1160} y={1008} fill="#0a5a4a" fontSize="9.5" textAnchor="middle">Code-barres HID</text>
                {lbl && <text x={1160} y={1024} fill="#1abc9c" fontSize="8"
                  textAnchor="middle">Interface USB — Auto-détecté</text>}
              </g>
              {/* USB wire */}
              <line x1={1040} y1={1005} x2={900}  y2={1005} stroke="#1abc9c" strokeWidth="1.2"/>
              <line x1={900}  y1={1005} x2={900}  y2={960}  stroke="#1abc9c" strokeWidth="1.2"/>
              <circle cx={900} cy={960} r="4.5" fill="#1abc9c"/>
              {lbl && <text x={906} y={950} fill="#1abc9c" fontSize="8">USB</text>}

              {/* ══ CONDENSATEURS ══ */}
              {/* C1 sur rail 5V */}
              <g className="comp-click" onClick={()=>setSel("c1")}>
                <line x1={1850} y1={60}  x2={1850} y2={90}  stroke="#c0392b" strokeWidth="1"/>
                <line x1={1836} y1={90}  x2={1864} y2={90}  stroke="#5dade2" strokeWidth="2.2"/>
                <line x1={1836} y1={99}  x2={1864} y2={99}  stroke="#5dade2" strokeWidth="2.2"/>
                <path d="M1836,99 C1840,108 1860,108 1864,99" fill="none" stroke="#5dade2" strokeWidth="1"/>
                <line x1={1850} y1={99}  x2={1850} y2={112} stroke="#445" strokeWidth="0.8"/>
                <GndSym x={1850} y={112}/>
                {lbl && <text x={1868} y={94} fill="#5dade2" fontSize="9">C1 100µF</text>}
                <circle cx={1850} cy={60} r="3" fill="#c0392b"/>
                <text x={1842} y={84} fill="#c0392b" fontSize="8">+</text>
              </g>

              {/* C2 sur rail 3.3V */}
              <g className="comp-click" onClick={()=>setSel("c2")}>
                <line x1={1650} y1={112} x2={1650} y2={142} stroke="#e67e22" strokeWidth="1"/>
                <line x1={1636} y1={142} x2={1664} y2={142} stroke="#5dade2" strokeWidth="2.2"/>
                <line x1={1636} y1={151} x2={1664} y2={151} stroke="#5dade2" strokeWidth="2.2"/>
                <path d="M1636,151 C1640,160 1660,160 1664,151" fill="none" stroke="#5dade2" strokeWidth="1"/>
                <line x1={1650} y1={151} x2={1650} y2={164} stroke="#445" strokeWidth="0.8"/>
                <GndSym x={1650} y={164}/>
                {lbl && <text x={1668} y={146} fill="#5dade2" fontSize="9">C2 100µF</text>}
                <circle cx={1650} cy={112} r="3" fill="#e67e22"/>
                <text x={1642} y={136} fill="#e67e22" fontSize="8">+</text>
              </g>

            </g>
          </svg>
        </div>

        {/* ── INFO PANEL ── */}
        <div style={{ width:280, borderLeft:"1px solid #1a2744",
          background:"#0c1120", overflowY:"auto", flexShrink:0, padding:14 }}>

          {/* door status card */}
          <div style={{ marginBottom:16, padding:"12px 14px",
            background: doorOpen ? "#07200e" : "#1a0707",
            borderRadius:8,
            border:`1px solid ${doorOpen ? "#27ae60" : "#e74c3c"}` }}>
            <div style={{ fontSize:10, color:"#6a7a8a",
              textTransform:"uppercase", marginBottom:6 }}>État Porte</div>
            <div style={{ fontSize:18, fontWeight:800,
              color: doorOpen ? "#4ade80" : "#f87171" }}>
              {doorOpen ? "● OUVERTE" : "● FERMÉE"}
            </div>
            {scanRes && (
              <div style={{ fontSize:10, marginTop:6,
                color: scanRes==="ok" ? "#4ade80":"#f87171" }}>
                {scanRes==="ok" ? "Accès autorisé — relais activé" : "Accès refusé — porte verrouillée"}
              </div>
            )}
          </div>

          <div style={{ fontSize:11, color:"#3a4a6a",
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            {selInfo ? "Composant sélectionné" : "Propriétés"}
          </div>

          {selInfo ? (
            <div>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700,
                fontSize:15, color:"#e8ecf2", marginBottom:4 }}>{selInfo.name}</div>
              <div style={{ fontSize:11, color:"#5dade2", marginBottom:12 }}>{selInfo.ref}</div>
              <div style={{ background:"#070b14", borderRadius:8, padding:12,
                border:"1px solid #121c30", marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#3a4a6a",
                  textTransform:"uppercase", marginBottom:6 }}>Description</div>
                <div style={{ fontSize:11.5, color:"#8a9aba", lineHeight:1.75 }}>{selInfo.desc}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{
                width:"100%", padding:8, background:"#1a2744",
                border:"1px solid #2a3a5c", borderRadius:6,
                color:"#6a8aaa", cursor:"pointer",
                fontFamily:"inherit", fontSize:11 }}>
                Désélectionner
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:10, color:"#3a4a6a",
                textTransform:"uppercase", marginBottom:8 }}>Légende</div>
              {[
                { c:"#c0392b", l:"+5V alimentation" },
                { c:"#e67e22", l:"+3.3V logique" },
                { c:"#556",    l:"GND" },
                { c:"#27ae60", l:"LEDs vertes" },
                { c:"#e74c3c", l:"LEDs rouges" },
                { c:"#f39c12", l:"Buzzer" },
                { c:"#3498db", l:"Servo PWM" },
                { c:"#9b59b6", l:"LCD I2C" },
                { c:"#e67e22", l:"Relais" },
                { c:"#1abc9c", l:"Scanner USB" },
                { c:"#5dade2", l:"Condensateurs" },
              ].map(x=>(
                <div key={x.l} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <div style={{ width:22, height:3, background:x.c, borderRadius:1, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"#6a7a9a" }}>{x.l}</span>
                </div>
              ))}
              <div style={{ marginTop:14, fontSize:10, color:"#3a4a6a",
                textTransform:"uppercase", marginBottom:8 }}>Composants</div>
              <div style={{ fontSize:10.5, color:"#5a6a7a", lineHeight:2 }}>
                U1 : Raspberry Pi 4<br/>
                D1-D2 : LEDs vertes 5mm<br/>
                D3-D4 : LEDs rouges 5mm<br/>
                R1-R4 : 220Ω — R5 : 10kΩ<br/>
                C1-C2 : 100µF<br/>
                BZ1 : Buzzer TMB12A05<br/>
                SERVO : SG90 TowerPro<br/>
                LCD : HD44780 I2C 16×2<br/>
                K1 : Relais SRD-05VDC<br/>
                GÂCHE : Électrique 12V<br/>
                SCANNER : USB HID<br/>
                ALIM : USB-C 5V/3A
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
