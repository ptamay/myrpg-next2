import React, { useState, useEffect } from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { rollAttack, rollDamage, parseDmgString } from '@/lib/dice/rollParser';
import { computeExtraDamages, buildDamageLog, isPaladin, rollDivineSmite } from '@/lib/dice/specialDamage';
import { getMaxAttacks, isMonk } from '@/lib/dice/multiattack';
import { PendingAttack } from '@/contexts/CombatContext';

interface Props {
  pendingAttack: PendingAttack | null;
  setPendingAttack: (atk: PendingAttack | null) => void;
}

export default function PlayerActionBar({ pendingAttack, setPendingAttack }: Props) {
  const { combat, addToLog, updateParticipant, applyDamage, triggerRollEvent, nextTurn, removeCondition, addCondition, removeParticipant, applyHeal } = useCombat();
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
    
    if (atk.actionCost) {
      if (atk.actionCost === 'action' && activeParticipant.actionSpent) return alert("Você já usou sua Ação neste turno!");
      if (atk.actionCost === 'bonus' && activeParticipant.bonusActionSpent) return alert("Você já usou sua Ação Bônus neste turno!");
      if (atk.actionCost === 'reaction' && activeParticipant.reactionSpent) return alert("Você já usou sua Reação neste turno!");
    } else {
      const maxAttacks = getMaxAttacks(activeParticipant);
      const currentAttacks = activeParticipant.attacksMade || 0;
      const isOutOfAttacks = currentAttacks >= maxAttacks;
      if (isOutOfAttacks) return alert("Você já usou sua Ação Principal e todos os Ataques Extras!");
    }

    if (atk.resourceCost && atk.resourceCost.resourceName) {
      const res = activeParticipant.classResources?.find(r => r.name === atk.resourceCost.resourceName);
      if (!res || res.current < atk.resourceCost.amount) return alert(`Recurso Insuficiente: ${atk.resourceCost.resourceName}`);
    }

    let updates: any = {};
    if (atk.actionCost) {
      if (atk.actionCost === 'action') updates.actionSpent = true;
      if (atk.actionCost === 'bonus') updates.bonusActionSpent = true;
      if (atk.actionCost === 'reaction') updates.reactionSpent = true;
    } else {
      updates.actionSpent = true;
      updates.attacksMade = (activeParticipant.attacksMade || 0) + 1;
    }
    
    if (atk.resourceCost && atk.resourceCost.resourceName) {
      const resIdx = activeParticipant.classResources?.findIndex(r => r.name === atk.resourceCost.resourceName);
      if (resIdx !== undefined && resIdx >= 0) {
        const newResources = [...(activeParticipant.classResources || [])];
        newResources[resIdx].current -= atk.resourceCost.amount;
        updates.classResources = newResources;
      }
    }

    if (Object.keys(updates).length > 0) updateParticipant(activeParticipant.refId, updates);
    setPendingAttack(atk);
  };

  const handleAbility = (ab: any) => {
    if (ab.actionCost) {
      if (ab.actionCost === 'action' && activeParticipant.actionSpent) return alert("Ação Principal já gasta!");
      if (ab.actionCost === 'bonus' && activeParticipant.bonusActionSpent) return alert("Ação Bônus já gasta!");
      if (ab.actionCost === 'reaction' && activeParticipant.reactionSpent) return alert("Reação já gasta!");
    }

    if (ab.resourceCost && ab.resourceCost.resourceName) {
      const res = activeParticipant.classResources?.find(r => r.name === ab.resourceCost.resourceName);
      if (!res || res.current < ab.resourceCost.amount) return alert(`Recurso Insuficiente: ${ab.resourceCost.resourceName}`);
    }

    let updates: any = {};
    if (ab.actionCost === 'action') updates.actionSpent = true;
    if (ab.actionCost === 'bonus') updates.bonusActionSpent = true;
    if (ab.actionCost === 'reaction') updates.reactionSpent = true;
    
    if (ab.resourceCost && ab.resourceCost.resourceName) {
      const resIdx = activeParticipant.classResources?.findIndex(r => r.name === ab.resourceCost.resourceName);
      if (resIdx !== undefined && resIdx >= 0) {
        const newResources = [...(activeParticipant.classResources || [])];
        newResources[resIdx].current -= ab.resourceCost.amount;
        updates.classResources = newResources;
      }
    }

    if (Object.keys(updates).length > 0) updateParticipant(activeParticipant.refId, updates);
    addToLog(`usou a habilidade: **${ab.name}**`, activeParticipant.name, 'system');

    // 💥 Automatização de Efeitos de Habilidades 💥
    if (ab.conditionApplied) {
      const isFeyStep = ab.conditionApplied === "Fantasmagórico (Resistência Total)";
      addCondition(activeParticipant.refId, ab.conditionApplied, isFeyStep ? 1 : undefined);
      addToLog(`Recebeu a condição: **${ab.conditionApplied}**${isFeyStep ? " (1 Turno)" : ""}`, activeParticipant.name, 'system');
    }

    const nameLower = ab.name.toLowerCase();

    if (nameLower === 'ataque furtivo') {
      addCondition(activeParticipant.refId, 'Furtivo Ativo');
      addToLog(`Preparou um Ataque Furtivo!`, activeParticipant.name, 'system');
    } else if (nameLower === 'golpe descuidado' || nameLower === 'ataque temerário') {
      addCondition(activeParticipant.refId, 'Ataque Temerário');
      addToLog(`O próximo ataque terá Vantagem (e ataques contra receberão Vantagem)!`, activeParticipant.name, 'system');
    } else if (nameLower === 'esquiva prodigiosa') {
      addCondition(activeParticipant.refId, 'Esquiva Prodigiosa');
      addToLog(`O próximo dano sofrido será reduzido à metade!`, activeParticipant.name, 'system');
    } else if (nameLower === 'segundo vento') {
      const level = parseInt(activeParticipant.playerLevel?.toString() || '1');
      const healRoll = Math.floor(Math.random() * 10) + 1;
      const healTotal = healRoll + level;
      applyHeal(activeParticipant.refId, healTotal);
      addToLog(`Recuperou **${healTotal}** PV (d10: ${healRoll} + Nv: ${level}) com Segundo Vento!`, activeParticipant.name, 'heal');
    } else if (nameLower === 'cura pelas mãos') {
      if (combat.selectedTargetIds.length === 0) {
        alert("Selecione um alvo no tabuleiro para curar!");
        return;
      }
      const pRes = activeParticipant.classResources?.find(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
      if (!pRes || pRes.current <= 0) {
        alert("Sem pontos de Cura pelas Mãos disponíveis!");
        return;
      }
      const input = prompt(`Quantos pontos deseja usar? (Max: ${pRes.current})`);
      const healAmount = parseInt(input || "0");
      if (healAmount > 0 && healAmount <= pRes.current) {
        combat.selectedTargetIds.forEach(targetId => {
          applyHeal(targetId, healAmount);
          const t = combat.participants.find(p => p.refId === targetId);
          addToLog(`Curou **${healAmount}** PV de ${t?.name} com Cura pelas Mãos!`, activeParticipant.name, 'heal');
        });
        
        const newResources = [...(activeParticipant.classResources || [])];
        const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
        if (resIdx >= 0) {
          newResources[resIdx].current -= Math.min(newResources[resIdx].current, healAmount * combat.selectedTargetIds.length);
          updateParticipant(activeParticipant.refId, { classResources: newResources });
        }
      }
    } else if (nameLower === 'destruição divina') {
      addCondition(activeParticipant.refId, 'Destruição Divina');
      addToLog(`A sua arma resplandece com energia divina!`, activeParticipant.name, 'system');
    } else if (nameLower === 'surto de ação') {
      updateParticipant(activeParticipant.refId, { actionSpent: false, attacksMade: 0 });
      addToLog(`Recuperou sua Ação Principal!`, activeParticipant.name, 'system');
    } else if (nameLower === 'chuva de golpes') {
      updateParticipant(activeParticipant.refId, { flurryUsed: true, bonusActionSpent: true });
      addToLog(`Pode realizar 2 ataques desarmados adicionais!`, activeParticipant.name, 'system');
    } else if (nameLower === 'defesa paciente') {
      addCondition(activeParticipant.refId, 'Esquiva');
      updateParticipant(activeParticipant.refId, { bonusActionSpent: true });
      addToLog(`Assumiu postura defensiva (Ataques contra você têm Desvantagem)!`, activeParticipant.name, 'system');
    } else if (nameLower === 'passo do vento') {
      updateParticipant(activeParticipant.refId, { bonusActionSpent: true });
      addToLog(`Pode usar Disparada ou Desengajar como Ação Bônus!`, activeParticipant.name, 'system');
    }
  };

  const handleRollDamage = () => {
    if (pendingDamageList.length === 0) return;
    if (isPaladin(activeParticipant) && smiteSlot === undefined) return;

    // Rola o dano BASE uma única vez para todos os acertados
    const firstHit = pendingDamageList[0];
    
    let extraCrit = 0;
    if (firstHit.res.isCritical && activeParticipant?.abilities) {
      const hasSavageAttacks = activeParticipant.abilities.some(a => a.name.includes("Ataques Selvagens") || a.name.includes("Savage Attacks"));
      if (hasSavageAttacks) {
        extraCrit = 1;
      }
    }
    
    const dmgRes = rollDamage(firstHit.atk.dmg, firstHit.res.isCritical, extraCrit);
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
      const parsed = parseDmgString(hit.atk.dmg);
      const isLifesteal = parsed.isLifesteal || hit.atk.name.toLowerCase().includes('[roubo de vida]') || hit.atk.name.toLowerCase().includes('[lifesteal]') || hit.atk.name.toLowerCase().includes('[cura]');
      
      applyDamage(hit.target.refId, totalDmg, parsed.damageType, activeParticipant.refId, isLifesteal);
      addToLog(logMsg, activeParticipant.name, hit.res.isCritical ? 'critical' : 'damage');
    });

    if (activeParticipant.conditions?.some(c => c.toLowerCase() === 'furtivo ativo')) {
      removeCondition(activeParticipant.refId, 'Furtivo Ativo');
    }
    if (activeParticipant.conditions?.some(c => c.toLowerCase() === 'destruição divina')) {
      removeCondition(activeParticipant.refId, 'Destruição Divina');
    }

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
              const isOutOfAttacks = !atk.actionCost && currentAttacks >= maxAttacks;
              
              return (
                <button 
                  key={idx}
                  className="btn primary-btn" 
                  disabled={isOutOfAttacks}
                  onClick={() => handleAttack(atk)}
                  title={atk.resourceCost?.resourceName ? `Gasta ${atk.resourceCost.amount} ${atk.resourceCost.resourceName}` : 'Ataque contra alvos selecionados'}
                >
                  ⚔️ {atk.name} {atk.actionCost ? `(${atk.actionCost})` : (activeParticipant.actionSpent && !isOutOfAttacks ? `(${currentAttacks + 1}/${maxAttacks})` : '')}
                </button>
              );
            })}

            {activeParticipant.abilities && activeParticipant.abilities.map((ab, idx) => (
              <button 
                key={`ab-${idx}`}
                className="btn success-btn" 
                onClick={() => handleAbility(ab)}
                title={ab.description}
              >
                ⚡ {ab.name} {ab.actionCost ? `(${ab.actionCost})` : ''} {ab.resourceCost?.resourceName ? `[-${ab.resourceCost.amount} ${ab.resourceCost.resourceName}]` : ''}
              </button>
            ))}

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
