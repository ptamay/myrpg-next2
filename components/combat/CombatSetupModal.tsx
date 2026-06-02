"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useCombat } from "@/contexts/CombatContext";

export default function CombatSetupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dadosGlobais } = useApp();
  const { isGM } = useUserSession();
  const { startCombat, combat } = useCombat();

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [selectedNpcs, setSelectedNpcs] = useState<Set<string>>(new Set());

  // Inicia com todos os players vivos marcados e todos os npcs inimigos/neutros vivos marcados
  useEffect(() => {
    if (isOpen && dadosGlobais && !combat?.isActive) {
      const pSet = new Set<string>((dadosGlobais.players || []).filter((p: any) => !p.isDead).map((p: any) => p.id));
      const nSet = new Set<string>((dadosGlobais.npcs || []).filter((n: any) => !n.isDead && !n.isHidden && n.faction !== "ally").map((n: any) => n.id));
      setSelectedPlayers(pSet);
      setSelectedNpcs(nSet);
    }
  }, [isOpen, dadosGlobais, combat?.isActive]);

  if (!isOpen) return null;

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayers(next);
  };

  const toggleNpc = (id: string) => {
    const next = new Set(selectedNpcs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNpcs(next);
  };

  const handleStart = () => {
    if (!isGM) return;
    const playersToInclude = (dadosGlobais.players || []).filter((p: any) => selectedPlayers.has(p.id));
    const npcsToInclude = (dadosGlobais.npcs || []).filter((n: any) => selectedNpcs.has(n.id));
    
    startCombat(playersToInclude, npcsToInclude);
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? "active" : ""}`} style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: "600px", width: "90%", display: "flex", flexDirection: "column" }}>
        <header className="modal-header">
          <h2>⚔️ Setup de Combate</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </header>

        {combat?.isActive ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <h3>Um combate já está ativo!</h3>
            <p>Encerre o combate atual antes de iniciar um novo.</p>
            <div style={{ marginTop: "1rem" }}>
              <button className="btn primary-btn" onClick={onClose}>OK</button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-body" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                Selecione os participantes que entrarão neste combate. O sistema capturará as fichas no estado atual.
              </p>

              <div>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--primary-color)" }}>Jogadores</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {(dadosGlobais.players || []).map((p: any) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "8px", cursor: "pointer", opacity: p.isDead ? 0.5 : 1 }}>
                      <input type="checkbox" checked={selectedPlayers.has(p.id)} onChange={() => togglePlayer(p.id)} />
                      <span>{p.name} {p.isDead && "(Morto)"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--danger)" }}>NPCs / Monstros</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {(dadosGlobais.npcs || []).filter((n: any) => !n.isHidden).map((n: any) => (
                    <label key={n.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "8px", cursor: "pointer", opacity: n.isDead ? 0.5 : 1 }}>
                      <input type="checkbox" checked={selectedNpcs.has(n.id)} onChange={() => toggleNpc(n.id)} />
                      <span>{n.name} {n.isDead && "(Morto)"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <footer className="modal-footer" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn secondary-btn" onClick={onClose}>Cancelar</button>
              <button 
                className="btn primary-btn" 
                style={{ backgroundColor: "var(--danger)" }}
                onClick={handleStart}
                disabled={selectedPlayers.size === 0 && selectedNpcs.size === 0}
              >
                Inicar Combate ({selectedPlayers.size + selectedNpcs.size})
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
