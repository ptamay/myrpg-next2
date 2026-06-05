import React, { useState, useEffect } from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { rollAttack, rollDamage } from '@/lib/dice/rollParser';
import { computeExtraDamages, buildDamageLog, isPaladin, rollDivineSmite } from '@/lib/dice/specialDamage';
import { getMaxAttacks, isMonk } from '@/lib/dice/multiattack';
import { PendingAttack } from '@/contexts/CombatContext';

interface Props {
  pendingAttack: PendingAttack | null;
  setPendingAttack: (atk: PendingAttack | null) => void;
}

export default function PlayerActionBar({ pendingAttack, setPendingAttack }: Props) {
  const { combat, addToLog, updateParticipant, applyDamage, triggerRollEvent, nextTurn, removeCondition, addCondition, removeParticipant } = useCombat();
  const { isGM, profile } = useUserSession();
  
  const [pendingDamageList, setPendingDamageList] = useState<any[]>([]); // Lista de alvos acertados para rolar o dano conjunto
  const [smiteSlot, setSmiteSlot] = useState<number | null | undefined>(undefined); // Para Paladino no pendingDamage

  useEffect(() => {
    const handleHit = (e: any) => {
      setPendingDamageList(prev => {
        // Evita duplicar se já foi adicionado
        const newHits = e.detail;
        return [...prev, ...newHits];
      });
      setSmiteSlot(undefined);
    };
    window.addEventListener('action_panel_attack_hit', handleHit);
    return () => window.removeEventListener('action_panel_attack_hit', handleHit);
  }, []);

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
    if (combat.selectedTargetIds.length === 0) return alert("Selecione pelo menos um alvo no tabuleiro primeiro!");
    
    const maxAttacks = getMaxAttacks(activeParticipant);
    const currentAttacks = activeParticipant.attacksMade || 0;
    const isOutOfAttacks = currentAttacks >= maxAttacks;

    if (isOutOfAttacks) return alert("Você já usou sua Ação Principal e todos os Ataques Extras!");

    setPendingAttack(atk);
  };

  const handleRollDamage = () => {
    if (pendingDamageList.length === 0) return;
    if (isPaladin(activeParticipant) && smiteSlot === undefined) return;

    // Rola o dano BASE uma única vez para todos os acertados
    const firstHit = pendingDamageList[0];
    const dmgRes = rollDamage(firstHit.atk.dmg, firstHit.res.isCritical);
    const extras = computeExtraDamages(activeParticipant, firstHit.res.isCritical, firstHit.advantageType);
    if (smiteSlot) extras.push(rollDivineSmite(smiteSlot, firstHit.res.isCritical));

    // Distribui o dano e loga
    pendingDamageList.forEach(hit => {
      const { total: totalDmg, message: logMsg } = buildDamageLog(
        activeParticipant.name,
        hit.target.name,
        dmgRes.total,
        dmgRes.rolls,
        dmgRes.modifier,
        hit.atk.dmg,
        extras,
        hit.res.isCritical
      );
      applyDamage(hit.target.refId, totalDmg);
      addToLog(logMsg, activeParticipant.name, hit.res.isCritical ? 'critical' : 'damage');
    });

    setPendingDamageList([]);
    setSmiteSlot(undefined);
  };

  return (
    <div className="player-action-bar">
      
      {/* Botões Superiores do Player */}

      <div className="action-buttons">
        {pendingDamageList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)', flex: 1 }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
              🎯 Acertos confirmados em {pendingDamageList.length} alvo(s)!
            </span>

            {isPaladin(activeParticipant) && smiteSlot === undefined && (
              <div>
                <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginBottom: '4px', fontWeight: 'bold' }}>⚡ Usar Smite Divino em Área? (Dano extra pra todos)</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(slot => (
                    <button key={slot} className="btn secondary-btn" style={{ flex: 1, padding: '4px 2px', fontSize: '0.72rem' }} onClick={() => setSmiteSlot(slot)}>Slot {slot}</button>
                  ))}
                  <button className="btn secondary-btn" style={{ flex: 1, padding: '4px 2px', fontSize: '0.72rem', color: 'var(--text-muted)' }} onClick={() => setSmiteSlot(null)}>Não</button>
                </div>
              </div>
            )}

            {(!isPaladin(activeParticipant) || smiteSlot !== undefined) && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn primary-btn"
                  style={{ background: 'var(--danger)', color: 'white', padding: '8px 16px', fontSize: '1rem', flex: 1 }}
                  onClick={handleRollDamage}
                >
                  🩸 Rolar Dano Múltiplo
                </button>
                <button className="btn secondary-btn small-btn" onClick={() => setPendingDamageList([])}>Cancelar</button>
              </div>
            )}
          </div>
        ) : pendingAttack ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(255,165,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.3)', flex: 1 }}>
            <span style={{ color: 'orange', fontWeight: 'bold' }}>
              ⚔️ Ataque Pendente: {pendingAttack.name} ({pendingAttack.bonus})
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Clique no d20 do painel direito para realizar a rolagem!
            </span>
            <button className="btn secondary-btn small-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setPendingAttack(null)}>Cancelar</button>
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
                  title={`Ataque contra alvos selecionados`}
                >
                  ⚔️ {atk.name} {activeParticipant.actionSpent && !isOutOfAttacks && `(${activeParticipant.attacksMade + 1}/${maxAttacks})`}
                </button>
              );
            })}

            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 10px' }}></div>
            
            {['Disparada', 'Desengajar', 'Esquiva', 'Esconder'].map(act => {
              const isRogue = activeParticipant.playerClass?.toLowerCase().includes('ladino');
              const isMonkAct = activeParticipant.playerClass?.toLowerCase().includes('monge');
              const isCunningAction = isRogue && ['Disparada', 'Desengajar', 'Esconder'].includes(act);
              const isStepOfTheWind = isMonkAct && ['Disparada', 'Desengajar'].includes(act);
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
            
            <button 
              className="btn secondary-btn"
              disabled={activeParticipant.reactionSpent}
              onClick={() => {
                const reaction = prompt("Descreva a Reação:", "Ataque de Oportunidade");
                if (reaction) {
                  updateParticipant(activeParticipant.refId, { reactionSpent: true });
                  addToLog(`usou Reação: ${reaction}.`, activeParticipant.name, 'system');
                }
              }}
            >
              🔵 Reação
            </button>

            <button 
              className="btn primary-btn" 
              style={{ background: 'var(--primary-color)', marginLeft: 'auto' }}
              onClick={() => {
                addToLog(`encerrou seu turno.`, activeParticipant.name, 'system');
                nextTurn();
              }}
            >
              ⏭️ Fim de Turno
            </button>
          </>
        )}
      </div>
    </div>
  );
}
