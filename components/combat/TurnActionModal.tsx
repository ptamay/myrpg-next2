"use client";

import React, { useState, useEffect } from 'react';
import { useCombat, CombatParticipant, PendingAttack } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import CombatDicePanel, { RollEntry } from './CombatDicePanel';
import { getMaxAttacks } from '@/lib/dice/multiattack';
import { isPaladin, rollDivineSmite } from '@/lib/dice/specialDamage';
import { parseDmgString, ParsedDamage, rollDamage } from '@/lib/dice/rollParser';
import { computeExtraDamages, buildDamageLog } from '@/lib/dice/specialDamage';
import { Ability } from '@/lib/gameData';
import { CONDITIONS_MAP } from '@/lib/constants/dnd5e';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface Props {
  participantId: string;
  onClose: () => void;
  pendingAttack: PendingAttack | null;
  setPendingAttack: (atk: PendingAttack | null) => void;
}

export default function TurnActionModal({ participantId, onClose, pendingAttack, setPendingAttack }: Props) {
  const { combat, updateParticipant, addCondition, removeCondition, applyDamage, addToLog, nextTurn, applyHeal, toggleTarget, clearTargets, triggerRollEvent, transformParticipant } = useCombat();
  const { isGM, profile } = useUserSession();

  const [showDicePanel, setShowDicePanel] = useState(false);
  const [isTargeting, setIsTargeting] = useState(false);
  const [pendingDamage, setPendingDamage] = useState<{ isCritical: boolean; parsedDmg: ParsedDamage } | null>(null);
  
  const [magicMissileUI, setMagicMissileUI] = useState<{
    active: boolean;
    abilityName: string;
    dmgStr: string;
    totalDarts: number;
    targets: { refId: string; name: string; darts: number }[];
    damageType: string;
    conditionApplied?: string;
    actorName: string;
  } | null>(null);
  
  const [mercyMonkUI, setMercyMonkUI] = useState<{
    active: boolean;
    mode: 'cura' | 'dano' | null;
    selectedTargetId: string | null;
  } | null>(null);
  
  if (!combat) return null;

  const participant = combat.participants.find(p => p.refId === participantId);
  if (!participant) return null;

  const isActiveTurn = combat.participants[combat.currentTurnIndex]?.refId === participantId;
  const isMyCharacter = participant.type === 'player' && participant.refId === profile?.player_id;
  
  // O Mestre pode controlar monstros e jogadores, o Jogador só controla a si mesmo.
  // MAS as ações normais e ataques só podem ser usados se for o TURNO do personagem (isActiveTurn),
  // mesmo para o Mestre, para evitar cliques acidentais.
  const hasPermission = isGM || isMyCharacter;
  const canAct = hasPermission && isActiveTurn;

  // ---------------- Async Dialog State ----------------
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'prompt' | 'confirm';
    message: string;
    defaultValue?: string;
    resolve?: (value: any) => void;
  }>({ isOpen: false, type: 'prompt', message: '' });

  const asyncPrompt = (message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise(resolve => {
      setDialogConfig({ isOpen: true, type: 'prompt', message, defaultValue, resolve });
    });
  };

  const asyncConfirm = (message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setDialogConfig({ isOpen: true, type: 'confirm', message, resolve });
    });
  };

  // ---------------- Handlers ----------------

  const handleDiceRoll = async (entry: RollEntry) => {
    const { rollMode, saveAttr, saveDC } = entry;
    
    const type = entry.isCritical ? 'critical' : entry.isCritFail ? 'crit_fail' : 'attack';
    
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
          
          let hasAdvantage = false;
          let hasDisadvantage = false;
          
          // Verificar condições que afetam o teste (ex: Esquiva, Restringido, etc)
          const targetConditions = target.conditions || [];
          targetConditions.forEach(condName => {
            const cDef = CONDITIONS_MAP.find(c => c.id.toLowerCase() === condName.toLowerCase() || c.label.toLowerCase() === condName.toLowerCase());
            if (cDef?.effect) {
              const effect: any = cDef.effect;
              if (saveAttr === "Destreza" && effect.advantageDexSave) hasAdvantage = true;
              if (saveAttr === "Destreza" && effect.disadvantageDexSave) hasDisadvantage = true;
              if (effect.failForceDex && (saveAttr === "Força" || saveAttr === "Destreza")) hasDisadvantage = true; // tecnicamente falha automática, mas desvantagem simula o malefício no rolamento provisoriamente
            }
          });
          
          if (entry.conditionApplied && entry.conditionApplied.toLowerCase().includes("amedrontado")) {
             if (target.abilities?.some(a => a.name.includes("Bravura"))) {
                 hasAdvantage = true;
             }
          }
          
          let rollResult = Math.floor(Math.random() * 20) + 1;
          let rollMsg = `${rollResult}`;
          
          if (hasAdvantage && !hasDisadvantage) {
            const r2 = Math.floor(Math.random() * 20) + 1;
            rollResult = Math.max(rollResult, r2);
            rollMsg = `[${rollMsg}, ${r2}] Vantagem → ${rollResult}`;
          } else if (hasDisadvantage && !hasAdvantage) {
            const r2 = Math.floor(Math.random() * 20) + 1;
            rollResult = Math.min(rollResult, r2);
            rollMsg = `[${rollMsg}, ${r2}] Desvantagem → ${rollResult}`;
          }
          
          const total = rollResult + mod;
          const passed = total >= saveDC!;
          
          let resMsg = `(Rolou d20: ${rollMsg} | Mod: ${mod}) = **${total}**`;
          if (passed) {
            addToLog(`🛡️ ${target.name} **PASSOU** no teste. ${resMsg}`, entry.actorName, 'system');
          } else {
            addToLog(`💥 ${target.name} **FALHOU** no teste! ${resMsg}`, entry.actorName, 'crit_fail');
            if (entry.conditionApplied) {
              addCondition(targetId, entry.conditionApplied);
              addToLog(`🤕 ${target.name} recebeu a condição: **${entry.conditionApplied}**`, 'Sistema', 'system');
            }
          }
        }
      });
      return;
    }

    let rollDetails = `d${entry.dieFaces}: ${entry.dieResult}`;
    if (entry.advantage === "advantage" && entry.rolls && entry.rolls.length >= 2) {
      rollDetails = `[${entry.rolls[0]}, ${entry.rolls[1]}] Vantagem → ${entry.dieResult}`;
    } else if (entry.advantage === "disadvantage" && entry.rolls && entry.rolls.length >= 2) {
      rollDetails = `[${entry.rolls[0]}, ${entry.rolls[1]}] Desvantagem → ${entry.dieResult}`;
    }

    let msg = `rolou ${rollDetails} ${entry.modifier !== 0 ? (entry.modifier > 0 ? '+ ' : '- ') + Math.abs(entry.modifier) : ''} = **${entry.total}**`;
    
    if (entry.isCritical) msg += ' 💥 CRÍTICO!';
    if (entry.isCritFail) msg += ' 💀 Falha Crítica!';

    if (rollMode === "free") {
      triggerRollEvent({
        type: "check",
        result: entry.dieResult,
        total: entry.total,
        isCritical: entry.isCritical,
        isCritFail: entry.isCritFail,
        actorName: entry.actorName,
        formula: `d${entry.dieFaces}+${entry.modifier}`
      });
      addToLog(msg, entry.actorName, 'system');
      return;
    }

    if (rollMode === "damage") {
      triggerRollEvent({
        type: "damage",
        result: entry.dieResult,
        total: entry.total,
        isCritical: entry.isCritical,
        isCritFail: entry.isCritFail,
        actorName: entry.actorName,
        formula: pendingDamage ? `${pendingDamage.parsedDmg.dieCount}d${entry.dieFaces}+${entry.modifier}` : `d${entry.dieFaces}+${entry.modifier}`
      });
      if (combat.selectedTargetIds.length === 0) {
        addToLog(`⚠️ ${msg} (nenhum alvo selecionado)`, entry.actorName, 'system');
        return;
      }
      
      const damagedNames: string[] = [];
      combat.selectedTargetIds.forEach(targetId => {
        const target = combat.participants.find(p => p.refId === targetId);
        if (target) damagedNames.push(target.name);
      });
      
      const actor = combat.participants.find(p => p.name === entry.actorName);
      
      if (actor && pendingDamage) {
        const extras = computeExtraDamages(actor, pendingDamage.isCritical, entry.advantage);
        let finalExtras = [...extras];
        if (actor.conditions?.some(c => c.toLowerCase() === 'destruição divina')) {
          const slotStr = await asyncPrompt("Destruição Divina ativa! Qual nível do espaço de magia você quer gastar? (1 a 5)");
          const slotLvl = parseInt(slotStr || "1");
          if (!isNaN(slotLvl) && slotLvl >= 1) {
            finalExtras.push(rollDivineSmite(slotLvl, pendingDamage.isCritical));
            const used = actor.spellSlotsUsed?.[slotLvl] || 0;
            updateParticipant(actor.refId, { 
              spellSlotsUsed: { ...(actor.spellSlotsUsed || {}), [slotLvl]: used + 1 }
            });
            addToLog(`Gastou 1 espaço de magia de Nível ${slotLvl} para Destruição Divina!`, actor.name, 'system');
          }
          removeCondition(actor.refId, 'Destruição Divina');
        }

        const logData = buildDamageLog(
          actor.name, 
          damagedNames.join(', '), 
          entry.total, 
          entry.rolls, 
          entry.modifier, 
          pendingDamage.parsedDmg.raw, 
          finalExtras, 
          pendingDamage.isCritical
        );
        
        combat.selectedTargetIds.forEach(targetId => {
          const isLifesteal = entry.isLifesteal || pendingAttack?.name?.toLowerCase().includes('[roubo de vida]') || pendingAttack?.name?.toLowerCase().includes('[lifesteal]') || pendingAttack?.name?.toLowerCase().includes('[cura]');
          applyDamage(targetId, logData.total, entry.damageType, entry.sourceId, isLifesteal);
          if (pendingAttack?.conditionApplied) {
            addCondition(targetId, pendingAttack.conditionApplied);
            addToLog(`🤕 Recebeu a condição: **${pendingAttack.conditionApplied}**`, damagedNames.join(', '), 'system');
          }
        });
        
        addToLog(`🩸 ${logData.message}`, entry.actorName, 'damage');
        
        if (actor.conditions?.some(c => c.toLowerCase() === 'furtivo ativo')) {
          removeCondition(actor.refId, 'Furtivo Ativo');
        }
        
        setPendingDamage(null);
        setPendingAttack(null);
        return;
      }

      if (pendingAttack && pendingAttack.bonus === "Auto" && combat.selectedTargetIds.length > 1) {
        const distStr = await asyncPrompt(`Dano Total: ${entry.total}. Você selecionou ${combat.selectedTargetIds.length} alvos.\nDigite os danos para cada alvo separados por vírgula na ordem em que foram selecionados.\n(Ex: se rolou 12 para 3 alvos, digite: 4, 4, 4)`);
        if (distStr) {
          const damages = distStr.split(',').map(n => parseInt(n.trim()) || 0);
          combat.selectedTargetIds.forEach((targetId, idx) => {
            const dmg = damages[idx] || 0;
            if (dmg > 0) {
              const isLifesteal = entry.isLifesteal || pendingAttack?.name?.toLowerCase().includes('[roubo de vida]') || pendingAttack?.name?.toLowerCase().includes('[lifesteal]') || pendingAttack?.name?.toLowerCase().includes('[cura]');
              applyDamage(targetId, dmg, entry.damageType, entry.sourceId, isLifesteal);
              const tName = combat.participants.find(p => p.refId === targetId)?.name;
              addToLog(`🩸 Míssil/Auto-Hit: causou **${dmg}** de dano em ${tName}!`, entry.actorName, 'damage');
              if (pendingAttack?.conditionApplied) {
                addCondition(targetId, pendingAttack.conditionApplied);
              }
            }
          });
          setPendingDamage(null);
          setPendingAttack(null);
          return;
        }
      }

      combat.selectedTargetIds.forEach(targetId => {
        const isLifesteal = entry.isLifesteal || pendingAttack?.name?.toLowerCase().includes('[roubo de vida]') || pendingAttack?.name?.toLowerCase().includes('[lifesteal]') || pendingAttack?.name?.toLowerCase().includes('[cura]');
        applyDamage(targetId, entry.total, entry.damageType, entry.sourceId, isLifesteal);
      });
      addToLog(`🩸 causou **${entry.total}** de dano em ${damagedNames.join(', ')}!`, entry.actorName, 'damage');
      setPendingDamage(null);
      setPendingAttack(null);
      return;
    }

    if (rollMode === "attack") {
      const atkName = pendingAttack ? pendingAttack.name : 'Arma Indefinida';
      const atkBonus = pendingAttack ? pendingAttack.bonus : `+${entry.modifier}`;
      const atkDmg = pendingAttack ? pendingAttack.dmg : '';

      let rollDetails = `d20: ${entry.dieResult}`;
      if (entry.advantage === "advantage" && entry.rolls && entry.rolls.length >= 2) {
        rollDetails = `[${entry.rolls[0]}, ${entry.rolls[1]}] Vantagem → ${entry.dieResult}`;
      } else if (entry.advantage === "disadvantage" && entry.rolls && entry.rolls.length >= 2) {
        rollDetails = `[${entry.rolls[0]}, ${entry.rolls[1]}] Desvantagem → ${entry.dieResult}`;
      }

      let baseMsg = `usou **${atkName}** (${rollDetails} | Mod: ${entry.modifier >= 0 ? '+' : ''}${entry.modifier} = **${entry.total}**)`;
      if (entry.isCritical) baseMsg += ' (💥 CRÍTICO)';
      if (entry.isCritFail) baseMsg += ' (💀 Falha Crítica)';

      let finalTargetsStatus: { name: string; status: 'hit' | 'miss' | 'pass' | 'fail' }[] = [];

      if (combat.selectedTargetIds.length === 0) {
        triggerRollEvent({
          type: "attack",
          result: entry.dieResult,
          total: entry.total,
          isCritical: entry.isCritical,
          isCritFail: entry.isCritFail,
          actorName: entry.actorName,
          formula: `d${entry.dieFaces}+${entry.modifier}`
        });
        addToLog(`⚔️ ${baseMsg}`, entry.actorName, type);
      } else {
        const hitLogs: string[] = [];
        const hitsToDispatch: any[] = [];
        
        for (const targetId of combat.selectedTargetIds) {
          const target = combat.participants.find(p => p.refId === targetId);
          if (target) {
            let effAc = target.ac;
            if (target.tempAc) effAc += target.tempAc;

            if (!entry.isCritical && !entry.isCritFail && entry.total >= effAc) {
              const shieldAb = target.abilities?.find(a => a.reactionTrigger === 'when_hit' && a.tempAcBonus);
              if (shieldAb && !target.reactionSpent && entry.total < effAc + shieldAb.tempAcBonus!) {
                let canCast = true;
                let slotLevel = shieldAb.spellLevel || 1;
                let isLegacy = false;
                if (shieldAb.resourceCost?.resourceName?.startsWith('Espaço Nível')) {
                  let availableSlot = -1;
                  for (let sl = slotLevel; sl <= 9; sl++) {
                    const m = target.spellSlots?.[sl] || 0;
                    const u = target.spellSlotsUsed?.[sl] || 0;
                    if (m - u > 0) {
                      availableSlot = sl;
                      break;
                    }
                  }
                  if (availableSlot === -1) {
                    const leg = target.classResources?.find(r => r.name === `Espaço Nível ${slotLevel}`);
                    if (!leg || leg.current <= 0) {
                      canCast = false;
                    } else {
                      isLegacy = true;
                    }
                  } else {
                    slotLevel = availableSlot;
                  }
                }
                
                if (canCast && await asyncConfirm(`[REAÇÃO] ${target.name} foi atingido (Ataque: ${entry.total} vs CA: ${effAc}).\nDeseja usar a Reação: ${shieldAb.name} para ganhar +${shieldAb.tempAcBonus} de CA e evitar o ataque?`)) {
                  const targetUpdates: any = { 
                    reactionSpent: true, 
                    tempAc: (target.tempAc || 0) + shieldAb.tempAcBonus!
                  };
                  if (shieldAb.resourceCost?.resourceName?.startsWith('Espaço Nível')) {
                    if (isLegacy) {
                      const newRes = [...(target.classResources || [])];
                      const idx = newRes.findIndex(r => r.name === `Espaço Nível ${shieldAb.spellLevel || 1}`);
                      if (idx >= 0) newRes[idx].current -= 1;
                      targetUpdates.classResources = newRes;
                    } else {
                      const used = target.spellSlotsUsed?.[slotLevel] || 0;
                      targetUpdates.spellSlotsUsed = { ...(target.spellSlotsUsed || {}), [slotLevel]: used + 1 };
                    }
                  }
                  updateParticipant(target.refId, targetUpdates);
                  effAc += shieldAb.tempAcBonus!;
                  addToLog(`🛡️ **${target.name}** usou **${shieldAb.name}** como reação!`, 'Sistema', 'system');
                }
              }
            }

            if (entry.isCritical || (!entry.isCritFail && entry.total >= effAc)) {
              finalTargetsStatus.push({ name: target.name, status: 'hit' });
              hitLogs.push(`🎯 Acertou ${target.name}`);
              hitsToDispatch.push({
                target,
                res: { rollResult: entry.dieResult, total: entry.total, isCritical: entry.isCritical, isCritFail: entry.isCritFail },
                atk: { name: atkName, bonus: atkBonus, dmg: atkDmg },
                advantageType: entry.advantage
              });
            } else {
              finalTargetsStatus.push({ name: target.name, status: 'miss' });
              hitLogs.push(`❌ Errou ${target.name}`);
            }
          }
        }
        
        triggerRollEvent({
          type: "attack",
          result: entry.dieResult,
          total: entry.total,
          isCritical: entry.isCritical,
          isCritFail: entry.isCritFail,
          actorName: entry.actorName,
          formula: `d${entry.dieFaces}+${entry.modifier}`,
          targetsStatus: finalTargetsStatus
        });
        
        addToLog(`⚔️ ${baseMsg}`, entry.actorName, type);
        
        if (hitsToDispatch.length > 0) {
          if (pendingAttack && pendingAttack.dmg) {
            const parsed = parseDmgString(pendingAttack.dmg);
            if (pendingAttack.name.toLowerCase().includes('[roubo de vida]') || pendingAttack.name.toLowerCase().includes('[lifesteal]') || pendingAttack.name.toLowerCase().includes('[cura]')) {
              parsed.isLifesteal = true;
            }
            setPendingDamage({
              isCritical: entry.isCritical,
              parsedDmg: parsed
            });
          }
        }
      }

      if (pendingAttack && entry.actorName === participant.name) {
        const isFurtivo = participant.conditions?.some(c => ['furtivo', 'escondido', 'invisível'].includes(c.toLowerCase()));
        if (isFurtivo) {
          ['Furtivo', 'Escondido', 'Invisível', 'furtivo', 'escondido', 'invisível'].forEach(sc => {
            if (participant.conditions?.includes(sc)) removeCondition(participant.refId, sc);
          });
          addToLog(`revelou sua posição ao atacar.`, participant.name, 'system');
        }
      }

      setPendingAttack(null);
    }
  };

  const handleAction = (type: 'action' | 'bonus' | 'reaction' | 'movement') => {
    if (!canAct) return;
    if (type === 'action' && participant.actionSpent) return alert("Ação Principal já gasta!");
    if (type === 'bonus' && participant.bonusActionSpent) return alert("Ação Bônus já gasta!");
    if (type === 'reaction' && participant.reactionSpent) return alert("Reação já gasta!");
    if (type === 'movement' && participant.movementSpent) return alert("Movimento já gasto!");

    let updates: any = {};
    if (type === 'action') updates.actionSpent = true;
    if (type === 'bonus') updates.bonusActionSpent = true;
    if (type === 'reaction') updates.reactionSpent = true;
    if (type === 'movement') updates.movementSpent = true;
    
    updateParticipant(participant.refId, updates);
  };

  const handleAttack = (atk: any) => {
    if (!canAct) return;
    
    if (atk.actionCost) {
      if (atk.actionCost === 'action' && participant.actionSpent) return alert("Ação Principal já gasta!");
      if (atk.actionCost === 'bonus' && participant.bonusActionSpent) return alert("Ação Bônus já gasta!");
      if (atk.actionCost === 'reaction' && participant.reactionSpent) return alert("Reação já gasta!");
    } else {
      const maxAttacks = getMaxAttacks(participant);
      const currentAttacks = participant.attacksMade || 0;
      if (currentAttacks >= maxAttacks) return alert("Você já usou sua Ação Principal e todos os Ataques Extras!");
    }

    let consumedResourceName = '';
    let consumedResourceAmount = 0;
    let isSpellSlot = false;
    let spellLevel = 0;

    // Check for spell slots via spellLevel (if added to attacks) or resourceCost
    if (atk.spellLevel !== undefined && atk.spellLevel > 0) {
      consumedResourceName = `Espaço Nível ${atk.spellLevel}`;
      consumedResourceAmount = atk.resourceCost?.amount || 1;
      isSpellSlot = true;
      spellLevel = atk.spellLevel;
    } else if (atk.resourceCost?.resourceName?.startsWith('Espaço Nível')) {
      consumedResourceName = atk.resourceCost.resourceName;
      consumedResourceAmount = atk.resourceCost.amount || 1;
      isSpellSlot = true;
      spellLevel = parseInt(consumedResourceName.replace('Espaço Nível ', ''));
    } else if (atk.resourceCost?.resourceName) {
      consumedResourceName = atk.resourceCost.resourceName;
      consumedResourceAmount = atk.resourceCost.amount || 1;
    }

    if (consumedResourceName) {
      if (isSpellSlot) {
        const max = participant.spellSlots?.[spellLevel] || 0;
        const used = participant.spellSlotsUsed?.[spellLevel] || 0;
        if (max - used < consumedResourceAmount) {
          return alert(`Recurso Insuficiente: ${consumedResourceName} (Atual: ${max - used}, Necessário: ${consumedResourceAmount})`);
        }
      } else {
        const res = participant.classResources?.find(r => r.name === consumedResourceName);
        if (!res || res.current < consumedResourceAmount) {
          return alert(`Recurso Insuficiente: ${consumedResourceName} (Atual: ${res?.current || 0}, Necessário: ${consumedResourceAmount})`);
        }
      }
    }

    let updates: any = {};
    if (atk.actionCost) {
      if (atk.actionCost === 'action') updates.actionSpent = true;
      if (atk.actionCost === 'bonus') updates.bonusActionSpent = true;
      if (atk.actionCost === 'reaction') updates.reactionSpent = true;
    } else {
      updates.actionSpent = true;
      updates.attacksMade = (participant.attacksMade || 0) + 1;
    }
    
    if (consumedResourceName) {
      if (isSpellSlot) {
        const used = participant.spellSlotsUsed?.[spellLevel] || 0;
        updates.spellSlotsUsed = { ...(participant.spellSlotsUsed || {}), [spellLevel]: used + consumedResourceAmount };
      } else {
        const resIdx = participant.classResources?.findIndex(r => r.name === consumedResourceName);
        if (resIdx !== undefined && resIdx >= 0) {
          const newResources = [...(participant.classResources || [])];
          newResources[resIdx].current -= consumedResourceAmount;
          updates.classResources = newResources;
        }
      }
    }

    if (Object.keys(updates).length > 0) updateParticipant(participant.refId, updates);
    setPendingAttack(atk);
    setShowDicePanel(true);
    
    if (combat.selectedTargetIds.length === 0) {
      setIsTargeting(true);
    } else {
      setIsTargeting(false);
    }
  };

  const handleAbility = async (ab: any) => {
    if (!canAct) return;
    if (ab.actionCost) {
      if (ab.actionCost === 'action' && participant.actionSpent) return alert("Ação Principal já gasta!");
      if (ab.actionCost === 'bonus' && participant.bonusActionSpent) return alert("Ação Bônus já gasta!");
      if (ab.actionCost === 'reaction' && participant.reactionSpent) return alert("Reação já gasta!");
    }

    let consumedResourceName = '';
    let consumedResourceAmount = 0;
    let isSpellSlot = false;
    let spellLevel = 0;

    // Check for spell slots via spellLevel
    if (ab.spellLevel !== undefined && ab.spellLevel > 0) {
      consumedResourceName = `Espaço Nível ${ab.spellLevel}`;
      consumedResourceAmount = ab.resourceCost?.amount || 1;
      isSpellSlot = true;
      spellLevel = ab.spellLevel;
    } else if (ab.resourceCost?.resourceName?.startsWith('Espaço Nível')) {
      consumedResourceName = ab.resourceCost.resourceName;
      consumedResourceAmount = ab.resourceCost.amount || 1;
      isSpellSlot = true;
      spellLevel = parseInt(consumedResourceName.replace('Espaço Nível ', ''));
    } else if (ab.resourceCost?.resourceName) {
      consumedResourceName = ab.resourceCost.resourceName;
      consumedResourceAmount = ab.resourceCost.amount || 1;
    }

    if (consumedResourceName) {
      if (isSpellSlot) {
        const max = participant.spellSlots?.[spellLevel] || 0;
        const used = participant.spellSlotsUsed?.[spellLevel] || 0;
        if (max - used < consumedResourceAmount) {
          return alert(`Recurso Insuficiente: ${consumedResourceName} (Atual: ${max - used}, Necessário: ${consumedResourceAmount})`);
        }
      } else {
        const res = participant.classResources?.find(r => r.name === consumedResourceName);
        if (!res || res.current < consumedResourceAmount) {
          return alert(`Recurso Insuficiente: ${consumedResourceName} (Atual: ${res?.current || 0}, Necessário: ${consumedResourceAmount})`);
        }
      }
    }

    let updates: any = {};
    if (ab.actionCost === 'action') updates.actionSpent = true;
    if (ab.actionCost === 'bonus') updates.bonusActionSpent = true;
    if (ab.actionCost === 'reaction') updates.reactionSpent = true;
    
    if (consumedResourceName) {
      if (isSpellSlot) {
        const used = participant.spellSlotsUsed?.[spellLevel] || 0;
        updates.spellSlotsUsed = { ...(participant.spellSlotsUsed || {}), [spellLevel]: used + consumedResourceAmount };
      } else {
        const resIdx = participant.classResources?.findIndex(r => r.name === consumedResourceName);
        if (resIdx !== undefined && resIdx >= 0) {
          const newResources = [...(participant.classResources || [])];
          newResources[resIdx].current -= consumedResourceAmount;
          updates.classResources = newResources;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      updateParticipant(participant.refId, updates);
    }

    if (ab.conditionApplied && (ab.effect === 'buff' || ab.targetType === 'self' || ab.description?.toLowerCase().includes('si mesmo'))) {
      let durRounds: number | undefined;
      if (ab.duration) {
        const dStr = ab.duration.toLowerCase();
        if (dStr.includes('minuto')) {
          const match = dStr.match(/\d+/);
          durRounds = match ? parseInt(match[0]) * 10 : 10;
        } else if (dStr.includes('hora')) {
          const match = dStr.match(/\d+/);
          durRounds = match ? parseInt(match[0]) * 600 : 600;
        } else if (dStr.includes('turno') || dStr.includes('rodada')) {
          const match = dStr.match(/\d+/);
          durRounds = match ? parseInt(match[0]) : 1;
        }
      }
      addCondition(participant.refId, ab.conditionApplied);
      addToLog(`Recebeu a condição: **${ab.conditionApplied}** ${durRounds ? `(Duração: ${durRounds} rodadas)` : ''}`, participant.name, 'system');
    }

    const nameLower = ab.name.toLowerCase();
    if (nameLower === 'ataque furtivo') {
      addCondition(participant.refId, 'Furtivo Ativo');
      addToLog(`Preparou um Ataque Furtivo!`, participant.name, 'system');
    } else if (nameLower === 'golpe descuidado' || nameLower === 'ataque temerário') {
      addCondition(participant.refId, 'Ataque Temerário');
      addToLog(`O próximo ataque terá Vantagem!`, participant.name, 'system');
    } else if (nameLower === 'esquiva prodigiosa') {
      addCondition(participant.refId, 'Esquiva Prodigiosa');
      addToLog(`Próximo dano será reduzido à metade!`, participant.name, 'system');
    } else if (nameLower === 'segundo vento') {
      const level = parseInt(participant.playerLevel?.toString() || '1');
      const healRoll = Math.floor(Math.random() * 10) + 1;
      const healTotal = healRoll + level;
      applyHeal(participant.refId, healTotal);
      addToLog(`Recuperou **${healTotal}** PV (d10: ${healRoll} + Nv: ${level})!`, participant.name, 'heal');
    } else if (nameLower === 'cura pelas mãos') {
      if (combat.selectedTargetIds.length === 0) {
        // Se não houver alvo, forçamos o modo alvo
        setPendingAttack({ name: 'Cura pelas Mãos (PV)', bonus: "0", dmg: "" });
        setShowDicePanel(true);
        setIsTargeting(true);
        return;
      }
      const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
      if (!pRes || pRes.current <= 0) return;
      const input = await asyncPrompt(`Quantos pontos deseja usar? (Max: ${pRes.current})`);
      const healAmount = parseInt(input || "0");
      if (isNaN(healAmount) || healAmount <= 0) return;
      if (healAmount > pRes.current) return alert("Não tem pontos suficientes.");
      
      const newResources = [...(participant.classResources || [])];
      const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
      newResources[resIdx].current -= healAmount;
      updateParticipant(participant.refId, { classResources: newResources });
      
      combat.selectedTargetIds.forEach(targetId => {
        applyHeal(targetId, healAmount);
        const t = combat.participants.find(p => p.refId === targetId);
        addToLog(`curou **${t?.name}** em ${healAmount} PV.`, participant.name, 'heal');
      });
    } else if (nameLower === 'smite divino' || nameLower === 'destruição divina') {
      addCondition(participant.refId, 'Destruição Divina');
      addToLog(`A arma brilhou com poder Divino!`, participant.name, 'system');
    } else if (nameLower === 'atleta incomparável') {
      const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'canalizar divindade');
      if (!pRes || pRes.current <= 0) return alert("Não possui usos de Canalizar Divindade.");
      const newResources = [...(participant.classResources || [])];
      const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'canalizar divindade');
      newResources[resIdx].current -= 1;
      updateParticipant(participant.refId, { classResources: newResources });
      
      addCondition(participant.refId, 'Atleta Incomparável', 100);
      addToLog(`usou **Atleta Incomparável**! Ganhou vantagem em Atletismo, Acrobacia e pulos estendidos por 10 minutos.`, participant.name, 'system');
    } else if (nameLower === 'destruição inspiradora') {
      if (combat.selectedTargetIds.length === 0) return alert("Selecione os aliados no tabuleiro que receberão os PVs Temporários!");
      
      const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'canalizar divindade');
      if (!pRes || pRes.current <= 0) return alert("Não possui usos de Canalizar Divindade.");
      const newResources = [...(participant.classResources || [])];
      const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'canalizar divindade');
      newResources[resIdx].current -= 1;
      updateParticipant(participant.refId, { classResources: newResources });
      
      const level = parseInt(participant.playerLevel?.toString() || '1');
      const r1 = Math.floor(Math.random() * 8) + 1;
      const r2 = Math.floor(Math.random() * 8) + 1;
      const pool = r1 + r2 + level;
      
      const targets = combat.participants.filter(p => combat.selectedTargetIds.includes(p.refId));
      if (targets.length === 1) {
        const t = targets[0];
        const newTemp = Math.max(t.tempHp || 0, pool);
        updateParticipant(t.refId, { tempHp: newTemp });
        addToLog(`usou **Destruição Inspiradora**! Concedeu **${pool} PVs Temporários** para **${t.name}** (2d8: ${r1}+${r2} + Nv: ${level}).`, participant.name, 'heal');
      } else {
        const amountPerTarget = Math.floor(pool / targets.length);
        targets.forEach(t => {
          const newTemp = Math.max(t.tempHp || 0, amountPerTarget);
          updateParticipant(t.refId, { tempHp: newTemp });
        });
        const names = targets.map(t => t.name).join(', ');
        addToLog(`usou **Destruição Inspiradora**! Dividiu **${pool} PVs Temporários** (2d8: ${r1}+${r2} + Nv: ${level}) entre: **${names}** (${amountPerTarget} para cada).`, participant.name, 'heal');
      }
    } else if (nameLower === 'surto de ação') {
      updateParticipant(participant.refId, { actionSpent: false, attacksMade: 0 });
      addToLog(`Recuperou sua Ação Principal!`, participant.name, 'system');
    } else if (nameLower === 'chuva de golpes') {
      updateParticipant(participant.refId, { flurryUsed: true, bonusActionSpent: true });
      addToLog(`Pode realizar 2 ataques desarmados adicionais!`, participant.name, 'system');
    } else if (nameLower === 'defesa paciente') {
      addCondition(participant.refId, 'Esquiva');
      updateParticipant(participant.refId, { bonusActionSpent: true });
      addToLog(`Assumiu postura defensiva (Ataques contra você têm Desvantagem)!`, participant.name, 'system');
    } else if (nameLower === 'passo do vento') {
      updateParticipant(participant.refId, { bonusActionSpent: true });
      addToLog(`Pode usar Disparada ou Desengajar como Ação Bônus!`, participant.name, 'system');
    } else if (nameLower === 'técnica da mão aberta' || nameLower === 'tecnica da mao aberta') {
      if (combat.selectedTargetIds.length === 0) return alert("Selecione um alvo no tabuleiro primeiro!");
      const targetId = combat.selectedTargetIds[0];
      const target = combat.participants.find(p => p.refId === targetId);
      if (!target) return;
      
      const prof = parseInt(participant.profBonus?.toString().replace('+','') || "2");
      const modWis = Math.floor(((participant.wis || 10) - 10) / 2);
      const saveDC = 8 + prof + modWis;
      
      const choice = await asyncPrompt("Efeito da Técnica (Derrubar / Empurrar / Remover Reação):", "Derrubar");
      if (!choice) return;
      
      const eff = choice.toLowerCase();
      let saveAttr = 'Destreza';
      if (eff.includes('empurrar')) saveAttr = 'Força';
      
      if (eff.includes('reacao') || eff.includes('reação') || eff.includes('remover')) {
        addToLog(`💥 O alvo não pode usar Reações até o fim do próximo turno do Monge.`, participant.name, 'system');
        addCondition(targetId, 'Sem Reação', 1);
        return;
      }
      
      let statVal = saveAttr === 'Força' ? target.str : target.dex;
      let targetMod = Math.floor((statVal - 10) / 2);
      if (target.saves?.some(s => s.toLowerCase() === saveAttr.toLowerCase())) {
        targetMod += target.profBonus;
      }
      
      const rollResult = Math.floor(Math.random() * 20) + 1;
      const total = rollResult + targetMod;
      const passed = total >= saveDC;
      
      let resMsg = `(Rolou d20: ${rollResult} + Mod: ${targetMod}) = **${total}** vs CD ${saveDC}`;
      if (passed) {
        addToLog(`🛡️ ${target.name} resistiu à Técnica da Mão Aberta! ${resMsg}`, participant.name, 'system');
      } else {
        addToLog(`💥 ${target.name} falhou no teste de ${saveAttr} contra a Técnica! ${resMsg}`, participant.name, 'crit_fail');
        if (eff.includes('derrubar')) {
          addCondition(targetId, 'Caído');
          addToLog(`🤕 ${target.name} foi Derrubado e está Caído!`, 'Sistema', 'system');
        } else if (eff.includes('empurrar')) {
          addToLog(`🌪️ ${target.name} foi empurrado 4,5m (15ft) para trás!`, 'Sistema', 'system');
        }
      }
      return;
    } else if (nameLower === 'mãos que curam / mãos de dano') {
      const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'pontos de ki');
      if (!pRes || pRes.current <= 0) {
        return alert("Não possui Pontos de Ki suficientes.");
      }
      setMercyMonkUI({ active: true, mode: null, selectedTargetId: null });
      return;
      

    } else {
      addToLog(`usou a habilidade: **${ab.name}**`, participant.name, 'system');
    }

    if (ab.dmg || ab.savingThrow || ab.description?.toLowerCase().includes('teste de resistência')) {
      let saveAttr;
      let saveDC;
      
      if (ab.savingThrow) {
        const attrMap: Record<string, string> = {
          'for': 'Força', 'des': 'Destreza', 'con': 'Constituição',
          'int': 'Inteligência', 'sab': 'Sabedoria', 'car': 'Carisma'
        };
        saveAttr = attrMap[ab.savingThrow.toLowerCase()] || ab.savingThrow;
        
        const prof = parseInt(participant.profBonus?.toString().replace('+','') || "2");
        let mod = 0;
        if (participant.spellcastingAbility) {
          const statVal = (participant as any)[participant.spellcastingAbility] || 10;
          mod = Math.floor((statVal - 10) / 2);
        } else {
          const modInt = Math.floor(((participant.int || 10) - 10) / 2);
          const modWis = Math.floor(((participant.wis || 10) - 10) / 2);
          const modCha = Math.floor(((participant.cha || 10) - 10) / 2);
          mod = Math.max(modInt, modWis, modCha);
        }
        saveDC = ab.saveDC || (8 + prof + mod);
      }

      // Mísseis Mágicos bypass the d20 roll
      const nLower = ab.name.toLowerCase();
      const isAutoHit = nLower.includes('míssil mágico') || nLower.includes('mísseis mágicos') || nLower.includes('missil magico') || nLower.includes('misseis magicos') || nLower.includes('magic missile') || ab.description?.toLowerCase().includes('acerta automaticamente');
      
      let spellAttackBonus = 0;
      if (!isAutoHit && !ab.savingThrow && ab.spellLevel !== undefined && ab.spellLevel >= 0) {
        const prof = parseInt(participant.profBonus?.toString().replace('+','') || "2");
        let mod = 0;
        if (participant.spellcastingAbility) {
          const statVal = (participant as any)[participant.spellcastingAbility] || 10;
          mod = Math.floor((statVal - 10) / 2);
        } else {
          const modInt = Math.floor(((participant.int || 10) - 10) / 2);
          const modWis = Math.floor(((participant.wis || 10) - 10) / 2);
          const modCha = Math.floor(((participant.cha || 10) - 10) / 2);
          mod = Math.max(modInt, modWis, modCha);
        }
        spellAttackBonus = prof + mod;
      }
      
      const pAtk: any = {
        name: ab.name,
        bonus: isAutoHit ? "Auto" : ((ab.spellLevel !== undefined && spellAttackBonus > 0) ? `+${spellAttackBonus}` : "0"),
        dmg: ab.dmg || "",
        conditionApplied: ab.conditionApplied,
        saveAttr: saveAttr,
        saveDC: saveDC,
        durationRounds: ab.duration,
        spellLevel: ab.spellLevel,
        damageType: ab.dmgType || 'force'
      };

      setPendingAttack(pAtk);

      if (isAutoHit && ab.dmg) {
        if (combat.selectedTargetIds.length > 0) {
          // Special UI for assigning darts
          const totalDarts = 2 + (ab.spellLevel || 1);
          setMagicMissileUI({
            active: true,
            abilityName: ab.name,
            dmgStr: ab.dmg,
            totalDarts,
            targets: combat.selectedTargetIds.map(id => ({
              refId: id,
              name: combat.participants.find(p => p.refId === id)?.name || 'Alvo',
              darts: 0
            })),
            damageType: ab.dmgType || 'force',
            conditionApplied: ab.conditionApplied,
            actorName: participant.name
          });
          return; // Skip setting pending attack/dice panel
        } else {
          const parsed = parseDmgString(ab.dmg);
          if (ab.name.toLowerCase().includes('[roubo de vida]') || ab.name.toLowerCase().includes('[lifesteal]') || ab.name.toLowerCase().includes('[cura]')) {
            parsed.isLifesteal = true;
          }
          setPendingDamage({
            isCritical: false,
            parsedDmg: parsed
          });
        }
      }

      setShowDicePanel(true);
      if (combat.selectedTargetIds.length === 0) {
        setIsTargeting(true);
      } else {
        setIsTargeting(false);
      }
    }
  };

  const handleGeneralAction = async (act: string) => {
    if (!canAct) return;
    
    if (act === 'Reação') {
      if (participant.reactionSpent) return;
      const reaction = await asyncPrompt("Descreva a Reação:", "Ataque de Oportunidade");
      if (reaction) {
        updateParticipant(participant.refId, { reactionSpent: true });
        addToLog(`usou Reação: ${reaction}.`, participant.name, 'system');
      }
      return;
    }

    const isBonus = (participant.playerClass?.toLowerCase().includes('ladino') && ['Disparada', 'Desengajar', 'Esconder'].includes(act)) ||
                    (participant.playerClass?.toLowerCase().includes('monge') && ['Disparada', 'Desengajar'].includes(act));
    
    if (isBonus && participant.bonusActionSpent) return alert("Ação Bônus já gasta!");
    if (!isBonus && participant.actionSpent) return alert("Ação Principal já gasta!");

    if (isBonus) updateParticipant(participant.refId, { bonusActionSpent: true });
    else updateParticipant(participant.refId, { actionSpent: true });

    if (act === 'Esconder') {
      addToLog(`está tentando se esconder... (Role Furtividade e aplique a condição se for bem-sucedido)`, participant.name, 'system');
      setPendingAttack({
        name: "Teste de Furtividade (Esconder)",
        bonus: "0", // O jogador/mestre deve ajustar o modificador no painel
        dmg: ""
      });
      setShowDicePanel(true);
    } else {
      addToLog(`usou ${act}${isBonus ? ' (Ação Bônus)' : ''}.`, participant.name, 'system');
    }
  };

  const maxAttacks = getMaxAttacks(participant);
  const currentAttacks = participant.attacksMade || 0;
  
  const activeAbilities = (participant.abilities || []); // Mostrar todas, inclusive passivas (para engatilhar Furtivo etc)
  const passiveAbilities: Ability[] = [];

  return (
    <>
      <style>{`
        .tam-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .tam-container {
          background: #15151e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 800px; /* Reduced from 6xl to make it smaller and more compact */
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: width 0.3s ease;
        }
        .tam-container.with-dice {
          max-width: 1100px;
          flex-direction: row;
        }
        .tam-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }
        .tam-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }
        .tam-avatar {
          width: 60px; height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent-primary, #6366f1);
          background: #1e1e2d;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: bold;
        }
        .tam-info {
          flex: 1;
        }
        .tam-name {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tam-badge {
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .badge-fury { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
        .badge-conc { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
        .tam-stats {
          display: flex; gap: 20px;
        }
        .tam-stat {
          display: flex; flex-direction: column;
        }
        .tam-stat-label { font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; font-weight: bold; }
        .tam-stat-value { font-size: 1.1rem; font-weight: bold; color: #fff; }
        .tam-stat-value.hp { color: #4ade80; }
        
        .tam-close {
          position: absolute; right: 20px; top: 20px;
          background: transparent; border: none; color: #9ca3af;
          font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 50%;
        }
        .tam-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
        
        .tam-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .tam-section-title {
          font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;
          margin-bottom: 12px; display: block;
        }
        .tam-actions-grid {
          display: flex; flex-wrap: wrap; gap: 12px;
          background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
        }
        .tam-action-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 8px; border: 1px solid transparent;
          cursor: pointer; transition: all 0.2s; font-weight: 500; font-size: 0.9rem;
        }
        .tam-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Action Types Colors */
        .btn-act { background: rgba(30, 58, 138, 0.3); border-color: rgba(59, 130, 246, 0.4); color: #bfdbfe; }
        .btn-act:hover:not(:disabled) { background: rgba(30, 58, 138, 0.5); }
        .btn-act.spent { background: rgba(30, 58, 138, 0.1); border-color: rgba(59, 130, 246, 0.1); color: #6b7280; }
        
        .btn-bonus { background: rgba(20, 83, 45, 0.3); border-color: rgba(34, 197, 94, 0.4); color: #bbf7d0; }
        .btn-bonus:hover:not(:disabled) { background: rgba(20, 83, 45, 0.5); }
        .btn-bonus.spent { background: rgba(20, 83, 45, 0.1); border-color: rgba(34, 197, 94, 0.1); color: #6b7280; }
        
        .btn-react { background: rgba(88, 28, 135, 0.3); border-color: rgba(168, 85, 247, 0.4); color: #e9d5ff; }
        .btn-react:hover:not(:disabled) { background: rgba(88, 28, 135, 0.5); }
        .btn-react.spent { background: rgba(88, 28, 135, 0.1); border-color: rgba(168, 85, 247, 0.1); color: #6b7280; }
        
        .btn-move { background: rgba(113, 63, 18, 0.3); border-color: rgba(234, 179, 8, 0.4); color: #fef08a; }
        .btn-move:hover:not(:disabled) { background: rgba(113, 63, 18, 0.5); }
        .btn-move.spent { background: rgba(113, 63, 18, 0.1); border-color: rgba(234, 179, 8, 0.1); color: #6b7280; }

        .tam-attacks-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
        }
        .tam-atk-btn {
          background: rgba(127, 29, 29, 0.2); border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 8px; padding: 12px; text-align: left; cursor: pointer; transition: 0.2s;
        }
        .tam-atk-btn:hover:not(:disabled) { background: rgba(127, 29, 29, 0.4); border-color: rgba(248, 113, 113, 0.5); }
        .tam-atk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .tam-atk-title { font-weight: bold; color: #fecaca; margin-bottom: 4px; font-size: 0.95rem; }
        .tam-atk-desc { font-size: 0.8rem; color: #9ca3af; }
        .tam-atk-desc span { color: #fff; }
        
        .tam-general-btns { display: flex; flex-wrap: wrap; gap: 10px; }
        .tam-gen-btn {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db;
          padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
        }
        .tam-gen-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
        .tam-gen-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .tam-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 600px) { .tam-row { grid-template-columns: 1fr; } }
        
        .tam-card { background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .tam-condition {
          display: inline-flex; align-items: center; gap: 4px; background: rgba(127, 29, 29, 0.4);
          border: 1px solid rgba(239, 68, 68, 0.5); color: #fecaca; padding: 4px 10px; border-radius: 16px; font-size: 0.8rem; margin: 0 6px 6px 0;
        }
        .tam-condition button { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.7; }
        .tam-condition button:hover { opacity: 1; }
        
        .tam-resource { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .tam-resource-name { font-size: 0.85rem; color: #d1d5db; }
        .tam-resource-pips { display: flex; gap: 4px; align-items: center; }
        .tam-pip { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #f97316; cursor: pointer; }
        .tam-pip.active { background: #f97316; }
        .tam-pip.empty { background: transparent; }

        .tam-lore { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px; }
        .tam-lore-item { background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.03); }
        .tam-lore-title { font-weight: bold; color: #a5b4fc; font-size: 0.9rem; margin-bottom: 4px; }
        .tam-lore-text { font-size: 0.85rem; color: #9ca3af; line-height: 1.5; white-space: pre-wrap; }

        .tam-footer {
          padding: 16px 24px; background: rgba(0,0,0,0.5); border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; justify-content: flex-end; position: sticky; bottom: 0;
        }
        .tam-btn-end {
          background: linear-gradient(90deg, #ca8a04, #eab308); color: #000; font-weight: bold;
          padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 0 15px rgba(234, 179, 8, 0.4);
        }
        .tam-btn-end:hover { filter: brightness(1.1); }

        .tam-dice-side {
          width: 380px; border-left: 1px solid rgba(255,255,255,0.1); background: #0c0c12;
          display: flex; flex-direction: column; position: relative;
        }
        
        .tam-targeting {
          padding: 20px; display: flex; flex-direction: column; gap: 16px; height: 100%;
        }
        .tam-target-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; overflow-y: auto; flex: 1;
        }
        .tam-target-card {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          padding: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;
        }
        .tam-target-card:hover { background: rgba(255,255,255,0.1); }
        .tam-target-card.selected { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
        .tam-target-card.selected-ally { border-color: #22c55e; background: rgba(34, 197, 94, 0.2); box-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }
        .tam-target-avatar {
          width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #333;
          display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;
        }
      `}</style>

      <div className="tam-overlay" onClick={onClose}>
        <div className={`tam-container ${showDicePanel ? 'with-dice' : ''}`} onClick={e => e.stopPropagation()}>
          
          <div className="tam-main">
            <div className="tam-header">
              {participant.image ? (
                <OptimizedImage src={participant.image} alt={participant.name} className="tam-avatar" />
              ) : (
                <div className="tam-avatar">{participant.name.charAt(0)}</div>
              )}
              
              <div className="tam-info">
                <h2 className="tam-name">
                  {participant.name}
                  {participant.combatTransformActive && <span className="tam-badge badge-fury">🐺 Forma Selvagem</span>}
                  {participant.isRaging && <span className="tam-badge badge-fury">🔥 Fúria</span>}
                  {participant.isConcentrating && <span className="tam-badge badge-conc">🌀 Concentração</span>}
                </h2>
                <div className="tam-stats">
                  <div className="tam-stat"><span className="tam-stat-label">HP</span><span className="tam-stat-value hp">{participant.hpCurrent} / {participant.hpMax}</span></div>
                  <div className="tam-stat"><span className="tam-stat-label">CA</span><span className="tam-stat-value">{participant.ac}</span></div>
                  <div className="tam-stat"><span className="tam-stat-label">Veloc</span><span className="tam-stat-value">{participant.speed}m</span></div>
                </div>
              </div>
              
              <button onClick={onClose} className="tam-close">✕</button>
            </div>

            <div className="tam-body">
              
              <div className="tam-actions-grid">
                <span className="tam-section-title" style={{ width: '100%', marginBottom: 0 }}>Ações do Turno</span>
                
                <button 
                  className={`tam-action-btn ${participant.actionSpent ? 'btn-act spent' : 'btn-act'}`}
                  onClick={() => handleAction('action')}
                  title={canAct ? "Clique para marcar como gasta manualmente" : undefined}
                  disabled={!canAct}
                >
                  ⚔️ Ação
                  {!participant.actionSpent && maxAttacks > 1 && (
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      {Array.from({ length: maxAttacks }).map((_, i) => (
                        <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i < currentAttacks ? 'rgba(255,255,255,0.2)' : '#fff' }} />
                      ))}
                    </div>
                  )}
                  {participant.actionSpent && <span>✓</span>}
                </button>

                <button 
                  className={`tam-action-btn ${participant.bonusActionSpent ? 'btn-bonus spent' : 'btn-bonus'}`}
                  onClick={() => handleAction('bonus')}
                  disabled={!canAct}
                >
                  ⚡ Bônus {participant.bonusActionSpent && <span>✓</span>}
                </button>

                <button 
                  className={`tam-action-btn ${participant.reactionSpent ? 'btn-react spent' : 'btn-react'}`}
                  onClick={() => handleAction('reaction')}
                  disabled={!hasPermission}
                >
                  🛡️ Reação {participant.reactionSpent && <span>✓</span>}
                </button>
                
                <button 
                  className={`tam-action-btn ${participant.movementSpent ? 'btn-move spent' : 'btn-move'}`}
                  onClick={() => handleAction('movement')}
                  disabled={!canAct}
                >
                  🏃 Mov {participant.movementSpent && <span>✓</span>}
                </button>
              </div>

              {participant.attacks && participant.attacks.length > 0 && (
                <div>
                  <span className="tam-section-title">Ataques</span>
                  <div className="tam-attacks-grid">
                    {participant.attacks.map((atk, idx) => {
                      const isReaction = atk.actionCost?.toLowerCase() === 'reação' || atk.actionCost?.toLowerCase() === 'reaction';
                      const canUseThisAction = hasPermission && (isActiveTurn || isReaction);
                      const isOutOfAttacks = !atk.actionCost && currentAttacks >= maxAttacks;
                      
                      return (
                        <button 
                          key={idx}
                          className="tam-atk-btn"
                          disabled={!canUseThisAction || isOutOfAttacks}
                          onClick={() => handleAttack(atk)}
                        >
                          <div className="tam-atk-title">{atk.name} {atk.actionCost ? `(${atk.actionCost})` : ''}</div>
                          <div className="tam-atk-desc">Atk: <span>{atk.bonus}</span> | Dano: <span>{atk.dmg}</span></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <span className="tam-section-title">Habilidades & Ações Gerais</span>
                <div className="tam-general-btns">
                  {participant.availableTransformation && (
                    <button
                      className="tam-gen-btn"
                      style={{ borderColor: 'rgba(34, 197, 94, 0.4)', background: 'rgba(21, 128, 61, 0.2)' }}
                      disabled={!canAct}
                      onClick={() => {
                        if (participant.combatTransformActive) {
                          transformParticipant(participant.refId, null);
                          addToLog(`reverteu para sua forma original!`, participant.name, 'system');
                        } else {
                          transformParticipant(participant.refId, participant.availableTransformation);
                          addToLog(`assumiu a forma de **${participant.availableTransformation.name}**!`, participant.name, 'system');
                        }
                      }}
                    >
                      {participant.combatTransformActive ? '👤 Reverter Forma' : '🐺 Forma Selvagem'}
                    </button>
                  )}
                  {activeAbilities.map((ab, idx) => {
                    const isReaction = ab.actionCost?.toLowerCase() === 'reação' || ab.actionCost?.toLowerCase() === 'reaction';
                    const canUseThisAbility = hasPermission && (isActiveTurn || isReaction);
                    
                    return (
                      <button 
                        key={`ab-${idx}`}
                        className="tam-gen-btn"
                        style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(79, 70, 229, 0.1)' }}
                        disabled={!canUseThisAbility}
                        onClick={() => handleAbility(ab)}
                        title={ab.description}
                      >
                        {ab.name} {ab.actionCost && ab.actionCost !== 'none' ? `[${ab.actionCost}]` : (ab.isPassive ? '[Passiva]' : '')}
                        {ab.resourceCost?.resourceName && <span style={{ color: '#fdba74', display: 'block', fontSize: '0.7rem' }}>Custo: {ab.resourceCost.amount} {ab.resourceCost.resourceName}</span>}
                      </button>
                    );
                  })}

                  {['Disparada', 'Desengajar', 'Esquiva', 'Esconder', 'Reação'].map(act => {
                    const isBonus = (participant.playerClass?.toLowerCase().includes('ladino') && act !== 'Reação' && act !== 'Esquiva') || 
                                    (participant.playerClass?.toLowerCase().includes('monge') && (act === 'Disparada' || act === 'Desengajar'));
                    const isReaction = act === 'Reação';
                    const canUseThisAction = hasPermission && (isActiveTurn || isReaction);
                                    
                    return (
                      <button 
                        key={act}
                        className="tam-gen-btn"
                        disabled={!canUseThisAction}
                        onClick={() => handleGeneralAction(act)}
                      >
                        {act} {isBonus ? <span style={{ color: '#4ade80' }}>(B)</span> : act === 'Reação' ? '' : <span style={{ color: '#60a5fa' }}>(A)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tam-row">
                <div className="tam-card">
                  <span className="tam-section-title">Condições Ativas</span>
                  <div>
                    {(participant.conditions || []).map(c => (
                      <div key={c} className="tam-condition">
                        {c}
                        {canAct && <button onClick={() => removeCondition(participant.refId, c)}>✕</button>}
                      </div>
                    ))}
                    {participant.isConcentrating && (
                      <div className="tam-condition" style={{ borderColor: '#a855f7', color: '#a855f7' }}>
                        Concentração: {participant.concentrationSpell || 'Magia'}
                        {canAct && <button onClick={() => updateParticipant(participant.refId, { isConcentrating: false, concentrationSpell: undefined })}>✕</button>}
                      </div>
                    )}
                    {(!participant.conditions || participant.conditions.length === 0) && !participant.isConcentrating && (
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>Nenhuma condição ativa.</span>
                    )}
                  </div>
                </div>

                {(!(!isGM && participant.combatFaction === 'enemy') && participant.classResources && participant.classResources.length > 0) && (
                  <div className="tam-card">
                    <span className="tam-section-title">Recursos</span>
                    <div>
                      {participant.classResources.map(res => (
                        <div key={res.id} className="tam-resource">
                          <span className="tam-resource-name">{res.name}</span>
                          <div className="tam-resource-pips">
                            {Array.from({ length: Math.min(res.max, 10) }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`tam-pip ${i < res.current ? 'active' : 'empty'}`}
                                onClick={() => {
                                  if (!canAct) return;
                                  const newResources = [...participant.classResources!];
                                  const idx = newResources.findIndex(r => r.id === res.id);
                                  newResources[idx].current = i < res.current ? i : i + 1;
                                  updateParticipant(participant.refId, { classResources: newResources });
                                }}
                              />
                            ))}
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', width: '30px', textAlign: 'right' }}>{res.current}/{res.max}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!(!isGM && participant.combatFaction === 'enemy') && participant.spellSlots && Object.values(participant.spellSlots).some(v => v > 0)) && (
                  <div className="tam-card">
                    <span className="tam-section-title">Espaços de Magia</span>
                    <div>
                      {Object.keys(participant.spellSlots).map(Number).sort((a, b) => a - b).filter(lvl => participant.spellSlots![lvl] > 0).map(lvl => {
                        const max = participant.spellSlots![lvl];
                        const used = participant.spellSlotsUsed?.[lvl] || 0;
                        const available = max - used;
                        return (
                          <div key={lvl} className="tam-resource">
                            <span className="tam-resource-name" style={{ color: '#c084fc' }}>Nível {lvl}</span>
                            <div className="tam-resource-pips">
                              {Array.from({ length: max }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`tam-pip ${i < available ? 'active' : 'empty'}`}
                                  style={i < available ? { borderColor: '#a855f7', background: '#a855f7' } : { borderColor: 'rgba(168, 85, 247, 0.3)' }}
                                  onClick={() => {
                                    if (!canAct) return;
                                    const newUsed = { ...(participant.spellSlotsUsed || {}) };
                                    if (i < available) {
                                      newUsed[lvl] = max - i;
                                    } else {
                                      newUsed[lvl] = max - (i + 1);
                                    }
                                    updateParticipant(participant.refId, { spellSlotsUsed: newUsed });
                                  }}
                                />
                              ))}
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af', width: '30px', textAlign: 'right' }}>{available}/{max}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="tam-lore">
                <span className="tam-section-title">📖 Referência Rápida</span>
                
                {participant.type === 'npc' ? (
                  <div>
                    <div className="tam-lore-item" style={{ borderLeft: '3px solid #ef4444' }}>
                      <span className="tam-lore-title">Ataque Principal</span>
                      <div className="tam-lore-text">{(participant as any).actions || "Nenhuma ação descritiva encontrada."}</div>
                    </div>
                    {(participant as any).otherActions && (
                      <div className="tam-lore-item" style={{ borderLeft: '3px solid #3b82f6' }}>
                        <span className="tam-lore-title">Outras Ações</span>
                        <div className="tam-lore-text">{(participant as any).otherActions}</div>
                      </div>
                    )}
                    {(participant as any).traits && (
                      <div className="tam-lore-item" style={{ borderLeft: '3px solid #eab308' }}>
                        <span className="tam-lore-title">Características</span>
                        <div className="tam-lore-text">{(participant as any).traits}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {(participant.abilities || []).map((ab, idx) => (
                      <div key={idx} className="tam-lore-item">
                        <span className="tam-lore-title">{ab.name} {ab.isPassive ? '(Passiva)' : ''}</span>
                        <div className="tam-lore-text">{ab.description || "Sem descrição."}</div>
                      </div>
                    ))}
                    {(!participant.abilities || participant.abilities.length === 0) && (
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>Nenhuma habilidade cadastrada.</span>
                    )}
                  </div>
                )}
              </div>

            </div>
            
            {isActiveTurn && canAct && (
              <div className="tam-footer">
                <button 
                  className="tam-btn-end"
                  onClick={() => {
                    addToLog(`encerrou seu turno.`, participant.name, 'system');
                    nextTurn();
                    onClose();
                  }}
                >
                  ⏭️ Fim de Turno
                </button>
              </div>
            )}
          </div>

          {showDicePanel && (
            <div className="tam-dice-side">
              <button 
                className="tam-close" 
                onClick={() => {
                  setShowDicePanel(false);
                  setIsTargeting(false);
                  setPendingAttack(null);
                  clearTargets();
                }} 
                style={{ zIndex: 10 }}
              >✕</button>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {isTargeting ? (
                  <div className="tam-targeting">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Selecione os Alvos</h3>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '8px' }}>Ação: {pendingAttack?.name}</p>
                    
                    {(() => {
                      const pName = pendingAttack?.name?.toLowerCase() || '';
                      const isHealOrBuff = pName.includes('cura') || pName.includes('curar') || pName.includes('bênção') || pName.includes('escudo') || pName.includes('palavra') || pName.includes('proteção');
                      
                      return (
                        <>
                          <div className="tam-target-grid">
                            {combat.participants.filter(p => {
                              if (p.isDead) return false;
                              const isMyAlly = participant.combatFaction === p.combatFaction;
                              if (isHealOrBuff) return isMyAlly;
                              return !isMyAlly; // Inimigos
                            }).map(t => {
                              const isSelected = combat.selectedTargetIds.includes(t.refId);
                              return (
                                <div 
                                  key={t.refId} 
                                  className={`tam-target-card ${isSelected ? (isHealOrBuff ? 'selected-ally' : 'selected') : ''}`}
                                  onClick={() => toggleTarget(t.refId)}
                                >
                                  {t.image ? (
                                    <OptimizedImage src={t.image} alt={t.name} className="tam-target-avatar" />
                                  ) : (
                                    <div className="tam-target-avatar">{t.name.charAt(0)}</div>
                                  )}
                                  <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                      HP: {(!isGM && t.combatFaction === 'enemy') ? '???' : `${t.hpCurrent}/${t.hpMax}`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <button 
                            className="tam-btn-end" 
                            style={{ 
                              width: '100%', marginTop: '16px', color: '#fff', 
                              background: isHealOrBuff ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #ef4444, #dc2626)', 
                              boxShadow: isHealOrBuff ? '0 0 15px rgba(34, 197, 94, 0.4)' : '0 0 15px rgba(239, 68, 68, 0.4)' 
                            }}
                            disabled={combat.selectedTargetIds.length === 0}
                            onClick={async () => {
                              if (combat.selectedTargetIds.length === 0) return alert("Selecione pelo menos um alvo!");
                              
                              if (pendingAttack?.name === 'Cura pelas Mãos (PV)') {
                                // Lógica especial atrasada da Cura pelas mãos pois requer alvo primeiro
                                const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
                                if (!pRes || pRes.current <= 0) return;
                                const input = await asyncPrompt(`Quantos pontos deseja usar? (Max: ${pRes.current})`);
                                const healAmount = parseInt(input || "0");
                                if (!isNaN(healAmount) && healAmount > 0 && healAmount <= pRes.current) {
                                  const newResources = [...(participant.classResources || [])];
                                  const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'cura pelas mãos (pv)');
                                  newResources[resIdx].current -= healAmount;
                                  updateParticipant(participant.refId, { classResources: newResources });
                                  
                                  combat.selectedTargetIds.forEach(targetId => {
                                    applyHeal(targetId, healAmount);
                                    const t = combat.participants.find(p => p.refId === targetId);
                                    addToLog(`curou **${t?.name}** em ${healAmount} PV.`, participant.name, 'heal');
                                  });
                                }
                                setShowDicePanel(false);
                                setIsTargeting(false);
                                setPendingAttack(null);
                                clearTargets();
                                return;
                              }
                              const isAutoHit = pendingAttack?.bonus === 'Auto';
                              if (isAutoHit && pendingAttack?.dmg) {
                                const nLower = pendingAttack.name.toLowerCase();
                                const isMagicMissile = nLower.includes('míssil mágico') || nLower.includes('mísseis mágicos') || nLower.includes('missil magico') || nLower.includes('misseis magicos') || nLower.includes('magic missile') || pendingAttack.description?.toLowerCase().includes('acerta automaticamente');
                                
                                if (isMagicMissile) {
                                  const totalDarts = 2 + ((pendingAttack as any).spellLevel || 1);
                                  setMagicMissileUI({
                                    active: true,
                                    abilityName: pendingAttack.name,
                                    dmgStr: pendingAttack.dmg,
                                    totalDarts,
                                    targets: combat.selectedTargetIds.map(id => ({
                                      refId: id,
                                      name: combat.participants.find(p => p.refId === id)?.name || 'Alvo',
                                      darts: 0
                                    })),
                                    damageType: (pendingAttack as any).damageType || 'force',
                                    conditionApplied: pendingAttack.conditionApplied,
                                    actorName: participant.name
                                  });
                                  
                                  setShowDicePanel(false);
                                  setIsTargeting(false);
                                  setPendingAttack(null);
                                  setPendingDamage(null);
                                  return;
                                }
                              }
                              
                              setIsTargeting(false);
                            }}
                          >
                            🎯 Confirmar Alvos
                          </button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <CombatDicePanel 
                    activeParticipant={participant}
                    participants={combat.participants.filter(p => !p.isDead)}
                    pendingAttack={pendingAttack}
                    onRoll={handleDiceRoll} 
                    pendingDamage={pendingDamage}
                  />
                )}
              </div>
            </div>
          )}

          {magicMissileUI?.active && (
            <div className="tam-dice-side" style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                className="tam-close" 
                onClick={() => {
                  setMagicMissileUI(null);
                  clearTargets();
                }} 
                style={{ zIndex: 10 }}
              >✕</button>
              <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>Mísseis Mágicos</h3>
                <p style={{ color: '#ccc', marginBottom: '16px', fontSize: '0.9rem' }}>Distribua os {magicMissileUI.totalDarts} dardos entre os alvos selecionados.</p>
                
                <div style={{ flex: 1 }}>
                  {magicMissileUI.targets.map((t, idx) => (
                    <div key={t.refId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{t.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={() => {
                          const newTargets = [...magicMissileUI.targets];
                          if (newTargets[idx].darts > 0) newTargets[idx].darts--;
                          setMagicMissileUI({...magicMissileUI, targets: newTargets});
                        }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#374151', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                        
                        <span style={{ color: '#60a5fa', width: '20px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>{t.darts}</span>
                        
                        <button onClick={() => {
                          const sum = magicMissileUI.targets.reduce((acc, curr) => acc + curr.darts, 0);
                          if (sum < magicMissileUI.totalDarts) {
                            const newTargets = [...magicMissileUI.targets];
                            newTargets[idx].darts++;
                            setMagicMissileUI({...magicMissileUI, targets: newTargets});
                          }
                        }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(79,70,229,0.5)' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                    Dardos Alocados: <span style={{ color: '#fff', fontWeight: 'bold' }}>{magicMissileUI.targets.reduce((acc, curr) => acc + curr.darts, 0)} / {magicMissileUI.totalDarts}</span>
                  </span>
                </div>

                <button
                  className="tam-btn-end"
                  style={{ 
                    marginTop: '20px', 
                    background: 'linear-gradient(90deg, #4f46e5, #4338ca)', 
                    color: '#fff',
                    width: '100%',
                    padding: '16px',
                    fontSize: '1.1rem',
                    boxShadow: '0 0 15px rgba(79, 70, 229, 0.4)'
                  }}
                  onClick={() => {
                    const sum = magicMissileUI.targets.reduce((acc, curr) => acc + curr.darts, 0);
                    if (sum === 0) return alert('Aloque pelo menos 1 dardo para disparar!');
                    
                    magicMissileUI.targets.forEach(t => {
                      if (t.darts > 0) {
                        let totalDmg = 0;
                        let dartResults: number[] = [];
                        for(let i=0; i<t.darts; i++) {
                          const res = rollDamage(magicMissileUI.dmgStr, false);
                          totalDmg += res.total;
                          dartResults.push(res.total);
                        }
                        applyDamage(t.refId, totalDmg, magicMissileUI.damageType);
                        if (magicMissileUI.conditionApplied) addCondition(t.refId, magicMissileUI.conditionApplied);
                        addToLog(`🩸 Mísseis Mágicos (${t.darts} dardo${t.darts > 1 ? 's' : ''}): causou **${totalDmg}** de dano em ${t.name}! (Dardos: [${dartResults.join(', ')}])`, magicMissileUI.actorName, 'damage');
                      }
                    });
                    
                    setMagicMissileUI(null);
                    clearTargets();
                  }}
                >
                  🚀 Disparar Mísseis!
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {mercyMonkUI?.active && (
        <div className="tam-overlay" style={{ zIndex: 12000 }}>
          <div className="tam-container glass-panel" style={{ maxWidth: '400px', padding: '24px', margin: 'auto', alignSelf: 'center', marginTop: '10vh' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: '#fff', textAlign: 'center' }}>Mãos da Misericórdia</h3>
            
            {!mercyMonkUI.mode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '8px' }}>Escolha o efeito desta habilidade:</p>
                <button 
                  className="btn primary-btn" 
                  style={{ padding: '12px', background: 'linear-gradient(45deg, #10b981, #059669)' }}
                  onClick={() => setMercyMonkUI({ ...mercyMonkUI, mode: 'cura' })}
                >
                  💚 Curar (Ação)
                </button>
                <button 
                  className="btn primary-btn" 
                  style={{ padding: '12px', background: 'linear-gradient(45deg, #ef4444, #b91c1c)' }}
                  onClick={() => setMercyMonkUI({ ...mercyMonkUI, mode: 'dano' })}
                >
                  ☠️ Causar Dano (Após Acertar)
                </button>
                <button className="btn secondary-btn" style={{ marginTop: '8px' }} onClick={() => setMercyMonkUI(null)}>Cancelar</button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>
                  Selecione o alvo para {mercyMonkUI.mode === 'cura' ? 'Curar' : 'Causar Dano'}:
                </p>
                
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }} className="custom-scrollbar">
                  {combat.participants.filter(p => p.hpCurrent > 0 || mercyMonkUI.mode === 'cura').map(p => (
                    <div 
                      key={p.refId} 
                      style={{ 
                        padding: '10px 12px', 
                        marginBottom: '8px', 
                        borderRadius: '8px',
                        background: mercyMonkUI.selectedTargetId === p.refId ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${mercyMonkUI.selectedTargetId === p.refId ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => setMercyMonkUI({ ...mercyMonkUI, selectedTargetId: p.refId })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          background: p.type === 'player' ? 'var(--primary)' : 'var(--danger)' 
                        }}></div>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{p.name}</span>
                      </div>
                      {mercyMonkUI.selectedTargetId === p.refId && (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--primary)" strokeWidth="3" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn secondary-btn" style={{ flex: 1 }} onClick={() => setMercyMonkUI({ ...mercyMonkUI, mode: null, selectedTargetId: null })}>Voltar</button>
                  <button 
                    className="btn primary-btn" 
                    style={{ flex: 2, background: mercyMonkUI.mode === 'cura' ? 'var(--success)' : 'var(--danger)' }}
                    disabled={!mercyMonkUI.selectedTargetId}
                    onClick={() => {
                      if (!mercyMonkUI.selectedTargetId) return;
                      const targetId = mercyMonkUI.selectedTargetId;
                      const target = combat.participants.find(p => p.refId === targetId);
                      if (!target) return;
                      
                      const pRes = participant.classResources?.find(r => r.name.toLowerCase() === 'pontos de ki');
                      if (!pRes || pRes.current <= 0) {
                        alert("Não possui Pontos de Ki suficientes.");
                        setMercyMonkUI(null);
                        return;
                      }
                      
                      const newResources = [...(participant.classResources || [])];
                      const resIdx = newResources.findIndex(r => r.name.toLowerCase() === 'pontos de ki');
                      newResources[resIdx].current -= 1;
                      updateParticipant(participant.refId, { classResources: newResources });
                      
                      const level = parseInt(participant.playerLevel?.toString() || '1');
                      let die = 4;
                      if (level >= 17) die = 10;
                      else if (level >= 11) die = 8;
                      else if (level >= 5) die = 6;
                      
                      const modWis = Math.floor(((participant.wis || 10) - 10) / 2);
                      const rollResult = Math.floor(Math.random() * die) + 1;
                      const total = Math.max(1, rollResult + modWis);
                      
                      if (mercyMonkUI.mode === 'cura') {
                        applyHeal(targetId, total);
                        addToLog(`usou **Mãos que Curam**! Gastou 1 Ki e curou **${target.name}** em **${total}** PV (d${die}: ${rollResult} + Sab: ${modWis}).`, participant.name, 'heal');
                      } else {
                        applyDamage(targetId, total, 'necrótico');
                        addToLog(`usou **Mãos de Dano**! Gastou 1 Ki e causou **${total}** de dano Necrótico extra em **${target.name}** (d${die}: ${rollResult} + Sab: ${modWis}).`, participant.name, 'damage');
                      }
                      
                      setMercyMonkUI(null);
                    }}
                  >
                    Aplicar {mercyMonkUI.mode === 'cura' ? 'Cura' : 'Dano'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dialogConfig.isOpen && (
        <div className="tam-overlay" style={{ zIndex: 12000 }}>
          <div className="tam-container glass-panel" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center', margin: 'auto', alignSelf: 'center', marginTop: '20vh' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: '#fff' }}>Ação Necessária</h3>
            <p style={{ marginBottom: '20px', color: '#ccc', fontSize: '0.95rem' }}>{dialogConfig.message}</p>
            {dialogConfig.type === 'prompt' && (
              <input 
                type="text" 
                className="journey-input" 
                defaultValue={dialogConfig.defaultValue} 
                id="custom-prompt-input"
                style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.1rem' }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    dialogConfig.resolve?.(e.currentTarget.value);
                  }
                }}
              />
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="btn secondary-btn" 
                style={{ padding: '8px 24px' }}
                onClick={() => {
                  setDialogConfig(prev => ({ ...prev, isOpen: false }));
                  dialogConfig.resolve?.(dialogConfig.type === 'prompt' ? null : false);
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn primary-btn" 
                style={{ padding: '8px 24px' }}
                onClick={() => {
                  setDialogConfig(prev => ({ ...prev, isOpen: false }));
                  if (dialogConfig.type === 'prompt') {
                    const val = (document.getElementById('custom-prompt-input') as HTMLInputElement)?.value || '';
                    dialogConfig.resolve?.(val);
                  } else {
                    dialogConfig.resolve?.(true);
                  }
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
