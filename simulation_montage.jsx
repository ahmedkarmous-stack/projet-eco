import { useState, useEffect, useRef, useCallback } from "react";

const DB_ETUDIANTS = [
  { id: 1, code: "ETU20240001", nom: "Ben Ali", prenom: "Ahmed", filiere: "Informatique", autorise: true },
  { id: 2, code: "ETU20240002", nom: "Zahra", prenom: "Fatima", filiere: "Electronique", autorise: true },
  { id: 3, code: "ETU20240003", nom: "Salah", prenom: "Mohamed", filiere: "Informatique", autorise: true },
  { id: 4, code: "ETU20240004", nom: "Khelifi", prenom: "Yasmine", filiere: "Mathematiques", autorise: true },
  { id: 5, code: "ETU20240005", nom: "Hadj", prenom: "Karim", filiere: "Informatique", autorise: false },
];

const GPIO_MAP = {
  LED_V1: 17, LED_V2: 27, LED_R1: 22, LED_R2: 23,
  BUZZER: 24, SERVO: 18, RELAIS: 25, SDA: 2, SCL: 3
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [etudiants, setEtudiants] = useState(DB_ETUDIANTS);
  const [logs, setLogs] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [ledGreen, setLedGreen] = useState(false);
  const [ledRed, setLedRed] = useState(false);
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [lcdL1, setLcdL1] = useState("Systeme Pret...");
  const [lcdL2, setLcdL2] = useState("Scannez une carte");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState("simulation");
  const [countdown, setCountdown] = useState(0);
  const [newEtu, setNewEtu] = useState({ code: "", nom: "", prenom: "", filiere: "" });
  const [stats, setStats] = useState({ total: 0, ok: 0, ko: 0 });
  const [gpioStates, setGpioStates] = useState({});
  const audioRef = useRef(null);
  const timelineRef = useRef(null);

  const now = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addTimeline = useCallback((text, type = "info") => {
    setTimeline((prev) => [...prev, { text, type, time: now() }]);
  }, []);

  useEffect(() => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [timeline]);

  const setGpio = (pin, value) => {
    setGpioStates((prev) => ({ ...prev, [pin]: value }));
  };

  const beep = (freq, duration) => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {}
  };

  const processScan = async () => {
    if (processing || !scanInput.trim()) return;
    const code = scanInput.trim();
    setProcessing(true);
    setTimeline([]);
    setScanning(true);

    addTimeline("Scanner USB (GPIO HID) : lecture en cours...", "info");
    beep(1000, 100);
    await sleep(800);
    setScanning(false);
    addTimeline(`Code-barres lu : ${code}`, "info");

    addTimeline("Hashage SHA-256 du code...", "info");
    await sleep(300);

    addTimeline("SELECT * FROM etudiants WHERE code_barre = hash(?)", "sql");
    await sleep(400);

    const etu = etudiants.find((e) => e.code === code);

    if (etu && etu.autorise) {
      const fullName = `${etu.prenom} ${etu.nom}`;
      addTimeline(`Etudiant trouve : ${fullName}`, "success");

      addTimeline(`GPIO ${GPIO_MAP.LED_V1} → HIGH (LED verte 1)`, "gpio");
      addTimeline(`GPIO ${GPIO_MAP.LED_V2} → HIGH (LED verte 2)`, "gpio");
      setGpio(GPIO_MAP.LED_V1, true);
      setGpio(GPIO_MAP.LED_V2, true);
      setLedGreen(true);

      setLcdL1(fullName.substring(0, 16));
      setLcdL2("Acces Autorise");
      addTimeline(`LCD I2C (0x27) : "${fullName}" / "Acces Autorise"`, "success");

      addTimeline(`GPIO ${GPIO_MAP.BUZZER} → HIGH (buzzer 300ms)`, "gpio");
      setBuzzerOn(true);
      beep(1500, 300);
      await sleep(400);
      setBuzzerOn(false);
      setGpio(GPIO_MAP.BUZZER, false);

      addTimeline(`GPIO ${GPIO_MAP.SERVO} → PWM 7.5% (servo 90°)`, "gpio");
      setGpio(GPIO_MAP.SERVO, true);
      setDoorOpen(true);

      const newLog = { id: Date.now(), code, nom: fullName, statut: "autorise", heure: now() };
      setLogs((prev) => [newLog, ...prev]);
      setStats((prev) => ({ total: prev.total + 1, ok: prev.ok + 1, ko: prev.ko }));
      addTimeline("INSERT INTO logs_acces (autorise)", "sql");

      for (let i = 5; i > 0; i--) {
        setCountdown(i);
        addTimeline(`Porte ouverte... ${i}s`, "info");
        await sleep(1000);
      }
      setCountdown(0);

      addTimeline(`GPIO ${GPIO_MAP.SERVO} → PWM 2.5% (servo 0°)`, "gpio");
      setDoorOpen(false);
      setGpio(GPIO_MAP.SERVO, false);
      setLedGreen(false);
      setGpio(GPIO_MAP.LED_V1, false);
      setGpio(GPIO_MAP.LED_V2, false);
      addTimeline("GPIO 17, 27 → LOW", "gpio");
    } else {
      const reason = etu ? `${etu.prenom} ${etu.nom} (suspendu)` : "Code inconnu";
      addTimeline(`Acces refuse : ${reason}`, "error");

      addTimeline(`GPIO ${GPIO_MAP.LED_R1} → HIGH (LED rouge 1)`, "gpio");
      addTimeline(`GPIO ${GPIO_MAP.LED_R2} → HIGH (LED rouge 2)`, "gpio");
      setGpio(GPIO_MAP.LED_R1, true);
      setGpio(GPIO_MAP.LED_R2, true);
      setLedRed(true);

      setLcdL1("Acces Refuse!");
      setLcdL2(etu ? `${etu.prenom} ${etu.nom}`.substring(0, 16) : "Carte inconnue");

      for (let i = 0; i < 3; i++) {
        setBuzzerOn(true);
        setGpio(GPIO_MAP.BUZZER, true);
        beep(800, 150);
        addTimeline(`GPIO ${GPIO_MAP.BUZZER} → bip ${i + 1}/3`, "gpio");
        await sleep(300);
        setBuzzerOn(false);
        setGpio(GPIO_MAP.BUZZER, false);
      }

      const newLog = { id: Date.now(), code, nom: etu ? `${etu.prenom} ${etu.nom}` : "Inconnu", statut: "refuse", heure: now() };
      setLogs((prev) => [newLog, ...prev]);
      setStats((prev) => ({ total: prev.total + 1, ok: prev.ok, ko: prev.ko + 1 }));
      addTimeline("INSERT INTO logs_acces (refuse)", "sql");

      await sleep(2000);
      setLedRed(false);
      setGpio(GPIO_MAP.LED_R1, false);
      setGpio(GPIO_MAP.LED_R2, false);
    }

    setLcdL1("Systeme Pret...");
    setLcdL2("Scannez une carte");
    addTimeline("Retour en attente", "info");
    setScanInput("");
    setProcessing(false);
  };

  const quickScan = (code) => {
    setScanInput(code);
    setTimeout(() => {
      document.getElementById("scanBtn")?.click();
    }, 100);
  };

  const addEtudiant = () => {
    if (!newEtu.code || !newEtu.nom || !newEtu.prenom) return;
    setEtudiants((prev) => [...prev, { ...newEtu, id: Date.now(), autorise: true }]);
    setNewEtu({ code: "", nom: "", prenom: "", filiere: "" });
  };

  const toggleAutorise = (id) => {
    setEtudiants((prev) => prev.map((e) => (e.id === id ? { ...e, autorise: !e.autorise } : e)));
  };

  const deleteEtudiant = (id) => {
    setEtudiants((prev) => prev.filter((e) => e.id !== id));
  };

  useEffect(() => { setScanInput(scanInput); }, [scanInput]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e0e0e0", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #2a3a5c; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes scanLine { 0% { top: 8%; } 100% { top: 88%; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes doorSwing { 0% { transform: perspective(600px) rotateY(0deg); } 100% { transform: perspective(600px) rotateY(-75deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 12px currentColor; } 50% { box-shadow: 0 0 24px currentColor, 0 0 48px currentColor; } }
        .tab-btn { padding: 10px 20px; background: transparent; border: 1px solid #1a2744; color: #6a7a9a; cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.2s; border-radius: 8px; }
        .tab-btn.active { background: #1a2744; color: #5dade2; border-color: #2471a3; }
        .tab-btn:hover:not(.active) { border-color: #2a3a5c; color: #8a9aba; }
        input, select { background: #0d1220; border: 1px solid #1a2744; color: #c0c8d8; padding: 8px 12px; border-radius: 6px; font-family: inherit; font-size: 13px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #2471a3; }
        .card { background: #0d1220; border: 1px solid #141e33; border-radius: 12px; overflow: hidden; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d1220 0%, #1a2744 100%)", borderBottom: "1px solid #1a2744", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1a2744", border: "1px solid #2471a3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <span style={{ color: "#5dade2" }}>&#9889;</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, color: "#e8ecf2", letterSpacing: "-0.02em" }}>
                Simulation Hardware
              </div>
              <div style={{ fontSize: 11, color: "#4a5a7a", letterSpacing: "0.05em" }}>
                RASPBERRY PI 4 &middot; FLASK &middot; SQLITE &middot; GPIO
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["simulation", "admin", "gpio"].map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "simulation" ? "Montage" : t === "admin" ? "Dashboard Flask" : "GPIO Monitor"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>
        {tab === "simulation" && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: 16 }}>
            {/* LEFT: Scanner + Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Scanner */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  Scanner Code-Barres USB (HID)
                </div>
                <div style={{ background: "#080c16", border: `1px solid ${scanning ? "#2471a3" : "#141e33"}`, borderRadius: 8, padding: 16, textAlign: "center", position: "relative", overflow: "hidden", transition: "border-color 0.3s", minHeight: 80 }}>
                  {scanning && <div style={{ position: "absolute", top: "8%", left: "10%", width: "80%", height: 2, background: "linear-gradient(90deg, transparent, #e74c3c, transparent)", animation: "scanLine 0.8s ease-in-out" }} />}
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: scanInput ? "#e8ecf2" : "#2a3a5c", letterSpacing: "0.05em" }}>
                    {scanInput || "--------"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, margin: "8px 0", height: 30 }}>
                    {[3,1,2,1,3,2,1,1,3,1,2,3,1,1,2,1,3,1,2,1,3,2].map((w, i) => (
                      <div key={i} style={{ width: w, background: i % 2 === 0 ? "#4a5a7a" : "transparent", borderRadius: 1 }} />
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <input value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && processScan()} placeholder="Code-barres..." style={{ width: "100%", textAlign: "center", fontSize: 14 }} />
                </div>
                <button id="scanBtn" onClick={processScan} disabled={processing} style={{ width: "100%", marginTop: 8, padding: "10px", background: processing ? "#1a2744" : "linear-gradient(135deg, #1a5276, #2471a3)", color: "#e8ecf2", border: "none", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: processing ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: processing ? 0.6 : 1 }}>
                  {processing ? "Traitement..." : "Scanner la Carte"}
                </button>
              </div>

              {/* Quick test cards */}
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Cartes de test
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {etudiants.map((e) => (
                    <button key={e.id} onClick={() => quickScan(e.code)} disabled={processing} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#080c16", border: "1px solid #141e33", borderRadius: 6, color: "#c0c8d8", cursor: "pointer", fontFamily: "inherit", fontSize: 12, transition: "all 0.15s", opacity: processing ? 0.5 : 1 }}>
                      <span style={{ fontWeight: 500 }}>{e.prenom} {e.nom}</span>
                      <span style={{ fontSize: 10, color: e.autorise ? "#27ae60" : "#e74c3c", background: e.autorise ? "#0d2818" : "#2a0f0f", padding: "2px 6px", borderRadius: 4 }}>
                        {e.autorise ? "OK" : "Bloque"}
                      </span>
                    </button>
                  ))}
                  <button onClick={() => quickScan("ETU99999999")} disabled={processing} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#080c16", border: "1px solid #2a0f0f", borderRadius: 6, color: "#e74c3c", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                    <span>Carte inconnue</span>
                    <span style={{ fontSize: 10, background: "#2a0f0f", padding: "2px 6px", borderRadius: 4 }}>ERREUR</span>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <div className="card" style={{ padding: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#5dade2" }}>{stats.total}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a", textTransform: "uppercase" }}>Total</div>
                </div>
                <div className="card" style={{ padding: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#27ae60" }}>{stats.ok}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a", textTransform: "uppercase" }}>OK</div>
                </div>
                <div className="card" style={{ padding: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#e74c3c" }}>{stats.ko}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a", textTransform: "uppercase" }}>Refuse</div>
                </div>
              </div>
            </div>

            {/* CENTER: Hardware visualization */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Hardware board */}
              <div className="card" style={{ padding: 20, position: "relative" }}>
                <div style={{ fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
                  Montage sur Breadboard &mdash; Raspberry Pi GPIO
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {/* LEDs Vertes */}
                  <div style={{ background: "#080c16", borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${ledGreen ? "#145a2a" : "#141e33"}`, transition: "all 0.3s" }}>
                    <div style={{ fontSize: 10, color: "#4a5a7a", marginBottom: 8, textTransform: "uppercase" }}>LEDs Vertes (GPIO 17, 27)</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, margin: "8px 0" }}>
                      {[1, 2].map((i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: ledGreen ? "#27ae60" : "#0a1a0a", border: `2px solid ${ledGreen ? "#27ae60" : "#1a2a1a"}`, transition: "all 0.3s", boxShadow: ledGreen ? "0 0 20px #27ae60, 0 0 40px rgba(39,174,96,0.3)" : "none" }} />
                          <div style={{ fontSize: 9, color: "#3a4a6a", marginTop: 4 }}>220&#937;</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: ledGreen ? "#27ae60" : "#2a3a5c" }}>{ledGreen ? "ON" : "OFF"}</div>
                  </div>

                  {/* LEDs Rouges */}
                  <div style={{ background: "#080c16", borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${ledRed ? "#5a1414" : "#141e33"}`, transition: "all 0.3s" }}>
                    <div style={{ fontSize: 10, color: "#4a5a7a", marginBottom: 8, textTransform: "uppercase" }}>LEDs Rouges (GPIO 22, 23)</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, margin: "8px 0" }}>
                      {[1, 2].map((i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: ledRed ? "#e74c3c" : "#1a0a0a", border: `2px solid ${ledRed ? "#e74c3c" : "#2a1a1a"}`, transition: "all 0.3s", boxShadow: ledRed ? "0 0 20px #e74c3c, 0 0 40px rgba(231,76,60,0.3)" : "none" }} />
                          <div style={{ fontSize: 9, color: "#3a4a6a", marginTop: 4 }}>220&#937;</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: ledRed ? "#e74c3c" : "#2a3a5c" }}>{ledRed ? "ON" : "OFF"}</div>
                  </div>

                  {/* Buzzer */}
                  <div style={{ background: "#080c16", borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${buzzerOn ? "#5a4a14" : "#141e33"}`, transition: "all 0.3s" }}>
                    <div style={{ fontSize: 10, color: "#4a5a7a", marginBottom: 8, textTransform: "uppercase" }}>Buzzer (GPIO 24)</div>
                    <div style={{ width: 40, height: 40, margin: "8px auto", borderRadius: "50%", background: buzzerOn ? "#f39c12" : "#1a1a0a", border: `2px solid ${buzzerOn ? "#f39c12" : "#2a2a1a"}`, transition: "all 0.3s", boxShadow: buzzerOn ? "0 0 16px #f39c12" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={buzzerOn ? "#0a0e1a" : "#2a3a5c"} strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: buzzerOn ? "#f39c12" : "#2a3a5c", animation: buzzerOn ? "pulse 0.3s infinite" : "none" }}>
                      {buzzerOn ? "BIP!" : "Silence"}
                    </div>
                  </div>
                </div>

                {/* Door + LCD Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                  {/* Door / Servo */}
                  <div style={{ background: "#080c16", borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${doorOpen ? "#145a2a" : "#141e33"}` }}>
                    <div style={{ fontSize: 10, color: "#4a5a7a", marginBottom: 10, textTransform: "uppercase" }}>Servo SG90 (GPIO 18 PWM) + Porte</div>
                    <div style={{ width: 120, height: 150, margin: "0 auto", perspective: 600, position: "relative" }}>
                      {/* Door frame */}
                      <div style={{ position: "absolute", inset: 0, border: "2px solid #2a3a5c", borderRadius: 4, background: "rgba(26,39,68,0.2)" }} />
                      {/* Door */}
                      <div style={{ position: "absolute", top: 2, right: 2, width: "calc(100% - 4px)", height: "calc(100% - 4px)", background: "linear-gradient(135deg, #3a2a1a, #2a1a0a)", borderRadius: 2, transformOrigin: "left center", transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)", transform: doorOpen ? "rotateY(-75deg)" : "rotateY(0deg)" }}>
                        <div style={{ position: "absolute", right: 10, top: "50%", width: 8, height: 20, background: "#8a7a50", borderRadius: 3, transform: "translateY(-50%)" }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: doorOpen ? "#27ae60" : "#e74c3c", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span>{doorOpen ? "\u{1F513}" : "\u{1F512}"}</span>
                      {doorOpen ? `OUVERTE ${countdown > 0 ? `(${countdown}s)` : ""}` : "VERROUILLEE"}
                    </div>
                    <div style={{ fontSize: 10, color: "#3a4a6a", marginTop: 4 }}>
                      PWM: {doorOpen ? "7.5% (90\u00B0)" : "2.5% (0\u00B0)"}
                    </div>
                  </div>

                  {/* LCD */}
                  <div style={{ background: "#080c16", borderRadius: 10, padding: 14, border: "1px solid #141e33" }}>
                    <div style={{ fontSize: 10, color: "#4a5a7a", marginBottom: 10, textTransform: "uppercase" }}>Ecran LCD 16x2 I2C (0x27)</div>
                    <div style={{ background: "#0a2a12", border: "3px solid #1a3a22", borderRadius: 8, padding: "12px 14px", fontFamily: "'IBM Plex Mono', monospace", color: "#33ff33", fontSize: 15, lineHeight: 1.8, minHeight: 68, textShadow: "0 0 8px rgba(51,255,51,0.5)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)", pointerEvents: "none" }} />
                      <div style={{ position: "relative" }}>{lcdL1}</div>
                      <div style={{ position: "relative" }}>{lcdL2}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#3a4a6a", marginTop: 6, padding: "0 2px" }}>
                      <span>SDA: GPIO 2</span>
                      <span>SCL: GPIO 3</span>
                      <span>VCC: 5V</span>
                    </div>
                  </div>
                </div>

                {/* Raspberry Pi visual */}
                <div style={{ marginTop: 14, background: "#080c16", borderRadius: 10, padding: 12, border: "1px solid #141e33", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 60, height: 40, borderRadius: 6, background: "#1a5a2a", border: "1px solid #27ae60", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 700, color: "#27ae60" }}>RPi 4</span>
                  </div>
                  <div style={{ flex: 1, fontSize: 11, color: "#4a5a7a" }}>
                    <span style={{ color: "#6a8aaa" }}>ARM Cortex-A72 @ 1.5GHz</span> &middot; 4GB RAM &middot; Raspberry Pi OS Lite &middot; Python 3 + Flask + SQLite
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27ae60", animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: 10, color: "#27ae60" }}>ACTIF</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="card" style={{ padding: 14, flex: 1, minHeight: 160 }}>
                <div style={{ fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Console &mdash; Chronologie GPIO
                </div>
                <div ref={timelineRef} style={{ maxHeight: 200, overflowY: "auto", fontSize: 12, lineHeight: 1.7 }}>
                  {timeline.length === 0 ? (
                    <div style={{ color: "#2a3a5c", fontStyle: "italic" }}>En attente d'un scan...</div>
                  ) : timeline.map((t, i) => (
                    <div key={i} style={{ animation: "fadeSlideIn 0.2s ease", color: t.type === "success" ? "#27ae60" : t.type === "error" ? "#e74c3c" : t.type === "gpio" ? "#5dade2" : t.type === "sql" ? "#8e44ad" : "#6a7a9a" }}>
                      <span style={{ color: "#2a3a5c" }}>[{t.time}]</span> {t.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Logs */}
            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Journal d'acces (logs_acces)
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {logs.length === 0 ? (
                  <div style={{ color: "#2a3a5c", textAlign: "center", padding: 30, fontSize: 12, fontStyle: "italic" }}>
                    Aucun evenement.<br />Scannez une carte.
                  </div>
                ) : logs.map((log) => (
                  <div key={log.id} style={{ padding: "8px 10px", borderRadius: 8, background: log.statut === "autorise" ? "rgba(39,174,96,0.06)" : "rgba(231,76,60,0.06)", borderLeft: `3px solid ${log.statut === "autorise" ? "#27ae60" : "#e74c3c"}`, animation: "fadeSlideIn 0.3s ease", fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#6a7a9a", fontSize: 10 }}>{log.heure}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: log.statut === "autorise" ? "#27ae60" : "#e74c3c", background: log.statut === "autorise" ? "#0d2818" : "#2a0f0f", padding: "1px 6px", borderRadius: 4 }}>
                        {log.statut === "autorise" ? "OK" : "REFUSE"}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500, color: "#c0c8d8", marginTop: 2 }}>{log.nom}</div>
                    <div style={{ fontSize: 10, color: "#3a4a6a", fontFamily: "'IBM Plex Mono', monospace" }}>{log.code}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Students management */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 600, color: "#e8ecf2", marginBottom: 4 }}>
                Gestion des Etudiants
              </div>
              <div style={{ fontSize: 12, color: "#4a5a7a", marginBottom: 16 }}>Interface Flask &mdash; http://192.168.1.x:5000</div>

              {/* Add form */}
              <div style={{ background: "#080c16", borderRadius: 8, padding: 14, marginBottom: 16, border: "1px solid #141e33" }}>
                <div style={{ fontSize: 11, color: "#5dade2", textTransform: "uppercase", marginBottom: 10 }}>Ajouter un etudiant</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="Code-barres" value={newEtu.code} onChange={(e) => setNewEtu({ ...newEtu, code: e.target.value })} />
                  <input placeholder="Nom" value={newEtu.nom} onChange={(e) => setNewEtu({ ...newEtu, nom: e.target.value })} />
                  <input placeholder="Prenom" value={newEtu.prenom} onChange={(e) => setNewEtu({ ...newEtu, prenom: e.target.value })} />
                  <input placeholder="Filiere" value={newEtu.filiere} onChange={(e) => setNewEtu({ ...newEtu, filiere: e.target.value })} />
                </div>
                <button onClick={addEtudiant} style={{ marginTop: 10, width: "100%", padding: 10, background: "#1a5276", color: "#e8ecf2", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                  + Ajouter
                </button>
              </div>

              {/* Students table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2744" }}>
                      {["Code", "Nom", "Prenom", "Filiere", "Statut", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#4a5a7a", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {etudiants.map((e) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid #0d1830" }}>
                        <td style={{ padding: "6px", color: "#6a8aaa", fontSize: 11 }}>{e.code}</td>
                        <td style={{ padding: "6px", color: "#c0c8d8" }}>{e.nom}</td>
                        <td style={{ padding: "6px", color: "#c0c8d8" }}>{e.prenom}</td>
                        <td style={{ padding: "6px", color: "#6a7a9a" }}>{e.filiere}</td>
                        <td style={{ padding: "6px" }}>
                          <button onClick={() => toggleAutorise(e.id)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, background: e.autorise ? "#0d2818" : "#2a0f0f", color: e.autorise ? "#27ae60" : "#e74c3c" }}>
                            {e.autorise ? "Autorise" : "Suspendu"}
                          </button>
                        </td>
                        <td style={{ padding: "6px" }}>
                          <button onClick={() => deleteEtudiant(e.id)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid #2a0f0f", background: "transparent", color: "#e74c3c", cursor: "pointer", fontFamily: "inherit" }}>
                            Suppr.
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Logs table */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 600, color: "#e8ecf2", marginBottom: 4 }}>
                Historique des Acces
              </div>
              <div style={{ fontSize: 12, color: "#4a5a7a", marginBottom: 16 }}>Table logs_acces &mdash; SQLite</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#080c16", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#5dade2" }}>{stats.total}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a" }}>TOTAL SCANS</div>
                </div>
                <div style={{ background: "#080c16", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#27ae60" }}>{stats.ok}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a" }}>AUTORISES</div>
                </div>
                <div style={{ background: "#080c16", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#e74c3c" }}>{stats.ko}</div>
                  <div style={{ fontSize: 10, color: "#4a5a7a" }}>REFUSES</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a2744" }}>
                    {["Heure", "Nom", "Code", "Statut"].map((h) => (
                      <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#4a5a7a", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#2a3a5c", fontStyle: "italic" }}>Aucun log enregistre</td></tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #0d1830" }}>
                      <td style={{ padding: "6px", color: "#6a7a9a" }}>{log.heure}</td>
                      <td style={{ padding: "6px", color: "#c0c8d8", fontWeight: 500 }}>{log.nom}</td>
                      <td style={{ padding: "6px", color: "#4a5a7a", fontSize: 10 }}>{log.code}</td>
                      <td style={{ padding: "6px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: log.statut === "autorise" ? "#0d2818" : "#2a0f0f", color: log.statut === "autorise" ? "#27ae60" : "#e74c3c" }}>
                          {log.statut === "autorise" ? "AUTORISE" : "REFUSE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "gpio" && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 600, color: "#e8ecf2", marginBottom: 4 }}>
              GPIO Pin Monitor &mdash; Raspberry Pi 4
            </div>
            <div style={{ fontSize: 12, color: "#4a5a7a", marginBottom: 20 }}>Etat en temps reel de chaque broche utilisee</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { pin: 17, name: "LED Verte 1", type: "Sortie", comp: "LED 5mm + 220\u03A9" },
                { pin: 27, name: "LED Verte 2", type: "Sortie", comp: "LED 5mm + 220\u03A9" },
                { pin: 22, name: "LED Rouge 1", type: "Sortie", comp: "LED 5mm + 220\u03A9" },
                { pin: 23, name: "LED Rouge 2", type: "Sortie", comp: "LED 5mm + 220\u03A9" },
                { pin: 24, name: "Buzzer", type: "Sortie", comp: "TMB12A05 actif 5V" },
                { pin: 18, name: "Servo SG90", type: "PWM", comp: "TowerPro SG90" },
                { pin: 25, name: "Relais", type: "Sortie", comp: "SRD-05VDC" },
                { pin: 2, name: "LCD SDA", type: "I2C", comp: "HD44780 + PCF8574" },
                { pin: 3, name: "LCD SCL", type: "I2C", comp: "HD44780 + PCF8574" },
              ].map((g) => {
                const active = gpioStates[g.pin];
                return (
                  <div key={g.pin} style={{ background: "#080c16", borderRadius: 8, padding: 12, border: `1px solid ${active ? "#1a5276" : "#141e33"}`, transition: "all 0.3s", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: active ? "#5dade2" : "#1a2744", boxShadow: active ? "0 0 8px #5dade2" : "none", transition: "all 0.3s", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: active ? "#5dade2" : "#6a7a9a" }}>
                        GPIO {g.pin} &mdash; {g.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#3a4a6a" }}>{g.type} &middot; {g.comp}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#5dade2" : "#2a3a5c" }}>
                      {active ? "HIGH" : "LOW"}
                    </div>
                  </div>
                );
              })}
              <div style={{ background: "#080c16", borderRadius: 8, padding: 12, border: "1px solid #141e33", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27ae60", animation: "pulse 2s infinite", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#27ae60" }}>USB &mdash; Scanner</div>
                  <div style={{ fontSize: 10, color: "#3a4a6a" }}>HID &middot; Generique</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#27ae60" }}>ACTIF</div>
              </div>
            </div>

            {/* Pin diagram */}
            <div style={{ marginTop: 20, background: "#080c16", borderRadius: 10, padding: 16, border: "1px solid #141e33" }}>
              <div style={{ fontSize: 11, color: "#5dade2", textTransform: "uppercase", marginBottom: 12 }}>Schema de cablage simplifie</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                {[
                  { pin: "3V3", used: false }, { pin: "5V", used: true, label: "LCD+Servo" },
                  { pin: "GPIO2", used: true, label: "SDA" }, { pin: "5V", used: false },
                  { pin: "GPIO3", used: true, label: "SCL" }, { pin: "GND", used: true },
                  { pin: "GPIO4", used: false }, { pin: "GPIO14", used: false },
                  { pin: "GND", used: false }, { pin: "GPIO15", used: false },
                  { pin: "GPIO17", used: true, label: "LED V1" }, { pin: "GPIO18", used: true, label: "SERVO" },
                  { pin: "GPIO27", used: true, label: "LED V2" }, { pin: "GND", used: false },
                  { pin: "GPIO22", used: true, label: "LED R1" }, { pin: "GPIO23", used: true, label: "LED R2" },
                  { pin: "3V3", used: false }, { pin: "GPIO24", used: true, label: "BUZZER" },
                  { pin: "GPIO10", used: false }, { pin: "GND", used: false },
                  { pin: "GPIO9", used: false }, { pin: "GPIO25", used: true, label: "RELAIS" },
                ].map((p, i) => (
                  <div key={i} style={{ width: 56, textAlign: "center", padding: "4px 2px" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", margin: "0 auto 2px", background: p.used ? "#5dade2" : p.pin.startsWith("GND") ? "#2a3a5c" : p.pin.startsWith("3V3") || p.pin.startsWith("5V") ? "#8a4a2a" : "#1a2744", border: `1px solid ${p.used ? "#2471a3" : "#1a2744"}` }} />
                    <div style={{ fontSize: 8, color: p.used ? "#5dade2" : "#2a3a5c", fontWeight: p.used ? 600 : 400 }}>
                      {p.label || p.pin}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
