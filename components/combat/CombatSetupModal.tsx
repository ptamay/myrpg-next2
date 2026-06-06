"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useCombat } from "@/contexts/CombatContext";

export default function CombatSetupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dadosGlobais } = useApp();
  const { isGM } = useUserSession();
  const { startCombat, combat } = useCombat();

  const [participantsRoles, setParticipantsRoles] = useState<Record<string, 'ally' | 'enemy'>>({});

  useEffect(() => {
    if (isOpen && dadosGlobais && !combat?.isActive) {
      const initialRoles: Record<string, 'ally' | 'enemy'> = {};
      
      // Players vivos entram como aliados por padrão
      (dadosGlobais.players || []).filter((p: any) => !p.isDead).forEach((p: any) => {
        initialRoles[p.id] = 'ally';
      });

      // NPCs começam fora do combate (null) por padrão. Não definiremos 'enemy' nem 'ally'.
      (dadosGlobais.npcs || []).filter((n: any) => !n.isDead && !n.isHidden).forEach((n: any) => {
        // initialRoles[n.id] fica vazio, indicando "Fora"
      });

      setParticipantsRoles(initialRoles);
    }
  }, [isOpen, dadosGlobais, combat?.isActive]);

  if (!isOpen) return null;

  const setRole = (id: string, role: 'ally' | 'enemy' | null) => {
    setParticipantsRoles(prev => {
      const next = { ...prev };
      if (role === null) {
        delete next[id];
      } else {
        next[id] = role;
      }
      return next;
    });
  };

  const handleStart = () => {
    if (!isGM) return;
    
    const finalConfig: { entity: any; type: 'player' | 'npc'; role: 'ally' | 'enemy' }[] = [];
    
    (dadosGlobais.players || []).forEach((p: any) => {
      if (participantsRoles[p.id]) {
        finalConfig.push({ entity: p, type: 'player', role: participantsRoles[p.id] });
      }
    });

    (dadosGlobais.npcs || []).forEach((n: any) => {
      if (participantsRoles[n.id]) {
        finalConfig.push({ entity: n, type: 'npc', role: participantsRoles[n.id] });
      }
    });
    
    if (finalConfig.length === 0) return;

    startCombat(finalConfig);
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
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(dadosGlobais.players || [])
                    .filter((p: any) => !p.isDead) // Filtra mortos
                    .map((p: any) => {
                      const role = participantsRoles[p.id] || null;
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "8px" }}>
                          <span style={{ fontWeight: "bold" }}>{p.name}</span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button className={`btn ${role === null ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", opacity: role === null ? 1 : 0.5 }} onClick={() => setRole(p.id, null)}>Fora</button>
                            <button className={`btn ${role === 'ally' ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", backgroundColor: role === 'ally' ? '#22c55e' : 'transparent', opacity: role === 'ally' ? 1 : 0.5 }} onClick={() => setRole(p.id, 'ally')}>Aliado</button>
                            <button className={`btn ${role === 'enemy' ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", backgroundColor: role === 'enemy' ? '#ef4444' : 'transparent', opacity: role === 'enemy' ? 1 : 0.5 }} onClick={() => setRole(p.id, 'enemy')}>Inimigo</button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--danger)' }}>NPCs / Monstros</h3>
                <div style={{ display: 'flex', flexDirection: "column", gap: '0.5rem' }}>
                  {(dadosGlobais.npcs || [])
                    .filter((n: any) => !n.isHidden && !n.isDead) // Filtra ocultos E mortos
                    .map((n: any) => {
                    const role = participantsRoles[n.id] || null;
                    return (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: "space-between", background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ flex: 1, fontWeight: "bold" }}>{n.name}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <button className={`btn ${role === null ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", opacity: role === null ? 1 : 0.5 }} onClick={() => setRole(n.id, null)}>Fora</button>
                            <button className={`btn ${role === 'ally' ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", backgroundColor: role === 'ally' ? '#22c55e' : 'transparent', opacity: role === 'ally' ? 1 : 0.5 }} onClick={() => setRole(n.id, 'ally')}>Aliado</button>
                            <button className={`btn ${role === 'enemy' ? 'primary-btn' : 'secondary-btn'}`} style={{ padding: "4px 8px", fontSize: "0.75rem", backgroundColor: role === 'enemy' ? '#ef4444' : 'transparent', opacity: role === 'enemy' ? 1 : 0.5 }} onClick={() => setRole(n.id, 'enemy')}>Inimigo</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="modal-footer" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn secondary-btn" onClick={onClose}>Cancelar</button>
              <button 
                className="btn primary-btn" 
                style={{ backgroundColor: "var(--danger)" }}
                onClick={handleStart}
                disabled={Object.values(participantsRoles).length === 0}
              >
                Inicar Combate ({Object.values(participantsRoles).length})
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
