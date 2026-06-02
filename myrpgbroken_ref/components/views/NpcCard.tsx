"use client";

import React, { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";

interface NpcCardProps {
  npc: any;
  combatMode: boolean;
  hideEffects: boolean;
}

export default function NpcCard({ npc, combatMode, hideEffects }: NpcCardProps) {
  const { dadosGlobais, setDadosGlobais, setModals, setActiveData, salvarEstadoLocal } = useAppContext();
  const { isGM } = useUserSession();

  const activeNpc = npc.isTransformed && npc.transformation ? npc.transformation : npc;

  const [localHp, setLocalHp] = useState<string | number>("");
  const [localTempHp, setLocalTempHp] = useState<string | number>("");
  const [hpModInput, setHpModInput] = useState<string>("");

  const activeHp = activeNpc.hpCurrent !== undefined ? activeNpc.hpCurrent : (activeNpc.hpMax || 0);
  const activeTemp = activeNpc.tempHp || 0;

  useEffect(() => {
    setLocalHp(activeHp);
  }, [activeHp]);

  useEffect(() => {
    setLocalTempHp(activeTemp);
  }, [activeTemp]);

  const handleUpdate = (updates: any) => {
    const newNpcs = dadosGlobais.npcs.map((n: any) => n.id === npc.id ? { ...n, ...updates } : n);
    setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
    setTimeout(salvarEstadoLocal, 100);
  };

  const handleActiveUpdate = (updates: any) => {
    if (npc.isTransformed && npc.transformation) {
      handleUpdate({ transformation: { ...npc.transformation, ...updates } });
    } else {
      handleUpdate(updates);
    }
  };

  const getMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const toggleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdate({ isHidden: !npc.isHidden });
  };

  const toggleTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGM) return;
    if (!npc.isTransformed) {
      handleUpdate({ 
        isTransformed: true,
        transformation: {
          ...npc.transformation,
          hpCurrent: npc.transformation?.hpMax || 0,
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
    const currentTempAc = activeNpc.tempAc || 0;
    handleActiveUpdate({ tempAc: currentTempAc + mod });
  };

  const openDetail = () => {
    setActiveData(npc);
    setModals((prev: any) => ({ ...prev, npcDetail: true }));
  };

  const handleHpMod = (e: React.MouseEvent, direction: number) => {
    e.stopPropagation();
    const amount = Math.max(1, parseInt(hpModInput) || 1);
    let current = activeNpc.hpCurrent !== undefined ? activeNpc.hpCurrent : (activeNpc.hpMax || 0);
    let temp = activeNpc.tempHp || 0;
    
    if (direction > 0) {
      current = Math.min(activeNpc.hpMax, current + amount);
    } else {
      if (temp > 0) {
        if (temp >= amount) {
          temp -= amount;
        } else {
          const overflow = amount - temp;
          temp = 0;
          current = Math.max(0, current - overflow);
        }
      } else {
        current = Math.max(0, current - amount);
      }
    }
    
    if (current <= 0 && temp <= 0 && npc.isTransformed) {
      handleUpdate({ 
        isTransformed: false, 
        transformation: { ...npc.transformation, hpCurrent: 0, tempHp: 0, isDead: true } 
      });
      setHpModInput("");
      return;
    }
    
    handleActiveUpdate({ 
      hpCurrent: current, 
      tempHp: temp,
      isDead: current <= 0 && temp <= 0
    });
    setHpModInput("");
  };

  const handleHpChange = (valStr: string) => {
    setLocalHp(valStr);
  };

  const handleHpCommit = () => {
    if (localHp === "") {
      const defaultHp = activeNpc.hpCurrent !== undefined ? activeNpc.hpCurrent : (activeNpc.hpMax || 0);
      setLocalHp(defaultHp);
      return;
    }
    const val = Math.max(0, parseInt(localHp.toString()) || 0);
    handleActiveUpdate({ 
      hpCurrent: val,
      isDead: val <= 0 && (activeNpc.tempHp || 0) <= 0
    });
  };

  const handleTempHpChange = (valStr: string) => {
    setLocalTempHp(valStr);
  };

  const handleTempHpCommit = () => {
    if (localTempHp === "") {
      setLocalTempHp(0);
      handleActiveUpdate({ tempHp: 0 });
      return;
    }
    const val = Math.max(0, parseInt(localTempHp.toString()) || 0);
    handleActiveUpdate({ 
      tempHp: val,
      isDead: (activeNpc.hpCurrent || 0) <= 0 && val <= 0
    });
  };

  const toggleCondition = (e: React.MouseEvent, cond: string) => {
    e.stopPropagation();
    const tempCond = activeNpc.tempCond || [];
    const newCond = tempCond.includes(cond) ? tempCond.filter((c: string) => c !== cond) : [...tempCond, cond];
    handleActiveUpdate({ tempCond: newCond });
  };

  const toggleRes = (e: React.MouseEvent, res: string) => {
    e.stopPropagation();
    const tempRes = activeNpc.tempRes || [];
    const newRes = tempRes.includes(res) ? tempRes.filter((r: string) => r !== res) : [...tempRes, res];
    handleActiveUpdate({ tempRes: newRes });
  };

  const handleSpellSlotClick = (e: React.MouseEvent, level: number, idx: number) => {
    e.stopPropagation();
    const used = activeNpc.spellSlotsUsed || {};
    const currentUsed = used[level] || 0;
    
    const newUsed = idx >= currentUsed ? idx + 1 : idx;
    handleActiveUpdate({ spellSlotsUsed: { ...used, [level]: newUsed } });
  };

  const currentHp = activeNpc.hpCurrent !== undefined ? activeNpc.hpCurrent : (activeNpc.hpMax || 0);
  const hpPct = activeNpc.hpMax > 0 ? Math.max(0, Math.min(100, (currentHp / activeNpc.hpMax) * 100)) : 0;
  let hpColorClass = "";
  if (hpPct <= 25) hpColorClass = "danger";
  else if (hpPct <= 50) hpColorClass = "warning";

  const tempHpPct = activeNpc.tempHp && activeNpc.hpMax > 0 ? Math.min(100, (activeNpc.tempHp / activeNpc.hpMax) * 100) : 0;

  const factionBorder = activeNpc.faction === 'enemy' ? 'border-danger' : activeNpc.faction === 'ally' ? 'border-success' : 'border-neutral';

  const CONDITIONS = ["Cego", "Enfeitiçado", "Surdo", "Amedrontado", "Agarrado", "Incapacitado", "Invisível", "Paralisado", "Petrificado", "Envenenado", "Caído", "Restringido", "Atordoado", "Inconsciente"];
  const RESISTANCES = ["Ácido", "Frio", "Fogo", "Força", "Elétrico", "Necrótico", "Veneno", "Psíquico", "Radiante", "Trovão"];

  return (
    <div className={`npc-card glass-panel ${combatMode ? "combat-expanded" : ""} ${activeNpc.isDead ? "is-dead" : ""} ${factionBorder}`} style={npc.isHidden ? { opacity: 0.5 } : {}}>
      {activeNpc.isDead && <div className="status-dead-overlay">💀</div>}
      
      <button className="btn-quick-hide" title={npc.isHidden ? 'Mostrar NPC' : 'Ocultar NPC'} onClick={toggleHide}>
        {npc.isHidden ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7-10.5-7-10.5-7z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>



      <div className="npc-card-header" onClick={openDetail}>
        {activeNpc.image ? (
          <img src={activeNpc.image} className="npc-card-avatar" alt={activeNpc.name} style={{ border: npc.isTransformed ? "2px solid var(--accent-primary)" : "none" }} />
        ) : (
          <div className="npc-card-placeholder" style={{ border: npc.isTransformed ? "2px solid var(--accent-primary)" : "none" }}>{(activeNpc.name || "?").charAt(0).toUpperCase()}</div>
        )}
        <div className="npc-card-title-area">
          <div className="npc-card-name" style={{ color: npc.isTransformed ? "var(--accent-primary)" : "inherit", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <span>{activeNpc.name}</span>
            {npc.isTransformed && <span style={{fontSize: "0.65rem", backgroundColor: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", color: "#fff", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase"}}>Transformado</span>}
            {npc.transformation && combatMode && isGM && (
              <button 
                title={npc.isTransformed ? 'Reverter Forma' : 'Transformar'} 
                onClick={(e) => { e.stopPropagation(); toggleTransform(e); }}
                style={{
                  background: npc.isTransformed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: npc.isTransformed ? '#fff' : 'var(--text-muted)',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
              >
                ⚡
              </button>
            )}
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

      {!combatMode && (
        <div className="npc-card-narrative-details">
          <div className="narrative-block">
            <span className="narrative-label">Motivações</span>
            <p className="narrative-text">{activeNpc.mot || 'Não definidas'}</p>
          </div>
          <div className="narrative-block">
            <span className="narrative-label">Segredos / Fraquezas</span>
            <p className="narrative-text">{activeNpc.sec || 'Não definidos'}</p>
          </div>
          <div className="narrative-block">
            <span className="narrative-label">Traços</span>
            <p className="narrative-text">{activeNpc.traits || 'Não definidos'}</p>
          </div>
        </div>
      )}

      {combatMode && (
        <div className="npc-card-combat-details">
          <div className="npc-card-attrs">
            <div className="attr-m"><span className="attr-lbl">FOR</span><span className="attr-mod">{getMod(activeNpc.str)}</span><span className="attr-val">{activeNpc.str || 10}</span></div>
            <div className="attr-m"><span className="attr-lbl">DES</span><span className="attr-mod">{getMod(activeNpc.dex)}</span><span className="attr-val">{activeNpc.dex || 10}</span></div>
            <div className="attr-m"><span className="attr-lbl">CON</span><span className="attr-mod">{getMod(activeNpc.con)}</span><span className="attr-val">{activeNpc.con || 10}</span></div>
            <div className="attr-m"><span className="attr-lbl">INT</span><span className="attr-mod">{getMod(activeNpc.int)}</span><span className="attr-val">{activeNpc.int || 10}</span></div>
            <div className="attr-m"><span className="attr-lbl">SAB</span><span className="attr-mod">{getMod(activeNpc.wis)}</span><span className="attr-val">{activeNpc.wis || 10}</span></div>
            <div className="attr-m"><span className="attr-lbl">CAR</span><span className="attr-mod">{getMod(activeNpc.cha)}</span><span className="attr-val">{activeNpc.cha || 10}</span></div>
          </div>

          <div className="npc-card-stats" onClick={openDetail}>
            <div className="stat-mini" title="Classe de Armadura (Esquerdo: +1 | Direito: -1)" onClick={(e) => handleAcMod(e, 1)} onContextMenu={(e) => handleAcMod(e, -1)} style={{ cursor: "pointer", userSelect: "none" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span className="base-val">{activeNpc.ac || '--'}</span>
              {activeNpc.tempAc ? <span className="temp-bonus">{activeNpc.tempAc > 0 ? '+' : ''}{activeNpc.tempAc}</span> : null}
            </div>
            <div className="stat-mini" title="Iniciativa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>
              {activeNpc.init || '--'}
            </div>
            <div className="stat-mini" title="Deslocamento">💨 {activeNpc.speed || '--'}</div>
            <div className="stat-mini" title="Percepção Passiva">👁️ {activeNpc.perc || '--'}</div>
          </div>

          {(activeNpc.res || activeNpc.imm) && (
            <div className="npc-card-res-area" onClick={openDetail}>
              {activeNpc.res && <div className="npc-card-res"><strong>RES:</strong> {activeNpc.res}</div>}
              {activeNpc.imm && <div className="npc-card-res"><strong>IMU:</strong> {activeNpc.imm}</div>}
            </div>
          )}

          {!hideEffects && (
            <div className="npc-card-combat-console">
              <div className="console-section">
                <div className="mod-section-label">CONDIÇÕES</div>
                <div className="conditions-grid">
                  {CONDITIONS.map(c => (
                    <div 
                      key={c} 
                      className={`condition-tag ${(activeNpc.tempCond || []).includes(c) ? 'active' : ''}`}
                      onClick={(e) => toggleCondition(e, c)}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div className="console-section">
                <div className="mod-section-label">RESISTÊNCIAS TEMP.</div>
                <div className="conditions-grid">
                  {RESISTANCES.map(r => (
                    <div 
                      key={r} 
                      className={`condition-tag ${(activeNpc.tempRes || []).includes(r) ? 'res-active' : ''}`}
                      onClick={(e) => toggleRes(e, r)}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNpc.hasSpells && activeNpc.spellSlots && (
            <div className="npc-card-spells">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                const total = activeNpc.spellSlots[level] || 0;
                if (total <= 0) return null;
                const usedCount = (activeNpc.spellSlotsUsed && activeNpc.spellSlotsUsed[level]) || 0;
                
                return (
                  <div key={level} className="spell-slot-group">
                    <span className="slot-label">{level}º</span>
                    <div className="slot-dots">
                      {Array.from({ length: total }).map((_, d) => (
                        <div 
                          key={d} 
                          className={`slot-dot ${d >= usedCount ? 'available' : ''}`}
                          onClick={(e) => handleSpellSlotClick(e, level, d)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="npc-card-hp-area">
            <div className="hp-header">
              <span>PONTOS DE VIDA</span>
              <div className="hp-inputs">
                <div className="hp-adjuster-group">
                  <button className="hp-mod-btn" onClick={(e) => handleHpMod(e, -1)} title="Subtrair HP (Dano)">-</button>
                  <input 
                    type="number" 
                    className="hp-mod-amount-input" 
                    placeholder="Qtd" 
                    value={hpModInput} 
                    onChange={e => setHpModInput(e.target.value)} 
                    onClick={e => e.stopPropagation()}
                    title="Quantidade para alterar"
                  />
                  <button className="hp-mod-btn" onClick={(e) => handleHpMod(e, 1)} title="Adicionar HP (Cura)">+</button>
                </div>
                
                <div className="hp-values-group">
                  <input 
                    type="number" 
                    className="hp-current-input" 
                    value={localHp} 
                    onChange={e => handleHpChange(e.target.value)}
                    onBlur={handleHpCommit}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handleHpCommit();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    title="HP Atual"
                  />
                  <span className="hp-max-val">/ {activeNpc.hpMax}</span>
                  
                  <div className="temp-hp-typing">
                    <span className="temp-label">TEMP:</span>
                    <input 
                      type="number" 
                      className="hp-input temp-hp-input" 
                      value={localTempHp} 
                      onChange={e => handleTempHpChange(e.target.value)}
                      onBlur={handleTempHpCommit}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          handleTempHpCommit();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      title="HP Temporário"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="hp-bar-bg">
              <div className={`hp-bar-fill ${hpColorClass}`} style={{ width: `${hpPct}%` }}></div>
              {activeNpc.tempHp > 0 && <div className="hp-bar-temp" style={{ width: `${tempHpPct}%` }}></div>}
            </div>
          </div>
          
          <div className="npc-card-atk-container" onClick={openDetail}>
            <div className="atk-header">⚔️ ATAQUE PRINCIPAL</div>
            <div className="npc-card-atk-item highlight-atk">{activeNpc.mainAttack || 'Nenhum ataque cadastrado.'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
