"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import HpInlineEditor from "../ui/HpInlineEditor";
import BuffPanel from "../ui/BuffPanel";

import { SAVES_MAP, SKILLS_MAP } from "@/lib/dndConstants";
import { DND5E_CLASSES } from "@/lib/constants/dnd5eClasses";

interface PlayerCardProps {
  player: any;
}

export default React.memo(function PlayerCard({ player }: PlayerCardProps) {
  const { dadosGlobais, setDadosGlobais, setModals, setActiveData, salvarEstadoLocal, jornadaPorDia, diaAtual } = useApp();
  const { showConfirm } = useSystemDialog();
  const { isGM, session } = useUserSession();
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [attacksExpanded, setAttacksExpanded] = useState(false);
  const [spellsExpanded, setSpellsExpanded] = useState(false);
  const [abilitiesExpanded, setAbilitiesExpanded] = useState(false);

  const activePlayer = player.isTransformed && player.transformation ? player.transformation : player;

  const activeHp = activePlayer.hpCurrent !== undefined ? activePlayer.hpCurrent : (activePlayer.hpMax || 0);
  const activeTemp = activePlayer.tempHp || 0;

  const isOwner = player.id === session?.playerId;
  const canViewDetails = isGM || isOwner;

  const calcMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const openDetail = () => {
    setActiveData(player);
    setModals((prev: any) => ({ ...prev, playerForm: true }));
  };

  const openDetailView = () => {
    setActiveData(player);
    setModals((prev: any) => ({ ...prev, playerDetail: true }));
  };

  const removePlayer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGM) return;
    if (await showConfirm({ title: "Remover Jogador", message: `Tem certeza que deseja excluir o jogador ${player.name}?`, type: "danger" })) {
      const newPlayers = dadosGlobais.players.filter((p: any) => p.id !== player.id);
      setDadosGlobais({ ...dadosGlobais, players: newPlayers });
      setTimeout(salvarEstadoLocal, 100);
    }
  };

  const handleUpdate = (updates: any) => {
    const newPlayers = dadosGlobais.players.map((p: any) => p.id === player.id ? { ...p, ...updates } : p);
    setDadosGlobais({ ...dadosGlobais, players: newPlayers });
    const updatedPlayer = newPlayers.find((p: any) => p.id === player.id);
    if (updatedPlayer) {
      window.dispatchEvent(new CustomEvent('force_players_refresh', { detail: { player: updatedPlayer } }));
    }
    setTimeout(salvarEstadoLocal, 100);
  };

  const handleActiveUpdate = (updates: any) => {
    if (player.isTransformed) {
      handleUpdate({ transformation: { ...player.transformation, ...updates } });
    } else {
      handleUpdate(updates);
    }
  };

  const toggleTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGM && !isOwner) return;
    if (!player.isTransformed) {
      handleUpdate({ 
        isTransformed: true,
        transformation: {
          ...player.transformation,
          hpCurrent: player.transformation?.hpMax || 0,
          tempHp: 0,
          isDead: false
        }
      });
    } else {
      handleUpdate({ isTransformed: false });
    }
  };

  const handleAcMod = (e: React.MouseEvent, mod: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canViewDetails) return;
    const currentTempAc = activePlayer.tempAc || 0;
    handleActiveUpdate({ tempAc: currentTempAc + mod });
  };

  const handleHpUpdate = (updates: Partial<{ hpCurrent: number; tempHp: number; isDead?: boolean }>) => {
    const isNowDead = updates.hpCurrent !== undefined 
      ? updates.hpCurrent <= 0 && (updates.tempHp !== undefined ? updates.tempHp : activeTemp) <= 0
      : activeHp <= 0 && updates.tempHp !== undefined && updates.tempHp <= 0;
      
    handleActiveUpdate({ ...updates, isDead: isNowDead });
  };

  const hpPct = activePlayer.hpMax > 0 ? Math.max(0, Math.min(100, ((activePlayer.hpCurrent !== undefined ? activePlayer.hpCurrent : activePlayer.hpMax) / activePlayer.hpMax) * 100)) : 0;
  
  let hpColor = "#4ade80"; // Saudável (soft green)
  let hpStatusText = "Saudável";

  if (activePlayer.isDead || (activePlayer.hpCurrent !== undefined && activePlayer.hpCurrent <= 0 && !activePlayer.tempHp)) {
    hpColor = "#9ca3af"; // Morto (gray)
    hpStatusText = "Morto";
  } else if (hpPct <= 50) {
    hpColor = "#f87171"; // Perigo (soft red)
    hpStatusText = "Perigo";
  } else if (hpPct <= 75) {
    hpColor = "#fbbf24"; // Ok (soft orange/amber)
    hpStatusText = "Ok";
  }

  const profBonus = activePlayer.profBonus || "2";

  const parsedSaves = Array.isArray(activePlayer.saves) ? activePlayer.saves : (typeof activePlayer.saves === 'string' && activePlayer.saves ? activePlayer.saves.split(',').map((s: string) => s.trim()) : []);
  const parsedSkills = Array.isArray(activePlayer.skills) ? activePlayer.skills : (typeof activePlayer.skills === 'string' && activePlayer.skills ? activePlayer.skills.split(',').map((s: string) => s.trim()) : []);
  const parsedExpertise = Array.isArray(activePlayer.expertiseSkills) ? activePlayer.expertiseSkills : (typeof activePlayer.expertiseSkills === 'string' && activePlayer.expertiseSkills ? activePlayer.expertiseSkills.split(',').map((s: string) => s.trim()) : []);

  let totalSleepMinutes = 0;
  const dayData = jornadaPorDia[diaAtual];
  if (dayData && dayData.blocos) {
    dayData.blocos.forEach((b: any) => {
      if (b.playerSessions && b.playerSessions[player.id]) {
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

  return (
    <div className={`npc-card glass-panel combat-expanded ${activePlayer.isDead ? "is-dead" : ""}`} onClick={canViewDetails ? openDetailView : undefined} style={{ cursor: canViewDetails ? "pointer" : "default" }}>
      {activePlayer.isDead && <div className="status-dead-overlay">💀</div>}
      
      <div className="npc-card-header">
        {activePlayer.image ? (
          <img src={activePlayer.image} className="npc-card-avatar" alt={activePlayer.name} style={{ border: player.isTransformed ? "2px solid var(--accent-primary)" : "none" }} />
        ) : (
          <div className="npc-card-placeholder" style={{ border: player.isTransformed ? "2px solid var(--accent-primary)" : "none" }}>{(activePlayer.name || "?").charAt(0).toUpperCase()}</div>
        )}
        <div className="npc-card-title-area" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span className="npc-card-name" style={{ margin: 0, fontSize: activePlayer.name?.length > 15 ? "1.05rem" : "1.25rem", fontWeight: 800, color: player.isTransformed ? "var(--accent-primary)" : "inherit" }}>
              {activePlayer.name}
            </span>
            {activePlayer.inspiration && <span className="inspiration-badge" title="Inspiração">🌟</span>}
            {player.isTransformed && <span style={{fontSize: "0.6rem", backgroundColor: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", color: "#fff", fontWeight: "bold"}}>TRANSF.</span>}
            {player.transformation && (isGM || isOwner) && (
              <button 
                title={player.isTransformed ? 'Reverter Forma' : 'Transformar'} 
                onClick={toggleTransform}
                style={{
                  background: player.isTransformed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: player.isTransformed ? '#fff' : 'var(--text-muted)',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s',
                  marginLeft: 'auto'
                }}
              >
                ⚡
              </button>
            )}
          </div>
          <div className="npc-card-title">
            {activePlayer.playerClass && activePlayer.playerClass !== "custom" 
              ? (DND5E_CLASSES.find(c => c.id === activePlayer.playerClass)?.label || activePlayer.playerClass)
              : (activePlayer.customClass || activePlayer.playerClass || activePlayer.classLevel || 'Sem classe')} {activePlayer.playerLevel ? `Nv. ${activePlayer.playerLevel}` : ''}
            {activePlayer.hasSpells && <span title="Conjurador" style={{ marginLeft: "4px" }}>🔮</span>}
            <span style={{ margin: "0 6px", opacity: 0.5 }}>•</span>
            <span style={{ color: hpColor, fontWeight: 700 }}>{hpStatusText}</span>
          </div>
          <div className="npc-card-meta">
            <span>{activePlayer.race || '---'}</span>
            {player.playerName && !player.isTransformed && (
              <>
                <span>•</span>
                <span>Jogador: {player.playerName}</span>
              </>
            )}
          </div>
        </div>
        <div className="npc-card-actions">
          {canViewDetails && (
            <button className="npc-card-action" onClick={(e) => { e.stopPropagation(); openDetail(); }} title="Editar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          )}
          {isGM && (
            <button className="npc-card-action text-danger" onClick={removePlayer} title="Excluir">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {canViewDetails && (
        <div className="npc-card-combat-details">
          <div className="npc-card-attrs">
          <div className="attr-m"><span className="attr-lbl">FOR</span><span className="attr-mod">{calcMod(activePlayer.str)}</span><span className="attr-val">{activePlayer.str || 10}</span></div>
          <div className="attr-m"><span className="attr-lbl">DES</span><span className="attr-mod">{calcMod(activePlayer.dex)}</span><span className="attr-val">{activePlayer.dex || 10}</span></div>
          <div className="attr-m"><span className="attr-lbl">CON</span><span className="attr-mod">{calcMod(activePlayer.con)}</span><span className="attr-val">{activePlayer.con || 10}</span></div>
          <div className="attr-m"><span className="attr-lbl">INT</span><span className="attr-mod">{calcMod(activePlayer.int)}</span><span className="attr-val">{activePlayer.int || 10}</span></div>
          <div className="attr-m"><span className="attr-lbl">SAB</span><span className="attr-mod">{calcMod(activePlayer.wis)}</span><span className="attr-val">{activePlayer.wis || 10}</span></div>
          <div className="attr-m"><span className="attr-lbl">CAR</span><span className="attr-mod">{calcMod(activePlayer.cha)}</span><span className="attr-val">{activePlayer.cha || 10}</span></div>
        </div>
        
        <div className="npc-card-stats">
          <div className="stat-mini" title="Classe de Armadura (Esquerdo: +1 | Direito: -1)" onClick={(e) => handleAcMod(e, 1)} onContextMenu={(e) => handleAcMod(e, -1)} style={{ cursor: "pointer", userSelect: "none" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span className="base-val">{activePlayer.ac || '--'}</span>
            {activePlayer.tempAc ? <span className="temp-bonus">{activePlayer.tempAc > 0 ? '+' : ''}{activePlayer.tempAc}</span> : null}
          </div>
          <div className="stat-mini" title="Iniciativa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>
            {activePlayer.init || '--'}
          </div>
          <div className="stat-mini" title="Deslocamento">💨 {activePlayer.speed || '--'}</div>
          <div className="stat-mini" title="Percepção Passiva">👁️ {activePlayer.perc || '--'}</div>
          <div className="stat-mini" title="Sono Hoje" style={{ color: "var(--text-primary)" }}>
            💤 {totalSleepHours}h <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>/ {activePlayer.minSleepReq || 8}h</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "1rem", alignItems: "center", width: "100%", padding: "0 1.5rem 1rem" }}>
          <div className="npc-card-hp-area" style={{ flex: 2.2, display: "flex", flexDirection: "column", padding: 0 }}>
            <div className="hp-header" style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.05em" }}>HP</span>
              {(isGM || session?.playerId === player.id) ? (
                <HpInlineEditor
                  hpCurrent={activeHp}
                  hpMax={activePlayer.hpMax}
                  tempHp={activeTemp}
                  onApplyDamage={(dmg) => handleHpUpdate({ hpCurrent: Math.max(0, activeHp - dmg) })}
                  onApplyHeal={(heal) => handleHpUpdate({ hpCurrent: activeHp + heal })}
                  onSetTempHp={(val) => handleHpUpdate({ tempHp: val })}
                  onSetHp={(val) => handleHpUpdate({ hpCurrent: Math.max(0, val) })}
                />
              ) : (
                <div className="hp-values-group">
                  <span className="hp-total-display">{activeHp}</span>
                  <span className="hp-max-val">/ {activePlayer.hpMax || 0}</span>
                  {activeTemp > 0 && <span className="temp-hp-badge">+{activeTemp} Temp</span>}
                </div>
              )}
            </div>
            <div className="hp-bar-bg" style={{ height: "6px" }}>
              <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpColor }}></div>
              {(activePlayer.tempHp || 0) > 0 && <div className="hp-bar-temp" style={{ width: `${Math.min(100, (activePlayer.tempHp / activePlayer.hpMax) * 100)}%` }}></div>}
            </div>
          </div>
          
          <div className="player-card-hd-badge" style={{ flex: "0 0 85px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "4px 6px", height: "38px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1, display: "block" }}>Dado Vida</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px", lineHeight: 1, display: "block" }}>{activePlayer.hdTotal || '1d10'}</span>
          </div>
        </div>
        
        <BuffPanel 
          buffs={activePlayer.activeBuffs || []} 
          onUpdateBuffs={(newBuffs) => handleActiveUpdate({ activeBuffs: newBuffs })} 
          isGM={isGM || session?.playerId === player.id} 
          character={activePlayer}
          onConsumeSpellSlot={(level, amount) => {
            const used = activePlayer.spellSlotsUsed || {};
            const currentUsed = used[level] || 0;
            const maxSlots = activePlayer.spellSlots?.[level] || 0;
            if (currentUsed + amount <= maxSlots) {
              handleActiveUpdate({ spellSlotsUsed: { ...used, [level]: currentUsed + amount } });
            }
          }}
          onUpdateCharacter={(updates) => handleActiveUpdate(updates)}
        />

        {activePlayer.classResources && activePlayer.classResources.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activePlayer.classResources.map((res: any, idx: number) => (
                <div key={res.id || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700, color: "#fff" }}>{res.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>Reseta em: {res.resetOn === 'short' ? 'Descanso Curto' : res.resetOn === 'long' ? 'Descanso Longo' : 'Outro'}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", minWidth: "30px", textAlign: "right" }}>{res.current}/{res.max}</span>
                    {canViewDetails && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newResources = [...activePlayer.classResources];
                            newResources[idx].current = Math.max(0, newResources[idx].current - 1);
                            handleActiveUpdate({ classResources: newResources });
                          }}
                          style={{ background: 'var(--danger-color)', color: '#fff', border: 'none', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >-</button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newResources = [...activePlayer.classResources];
                            newResources[idx].current = Math.min(newResources[idx].max, newResources[idx].current + 1);
                            handleActiveUpdate({ classResources: newResources });
                          }}
                          style={{ background: 'var(--success-color)', color: '#fff', border: 'none', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePlayer.hasSpells && activePlayer.spellSlots && Object.keys(activePlayer.spellSlots).length > 0 && (
          <>
            <div className={`player-skills-trigger ${spellsExpanded ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setSpellsExpanded(!spellsExpanded); }}>
              <span>Espaços de Magia</span>
              <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: spellsExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            <div className={`player-skills-collapse ${spellsExpanded ? "active" : ""}`} onClick={(e) => e.stopPropagation()} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: spellsExpanded ? "12px" : "0 12px", marginBottom: spellsExpanded ? "12px" : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                  const maxSlots = activePlayer.spellSlots[lvl];
                  if (!maxSlots || maxSlots <= 0) return null;
                  const usedSlots = (activePlayer.spellSlotsUsed && activePlayer.spellSlotsUsed[lvl]) || 0;
                  
                  return (
                    <div key={lvl} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.02)" }}>
                      <span style={{ fontWeight: 700, color: "#fff" }}>{lvl}º Círculo</span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", minWidth: "30px", textAlign: "right" }}>{maxSlots - usedSlots}/{maxSlots}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {Array.from({ length: maxSlots }).map((_, i) => (
                            <div 
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canViewDetails) return;
                                const newUsed = { ...(activePlayer.spellSlotsUsed || {}) };
                                if (i < usedSlots) {
                                  newUsed[lvl] = usedSlots - 1;
                                } else {
                                  newUsed[lvl] = usedSlots + 1;
                                }
                                handleActiveUpdate({ spellSlotsUsed: newUsed });
                              }}
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "4px",
                                cursor: canViewDetails ? "pointer" : "default",
                                border: "1.5px solid var(--accent-primary)",
                                background: i < usedSlots ? "transparent" : "var(--accent-primary)",
                                transition: "all 0.2s",
                                boxShadow: i < usedSlots ? "inset 0 0 4px rgba(0,0,0,0.5)" : "0 0 4px rgba(var(--accent-primary-rgb), 0.5)"
                              }}
                              title={i < usedSlots ? "Slot Usado (Clique para recuperar)" : "Slot Disponível (Clique para gastar)"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activePlayer.attacks && activePlayer.attacks.length > 0 && (
          <>
            <div className={`player-skills-trigger ${attacksExpanded ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setAttacksExpanded(!attacksExpanded); }}>
              <span>Ataques e Conjurações</span>
              <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: attacksExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            <div className={`player-skills-collapse ${attacksExpanded ? "active" : ""}`} onClick={(e) => e.stopPropagation()} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: attacksExpanded ? "12px" : "0 12px" }}>
              <div className="player-attacks-list" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {activePlayer.attacks.map((a: any, i: number) => (
                  <div key={i} className="player-atk-row" style={{ display: "flex", alignItems: "center", fontSize: "0.8rem", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.02)" }}>
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

        {activePlayer.abilities && activePlayer.abilities.length > 0 && (
          <>
            <div className={`player-skills-trigger ${abilitiesExpanded ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setAbilitiesExpanded(!abilitiesExpanded); }}>
              <span>Habilidades Especiais</span>
              <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: abilitiesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            <div className={`player-skills-collapse ${abilitiesExpanded ? "active" : ""}`} onClick={(e) => e.stopPropagation()} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: abilitiesExpanded ? "12px" : "0 12px", marginBottom: abilitiesExpanded ? "12px" : 0 }}>
              <div className="player-attacks-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activePlayer.abilities.map((a: any, i: number) => (
                  <div key={i} className="player-atk-row" style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="atk-name" style={{ fontWeight: 700, color: "#fff" }}>
                        {a.name ? a.name.charAt(0).toUpperCase() + a.name.slice(1) : ''}
                      </span>
                      {a.actionCost && <span style={{ fontSize: "0.65rem", color: "var(--accent-primary)", border: "1px solid rgba(var(--accent-primary-rgb), 0.5)", padding: "2px 6px", borderRadius: "12px", textTransform: "uppercase" }}>{a.actionCost}</span>}
                    </div>
                    {a.description && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "6px", lineHeight: "1.3" }}>{a.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className={`player-skills-trigger ${skillsExpanded ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setSkillsExpanded(!skillsExpanded); }}>
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
                const baseVal = parseInt((activePlayer[sv.attr] || 10).toString());
                const mod = Math.floor((baseVal - 10) / 2);
                const isProf = parsedSaves.some((s: string) => s.toLowerCase().trim() === sv.key.toLowerCase().trim());
                const total = mod + (isProf ? parseInt(profBonus) : 0);
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
                const baseVal = parseInt((activePlayer[sk.attr] || 10).toString());
                const mod = Math.floor((baseVal - 10) / 2);
                const isProf = parsedSkills.some((s: string) => s.toLowerCase().trim() === sk.label.toLowerCase().trim() || s.toLowerCase().trim() === sk.name.toLowerCase().trim());
                const isExpert = parsedExpertise.some((s: string) => s.toLowerCase().trim() === sk.label.toLowerCase().trim() || s.toLowerCase().trim() === sk.name.toLowerCase().trim());
                const total = mod + (isProf ? parseInt(profBonus) : 0) + (isExpert ? parseInt(profBonus) : 0);
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
                      {isExpert && <span title="Expertise" style={{ color: "#e2b43b", fontSize: "0.7rem", marginLeft: "3px" }}>⭐</span>}
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
    )}
  </div>
  );
}, (prev, next) => JSON.stringify(prev.player) === JSON.stringify(next.player));
