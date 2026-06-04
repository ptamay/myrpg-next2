import React, { useState } from 'react';
import { useCombat, CombatParticipant } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import HpInlineEditor from '@/components/ui/HpInlineEditor';
import { rollAttack, rollDamage } from '@/lib/dice/rollParser';
import { computeExtraDamages, buildDamageLog, isPaladin, rollDivineSmite } from '@/lib/dice/specialDamage';
import { getMaxAttacks, isMonk } from '@/lib/dice/multiattack';

interface Props {
  participantId: string | null;
  onClose: () => void;
}

export default function ActionPanel({ participantId, onClose }: Props) {
  const { combat, applyDamage, applyHeal, updateParticipant, addCondition, removeCondition, nextTurn, endCombat, addToLog, triggerRollEvent } = useCombat();
  const { isGM, profile } = useUserSession();
  
  const [condInput, setCondInput] = useState('');
  const [advantage, setAdvantage] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  // smiteSlot: undefined = Paladino ainda não decidiu | null = não usa smite | 1-5 = nível do slot
  const [pendingDamage, setPendingDamage] = useState<{ atk: any, target: any, res: any, advantageType: string, smiteSlot?: number | null } | null>(null);

  const handleRollDamage = () => {
    if (!pendingDamage || !participant) return;
    // Se for Paladino e a decisão de smite ainda não foi tomada, aguarda
    if (isPaladin(participant) && pendingDamage.smiteSlot === undefined) return;

    const { atk, target, res, advantageType, smiteSlot } = pendingDamage;

    // 1. Rola o dano da arma
    const dmgRes = rollDamage(atk.dmg, res.isCritical);

    // 2. Calcula danos extras automáticos (Furtivo, Fúria, Marca, Hex)
    const extras = computeExtraDamages(participant, res.isCritical, advantageType);

    // 3. Adiciona Smite Divino se o Paladino escolheu usar
    if (smiteSlot) {
      extras.push(rollDivineSmite(smiteSlot, res.isCritical));
    }

    // 4. Monta log com breakdown completo
    const { total: totalDmg, message: logMsg } = buildDamageLog(
      participant.name,
      target.name,
      dmgRes.total,
      dmgRes.rolls,
      dmgRes.modifier,
      atk.dmg,
      extras,
      res.isCritical
    );

    applyDamage(target.refId, totalDmg);
    addToLog(logMsg, participant.name, res.isCritical ? 'critical' : 'damage');
    setPendingDamage(null);
  };

  if (!combat) return null;

  const participant = combat.participants.find(p => p.refId === participantId);
  const canEdit = isGM || profile?.player_id === participant?.refId;

  return (
    <div className="action-panel">
      {/* HEADER LOGIC: NEXT TURN & END COMBAT */}
      {isGM && (
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn primary-btn" style={{ flex: 1 }} onClick={() => {
            addToLog('O turno foi passado.', 'Mestre');
            nextTurn();
          }}>
            Avançar Turno ⏭️
          </button>
          <button className="btn secondary-btn" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={endCombat} title="Encerrar Combate">
            ✖
          </button>
        </div>
      )}

      {participant ? (
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{participant.name}</h3>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{participant.hpCurrent}</span>
              <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ {participant.hpMax}</span>
              {participant.tempHp > 0 && <span style={{ fontSize: "0.85rem", color: "#eab308", marginLeft: '8px' }}>+{participant.tempHp} Temp</span>}
            </div>
          </div>

          {/* ECONOMY TRACKER */}
          {canEdit && (
            <div className="economy-tracker" style={{ margin: '1rem 0', justifyContent: 'flex-start' }}>
              <div 
                className={`bubble ${!participant.actionSpent ? 'active-action' : 'spent'}`} 
                title="Ação Principal (Clique para alternar)"
                style={{ cursor: 'pointer' }}
                onClick={() => updateParticipant(participant.refId, { actionSpent: !participant.actionSpent, attacksMade: 0 })}
              >
                🟢 Ação
              </div>
              <div 
                className={`bubble ${!participant.bonusActionSpent ? 'active-bonus' : 'spent'}`} 
                title="Ação Bônus (Clique para alternar)"
                style={{ cursor: 'pointer' }}
                onClick={() => updateParticipant(participant.refId, { bonusActionSpent: !participant.bonusActionSpent })}
              >
                🟡 Bônus
              </div>
              <div 
                className={`bubble ${!participant.movementSpent ? 'active-move' : 'spent'}`} 
                title="Movimento (Clique para alternar)"
                style={{ cursor: 'pointer' }}
                onClick={() => updateParticipant(participant.refId, { movementSpent: !participant.movementSpent })}
              >
                🏃 Movimento
              </div>
              <div 
                className={`bubble ${!participant.reactionSpent ? 'active-reaction' : 'spent'}`} 
                title="Reação (Clique para alternar)"
                style={{ cursor: 'pointer' }}
                onClick={() => updateParticipant(participant.refId, { reactionSpent: !participant.reactionSpent })}
              >
                🔵 Reação
              </div>
            </div>
          )}

          {isGM && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Condições</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                {(participant.conditions || []).map(c => (
                  <div key={c} style={{ background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ textTransform: 'uppercase' }}>{c}</span>
                    <button onClick={() => removeCondition(participant.refId, c)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  className="journey-input" 
                  style={{ flex: 1 }}
                  value={condInput}
                  onChange={e => {
                    if (e.target.value) {
                      addCondition(participant.refId, e.target.value);
                      setCondInput('');
                    }
                  }}
                >
                  <option value="">+ Adicionar Condição...</option>
                  {/* Condições padrão D&D 5e */}
                  <option value="Agarrado">Agarrado</option>
                  <option value="Amedrontado">Amedrontado</option>
                  <option value="Atordoado">Atordoado</option>
                  <option value="Caído">Caído</option>
                  <option value="Cego">Cego</option>
                  <option value="Enfeitiçado">Enfeitiçado</option>
                  <option value="Envenenado">Envenenado</option>
                  <option value="Escondido">Escondido</option>
                  <option value="Exausto">Exausto</option>
                  <option value="Furtivo">Furtivo</option>
                  <option value="Impedido">Impedido</option>
                  <option value="Incapacitado">Incapacitado</option>
                  <option value="Invisível">Invisível</option>
                  <option value="Paralisado">Paralisado</option>
                  <option value="Petrificado">Petrificado</option>
                  <option value="Surdo">Surdo</option>
                  {/* Efeitos de combate (adicionados ao ATACANTE) */}
                  <optgroup label="── Efeitos de Combate ──">
                    <option value="Fúria">🔥 Fúria (Bárbaro)</option>
                    <option value="Marcado">🏹 Marcado — Marca do Caçador</option>
                    <option value="Hex">💜 Hex (Bruxo)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ataques</h4>
            
            {isGM && participant.attacks && participant.attacks.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button 
                  className={`btn ${advantage === 'disadvantage' ? 'primary-btn' : 'secondary-btn'}`} 
                  style={{ flex: 1, padding: '0.2rem', fontSize: '0.8rem', background: advantage === 'disadvantage' ? 'var(--danger)' : '' }}
                  onClick={() => setAdvantage('disadvantage')}
                >
                  DESV
                </button>
                <button 
                  className={`btn ${advantage === 'normal' ? 'primary-btn' : 'secondary-btn'}`} 
                  style={{ flex: 1, padding: '0.2rem', fontSize: '0.8rem' }}
                  onClick={() => setAdvantage('normal')}
                >
                  NORM
                </button>
                <button 
                  className={`btn ${advantage === 'advantage' ? 'primary-btn' : 'secondary-btn'}`} 
                  style={{ flex: 1, padding: '0.2rem', fontSize: '0.8rem', background: advantage === 'advantage' ? '#22c55e' : '' }}
                  onClick={() => setAdvantage('advantage')}
                >
                  VANT
                </button>
              </div>
            )}

            {pendingDamage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  🎯 {pendingDamage.res.isCritical ? '💥 CRÍTICO! ' : ''}Acerto em {pendingDamage.target.name}!
                </span>

                {/* Preview de bônus automáticos */}
                {(() => {
                  const extras = computeExtraDamages(participant, pendingDamage.res.isCritical, pendingDamage.advantageType);
                  return extras.length > 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#a3e635', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                      ✨ Bônus automáticos: {extras.map(e => e.label).join(' + ')}
                    </div>
                  ) : null;
                })()}

                {/* Smite Divino — Paladino decide antes de rolar o dano */}
                {isPaladin(participant) && pendingDamage.smiteSlot === undefined && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginBottom: '4px', fontWeight: 'bold' }}>⚡ Usar Smite Divino?</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map(slot => (
                        <button key={slot}
                          className="btn secondary-btn"
                          style={{ flex: 1, padding: '4px 2px', fontSize: '0.72rem' }}
                          onClick={() => setPendingDamage({ ...pendingDamage, smiteSlot: slot })}
                        >
                          Slot {slot}<br/><span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>({slot + 1}d8)</span>
                        </button>
                      ))}
                      <button className="btn secondary-btn"
                        style={{ flex: 1, padding: '4px 2px', fontSize: '0.72rem', color: 'var(--text-muted)' }}
                        onClick={() => setPendingDamage({ ...pendingDamage, smiteSlot: null })}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                )}

                {/* Botão de rolar dano (espera decisão do Smite se for Paladino) */}
                {(!isPaladin(participant) || pendingDamage.smiteSlot !== undefined) && (
                  <button
                    className="btn primary-btn"
                    style={{ background: 'var(--danger)', color: 'white', marginTop: '4px' }}
                    onClick={handleRollDamage}
                  >
                    🩸 Rolar Dano ({pendingDamage.atk.dmg}{pendingDamage.smiteSlot ? ` + ${pendingDamage.smiteSlot + 1}d8 Smite` : ''})
                  </button>
                )}

                <button className="btn secondary-btn" style={{ fontSize: '0.8rem' }} onClick={() => setPendingDamage(null)}>Cancelar</button>
              </div>
            ) : participant.attacks && participant.attacks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {participant.attacks.map((atk, i) => {
                  const maxAttacks = getMaxAttacks(participant);
                  const currentAttacks = participant.attacksMade || 0;
                  const isOutOfAttacks = currentAttacks >= maxAttacks;
                  
                  return (
                    <button 
                      key={i} 
                      className="btn secondary-btn" 
                      style={{ justifyContent: 'space-between', padding: '0.5rem', opacity: isOutOfAttacks ? 0.5 : 1 }}
                      disabled={isOutOfAttacks}
                      onClick={() => {
                        if (!isGM) return;
                        
                        const targetId = combat.selectedTargetId;
                        const target = targetId ? combat.participants.find(p => p.refId === targetId) : null;
                        
                        // Consume action and increment attacks
                        const newAttacksMade = (participant.attacksMade || 0) + 1;
                        updateParticipant(participant.refId, { 
                          actionSpent: true, 
                          attacksMade: newAttacksMade 
                        });

                        const isFurtivo = participant.conditions?.some(c => ['furtivo', 'escondido', 'invisível'].includes(c.toLowerCase()));
                        const finalAdvantage = isFurtivo ? 'advantage' : advantage;

                        if (isFurtivo) {
                          ['Furtivo', 'Escondido', 'Invisível', 'furtivo', 'escondido', 'invisível'].forEach(sc => {
                            if (participant.conditions?.includes(sc)) removeCondition(participant.refId, sc);
                          });
                          addToLog(`revelou sua posição ao atacar.`, participant.name, 'system');
                        }

                        const res = rollAttack(atk.bonus, finalAdvantage);
                        triggerRollEvent({
                          type: 'attack',
                          result: res.rollResult,
                          total: res.total,
                          isCritical: res.isCritical,
                          isCritFail: res.isCritFail,
                          actorName: participant.name,
                          formula: `d20${atk.bonus}`
                        });
                        
                        const type = res.isCritical ? 'critical' : res.isCritFail ? 'crit_fail' : 'attack';
                        
                        if (target) {
                          const targetAc = Number(target.ac) || 10;
                          const isHit = res.isCritical || (!res.isCritFail && res.total >= targetAc);
                          
                          if (isHit) {
                            addToLog(`atacou ${target.name} com ${atk.name} e ACERTOU! (Aguardando dano)`, participant.name, res.isCritical ? 'critical' : 'attack');
                            setPendingDamage({ atk, target, res, advantageType: finalAdvantage });
                          } else {
                            addToLog(`atacou ${target.name} com ${atk.name} mas ERROU.`, participant.name, res.isCritFail ? 'crit_fail' : 'attack');
                          }
                        } else {
                          // Fallback: No target selected, just roll and log
                          addToLog(`atacou com ${atk.name}: Total ${res.total} (Dado: ${res.rollResult})`, participant.name, type);
                        }
                        
                        setAdvantage('normal'); // reset after roll
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>
                        {atk.name} {participant.actionSpent && !isOutOfAttacks && ("(Extra " + (participant.attacksMade + 1) + "/" + maxAttacks + ")")}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{atk.bonus} | {atk.dmg}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Nenhum ataque cadastrado.</div>
            )}
            
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ações Globais</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Disparada', 'Desengajar', 'Esquiva', 'Esconder'].map(act => {
                  const isRogue = participant.playerClass?.toLowerCase().includes('ladino') || participant.playerClass?.toLowerCase().includes('rogue');
                  const isMonk = participant.playerClass?.toLowerCase().includes('monge') || participant.playerClass?.toLowerCase().includes('monk');
                  const isCunningAction = isRogue && ['Disparada', 'Desengajar', 'Esconder'].includes(act);
                  const isStepOfTheWind = isMonk && ['Disparada', 'Desengajar'].includes(act);
                  
                  const isBonus = isCunningAction || isStepOfTheWind;
                  const canUse = isBonus ? !participant.bonusActionSpent : !participant.actionSpent;

                  return (
                    <button 
                      key={act}
                      className="btn secondary-btn" 
                      style={{ flex: 1, fontSize: '0.8rem', opacity: canUse ? 1 : 0.5 }} 
                      disabled={!canUse}
                      onClick={() => {
                        if (!isGM) return;
                        if (isBonus) updateParticipant(participant.refId, { bonusActionSpent: true });
                        else updateParticipant(participant.refId, { actionSpent: true });
                        
                        if (act === 'Esconder') addCondition(participant.refId, 'Escondido');
                        addToLog(`usou ${act}${isBonus ? ' (Ação Bônus)' : ''}.`, participant.name, 'system');
                      }}
                    >
                      {act === 'Disparada' ? '🏃' : act === 'Desengajar' ? '🛡️' : act === 'Esquiva' ? '🤸' : '🥷'} {act}
                    </button>
                  );
                })}
                {/* Reaction Button */}
                <button 
                  className="btn secondary-btn"
                  disabled={participant.reactionSpent}
                  onClick={() => {
                    if (!isGM) return;
                    const reaction = prompt("Descreva a Reação usada (ex: Ataque de Oportunidade, Magia Escudo Arcano):", "Ataque de Oportunidade");
                    if (reaction) {
                      updateParticipant(participant.refId, { reactionSpent: true });
                      addToLog(`usou Reação: ${reaction}.`, participant.name, 'system');
                    }
                  }}
                  title="Usar Reação"
                >
                  🔵 Usar Reação
                </button>

                {/* 🌀 Chuva de Golpes — Monge Nv.2+, Ação Bônus */}
                {isMonk(participant) && (participant.playerLevel || 0) >= 2 && (
                  <button
                    className="btn secondary-btn"
                    style={{
                      flex: '1 1 100%',
                      background: participant.flurryUsed ? 'rgba(99,102,241,0.15)' : '',
                      borderColor: participant.flurryUsed ? '#6366f1' : '',
                      color: participant.flurryUsed ? '#a5b4fc' : '',
                      opacity: (!participant.actionSpent || participant.bonusActionSpent || participant.flurryUsed) ? 0.45 : 1,
                      fontSize: '0.8rem'
                    }}
                    disabled={!participant.actionSpent || participant.bonusActionSpent || participant.flurryUsed}
                    title="Chuva de Golpes: gasta 1 Ponto de Ki, usa Ação Bônus para fazer 2 ataques extras."
                    onClick={() => {
                      if (!isGM) return;
                      updateParticipant(participant.refId, { bonusActionSpent: true, flurryUsed: true });
                      addToLog('usou Chuva de Golpes! (+2 ataques como Ação Bônus — gasta 1 Ki)', participant.name, 'system');
                    }}
                  >
                    🌀 Chuva de Golpes (+2 ataques / 1 Ki)
                  </button>
                )}
            </div>
          </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Selecione um participante no tabuleiro para ver suas ações e atributos.</p>
        </div>
      )}

      {/* COMBAT LOG */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', height: '30%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          Registro de Combate
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(combat.log || []).map(entry => (
            <div key={entry.id} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px', fontSize: '0.7rem' }}>
                <span>{entry.actorName}</span>
                <span>R{entry.round}</span>
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {entry.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
