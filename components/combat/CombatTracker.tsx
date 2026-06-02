"use client";

import React, { useState } from "react";
import { useCombat } from "@/contexts/CombatContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import HpInlineEditor from "@/components/ui/HpInlineEditor";

export default function CombatTracker() {
  const { combat, nextTurn, endCombat, applyDamage, applyHeal, setInitiative, addCondition, removeCondition, addToLog, updateParticipant } = useCombat();
  const { isGM } = useUserSession();
  
  const [initInputs, setInitInputs] = useState<Record<string, string>>({});
  const [condInputs, setCondInputs] = useState<Record<string, string>>({});

  if (!combat || !combat.isActive) return null;

  const handleInitSubmit = (id: string) => {
    const val = parseInt(initInputs[id]);
    if (!isNaN(val)) {
      setInitiative(id, val);
      setInitInputs(prev => ({ ...prev, [id]: "" }));
    }
  };

  const currentParticipant = combat.participants[combat.currentTurnIndex];

  return (
    <div className="combat-tracker-overlay" style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "var(--bg-dark)",
      zIndex: 80, // Abaixo do modal e feed
      display: "flex",
      flexDirection: "column"
    }}>
      <header className="combat-tracker-header glass-panel" style={{
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h2 style={{ margin: 0, color: "var(--danger)" }}>⚔️ Combate Ativo</h2>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: "20px", fontWeight: "bold" }}>
            Rodada {combat.round}
          </div>
        </div>
        
        {isGM && (
          <div style={{ display: "flex", gap: "1rem" }}>
            <button className="btn primary-btn" onClick={() => {
              addToLog("O turno foi passado.", "Mestre");
              nextTurn();
            }}>
              Avançar Turno ⏭️
            </button>
            <button className="btn secondary-btn" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={endCombat}>
              Encerrar Combate
            </button>
          </div>
        )}
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Main Area: Initiative Tracker */}
        <div style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Ordem de Iniciativa</h3>
            {!isGM && <div style={{ color: "var(--text-muted)" }}>Aguardando o Mestre conduzir o combate...</div>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {combat.participants.map((p, index) => {
              const isActive = index === combat.currentTurnIndex;
              return (
                <div key={p.refId} className={`glass-panel ${isActive ? 'active-turn' : ''}`} style={{
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  borderLeft: isActive ? "4px solid var(--accent-primary)" : "4px solid transparent",
                  opacity: p.isDead ? 0.4 : 1,
                  transition: "all 0.3s"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", width: "40px", textAlign: "center", color: isActive ? "var(--accent-primary)" : "var(--text-muted)" }}>
                    {p.initiative}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      {p.name} {p.isDead && "💀"} {p.isTransformed && "🐾"}
                    </div>
                    {p.originalName && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Forma de: {p.originalName}</div>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
                      {p.conditions.map(c => (
                        <span key={c} style={{ background: "var(--danger)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", textTransform: "uppercase" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "bold" }}>CA</div>
                      <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{p.ac}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "bold" }}>DESL.</div>
                      <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{p.speed}</div>
                    </div>

                    <div style={{ width: "160px" }}>
                      {isGM ? (
                        <HpInlineEditor 
                          hpCurrent={p.hpCurrent} 
                          hpMax={p.hpMax} 
                          tempHp={p.tempHp}
                          onApplyDamage={(dmg) => applyDamage(p.refId, dmg)}
                          onApplyHeal={(heal) => applyHeal(p.refId, heal)}
                          onSetTempHp={(temp) => updateParticipant(p.refId, { tempHp: temp })}
                          onSetHp={(val) => updateParticipant(p.refId, { hpCurrent: val })}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: "center" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)" }}>{p.hpCurrent}</span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ {p.hpMax}</span>
                          {p.tempHp > 0 && <span style={{ fontSize: "0.75rem", color: "#eab308", background: "rgba(234, 179, 8, 0.15)", padding: "1px 4px", borderRadius: "4px" }}>+{p.tempHp} Temp</span>}
                        </div>
                      )}
                    </div>

                    {isGM && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", borderLeft: "1px solid var(--border-subtle)", paddingLeft: "1rem" }}>
                        <input 
                          type="number" 
                          placeholder="Init" 
                          className="journey-input" 
                          style={{ width: "60px", padding: "4px" }}
                          value={initInputs[p.refId] || ""}
                          onChange={(e) => setInitInputs({ ...initInputs, [p.refId]: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && handleInitSubmit(p.refId)}
                        />
                        <div style={{ position: "relative" }}>
                          <input 
                            type="text" 
                            placeholder="+ Cond" 
                            className="journey-input" 
                            style={{ width: "80px", padding: "4px" }}
                            value={condInputs[p.refId] || ""}
                            onChange={(e) => setCondInputs({ ...condInputs, [p.refId]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && condInputs[p.refId]) {
                                addCondition(p.refId, condInputs[p.refId]);
                                setCondInputs({ ...condInputs, [p.refId]: "" });
                              }
                            }}
                          />
                        </div>
                        {p.conditions.length > 0 && (
                          <button 
                            className="btn secondary-btn" 
                            style={{ padding: "4px 8px" }}
                            onClick={() => removeCondition(p.refId, p.conditions[0])}
                            title="Remover primeira condição"
                          >
                            - Cond
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Combat Log */}
        <div className="glass-panel" style={{ width: "350px", borderLeft: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", fontWeight: "bold" }}>
            Registro de Combate
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {combat.log.map(entry => (
              <div key={entry.id} style={{ padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "4px", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "4px", fontSize: "0.75rem" }}>
                  <span>{entry.actorName}</span>
                  <span>R{entry.round}</span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  {entry.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
