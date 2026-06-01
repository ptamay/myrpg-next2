"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";

interface NpcCardPlayerProps {
  npc: any;
}

export default function NpcCardPlayer({ npc }: NpcCardPlayerProps) {
  const { setModals, setActiveData } = useApp();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('myrpg-fav-npcs') || '[]');
    setIsFav(favs.includes(npc.id));
  }, [npc.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('myrpg-fav-npcs') || '[]');
    if (favs.includes(npc.id)) {
      favs = favs.filter((id: string) => id !== npc.id);
      setIsFav(false);
    } else {
      favs.push(npc.id);
      setIsFav(true);
    }
    localStorage.setItem('myrpg-fav-npcs', JSON.stringify(favs));
    window.dispatchEvent(new Event('fav-npcs-changed'));
  };

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
          <div className="npc-card-name" style={{ color: npc.isTransformed ? "var(--accent-primary)" : "inherit", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", paddingRight: "40px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{activeNpc.name}</span>
            <button 
              onClick={toggleFavorite}
              title={isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                color: isFav ? "#fbbf24" : "rgba(255,255,255,0.2)",
                transition: "color 0.2s",
                zIndex: 2
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
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
