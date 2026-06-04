import React, { useState } from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { rollAttack, rollDamage } from '@/lib/dice/rollParser';
import { computeExtraDamages, buildDamageLog, isPaladin, rollDivineSmite } from '@/lib/dice/specialDamage';
import { getMaxAttacks, isMonk } from '@/lib/dice/multiattack';

export default function PlayerActionBar() {
  const { combat, addToLog, updateParticipant, applyDamage, triggerRollEvent, nextTurn, removeCondition, addCondition } = useCombat();
  const { isGM, profile } = useUserSession();
  // smiteSlot: undefined = Paladino ainda não decidiu | null = não usa | 1-5 = nível do slot
  const [pendingDamage, setPendingDamage] = useState<{ atk: any, target: any, res: any, advantageType: string, smiteSlot?: number | null } | null>(null);

  if (!combat || isGM) return null;

  const activeParticipant = combat.participants[combat.currentTurnIndex];
  const isMyTurn = activeParticipant && activeParticipant.type === 'player' && activeParticipant.refId === profile?.player_id;

  if (!isMyTurn) return null;

  const handleAction = (type: 'action' | 'bonus' | 'reaction' | 'movement', name: string) => {
    if (type === 'action' && activeParticipant.actionSpent) return alert("Você já usou sua Ação neste turno!");
    if (type === 'bonus' && activeParticipant.bonusActionSpent) return alert("Você já usou sua Ação Bônus neste turno!");
    if (type === 'movement' && activeParticipant.movementSpent) return alert("Você já usou seu Movimento neste turno!");

    const updates: any = {};
    if (type === 'action') updates.actionSpent = true;
    if (type === 'bonus') updates.bonusActionSpent = true;
    if (type === 'movement') updates.movementSpent = true;

    updateParticipant(activeParticipant.refId, updates);
    addToLog(`usou ${name}.`, activeParticipant.name, 'system');
  };

  const handleAttack = (atk: any) => {
    if (!combat.selectedTargetId) return alert("Selecione um alvo primeiro (clique na carta no tabuleiro)!");
    const target = combat.participants.find(p => p.refId === combat.selectedTargetId);
    if (!target) return;
    
    // Action Constraint
    if (activeParticipant.type === target.type) {
      return alert("Trava de Ação: Você não pode atacar um aliado!");
    }
    
    const maxAttacks = getMaxAttacks(activeParticipant);
    const currentAttacks = activeParticipant.attacksMade || 0;
    const isOutOfAttacks = currentAttacks >= maxAttacks;
    
    if (isOutOfAttacks) return alert("Você já usou sua Ação Principal e todos os Ataques Extras!");
    
    // Consume action and increment attacks
    const newAttacksMade = currentAttacks + 1;
    updateParticipant(activeParticipant.refId, { 
      actionSpent: true, 
      attacksMade: newAttacksMade 
    });
    
    const isFurtivo = activeParticipant.conditions?.some(c => ['furtivo', 'escondido', 'invisível'].includes(c.toLowerCase()));
    const advantageType = isFurtivo ? 'advantage' : 'normal';

    // Remove stealth conditions after attacking
    if (isFurtivo) {
      const stealthConditions = ['Furtivo', 'Escondido', 'Invisível', 'furtivo', 'escondido', 'invisível'];
      stealthConditions.forEach(sc => {
        if (activeParticipant.conditions?.includes(sc)) {
          removeCondition(activeParticipant.refId, sc);
        }
      });
      addToLog(`revelou sua posição ao atacar.`, activeParticipant.name, 'system');
    }

    // Roll attack
    const res = rollAttack(atk.bonus, advantageType);
    triggerRollEvent({
      type: 'attack',
      result: res.rollResult,
      total: res.total,
      isCritical: res.isCritical,
      isCritFail: res.isCritFail,
      actorName: activeParticipant.name,
      formula: `d20${atk.bonus}`
    });
    
    const targetAc = Number(target.ac) || 10;
    const isHit = res.isCritical || (!res.isCritFail && res.total >= targetAc);
    
    if (isHit) {
      addToLog(`atacou ${target.name} com ${atk.name} e ACERTOU! (Aguardando dano)`, activeParticipant.name, res.isCritical ? 'critical' : 'attack');
      setPendingDamage({ atk, target, res, advantageType });
    } else {
      addToLog(`atacou ${target.name} com ${atk.name} mas ERROU.`, activeParticipant.name, res.isCritFail ? 'crit_fail' : 'attack');
    }
  };

  const handleRollDamage = () => {
    if (!pendingDamage) return;
    // Se for Paladino e a decisão de smite não foi tomada, aguarda
    if (isPaladin(activeParticipant) && pendingDamage.smiteSlot === undefined) return;

    const { atk, target, res, advantageType, smiteSlot } = pendingDamage;

    // 1. Rola o dano da arma
    const dmgRes = rollDamage(atk.dmg, res.isCritical);

    // 2. Calcula danos extras automáticos (Furtivo, Fúria, Marca, Hex)
    const extras = computeExtraDamages(activeParticipant, res.isCritical, advantageType);

    // 3. Adiciona Smite Divino se o Paladino escolheu usar
    if (smiteSlot) {
      extras.push(rollDivineSmite(smiteSlot, res.isCritical));
    }

    // 4. Monta log com breakdown completo
    const { total: totalDmg, message: logMsg } = buildDamageLog(
      activeParticipant.name,
      target.name,
      dmgRes.total,
      dmgRes.rolls,
      dmgRes.modifier,
      atk.dmg,
      extras,
      res.isCritical
    );

    applyDamage(target.refId, totalDmg);
    addToLog(logMsg, activeParticipant.name, res.isCritical ? 'critical' : 'damage');
    setPendingDamage(null);
  };

  return (
    <div className="player-action-bar">
      <div className="economy-tracker">
        <div 
          className={`bubble ${!activeParticipant.actionSpent ? 'active-action' : 'spent'}`} 
          title="Ação Principal (Clique para alternar)"
          style={{ cursor: 'pointer' }}
          onClick={() => updateParticipant(activeParticipant.refId, { actionSpent: !activeParticipant.actionSpent, attacksMade: 0 })}
        >
          🟢 Ação
        </div>
        <div 
          className={`bubble ${!activeParticipant.bonusActionSpent ? 'active-bonus' : 'spent'}`} 
          title="Ação Bônus (Clique para alternar)"
          style={{ cursor: 'pointer' }}
          onClick={() => updateParticipant(activeParticipant.refId, { bonusActionSpent: !activeParticipant.bonusActionSpent })}
        >
          🟡 Bônus
        </div>
        <div 
          className={`bubble ${!activeParticipant.movementSpent ? 'active-move' : 'spent'}`} 
          title="Movimento (Clique para alternar)"
          style={{ cursor: 'pointer' }}
          onClick={() => updateParticipant(activeParticipant.refId, { movementSpent: !activeParticipant.movementSpent })}
        >
          🏃 Movimento
        </div>
        <div 
          className={`bubble ${!activeParticipant.reactionSpent ? 'active-reaction' : 'spent'}`} 
          title="Reação (Clique para alternar)"
          style={{ cursor: 'pointer' }}
          onClick={() => updateParticipant(activeParticipant.refId, { reactionSpent: !activeParticipant.reactionSpent })}
        >
          🔵 Reação
        </div>
      </div>
      
      <div className="action-buttons">
        {pendingDamage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)', flex: 1 }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
              🎯 {pendingDamage.res.isCritical ? '💥 CRÍTICO! ' : ''}Acerto em {pendingDamage.target.name}!
            </span>

            {/* Preview de bônus automáticos */}
            {(() => {
              const extras = computeExtraDamages(activeParticipant, pendingDamage.res.isCritical, pendingDamage.advantageType);
              return extras.length > 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#a3e635' }}>
                  ✨ {extras.map(e => e.label).join(' + ')}
                </div>
              ) : null;
            })()}

            {/* Smite Divino — Paladino decide antes de rolar */}
            {isPaladin(activeParticipant) && pendingDamage.smiteSlot === undefined && (
              <div>
                <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginBottom: '4px', fontWeight: 'bold' }}>⚡ Usar Smite Divino?</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(slot => (
                    <button key={slot}
                      className="btn secondary-btn"
                      style={{ flex: 1, padding: '4px 2px', fontSize: '0.72rem' }}
                      onClick={() => setPendingDamage({ ...pendingDamage, smiteSlot: slot })}
                    >
                      Slot {slot}<br/><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({slot + 1}d8)</span>
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

            {/* Botão de rolar dano */}
            {(!isPaladin(activeParticipant) || pendingDamage.smiteSlot !== undefined) && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn primary-btn"
                  style={{ background: 'var(--danger)', color: 'white', padding: '8px 16px', fontSize: '1rem', flex: 1 }}
                  onClick={handleRollDamage}
                >
                  🩸 Rolar Dano ({pendingDamage.atk.dmg}{pendingDamage.smiteSlot ? ` + ${pendingDamage.smiteSlot + 1}d8` : ''})
                </button>
                <button className="btn secondary-btn small-btn" onClick={() => setPendingDamage(null)}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {(activeParticipant.attacks || []).map((atk: any, idx: number) => {
              const maxAttacks = getMaxAttacks(activeParticipant);
              const currentAttacks = activeParticipant.attacksMade || 0;
              const isOutOfAttacks = currentAttacks >= maxAttacks;
              
              return (
                <button 
                  key={idx}
                  className="btn primary-btn" 
                  disabled={isOutOfAttacks}
                  onClick={() => handleAttack(atk)}
                  title={`Ataque: ${atk.bonus} Dano: ${atk.dmg}`}
                >
                  ⚔️ {atk.name} {activeParticipant.actionSpent && !isOutOfAttacks && `(Ataque Extra ${activeParticipant.attacksMade + 1}/${maxAttacks})`}
                </button>
              );
            })}
            
            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 10px' }}></div>
            
            {['Disparada', 'Desengajar', 'Esquiva', 'Esconder'].map(act => {
              const isRogue = activeParticipant.playerClass?.toLowerCase().includes('ladino') || activeParticipant.playerClass?.toLowerCase().includes('rogue');
              const isMonk = activeParticipant.playerClass?.toLowerCase().includes('monge') || activeParticipant.playerClass?.toLowerCase().includes('monk');
              const isCunningAction = isRogue && ['Disparada', 'Desengajar', 'Esconder'].includes(act);
              const isStepOfTheWind = isMonk && ['Disparada', 'Desengajar'].includes(act);
              
              const isBonus = isCunningAction || isStepOfTheWind;
              const canUse = isBonus ? !activeParticipant.bonusActionSpent : !activeParticipant.actionSpent;

              return (
                <button 
                  key={act}
                  className="btn secondary-btn" 
                  disabled={!canUse}
                  onClick={() => {
                    if (isBonus) updateParticipant(activeParticipant.refId, { bonusActionSpent: true });
                    else updateParticipant(activeParticipant.refId, { actionSpent: true });
                    
                    if (act === 'Esconder') addCondition(activeParticipant.refId, 'Escondido');
                    addToLog(`usou ${act}${isBonus ? ' (Ação Bônus)' : ''}.`, activeParticipant.name, 'system');
                  }}
                >
                  {act === 'Disparada' ? '🏃' : act === 'Desengajar' ? '🛡️' : act === 'Esquiva' ? '🤸' : '🥷'} {act}
                </button>
              );
            })}
            
            {/* Reaction Button */}
            <button 
              className="btn secondary-btn"
              disabled={activeParticipant.reactionSpent}
              onClick={() => {
                const reaction = prompt("Descreva a Reação usada (ex: Ataque de Oportunidade, Escudo Arcano):", "Ataque de Oportunidade");
                if (reaction) {
                  updateParticipant(activeParticipant.refId, { reactionSpent: true });
                  addToLog(`usou Reação: ${reaction}.`, activeParticipant.name, 'system');
                }
              }}
              title="Usar Reação"
            >
              🔵 Usar Reação
            </button>

            {/* 🌀 Chuva de Golpes — Monge Nv.2+, Ação Bônus */}
            {isMonk(activeParticipant) && (activeParticipant.playerLevel || 0) >= 2 && (
              <button
                className="btn secondary-btn"
                style={{
                  background: activeParticipant.flurryUsed ? 'rgba(99,102,241,0.15)' : '',
                  borderColor: activeParticipant.flurryUsed ? '#6366f1' : '',
                  color: activeParticipant.flurryUsed ? '#a5b4fc' : '',
                  opacity: (!activeParticipant.actionSpent || activeParticipant.bonusActionSpent || activeParticipant.flurryUsed) ? 0.45 : 1,
                }}
                disabled={!activeParticipant.actionSpent || activeParticipant.bonusActionSpent || activeParticipant.flurryUsed}
                title="Chuva de Golpes: gasta 1 Ponto de Ki, usa Ação Bônus para 2 ataques extras (Monge Nv.2+)"
                onClick={() => {
                  updateParticipant(activeParticipant.refId, { bonusActionSpent: true, flurryUsed: true });
                  addToLog('usou Chuva de Golpes! (+2 ataques como Ação Bônus — gasta 1 Ki)', activeParticipant.name, 'system');
                }}
              >
                🌀 Chuva de Golpes
              </button>
            )}

            <button 
              className="btn primary-btn" 
              style={{ 
                background: 'var(--primary-color)', 
                color: '#fff', 
                marginLeft: 'auto',
                animation: (activeParticipant.actionSpent && activeParticipant.movementSpent && activeParticipant.bonusActionSpent) || (activeParticipant.actionSpent) ? 'initiative-pulse 2s infinite' : 'none'
              }}
              onClick={() => {
                addToLog(`encerrou seu turno.`, activeParticipant.name, 'system');
                nextTurn();
              }}
            >
              ⏭️ Encerrar Turno
            </button>
          </>
        )}
      </div>
    </div>
  );
}
