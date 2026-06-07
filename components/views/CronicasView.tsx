"use client";
import { useState, useEffect } from "react";
import DiarioFeed from "../cronicas/diario/DiarioFeed";
import MuralCanvas from "../cronicas/mural/MuralCanvas";

type CronicasTab = "diario" | "mural";

export default function CronicasView() {
  const [activeTab, setActiveTab] = useState<CronicasTab>("diario");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#mural") {
      setActiveTab("mural");
    } else if (hash === "#diario") {
      setActiveTab("diario");
    }
  }, []);

  const tabs: { id: CronicasTab; label: string }[] = [
    { id: "diario", label: "Diário de Bordo" },
    { id: "mural", label: "Mural de Investigação" },
  ];

  return (
    <div className="npc-view-container" style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
      <div className="npc-header glass-panel" style={{ alignItems: "center" }}>
        <div>
          <h2 className="view-title">Crônicas</h2>
          <p className="view-subtitle">Registros e investigações da campanha.</p>
        </div>

        <div id="mural-header-portal" style={{ flex: 1, display: "flex", justifyContent: "center" }}></div>

        <div className="filter-tags">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`filter-tag ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {activeTab === "diario" ? (
          <div style={{ height: "100%", width: "100%" }}>
            <DiarioFeed />
          </div>
        ) : (
          <div style={{ height: "100%", width: "100%" }}>
            <MuralCanvas isActive={true} />
          </div>
        )}
      </div>
    </div>
  );
}
