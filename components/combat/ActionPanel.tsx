import React, { useState } from 'react';
import { useCombat, CombatParticipant, CombatClassResource, PendingAttack } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import CombatDicePanel, { RollEntry } from './CombatDicePanel';
import { getMaxAttacks } from '@/lib/dice/multiattack';

interface Props {
  participantId: string | null;
  onClose: () => void;
  pendingAttack: PendingAttack | null;
  setPendingAttack: (atk: PendingAttack | null) => void;
}

function LogTypeIcon(type?: string) {
  switch (type) {
    case 'critical': return '💥';
    case 'crit_fail': return '💀';
    case 'attack':   return '⚔️';
    case 'damage':   return '🩸';
    case 'heal':     return '💚';
    default:         return '🎲';
  }
}

function renderLogMarkdown(text: string) {
  const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ActionPanel({ participantId, onClose, pendingAttack, setPendingAttack }: Props) {
  const {
    combat, updateParticipant, addToLog, triggerRollEvent, clearLog, removeParticipant, applyDamage, removeCondition
  } = useCombat();
  const { isGM, profile } = useUserSession();

  const [concSpell, setConcSpell] = useState('');

  if (!combat) return null;

  const participant = participantId
    ? combat.participants.find(p => p.refId === participantId) ?? null
    : null;
  const activeParticipant = combat.participants[combat.currentTurnIndex] ?? null;
  const isMyCharacter = participant?.type === 'player' && participant?.refId === profile?.player_id;
  const canEdit = isGM || isMyCharacter;

  // ──── Handlers de Recursos ────────────────────────────────────────────────

  const updateResource = (participant: CombatParticipant, resId: string, delta: number) => {
    const updated = (participant.classResources || []).map(r =>
      r.id === resId
        ? { ...r, current: Math.max(0, Math.min(r.max, r.current + delta)) }
        : r
    );
    updateParticipant(participant.refId, { classResources: updated });
  };

  const consumeSpellSlot = (participant: CombatParticipant, level: number) => {
    const slots = { ...(participant.spellSlots || {}) };
    const used = { ...(participant.spellSlotsUsed || {}) };
    const max = slots[level] || 0;
    const usedCount = used[level] || 0;
    if (usedCount >= max) return;
    used[level] = usedCount + 1;
    updateParticipant(participant.refId, { spellSlotsUsed: used });
    addToLog(`gastou um slot de magia nível ${level}.`, participant.name, 'system');
  };

  const restoreSpellSlot = (participant: CombatParticipant, level: number) => {
    const used = { ...(participant.spellSlotsUsed || {}) };
    if (!used[level] || used[level] <= 0) return;
    used[level] = used[level] - 1;
    updateParticipant(participant.refId, { spellSlotsUsed: used });
    addToLog(`recuperou um slot de magia nível ${level}.`, participant.name, 'system');
  };

  const toggleRage = (participant: CombatParticipant) => {
    if (participant.isRaging) {
      updateParticipant(participant.refId, { isRaging: false });
      addToLog('saiu da Fúria.', participant.name, 'system');
    } else {
      const fury = (participant.classResources || []).find(r =>
        r.name.toLowerCase().includes('fúria') || r.name.toLowerCase().includes('furia')
      );
      if (fury && fury.current <= 0) {
        addToLog('tentou entrar em Fúria, mas não tem mais cargas!', participant.name, 'system');
        return;
      }
      if (fury) updateResource(participant, fury.id, -1);
      updateParticipant(participant.refId, { isRaging: true });
      addToLog('🔥 entrou em Fúria!', participant.name, 'system');
    }
  };

  const toggleConcentration = (participant: CombatParticipant) => {
    if (participant.isConcentrating) {
      updateParticipant(participant.refId, { isConcentrating: false, concentrationSpell: undefined });
      addToLog('quebrou Concentração.', participant.name, 'system');
    } else if (concSpell.trim()) {
      updateParticipant(participant.refId, { isConcentrating: true, concentrationSpell: concSpell.trim() });
      addToLog(`começou a se concentrar em ${concSpell.trim()}.`, participant.name, 'system');
      setConcSpell('');
    }
  };

  // ──── Callback do dado ────────────────────────────────────────────────────

  const handleActionPanelAttack = (atk: { name: string; bonus: string; dmg: string }) => {
    if (combat.selectedTargetIds.length === 0) {
      alert("Selecione pelo menos um alvo no tabuleiro primeiro!");
      return;
    }
    setPendingAttack(atk);
  };

  const handleDiceRoll = (entry: RollEntry) => {
    const { rollMode, saveAttr, saveDC } = entry;
    
    if (rollMode === "save") {
      if (combat.selectedTargetIds.length === 0) {
        alert("Selecione pelo menos um alvo no tabuleiro primeiro!");
        return;
      }
      addToLog(`✨ Exigiu Teste de Resistência de **${saveAttr} (CD ${saveDC})**!`, entry.actorName, 'system');
      
      combat.selectedTargetIds.forEach(targetId => {
        const target = combat.participants.find(p => p.refId === targetId);
        if (target) {
          let statVal = 10;
          if (saveAttr === "Força") statVal = target.str;
          if (saveAttr === "Destreza") statVal = target.dex;
          if (saveAttr === "Constituição") statVal = target.con;
          if (saveAttr === "Inteligência") statVal = target.int;
          if (saveAttr === "Sabedoria") statVal = target.wis;
          if (saveAttr === "Carisma") statVal = target.cha;
          
          let mod = Math.floor((statVal - 10) / 2);
          if (target.saves?.some(s => s.toLowerCase() === saveAttr!.toLowerCase())) {
            mod += target.profBonus;
          }
          
          const rollResult = Math.floor(Math.random() * 20) + 1;
          const total = rollResult + mod;
          const passed = total >= saveDC!;
          
          let resMsg = `Rolou **${total}** (d20: ${rollResult} | Mod: ${mod >= 0 ? '+' : ''}${mod}). `;
          if (passed) {
            addToLog(`🛡️ ${target.name}: ${resMsg} **PASSOU** no teste.`, entry.actorName, 'system');
          } else {
            addToLog(`💥 ${target.name}: ${resMsg} **FALHOU** no teste!`, entry.actorName, 'crit_fail');
          }
        }
      });
      return;
    }

    const type = entry.isCritical ? 'critical' : entry.isCritFail ? 'crit_fail' : 'attack';
    let msg = `rolou d${entry.dieFaces}${entry.modifier !== 0 ? (entry.modifier > 0 ? '+' : '') + entry.modifier : ''} → **${entry.total}**`;
    
    if (entry.isCritical) msg += ' 💥 CRÍTICO!';
    if (entry.isCritFail) msg += ' 💀 Falha Crítica!';

    if (rollMode === "free") {
      addToLog(msg, entry.actorName, 'system');
      return;
    }

    if (rollMode === "damage") {
      if (combat.selectedTargetIds.length === 0) {
        addToLog(`⚠️ ${msg} (nenhum alvo selecionado)`, entry.actorName, 'system');
        return;
      }
      
      const damagedNames: string[] = [];
      combat.selectedTargetIds.forEach(targetId => {
        const target = combat.participants.find(p => p.refId === targetId);
        if (target) {
          applyDamage(targetId, entry.total);
          damagedNames.push(target.name);
        }
      });
      addToLog(`🩸 causou **${entry.total}** de dano em ${damagedNames.join(', ')}!`, entry.actorName, 'damage');
      return;
    }

    if (rollMode === "attack") {
      const atkName = pendingAttack ? pendingAttack.name : 'Arma Indefinida';
      const atkBonus = pendingAttack ? pendingAttack.bonus : `+${entry.modifier}`;
      const atkDmg = pendingAttack ? pendingAttack.dmg : '';

      let baseMsg = `atacou com **${atkName}**: total **${entry.total}** (d20: ${entry.dieResult}${entry.modifier !== 0 ? (entry.modifier > 0 ? '+' : '') + entry.modifier : ''})`;
      if (entry.isCritical) baseMsg += ' 💥 CRÍTICO!';
      if (entry.isCritFail) baseMsg += ' 💀 Falha Crítica!';

      if (combat.selectedTargetIds.length === 0) {
        addToLog(`⚔️ ${baseMsg}`, entry.actorName, type);
      } else {
        const hitLogs: string[] = [];
        const hitsToDispatch: any[] = [];
        
        combat.selectedTargetIds.forEach(targetId => {
          const target = combat.participants.find(p => p.refId === targetId);
          if (target) {
            if (entry.isCritical || (!entry.isCritFail && entry.total >= target.ac)) {
              hitLogs.push(`🎯 Acertou ${target.name} (CA ${target.ac})`);
              hitsToDispatch.push({
                target,
                res: { rollResult: entry.dieResult, total: entry.total, isCritical: entry.isCritical, isCritFail: entry.isCritFail },
                atk: { name: atkName, bonus: atkBonus, dmg: atkDmg },
                advantageType: entry.advantage
              });
            } else {
              hitLogs.push(`❌ Errou ${target.name} (CA ${target.ac})`);
            }
          }
        });
        addToLog(`⚔️ ${baseMsg} — ${hitLogs.join(', ')}`, entry.actorName, type);
        
        if (hitsToDispatch.length > 0) {
          window.dispatchEvent(new CustomEvent('action_panel_attack_hit', { detail: hitsToDispatch }));
        }
      }

      // Se quem rolou foi o participante ativo, consome ação e tira stealth
      if (pendingAttack && activeParticipant && entry.actorName === activeParticipant.name) {
        updateParticipant(activeParticipant.refId, {
          actionSpent: true,
          attacksMade: (activeParticipant.attacksMade || 0) + 1
        });
        const isFurtivo = activeParticipant.conditions?.some(c => ['furtivo', 'escondido', 'invisível'].includes(c.toLowerCase()));
        if (isFurtivo) {
          ['Furtivo', 'Escondido', 'Invisível', 'furtivo', 'escondido', 'invisível'].forEach(sc => {
            if (activeParticipant.conditions?.includes(sc)) removeCondition(activeParticipant.refId, sc);
          });
          addToLog(`revelou sua posição ao atacar.`, activeParticipant.name, 'system');
        }
      }

      setPendingAttack(null);
    }

    triggerRollEvent({
      type: rollMode === "damage" ? 'damage' : 'attack',
      result: entry.dieResult,
      total: entry.total,
      isCritical: entry.isCritical,
      isCritFail: entry.isCritFail,
      actorName: entry.actorName,
      formula: `d${entry.dieFaces}${entry.modifier >= 0 ? '+' : ''}${entry.modifier}`
    });
  };

  // ──── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="action-panel" style={{ display: 'flex', flexDirection: 'column', width: '420px', minWidth: '380px', overflowY: 'hidden' }}>

      {/* ZONA 1 — LOG DE COMBATE (Agora no Topo) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: 'linear-gradient(to bottom, rgba(15,15,20,0.8), rgba(0,0,0,0.9))' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
            📋 Registro de Combate
          </span>
          {isGM && (
            <button
              className="btn secondary-btn"
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--text-muted)' }}
              onClick={clearLog}
              title="Limpar log"
            >
              🧹 Limpar
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(combat.log || []).map(entry => (
            <div key={entry.id} className={`combat-log-entry type-${entry.type || 'system'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{entry.actorName}</span>
                <span>Rodada {entry.round}</span>
              </div>
              <div className="log-action" style={{ fontSize: '1.05rem', lineHeight: '1.5' }}>
                {LogTypeIcon(entry.type)} {renderLogMarkdown(entry.action)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ZONA 2 — RECURSOS DO PARTICIPANTE SELECIONADO */}
      {participant && canEdit && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '1rem', flexShrink: 0, overflowY: 'auto', maxHeight: '350px' }}>
          {/* Header do participante */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{participant.name}</span>
              {participant.isTransformed && participant.originalName && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '6px' }}>(Forma de {participant.originalName})</span>
              )}
            </div>
            <button className="btn-close" onClick={onClose} style={{ flexShrink: 0, transform: 'scale(1.2)' }}>×</button>
          </div>

          {/* Ataques (Para NPCs e Monstros facilitar pro mestre) */}
          {participant.attacks && participant.attacks.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: '6px' }}>
                ⚔️ Ataques
              </div>
              
              {pendingAttack ? (
                <div style={{ padding: '12px', background: 'rgba(255,165,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'orange', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    ⚔️ Ataque Pendente: {pendingAttack.name}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    O modificador <strong>{pendingAttack.bonus}</strong> foi preenchido. Clique no dado d20 abaixo para rolar!
                  </span>
                  <button className="btn secondary-btn small-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setPendingAttack(null)}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {participant.attacks.map((atk, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleActionPanelAttack(atk)}
                      className="action-panel-attack-btn"
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '0.85rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      <span style={{ fontWeight: 'bold' }}>{atk.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Atk: {atk.bonus} | Dmg: {atk.dmg}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spell Slots */}
          {participant.spellSlots && Object.keys(participant.spellSlots).length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                ✨ Espaços de Magia
              </div>
              {Object.entries(participant.spellSlots)
                .filter(([, max]) => Number(max) > 0)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([lvlStr, max]) => {
                  const lvl = Number(lvlStr);
                  const used = participant.spellSlotsUsed?.[lvl] || 0;
                  const available = Number(max) - used;
                  return (
                    <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '22px' }}>{lvl}°</span>
                      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                        {Array.from({ length: Number(max) }).map((_, i) => (
                          <button
                            key={i}
                            title={i < available ? `Gastar slot nível ${lvl}` : `Recuperar slot nível ${lvl}`}
                            onClick={() => i < available ? consumeSpellSlot(participant, lvl) : restoreSpellSlot(participant, lvl)}
                            style={{
                              width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                              background: i < available ? '#a78bfa' : 'rgba(167,139,250,0.15)',
                              outline: '1px solid rgba(167,139,250,0.4)',
                              transition: 'all 0.15s'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{available}/{max}</span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Class Resources */}
          {(participant.classResources || []).length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                🎒 Recursos Especiais
              </div>
              {(participant.classResources || []).map(res => {
                const isFury = res.name.toLowerCase().includes('fúria') || res.name.toLowerCase().includes('furia');
                return (
                  <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', flex: 1, color: isFury && participant.isRaging ? '#f97316' : 'var(--text-secondary)' }}>
                      {res.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => updateResource(participant, res.id, -1)}
                        disabled={res.current <= 0}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.3)', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: res.current <= 0 ? 0.3 : 1 }}
                      >−</button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', minWidth: '32px', textAlign: 'center' }}>
                        {res.current}<span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.75rem' }}>/{res.max}</span>
                      </span>
                      <button
                        onClick={() => updateResource(participant, res.id, 1)}
                        disabled={res.current >= res.max}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.3)', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: res.current >= res.max ? 0.3 : 1 }}
                      >+</button>
                    </div>
                    {isFury && (
                      <button
                        className={`btn ${participant.isRaging ? 'secondary-btn' : 'primary-btn'}`}
                        style={{
                          fontSize: '0.8rem', padding: '4px 8px', marginLeft: '4px',
                          background: participant.isRaging ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.8)',
                          borderColor: '#f97316', color: participant.isRaging ? '#f97316' : 'white'
                        }}
                        onClick={() => toggleRage(participant)}
                        title={participant.isRaging ? 'Sair da Fúria' : 'Entrar em Fúria (gasta 1 carga)'}
                      >
                        {participant.isRaging ? '🔥 Sair' : '🔥 Fúria'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                🌀 Concentração
              </div>
              {participant.isConcentrating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#a855f7', flex: 1, fontWeight: 'bold' }}>
                    {participant.concentrationSpell}
                  </span>
                  <button
                    className="btn secondary-btn"
                    style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: '#a855f7', color: '#a855f7' }}
                    onClick={() => toggleConcentration(participant)}
                  >
                    Quebrar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    className="journey-input"
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.85rem' }}
                    placeholder="Magia..."
                    value={concSpell}
                    onChange={e => setConcSpell(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && toggleConcentration(participant)}
                  />
                  <button
                    className="btn secondary-btn"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => toggleConcentration(participant)}
                    disabled={!concSpell.trim()}
                  >
                    Concentrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ZONA 3 — DADO DE COMBATE (Agora na base) */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0, paddingBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '0.75rem 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary-color)' }}>
            🎲 Rolagem Livre
          </span>
        </div>
        <CombatDicePanel
          activeParticipant={activeParticipant}
          participants={combat.participants.filter(p => !p.isDead)}
          onRoll={handleDiceRoll}
          pendingAttack={pendingAttack}
        />
      </div>
    </div>
  );
}
