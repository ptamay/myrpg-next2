"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import HpInlineEditor from "../ui/HpInlineEditor";

export default function PlayerDetailModal({ isOpen, onClose, player }: { isOpen: boolean; onClose: () => void; player: any }) {
  const { setModals, setActiveData, dadosGlobais, setDadosGlobais } = useApp();
  const { isGM, session } = useUserSession();
  const isOwner = player?.id === session?.playerId;
  const [activeTab, setActiveTab] = useState("stats");
  const [isViewingTransformation, setIsViewingTransformation] = useState(false);

  // Buscar player atualizado no estado global (reatividade)
  const freshPlayer = dadosGlobais.players.find((p: any) => p.id === player?.id) || player;

  React.useEffect(() => {
    if (isOpen && freshPlayer) {
      setIsViewingTransformation(freshPlayer.isTransformed || false);
    }
  }, [isOpen, freshPlayer?.id, freshPlayer?.isTransformed]);

  const isDead = freshPlayer?.isDead;
  
  const handleEdit = () => {
    setActiveData(freshPlayer);
    onClose();
    setModals((prev: any) => ({ ...prev, playerForm: true }));
  };

  const mergePlayerHpUpdates = (updates: Partial<{ hpCurrent: number; tempHp: number }>) => {
    const newPlayers = [...(dadosGlobais.players || [])];
    const idx = newPlayers.findIndex(p => p.id === freshPlayer.id);
    if (idx !== -1) {
      const activeHp = freshPlayer.hpCurrent !== undefined ? freshPlayer.hpCurrent : (freshPlayer.hpMax || 0);
      const activeTemp = freshPlayer.tempHp || 0;
      
      let finalHp = activeHp;
      let finalTemp = activeTemp;
      
      if (updates.hpCurrent !== undefined) finalHp = updates.hpCurrent;
      if (updates.tempHp !== undefined) finalTemp = updates.tempHp;

      if (freshPlayer.isTransformed && newPlayers[idx].transformation) {
        newPlayers[idx].transformation.hpCurrent = finalHp;
        newPlayers[idx].transformation.tempHp = finalTemp;
        newPlayers[idx].transformation.isDead = finalHp <= 0 && finalTemp <= 0;
      } else {
        newPlayers[idx].hpCurrent = finalHp;
        newPlayers[idx].tempHp = finalTemp;
        newPlayers[idx].isDead = finalHp <= 0 && finalTemp <= 0;
      }
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
    }
  };

  const hpPct = freshPlayer?.hpMax > 0 ? Math.max(0, Math.min(100, ((freshPlayer.hpCurrent || 0) / freshPlayer.hpMax) * 100)) : 0;

  const calcMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const activePlayer = (isViewingTransformation && freshPlayer?.transformation) ? freshPlayer.transformation : freshPlayer;

  const attrList = activePlayer ? [
    { key: "FOR", label: "Força", val: activePlayer.str || 10 },
    { key: "DES", label: "Destreza", val: activePlayer.dex || 10 },
    { key: "CON", label: "Constituição", val: activePlayer.con || 10 },
    { key: "INT", label: "Inteligência", val: activePlayer.int || 10 },
    { key: "SAB", label: "Sabedoria", val: activePlayer.wis || 10 },
    { key: "CAR", label: "Carisma", val: activePlayer.cha || 10 },
  ] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="player-detail-modal">
      {freshPlayer && (
      <div className={`modal-content ${isDead ? "dead-modal-content" : ""}`} style={{ maxWidth: "850px", width: "100%", background: "#09090b", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", position: "relative" }}>
        
        {isViewingTransformation && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(45deg, rgba(var(--accent-primary-rgb), 0.1), transparent)", pointerEvents: "none" }} />
        )}

        {isDead && (
          <div className="modal-skull-overlay">
            <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10a8 8 0 1 1 16 0c0 3.18-1.83 6-4.66 7.4L15 22H9l-.34-4.6C5.83 16 4 13.18 4 10z" />
              <path d="M10 14h4" />
              <circle cx="8.5" cy="10" r="1" fill="currentColor" />
              <circle cx="15.5" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
        )}
        
        <header style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: isViewingTransformation ? "2px solid var(--accent-primary)" : `2px solid rgba(255,255,255,0.15)`, background: "rgba(255,255,255,0.05)" }}>
              {activePlayer.image ? (
                <img src={activePlayer.image} alt={activePlayer.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: isDead ? "grayscale(100%)" : "none" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "bold", color: "var(--text-muted)" }}>
                  {(activePlayer.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: isViewingTransformation ? "var(--accent-primary)" : "#fff", margin: 0, letterSpacing: "-0.02em" }}>{activePlayer.name}</div>
                {isViewingTransformation && <span style={{fontSize: "0.6rem", backgroundColor: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", color: "#fff", fontWeight: "bold"}}>TRANSF.</span>}
                {activePlayer.inspiration && <span title="Inspiração" style={{ fontSize: "1.2rem" }}>🌟</span>}
              </div>
              <div style={{ fontSize: "1rem", color: "var(--accent-primary)", fontWeight: 700, marginTop: "4px" }}>
                {activePlayer.playerClass || activePlayer.classLevel || 'Sem classe'}{activePlayer.playerLevel ? ` Nv. ${activePlayer.playerLevel}` : ''} <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>•</span> {activePlayer.race || 'Sem raça'}
              </div>
              {freshPlayer.playerName && !isViewingTransformation && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Jogador: <strong>{freshPlayer.playerName}</strong>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {freshPlayer.transformation && isGM && (
              <button 
                className={`btn ${isViewingTransformation ? 'primary-btn' : 'secondary-btn'} small-btn`} 
                onClick={() => setIsViewingTransformation(!isViewingTransformation)}
                style={{ padding: "8px 16px", borderRadius: "8px", transition: 'all 0.3s' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" style={{ marginRight: "4px", verticalAlign: "middle", display: "inline-block" }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                {isViewingTransformation ? "Ver Original" : "Transformar!"}
              </button>
            )}
            <button onClick={handleEdit} className="btn secondary-btn" style={{ padding: "8px 16px", borderRadius: "8px" }}>
              Editar Ficha
            </button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", padding: "8px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </header>
 
        <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.1)" }}>
          <button onClick={() => setActiveTab("stats")} style={{ padding: "12px 20px", background: "transparent", border: "none", color: activeTab === "stats" ? "#fff" : "var(--text-muted)", borderBottom: activeTab === "stats" ? "2px solid var(--accent-primary)" : "2px solid transparent", fontWeight: 700, cursor: "pointer" }}>Atributos & Status</button>
          <button onClick={() => setActiveTab("combat")} style={{ padding: "12px 20px", background: "transparent", border: "none", color: activeTab === "combat" ? "#fff" : "var(--text-muted)", borderBottom: activeTab === "combat" ? "2px solid var(--accent-primary)" : "2px solid transparent", fontWeight: 700, cursor: "pointer" }}>Combate & Magias</button>
          <button onClick={() => setActiveTab("bio")} style={{ padding: "12px 20px", background: "transparent", border: "none", color: activeTab === "bio" ? "#fff" : "var(--text-muted)", borderBottom: activeTab === "bio" ? "2px solid var(--accent-primary)" : "2px solid transparent", fontWeight: 700, cursor: "pointer" }}>Inventário & Bio</button>
        </div>
 
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
                {attrList.map(a => (
                  <div key={a.key} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "12px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.label}</span>
                    <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", margin: "4px 0" }}>{calcMod(a.val)}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "10px" }}>{a.val}</span>
                  </div>
                ))}
              </div>
 
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: `1px solid rgba(255, 255, 255, 0.05)`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Pontos de Vida</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    {(isGM || session?.playerId === freshPlayer.id) ? (
                      <HpInlineEditor
                        hpCurrent={activePlayer.hpCurrent !== undefined ? activePlayer.hpCurrent : activePlayer.hpMax}
                        hpMax={activePlayer.hpMax}
                        tempHp={activePlayer.tempHp || 0}
                        onApplyDamage={(dmg) => mergePlayerHpUpdates({ hpCurrent: Math.max(0, (activePlayer.hpCurrent !== undefined ? activePlayer.hpCurrent : activePlayer.hpMax) - dmg) })}
                        onApplyHeal={(heal) => mergePlayerHpUpdates({ hpCurrent: Math.min(activePlayer.hpMax, (activePlayer.hpCurrent !== undefined ? activePlayer.hpCurrent : activePlayer.hpMax) + heal) })}
                        onSetTempHp={(val) => mergePlayerHpUpdates({ tempHp: val })}
                        onSetHp={(val) => mergePlayerHpUpdates({ hpCurrent: Math.max(0, val) })}
                      />
                    ) : (
                      <>
                        {activePlayer.hpCurrent || 0} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ {activePlayer.hpMax || 0}</span>
                        {(activePlayer.tempHp || 0) > 0 && <span style={{ fontSize: "0.8rem", padding: "2px 8px", background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", borderRadius: "12px" }}>+{activePlayer.tempHp}</span>}
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: `1px solid rgba(255, 255, 255, 0.05)`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Classe de Armadura</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "4px 0" }}>
                    {activePlayer.ac || 10}
                  </div>
                </div>
 
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: `1px solid rgba(255, 255, 255, 0.05)`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Proficiência</span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "4px 0" }}>
                    +{activePlayer.profBonus || 2}
                  </div>
                </div>
 
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: `1px solid rgba(255, 255, 255, 0.05)`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Deslocamento</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", margin: "4px 0", textAlign: "center" }}>
                    {activePlayer.speed || "9m"}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "12px" }}>Salvaguardas</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {Array.isArray(activePlayer.saves) && activePlayer.saves.length > 0 ? activePlayer.saves.map((s: string) => (
                       <span key={s} style={{ background: "rgba(255, 255, 255, 0.05)", color: "#e2e8f0", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold", border: "1px solid rgba(255, 255, 255, 0.08)" }}>{s}</span>
                    )) : <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nenhuma salvaguarda selecionada.</span>}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "12px" }}>Perícias</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {Array.isArray(activePlayer.skills) && activePlayer.skills.length > 0 ? activePlayer.skills.map((s: string) => (
                       <span key={s} style={{ background: "rgba(255, 255, 255, 0.05)", color: "#e2e8f0", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold", border: "1px solid rgba(255, 255, 255, 0.08)" }}>{s}</span>
                    )) : <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nenhuma perícia selecionada.</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "combat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "12px" }}>Ataques e Habilidades</h3>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5, background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {Array.isArray(activePlayer.attacks) ? (
                    activePlayer.attacks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {activePlayer.attacks.map((atk: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "8px 12px", alignItems: "center", fontSize: "0.9rem" }}>
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
                    ) : "Nenhum ataque ou habilidade cadastrada."
                  ) : (
                    activePlayer.attacks || "Nenhum ataque ou habilidade cadastrada."
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "bio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "12px" }}>Inventário</h3>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5, background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {Array.isArray(activePlayer.inventory) ? (
                    activePlayer.inventory.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {activePlayer.inventory.map((item: any, idx: number) => (
                          <span key={idx} style={{ background: "rgba(255, 255, 255, 0.05)", color: "#e2e8f0", padding: "4px 10px", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            {item.name} ({item.qtd})
                          </span>
                        ))}
                      </div>
                    ) : "Inventário vazio."
                  ) : (
                    activePlayer.inventory || "Inventário vazio."
                  )}
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: "1.1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px", marginBottom: "12px" }}>Background / Anotações</h3>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5, background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {activePlayer.notes || "Sem anotações."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </Modal>
  );
}
