"use client";

import React from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";

export default function SummaryCardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { activeData: rawActiveData, dadosGlobais, setDadosGlobais, salvarEstadoLocal } = useAppContext();
  const { showConfirm, showAlert } = useSystemDialog();
  const { isGM, session } = useUserSession();

  const isPlayer = !!rawActiveData?.playerName;
  const isOwner = isPlayer && rawActiveData?.id === session?.playerId;
  const canToggleTransformation = isGM || isOwner;

  // Buscar dados frescos do estado global para reatividade em tempo real
  const listName = isPlayer ? 'players' : 'npcs';
  const freshActiveData = dadosGlobais[listName]?.find((item: any) => item.id === rawActiveData?.id) || rawActiveData;

  const isTransformed = freshActiveData?.isTransformed || false;
  const activeData = isTransformed && freshActiveData?.transformation 
    ? { ...freshActiveData, ...freshActiveData.transformation } 
    : freshActiveData;

  const isDead = activeData?.isDead;

  const handleToggleTransformation = async () => {
    if (!canToggleTransformation) return;
    const isApplying = !isTransformed;
    const actionText = isApplying ? "aplicar a transformação" : "reverter a transformação";

    if (await showConfirm({ 
      title: "Confirmar Transformação", 
      message: `Deseja realmente ${actionText} para ${freshActiveData?.name}? Isso atualizará o token para todos os jogadores na mesa.`, 
      type: "info" 
    })) {
      const listName = isPlayer ? 'players' : 'npcs';
      const newList = [...(dadosGlobais[listName] || [])];
      const idx = newList.findIndex((item: any) => item.id === rawActiveData?.id);
      
      if (idx !== -1) {
        newList[idx] = { ...newList[idx], isTransformed: isApplying };
        setDadosGlobais({ ...dadosGlobais, [listName]: newList });
        setTimeout(salvarEstadoLocal, 100);
        showAlert({ title: "Sucesso", message: `Transformação ${isApplying ? 'aplicada' : 'revertida'} com sucesso!`, type: "success" });
      }
    }
  };
  
  const magentaColor = "var(--accent-primary)";
  const badgeGreen = { background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" };
  const badgeRed = { background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" };
  const badgeRedSolid = { background: "#ef4444", color: "#ffffff", border: "1px solid #ef4444" };
  
  let factionBadge = null;
  const currentFaction = isPlayer ? 'ally' : activeData?.faction;
  if (currentFaction === 'ally') factionBadge = { label: "ALIADO", style: badgeGreen };
  else if (currentFaction === 'enemy') factionBadge = { label: "INIMIGO", style: badgeRed };
  else factionBadge = { label: "NEUTRO", style: { background: "rgba(255, 255, 255, 0.1)", color: "#aaa", border: "1px solid rgba(255,255,255,0.2)" }};

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="summary-card-modal">
      {activeData && (
      <div className="modal-content" style={{ maxWidth: isPlayer ? "800px" : "480px", width: "100%", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: 0, overflow: "hidden" }}>
        {isDead && (
          <div className="modal-skull-overlay">
            <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))" }}>
              <path d="M12 2C8 2 5 5 5 9.5c0 2.5 1 4 2 5.5v3.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-3.5c1-1.5 2-3 2-5.5C19 5 16 2 12 2z"></path>
              <path d="M8 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M16 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M9 16v2"></path>
              <path d="M12 16v2"></path>
              <path d="M15 16v2"></path>
              <path d="M12 13v1"></path>
            </svg>
          </div>
        )}
        
        <header className={isDead ? "dead-modal-content" : ""} style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Visualização Resumida
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
              Ficha do {isPlayer ? "Jogador" : "NPC"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {freshActiveData?.transformation && canToggleTransformation && (
              <button 
                onClick={handleToggleTransformation}
                className={`btn ${isTransformed ? 'danger-btn' : 'primary-btn'} small-btn`}
                style={{ padding: "6px 12px", border: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold" }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                {isTransformed ? "Reverter Original" : "Aplicar Transformação"}
              </button>
            )}
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", padding: "4px" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className="custom-scrollbar" style={{ padding: "24px", maxHeight: "75vh", overflowY: "auto" }}>
          
          <div style={{ display: "flex", gap: "20px", marginBottom: "30px", alignItems: "center" }}>
            
            <div className={isDead ? "dead-modal-content" : ""} style={{ position: "relative", width: "110px", height: "110px", flexShrink: 0 }}>
              {activeData.image ? (
                <img 
                  src={activeData.image} 
                  alt="Avatar" 
                  style={{ 
                    width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px", 
                    border: "1px solid rgba(255,255,255,0.1)"
                  }} 
                />
              ) : (
                <div style={{ 
                  width: "100%", height: "100%", borderRadius: "16px", background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.5rem", fontWeight: "bold", color: "rgba(255,255,255,0.2)"
                }}>
                  {activeData.name ? activeData.name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h3 className={isDead ? "dead-modal-content" : ""} style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{activeData.name}</h3>
              <div className={isDead ? "dead-modal-content" : ""} style={{ fontSize: "0.85rem", fontWeight: 700, color: magentaColor }}>
                {activeData.title || (isPlayer ? (activeData.playerClass || activeData.classLevel) : activeData.classLevel) || (isPlayer ? "Sem classe" : "Sem título")}{isPlayer && activeData.playerLevel ? ` Nv. ${activeData.playerLevel}` : ""}
              </div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>
                {activeData.race || "Raça não definida"}
              </div>
              
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                {factionBadge && (
                  <span style={{ 
                    ...factionBadge.style, 
                    fontSize: "0.55rem", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", letterSpacing: "0.05em" 
                  }}>
                    {factionBadge.label}
                  </span>
                )}
                {isDead && (
                  <span style={{ 
                    ...badgeRedSolid, 
                    fontSize: "0.55rem", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", letterSpacing: "0.05em" 
                  }}>
                    MORTO
                  </span>
                )}
                {isTransformed && (
                  <span style={{ 
                    background: "rgba(217, 70, 239, 0.15)", color: "#d946ef", border: "1px solid rgba(217, 70, 239, 0.3)",
                    fontSize: "0.55rem", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", letterSpacing: "0.05em" 
                  }}>
                    TRANSFORMADO
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.05)", marginBottom: "24px" }}></div>

          <div className={isDead ? "dead-modal-content" : ""} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {!isPlayer && (
              <div>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Traços de Personalidade</h4>
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {activeData.traits || 'Não definidos'}
                </div>
              </div>
            )}

            {!isPlayer && (
              <div>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Motivações</h4>
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {activeData.mot || 'Não definidas'}
                </div>
              </div>
            )}

            {!isPlayer && (
              <div>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Itens Visíveis</h4>
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {activeData.itemsVis || 'Nenhum'}
                </div>
              </div>
            )}

            {isPlayer && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Atributos e Estatísticas</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                    {[
                      { lbl: 'FOR', val: activeData.str }, { lbl: 'DES', val: activeData.dex }, { lbl: 'CON', val: activeData.con },
                      { lbl: 'INT', val: activeData.int }, { lbl: 'SAB', val: activeData.wis }, { lbl: 'CAR', val: activeData.cha }
                    ].map(attr => {
                      const mod = Math.floor((parseInt((attr.val || 10).toString()) - 10) / 2);
                      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                      return (
                        <div key={attr.lbl} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800 }}>{attr.lbl}</div>
                          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", margin: "4px 0" }}>{attr.val || 10}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 700 }}>{modStr}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>Pontos de Vida</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#10b981", marginTop: "4px" }}>{activeData.hpCurrent || 0} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ {activeData.hpMax || 0}</span></div>
                  </div>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>CA</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff" }}>{activeData.ac || '--'}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>Desloc</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff" }}>{activeData.speed || '--'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px" }}>
                    <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Salvaguardas</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {Array.isArray(activeData.saves) && activeData.saves.map((save: string, i: number) => (
                        <span key={i} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "#fff", fontWeight: 600 }}>{save}</span>
                      ))}
                      {(!Array.isArray(activeData.saves) || activeData.saves.length === 0) && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Nenhuma</span>}
                    </div>
                  </div>

                  <div style={{ flex: 2, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px" }}>
                    <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Perícias</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {Array.isArray(activeData.skills) && activeData.skills.map((skill: string, i: number) => (
                        <span key={i} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "var(--accent-primary)", fontWeight: 600 }}>{skill}</span>
                      ))}
                      {(!Array.isArray(activeData.skills) || activeData.skills.length === 0) && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Nenhuma</span>}
                    </div>
                  </div>
                </div>

                {activeData.attacks && activeData.attacks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Ataques Rápidos</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {activeData.attacks.map((atk: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "10px 14px", alignItems: "center", fontSize: "0.9rem" }}>
                          <div style={{ width: "45%", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {atk.name ? atk.name.charAt(0).toUpperCase() + atk.name.slice(1) : 'Ataque'}
                          </div>
                          <div style={{ width: "20%", textAlign: "center", color: "var(--accent-primary)", fontWeight: 700 }}>
                            {atk.bonus || '--'}
                          </div>
                          <div style={{ width: "35%", textAlign: "right", color: "var(--text-muted)" }}>
                            {atk.dmg || '--'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: magentaColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px 0" }}>Jogador(a)</h4>
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                    {activeData.playerName || 'Não definido'}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      )}
    </Modal>
  );
}
