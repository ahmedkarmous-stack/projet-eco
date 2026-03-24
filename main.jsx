import { useState } from "react";
import { createRoot } from "react-dom/client";
import SimulationMontage from "../simulation_montage.jsx";
import SchemaCablage from "../schema_cablage.jsx";
import SchemaElectrique from "../schema_electrique_isis.jsx";

const TABS = [
  { id: "simulation", label: "Simulation Montage", component: SimulationMontage },
  { id: "cablage", label: "Schéma Câblage", component: SchemaCablage },
  { id: "electrique", label: "Schéma Électrique ISIS", component: SchemaElectrique },
];

function Root() {
  const [activeTab, setActiveTab] = useState("simulation");
  const Active = TABS.find((t) => t.id === activeTab).component;

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <nav style={{
        display: "flex", gap: "4px", padding: "8px 12px",
        background: "#1e1e2e", borderBottom: "2px solid #3b3b5c"
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 18px", border: "none", borderRadius: "6px",
              cursor: "pointer", fontWeight: 600, fontSize: "14px",
              background: activeTab === tab.id ? "#6c63ff" : "#2d2d44",
              color: activeTab === tab.id ? "#fff" : "#aaa",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <Active />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
