"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";

import { SAVES_MAP, SKILLS_MAP } from "@/lib/dndConstants";

interface SessionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionPlayerModal({ isOpen, onClose }: SessionPlayerModalProps) {
  const { diaAtual, jornadaPorDia, setJornadaPorDia, activeData, setActiveData, setModals, dadosGlobais, setDadosGlobais, salvarEstadoLocal } = useAppContext();
  const { showAlert, showConfirm } = useSystemDialog();
  const { isGM } = useUserSession();

  const [acoes, setAcoes] = useState<any[]>([]);
  const [concluido, setConcluido] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [attacksExpanded, setAttacksExpanded] = useState(false);

  React.useEffect(() => {
    if (isOpen && activeData) {
      const playerObj = activeData.player || activeData;

      if (activeData.blocoIndex !== undefined) {
        const session = jornadaPorDia[diaAtual]?.blocos?.[activeData.blocoIndex]?.playerSessions?.[playerObj.id];
        const savedAcoes = session?.acoes || [];
        
        // Backward compatibility: map strings to objects
        const mappedAcoes = savedAcoes.map((a: any) => {
          if (typeof a === 'string') {
            return { id: Date.now() + Math.random(), type: 'Livre / Outro', text: a, timeCost: 60 };
          }
          // Convert old isSleep format
          if (a.isSleep !== undefined && a.type === undefined) {
            return { ...a, type: a.isSleep ? 'Dormindo / Descanso' : 'Livre / Outro' };
          }
          return a;
        });

        setAcoes(mappedAcoes);
        setConcluido(session?.concluido || false);
      } else {
        setAcoes([]);
        setConcluido(false);
      }
    }
  }, [isOpen, activeData, diaAtual, jornadaPorDia]);

  if (!activeData) return null;

  const rawPlayer = activeData.player || activeData;
  const player = rawPlayer?.isTransformed && rawPlayer?.transformation 
    ? { ...rawPlayer, ...rawPlayer.transformation } 
    : rawPlayer;

  const isDead = player.isDead;

  // Calculate Total Sleep in the day (combining saved blocks and the current edited block)
  let totalSleepMinutes = 0;
  if (jornadaPorDia[diaAtual] && jornadaPorDia[diaAtual].blocos) {
    jornadaPorDia[diaAtual].blocos.forEach((b: any, index: number) => {
      if (index === activeData?.blocoIndex) {
        acoes.forEach(a => {
          if (a.type === 'Dormindo / Descanso') totalSleepMinutes += (a.timeCost || 0);
        });
      } else if (b.playerSessions && b.playerSessions[player.id]) {
        (b.playerSessions[player.id].acoes || []).forEach((a: any) => {
          if (a && typeof a === 'object') {
            if (a.type === 'Dormindo / Descanso' || a.isSleep === true) {
              totalSleepMinutes += (a.timeCost || 0);
            }
          }
        });
      }
    });
  }
  const totalSleepHours = (totalSleepMinutes / 60).toFixed(1).replace('.0', '');

  const totalTimeSpentInBlock = acoes.reduce((sum, a) => {
    if (typeof a === 'object') {
      return a.concluida ? sum + (a.timeCost || 0) : sum;
    }
    return sum + 60;
  }, 0);
  const remainingTimeMinutes = 240 - totalTimeSpentInBlock;

  const hpPct = player.hpMax > 0 ? Math.max(0, Math.min(100, ((player.hpCurrent !== undefined ? player.hpCurrent : player.hpMax) / player.hpMax) * 100)) : 0;

  let hpColor = "#4ade80"; // Saudável (soft green)
  let hpStatusText = "Saudável";

  if (hpPct <= 50) {
    hpColor = "#f87171"; // Perigo (soft red)
    hpStatusText = "Perigo";
  } else if (hpPct <= 75) {
    hpColor = "#fbbf24"; // Ok (soft orange/amber)
    hpStatusText = "Ok";
  }

  const profBonus = player.profBonus || "2";
  const profBonusNum = parseInt(profBonus.toString()) || 2;
  const parsedSaves = Array.isArray(player.saves) ? player.saves : (typeof player.saves === 'string' && player.saves ? player.saves.split(',').map((s: string) => s.trim()) : []);
  const parsedSkills = Array.isArray(player.skills) ? player.skills : (typeof player.skills === 'string' && player.skills ? player.skills.split(',').map((s: string) => s.trim()) : []);

  const calcMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const openDetail = () => {
    onClose();
    setActiveData(player);
    setModals((prev: any) => ({ ...prev, playerForm: true }));
  };

  const removePlayer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await showConfirm({ title: "Remover Jogador", message: `Tem certeza que deseja excluir o jogador ${player.name}?`, type: "danger" })) {
      const newPlayers = dadosGlobais.players.filter((p: any) => p.id !== player.id);
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
      setTimeout(salvarEstadoLocal, 100);
      onClose();
    }
  };

  const handleHpChange = (amount: number) => {
    const newPlayers = [...(dadosGlobais.players || [])];
    const idx = newPlayers.findIndex(p => p.id === rawPlayer.id);
    if (idx !== -1) {
      const transformation = newPlayers[idx].transformation;
      if (rawPlayer.isTransformed && transformation) {
        const max = Number(transformation.hpMax) || 0;
        let current = Number(transformation.hpCurrent);
        if (isNaN(current)) current = max;
        current += amount;
        if (current > max) current = max;
        if (current < 0) current = 0;
        transformation.hpCurrent = current;
        if (current === 0) {
           newPlayers[idx].isTransformed = false;
           transformation.isDead = true;
        } else {
           transformation.isDead = false;
        }
      } else {
        const max = Number(newPlayers[idx].hpMax) || 0;
        let current = Number(newPlayers[idx].hpCurrent);
        if (isNaN(current)) current = max;
        current += amount;
        if (current > max) current = max;
        if (current < 0) current = 0;
        newPlayers[idx].hpCurrent = current;
        if (current === 0) newPlayers[idx].isDead = true;
        else newPlayers[idx].isDead = false;
      }
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
      setTimeout(salvarEstadoLocal, 100);
    }
  };

  const handleSaveDmControls = () => {
    let setPlayerToSleep = false;
    if (activeData.blocoIndex !== undefined) {
       setPlayerToSleep = acoes.some(a => a.type === 'Dormindo / Descanso');
    }

    const newPlayers = [...(dadosGlobais.players || [])];
    const idx = newPlayers.findIndex(p => p.id === rawPlayer.id);
    if (idx !== -1) {
      newPlayers[idx].sleepHoursToday = Number(totalSleepHours);
      if (setPlayerToSleep) {
        newPlayers[idx].isSleepingAction = true;
      }
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
    }

    if (activeData.blocoIndex !== undefined) {
      const blocoIndex = activeData.blocoIndex;
      const newJornada = JSON.parse(JSON.stringify(jornadaPorDia));
      const blocos = newJornada[diaAtual].blocos;
      
      if (!blocos[blocoIndex].playerSessions) {
        blocos[blocoIndex].playerSessions = {};
      }

      // Filter out empty 'Livre' actions without text, but keep sleep actions etc.
      const filteredAcoes = acoes.filter(a => {
        if (typeof a === 'object') {
          if (a.type !== 'Livre / Outro') return true; // keep it if it has a category
          return a.text && a.text.trim() !== "";
        }
        return a.trim() !== "";
      });

      blocos[blocoIndex].playerSessions[player.id] = {
        ...blocos[blocoIndex].playerSessions[player.id], // preserve previous things just in case
        acoes: filteredAcoes,
        concluido: concluido
      };
      
      // Delete old objetivos array since it's no longer used
      if (blocos[blocoIndex].playerSessions[player.id].objetivos) {
        delete blocos[blocoIndex].playerSessions[player.id].objetivos;
      }

      setJornadaPorDia(newJornada);
    }

    setTimeout(salvarEstadoLocal, 100);
    onClose();
  };

  const handleAddAcao = async () => {
    if (acoes.some(a => !a.concluida)) return;

    const otherTimeSpent = acoes.filter(a => a.concluida).reduce((sum, a) => sum + (a.timeCost || 0), 0);
    const remaining = 240 - otherTimeSpent;

    if (remaining <= 0) {
      await showAlert("Não há mais tempo disponível neste bloco.");
      return;
    }

    const defaultCost = remaining >= 60 ? 60 : remaining >= 30 ? 30 : 15;
    setAcoes([...acoes, { id: Date.now(), type: 'Livre / Outro', text: "", timeCost: defaultCost, concluida: false }]);
  };
  
  const handleResetBloco = () => {
    setAcoes([]);
    const newPlayers = [...(dadosGlobais.players || [])];
    const idx = newPlayers.findIndex(p => p.id === rawPlayer.id);
    if (idx !== -1 && newPlayers[idx].isSleepingAction) {
      newPlayers[idx].isSleepingAction = false;
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
      setTimeout(salvarEstadoLocal, 100);
    }
  };
  
  const handleAcaoChange = async (index: number, field: string, value: any) => {
    const newAcoes = [...acoes];
    
    let newTimeCost = newAcoes[index].timeCost || 60;
    if (field === 'timeCost') {
      newTimeCost = Number(value);
    } else if (field === 'type' && value === 'Cozinhando') {
      newTimeCost = 60;
    }

    const otherTimeSpent = acoes.filter((a, idx) => idx !== index && a.concluida).reduce((sum, a) => sum + (a.timeCost || 0), 0);
    const availableTime = 240 - otherTimeSpent;

    if (newTimeCost > availableTime) {
      await showAlert(`Esta ação requer ${newTimeCost} min, mas restam apenas ${availableTime} min no bloco.`);
      return;
    }

    if (field === 'type' && value === 'Cozinhando') {
      newAcoes[index] = { ...newAcoes[index], [field]: value, timeCost: 60 };
    } else {
      newAcoes[index] = { ...newAcoes[index], [field]: value };
    }
    setAcoes(newAcoes);
  };

  const handleRemoveAcao = (index: number) => {
    const newAcoes = [...acoes];
    newAcoes.splice(index, 1);
    setAcoes(newAcoes);
  };

  const handleExhaustionChange = (level: number) => {
    const newPlayers = [...(dadosGlobais.players || [])];
    const idx = newPlayers.findIndex(p => p.id === rawPlayer.id);
    if (idx !== -1) {
      newPlayers[idx].exhaustionLevel = level;
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
      setTimeout(salvarEstadoLocal, 100);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="session-player-modal">
      <div className="modal-content" style={{ maxWidth: "90%", width: "100%", background: "#09090b", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        <header style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Gestão da Sessão
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
              {player.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", padding: "4px" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: "60vh", overflow: "hidden" }}>
          
          {/* PAINEL ESQUERDO: FICHA DO JOGADOR */}
          <div className="custom-scrollbar" style={{ flex: 0.4, padding: "16px", overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className={`npc-card glass-panel combat-expanded ${player.isDead ? "is-dead" : ""}`}>
              {player.isDead && <div className="status-dead-overlay">💀</div>}
              
              <div className="npc-card-header">
                {player.image ? (
                  <img src={player.image} className="npc-card-avatar" alt={player.name} />
                ) : (
                  <div className="npc-card-placeholder">{(player.name || "?").charAt(0).toUpperCase()}</div>
                )}
                <div className="npc-card-title-area">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="npc-card-name" style={{ flex: 1, wordBreak: "break-word", lineHeight: 1.2, fontSize: player.name?.length > 15 ? "0.9rem" : "1.1rem", whiteSpace: "normal" }}>
                      {player.name}
                    </span>
                    {player.inspiration && <span className="inspiration-badge" title="Inspiração" style={{ marginLeft: "6px" }}>🌟</span>}
                  </div>
                  <div className="npc-card-title">
                    {player.playerClass || player.classLevel || 'Sem classe'}{player.playerLevel ? ` Nv. ${player.playerLevel}` : ''}
                    <span style={{ margin: "0 6px", opacity: 0.5 }}>•</span>
                    <span style={{ color: hpColor, fontWeight: 700 }}>{hpStatusText}</span>
                  </div>
                  <div className="npc-card-meta">
                    <span>{player.race || '---'}</span>
                    {player.playerName && <><span>•</span><span>Jogador: {player.playerName}</span></>}
                  </div>
                </div>
              </div>
              
              <div className="npc-card-combat-details">
                <div className="npc-card-attrs">
                  <div className="attr-m"><span className="attr-lbl">FOR</span><span className="attr-mod">{calcMod(player.str)}</span><span className="attr-val">{player.str || 10}</span></div>
                  <div className="attr-m"><span className="attr-lbl">DES</span><span className="attr-mod">{calcMod(player.dex)}</span><span className="attr-val">{player.dex || 10}</span></div>
                  <div className="attr-m"><span className="attr-lbl">CON</span><span className="attr-mod">{calcMod(player.con)}</span><span className="attr-val">{player.con || 10}</span></div>
                  <div className="attr-m"><span className="attr-lbl">INT</span><span className="attr-mod">{calcMod(player.int)}</span><span className="attr-val">{player.int || 10}</span></div>
                  <div className="attr-m"><span className="attr-lbl">SAB</span><span className="attr-mod">{calcMod(player.wis)}</span><span className="attr-val">{player.wis || 10}</span></div>
                  <div className="attr-m"><span className="attr-lbl">CAR</span><span className="attr-mod">{calcMod(player.cha)}</span><span className="attr-val">{player.cha || 10}</span></div>
                </div>
                
                <div className="npc-card-stats">
                  <div className="stat-mini" title="Classe de Armadura" style={{ cursor: "default" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span className="base-val">{player.ac || '--'}</span>
                  </div>
                  <div className="stat-mini" title="Iniciativa">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>
                    {player.init || '--'}
                  </div>
                  <div className="stat-mini" title="Deslocamento">💨 {player.speed || '--'}</div>
                  <div className="stat-mini" title="Percepção Passiva">👁️ {player.perc || '--'}</div>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "1rem", alignItems: "stretch", width: "100%" }}>
                  <div className="npc-card-hp-area" style={{ flex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div className="hp-header" style={{ marginBottom: "4px" }}>
                      <span>PONTOS DE VIDA</span>
                      <div className="hp-values-group">
                        <button onClick={(e) => { e.stopPropagation(); handleHpChange(-1); }} style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", borderRadius: "3px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>-</button>
                        <span className="hp-total-display">{player.hpCurrent || 0}</span>
                        <span className="hp-max-val">/ {player.hpMax || 0}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleHpChange(1); }} style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#a7f3d0", borderRadius: "3px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>+</button>
                      </div>
                    </div>
                    <div className="hp-bar-bg" style={{ height: "6px" }}>
                      <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpColor }}></div>
                    </div>
                  </div>
                  
                  <div className="player-card-hd-badge" style={{ flex: 1, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "4px 6px", minWidth: "65px", height: "32px", boxSizing: "border-box" }}>
                    <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1, display: "block" }}>Dado Vida</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px", lineHeight: 1, display: "block" }}>{player.hdTotal || '1d10'}</span>
                  </div>
                </div>

                {player.attacks && player.attacks.length > 0 && (
                  <>
                    <div className={`player-skills-trigger ${attacksExpanded ? "active" : ""}`} onClick={() => setAttacksExpanded(!attacksExpanded)}>
                      <span>Ataques e Conjurações</span>
                      <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    
                    <div className={`player-skills-collapse ${attacksExpanded ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
                      <div className="player-attacks-list" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {player.attacks.map((a: any, i: number) => (
                          <div key={i} className="player-atk-row" style={{ display: "flex", alignItems: "center", fontSize: "0.8rem", padding: "6px 10px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                            <span className="atk-name" style={{ width: "45%", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {a.name ? a.name.charAt(0).toUpperCase() + a.name.slice(1) : ''}
                            </span>
                            <span className="atk-bonus" style={{ width: "20%", textAlign: "center", color: "var(--accent-primary)", fontWeight: 700 }}>
                              {a.bonus || '--'}
                            </span>
                            <span className="atk-dmg" style={{ width: "35%", textAlign: "right", color: "var(--text-secondary)" }}>
                              {a.dmg || '--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className={`player-skills-trigger ${skillsExpanded ? "active" : ""}`} onClick={() => setSkillsExpanded(!skillsExpanded)}>
                  <span>Perícias & Salvaguardas</span>
                  <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                
                <div className={`player-skills-collapse ${skillsExpanded ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
                  <div className="prof-bonus-badge-row" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#e2b43b", letterSpacing: "0.05em" }}>BÔNUS DE PROFICIÊNCIA</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#e2b43b" }}>+{profBonus}</span>
                  </div>
                  
                  <div className="skills-section-container" style={{ marginBottom: "16px" }}>
                    <span className="skills-section-title" style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "#8a8a8a", letterSpacing: "0.05em", marginBottom: "8px", display: "block" }}>Salvaguardas</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "16px", rowGap: "8px" }}>
                      {SAVES_MAP.map((sv) => {
                        const baseVal = parseInt((player[sv.attr] || 10).toString());
                        const mod = Math.floor((baseVal - 10) / 2);
                        const isProf = parsedSaves.some((s: string) => s.toLowerCase().trim() === sv.key.toLowerCase().trim());
                        const total = mod + (isProf ? profBonusNum : 0);
                        const totalStr = total >= 0 ? `+${total}` : `${total}`;
                        return (
                          <div key={sv.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: isProf ? "#fff" : "#a1a1aa" }}>
                            <div style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: isProf ? "2px solid #e2b43b" : "1.5px solid rgba(255,255,255,0.3)",
                              background: isProf ? "#e2b43b" : "transparent",
                              flexShrink: 0
                            }}></div>
                            <span style={{ width: "24px", fontWeight: isProf ? 800 : 500, color: isProf ? "#e2b43b" : "inherit", textAlign: "right", flexShrink: 0 }}>{totalStr}</span>
                            <span style={{ fontWeight: isProf ? 800 : 600, textTransform: "uppercase" }}>{sv.key}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
 
                  <div className="skills-section-container">
                    <span className="skills-section-title" style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "#8a8a8a", letterSpacing: "0.05em", marginBottom: "8px", display: "block" }}>Perícias</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "16px", rowGap: "8px" }}>
                      {SKILLS_MAP.map((sk) => {
                        const baseVal = parseInt((player[sk.attr] || 10).toString());
                        const mod = Math.floor((baseVal - 10) / 2);
                        const isProf = parsedSkills.some((s: string) => s.toLowerCase().trim() === sk.label.toLowerCase().trim() || s.toLowerCase().trim() === sk.name.toLowerCase().trim());
                        const total = mod + (isProf ? profBonusNum : 0);
                        const totalStr = total >= 0 ? `+${total}` : `${total}`;
                        
                        const attrIndex = sk.label.indexOf(" (");
                        const displayName = attrIndex !== -1 ? sk.label.substring(0, attrIndex) : sk.label;
                        const displayAttr = attrIndex !== -1 ? sk.label.substring(attrIndex).trim() : "";
 
                        return (
                          <div key={sk.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: isProf ? "#fff" : "#a1a1aa", minWidth: 0 }}>
                            <div style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: isProf ? "2px solid #e2b43b" : "1.5px solid rgba(255,255,255,0.3)",
                              background: isProf ? "#e2b43b" : "transparent",
                              flexShrink: 0
                            }}></div>
                            <span style={{ width: "24px", fontWeight: isProf ? 800 : 500, color: isProf ? "#e2b43b" : "inherit", textAlign: "right", flexShrink: 0 }}>{totalStr}</span>
                            <span style={{ 
                              overflow: "hidden", 
                              textOverflow: "ellipsis", 
                              whiteSpace: "nowrap", 
                              fontWeight: isProf ? 700 : 500 
                            }}>
                              <strong style={{ fontWeight: isProf ? 800 : 600, color: isProf ? "#fff" : "inherit" }}>{displayName}</strong>
                              {" "}
                              <span style={{ color: "#71717a", fontSize: "0.65rem", fontWeight: 400 }}>{displayAttr}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* PAINEL DIREITO: GESTÃO DO MESTRE */}
          <div className="custom-scrollbar" style={{ flex: 0.6, padding: "24px", overflowY: "auto", background: "rgba(255,255,255,0.01)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
              Controle de Condições
            </h3>
            
            <div className="form-group mt-4">
              <label style={{ display: "flex", justifyContent: "space-between" }}>
                Nível de Exaustão
                <span className="text-danger" style={{ fontWeight: "bold" }}>{player.exhaustionLevel || 0} / 6</span>
              </label>
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                {[0, 1, 2, 3, 4, 5, 6].map(level => (
                  <button 
                    key={level}
                    disabled={!isGM}
                    onClick={() => handleExhaustionChange(level)}
                    style={{ 
                      flex: 1, 
                      padding: "8px 0", 
                      border: "1px solid",
                      borderColor: (player.exhaustionLevel || 0) === level ? "#ef4444" : "rgba(255,255,255,0.1)",
                      background: (player.exhaustionLevel || 0) === level ? "rgba(239, 68, 68, 0.2)" : "transparent",
                      color: (player.exhaustionLevel || 0) === level ? "#fff" : "var(--text-muted)",
                      borderRadius: "6px",
                      cursor: isGM ? "pointer" : "default",
                      opacity: !isGM && (player.exhaustionLevel || 0) !== level ? 0.4 : 1,
                      fontWeight: "bold"
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "10px", borderRadius: "8px", fontSize: "0.75rem", color: "#fca5a5" }}>
                <strong>Efeitos (D&D 5e):</strong>
                <ul style={{ paddingLeft: "1.2rem", margin: "4px 0 0 0" }}>
                  {(player.exhaustionLevel || 0) >= 1 && <li>Desvantagem em testes de habilidade</li>}
                  {(player.exhaustionLevel || 0) >= 2 && <li>Deslocamento reduzido à metade</li>}
                  {(player.exhaustionLevel || 0) >= 3 && <li>Desvantagem em jogadas de ataque e salvaguarda</li>}
                  {(player.exhaustionLevel || 0) >= 4 && <li>Pontos de vida máximos reduzidos à metade</li>}
                  {(player.exhaustionLevel || 0) >= 5 && <li>Deslocamento reduzido a 0</li>}
                  {(player.exhaustionLevel || 0) >= 6 && <li>Morte</li>}
                  {(player.exhaustionLevel || 0) === 0 && <li style={{ listStyle: "none", color: "var(--text-muted)" }}>Sem efeitos adversos no momento.</li>}
                </ul>
              </div>
            </div>

            {activeData.blocoIndex !== undefined && (
              <div style={{ marginTop: "30px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-primary)", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Atribuições do Bloco
                </h3>
                
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: isGM ? "space-between" : "center", alignItems: "center", marginBottom: "15px", background: "rgba(0,0,0,0.2)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {isGM && (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                          Tempo Restante no Bloco
                          <button onClick={handleResetBloco} title="Resetar Tempo do Bloco" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", borderRadius: "4px", fontSize: "0.6rem", padding: "2px 6px", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}>Resetar</button>
                        </span>
                        <span style={{ fontSize: "0.85rem", color: remainingTimeMinutes < 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
                          {Math.floor(Math.abs(remainingTimeMinutes) / 60)}h {Math.abs(remainingTimeMinutes) % 60}m {remainingTimeMinutes < 0 ? 'excedido' : 'disponíveis'}
                        </span>
                      </div>
                    )}
                    <div style={{ textAlign: isGM ? "right" : "center", display: "flex", flexDirection: "column", justifyContent: "center", width: isGM ? "auto" : "100%" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Total de Sono Hoje: <strong style={{ color: "var(--text-primary)" }}>{totalSleepHours}h</strong> <span style={{fontSize: "0.7rem"}}>/ {player.minSleepReq || 8}h mín</span></div>
                    </div>
                  </div>

                  {acoes.map((acao, i) => acao.concluida ? (
                    <div key={acao.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", background: "rgba(16, 185, 129, 0.05)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <span style={{ fontSize: "0.85rem", color: "#a7f3d0", fontWeight: 600 }}>✓ {acao.type !== 'Livre / Outro' ? acao.type : acao.text}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>-{acao.timeCost}m</span>
                    </div>
                  ) : isGM ? (
                    <div key={acao.id || i} style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", background: "rgba(59, 130, 246, 0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#93c5fd", fontWeight: 800, textTransform: "uppercase", marginBottom: "-4px" }}>Ação Ativa</div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <select className="journey-input" value={acao.type || 'Livre / Outro'} onChange={(e) => handleAcaoChange(i, 'type', e.target.value)} style={{ margin: 0, padding: "6px 10px", width: "auto", flexShrink: 0 }}>
                          <option value="Dormindo / Descanso">💤 Dormindo / Descanso</option>
                          <option value="De Guarda / Vigiando">🛡️ De Guarda / Vigiando</option>
                          <option value="Explorando / Investigando">🗺️ Explorando / Investigando</option>
                          <option value="Cozinhando">🍳 Cozinhando</option>
                          <option value="Consertando navio">🛠️ Consertando navio</option>
                          <option value="Ofício / Preparação">⚒️ Ofício / Preparação</option>
                          <option value="Livre / Outro">🎲 Livre / Outro</option>
                        </select>
                        {(!acao.type || acao.type === 'Livre / Outro') && (
                          <input type="text" className="journey-input" value={acao.text || ""} onChange={(e) => handleAcaoChange(i, 'text', e.target.value)} placeholder="Detalhes (obrigatório)..." style={{ flex: 1, margin: 0 }} />
                        )}
                        <button className="btn danger-btn small-btn" onClick={() => handleRemoveAcao(i)} style={{ padding: "4px 8px", margin: 0, marginLeft: "auto" }}>✕</button>
                      </div>
                      <div style={{ display: "flex", gap: "15px", alignItems: "center", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "bold" }}>Tempo investido:</span>
                        {acao.type === 'Cozinhando' ? (
                          <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 700, padding: "4px 8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                            1 Hora (Fixo)
                          </span>
                        ) : (
                          <select className="journey-input" value={acao.timeCost || 60} onChange={(e) => handleAcaoChange(i, 'timeCost', Number(e.target.value))} style={{ margin: 0, padding: "4px 10px", height: "auto", fontSize: "0.8rem", width: "120px" }}>
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1 Hora</option>
                            <option value={90}>1.5 Horas</option>
                            <option value={120}>2 Horas</option>
                            <option value={180}>3 Horas</option>
                            <option value={240}>4 Horas</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ) : null)}
                  {acoes.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>Nenhuma ação registrada neste bloco.</p>}
                  
                  {isGM && !acoes.some(a => !a.concluida) && (
                    <button className="btn secondary-btn" onClick={handleAddAcao} style={{ width: "100%", marginTop: "10px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderStyle: "dashed" }}>
                       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                       Adicionar Ação ao Bloco
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="modal-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
          <div></div>
          <div style={{ display: "flex", gap: "10px" }}>
            {isGM ? (
              <>
                <button className="btn secondary-btn" onClick={onClose}>Cancelar</button>
                <button className="btn primary-btn" onClick={handleSaveDmControls}>Salvar Alterações</button>
              </>
            ) : (
              <button className="btn primary-btn" onClick={onClose}>Fechar</button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  );
}
