"use client";
import React from "react";
import { useAppContext } from "@/contexts/AppContext";

interface NpcCardPlayerProps {
  npc: any;
}

export default function NpcCardPlayer({ npc }: NpcCardPlayerProps) {
  const { setModals, setActiveData } = useAppContext();

  const activeNpc = npc.isTransformed && npc.transformation ? npc.transformation : npc;

  const openDetail = () => {
    setActiveData(npc);
    setModals((prev: any) => ({ ...prev, summaryCard: true }));
  };

  const factionBorder = activeNpc.faction === 'enemy' ? 'border-danger' : activeNpc.faction === 'ally' ? 'border-success' : 'border-neutral';

  return (
    <div className={`npc-card glass-panel clickable-card ${activeNpc.isDead ? "is-dead" : ""} ${factionBorder}`} onClick={openDetail}>
      {activeNpc.isDead && <div className="status-dead-overlay">💀</div>}
      
      <div className="npc-card-header">
        {activeNpc.image ? (
          <img src={activeNpc.image} className="npc-card-avatar" alt={activeNpc.name} style={{ border: npc.isTransformed ? "2px solid var(--accent-primary)" : "none" }} />
        ) : (
          <div className="npc-card-placeholder" style={{ border: npc.isTransformed ? "2px solid var(--accent-primary)" : "none" }}>{(activeNpc.name || "?").charAt(0).toUpperCase()}</div>
        )}
        <div className="npc-card-title-area">
          <div className="npc-card-name" style={{ color: npc.isTransformed ? "var(--accent-primary)" : "inherit", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <span>{activeNpc.name}</span>
            {npc.isTransformed && <span style={{fontSize: "0.65rem", backgroundColor: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", color: "#fff", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase"}}>Transformado</span>}
          </div>
          <div className="npc-card-title">{activeNpc.title || 'Sem título'}</div>
          <div className="npc-card-meta">
            <span>{activeNpc.race || '---'}</span>
            <span>•</span>
            <span>ND {activeNpc.cr || '0'}</span>
          </div>
          <div className="npc-card-active-conditions">
            {activeNpc.tempCond?.map((c: string, i: number) => <span key={i} className="active-cond-badge">{c}</span>)}
            {activeNpc.tempRes?.map((r: string, i: number) => <span key={i} className="active-res-badge">{r}</span>)}
          </div>
        </div>
      </div>

      <div className="npc-card-narrative-details">
        {activeNpc.mot && (
          <div className="narrative-block">
            <span className="narrative-label">Motivações</span>
            <p className="narrative-text">{activeNpc.mot}</p>
          </div>
        )}
        {activeNpc.itemsVis && (
          <div className="narrative-block">
            <span className="narrative-label">Itens Visíveis</span>
            <p className="narrative-text">{activeNpc.itemsVis}</p>
          </div>
        )}
        {activeNpc.traits && (
          <div className="narrative-block">
            <span className="narrative-label">Traços</span>
            <p className="narrative-text">{activeNpc.traits}</p>
          </div>
        )}
      </div>
    </div>
  );
}
