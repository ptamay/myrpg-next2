"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Npc } from '@/lib/gameData';
import { ActiveBuff } from '@/lib/types/buffs';
import { parseAC, parseSpeed, parseProfBonus } from '@/lib/dice/dnd5e';
const generateId = () => Math.random().toString(36).substring(2, 15);
import { useGameSync, SyncEvent } from '@/hooks/useGameSync';
import { useUserSession } from '@/contexts/UserSessionContext';
import { rollExpression, parseDiceExpression } from '@/lib/dice/rollParser';

export interface CombatParticipant {
  type: 'player' | 'npc';
  refId: string;           
  name: string;
  image?: string;
  isTransformed: boolean;  
  originalName?: string;   
  initMod: number;
  initiative: number;      
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  ac: number;              
  speed: number;           
  conditions: string[];
  activeBuffs: ActiveBuff[];
  isDelayed: boolean;
  isDead: boolean;
  saves: string[];
  profBonus: number;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
  attacks: { name: string; bonus: string; dmg: string }[];
  
  // F4: Action Economy Tracker
  actionSpent: boolean;
  bonusActionSpent: boolean;
  reactionSpent: boolean;
  movementSpent: boolean;
  
  // F5: Extra Attack Tracking
  attacksMade: number;
  playerLevel?: number;
  playerClass?: string;
  cr?: string;         // ND do NPC (para cálculo de multiataque por CR)
  flurryUsed: boolean; // Monge: Chuva de Golpes usada neste turno
}

export type LogEntryType = 'attack' | 'damage' | 'critical' | 'crit_fail' | 'initiative' | 'system' | 'heal';

export interface CombatLogEntry {
  id: string;
  round: number;
  actorName: string;
  action: string;
  type?: LogEntryType;
  timestamp: string;
}

export interface RollFeedbackEvent {
  id: string;
  type: 'attack' | 'damage' | 'check';
  result: number;
  total: number;
  isCritical: boolean;
  isCritFail: boolean;
  actorName: string;
  formula: string;
  timestamp: number;
}

export interface CombatSession {
  id: string;
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  participants: CombatParticipant[];
  log: CombatLogEntry[];
  latestRollEvent?: RollFeedbackEvent;
  selectedTargetId?: string | null;
}

export interface CombatContextValue {
  combat: CombatSession | null;
  startCombat: (players: Player[], npcs: Npc[]) => void;
  endCombat: () => Promise<void>;
  nextTurn: () => void;
  applyDamage: (participantId: string, amount: number) => void;
  applyHeal: (participantId: string, amount: number) => void;
  addCondition: (participantId: string, condition: string) => void;
  removeCondition: (participantId: string, condition: string) => void;
  setInitiative: (participantId: string, value: number) => void;
  broadcastCombatState: () => void;
  addToLog: (action: string, actorName?: string, type?: LogEntryType) => void;
  updateParticipant: (participantId: string, updates: Partial<CombatParticipant>) => void;
  triggerRollEvent: (event: Omit<RollFeedbackEvent, 'id' | 'timestamp'>) => void;
  setTarget: (participantId: string | null) => void;
  clearLog: () => void;
}

const CombatContext = createContext<CombatContextValue | undefined>(undefined);

function sumBuffs(buffs: ActiveBuff[] | undefined, stat: 'acBonus' | 'speedBonus'): number {
  if (!buffs || !Array.isArray(buffs)) return 0;
  return buffs.reduce((acc, buff) => {
    if (buff.effects && typeof buff.effects[stat] === 'number') {
      return acc + (buff.effects[stat] as number);
    }
    return acc;
  }, 0);
}

function toCombatParticipant(entity: Player | Npc, type: 'player' | 'npc'): CombatParticipant {
  const activeForm = (entity.isTransformed && entity.transformation)
    ? { ...entity, ...entity.transformation }
    : entity;

  return {
    type,
    refId: entity.id,
    name: activeForm.name,
    image: activeForm.image,
    isTransformed: entity.isTransformed || false,
    originalName: entity.isTransformed ? entity.name : undefined,
    initMod: parseInt((entity.init || "0").replace(/\+/g, ''), 10) || 0,
    initiative: 0, 
    hpCurrent: activeForm.hpCurrent ?? activeForm.hpMax ?? 0,
    hpMax: activeForm.hpMax ?? 0,
    tempHp: activeForm.tempHp || 0,
    ac: parseAC(activeForm.ac || 10) + sumBuffs(activeForm.activeBuffs, 'acBonus'),
    speed: parseSpeed(activeForm.speed || "30 ft") + sumBuffs(activeForm.activeBuffs, 'speedBonus'),
    conditions: Array.isArray(activeForm.conditions) ? activeForm.conditions : (activeForm.conditions ? [activeForm.conditions as unknown as string] : []),
    activeBuffs: Array.isArray(activeForm.activeBuffs) ? activeForm.activeBuffs : [],
    isDelayed: false,
    isDead: activeForm.isDead ?? false,
    saves: Array.isArray(activeForm.saves) ? activeForm.saves : (activeForm.saves ? [activeForm.saves as unknown as string] : []),
    profBonus: parseProfBonus(
      (activeForm as any).profBonus,
      (activeForm as Npc).cr
    ),
    str: parseInt(activeForm.str as any) || 10, dex: parseInt(activeForm.dex as any) || 10,
    con: parseInt(activeForm.con as any) || 10, int: parseInt(activeForm.int as any) || 10,
    wis: parseInt(activeForm.wis as any) || 10, cha: parseInt(activeForm.cha as any) || 10,
    attacks: Array.isArray((activeForm as Player).attacks) ? (activeForm as Player).attacks : [],
    actionSpent: false,
    bonusActionSpent: false,
    reactionSpent: false,
    movementSpent: false,
    attacksMade: 0,
    playerLevel: (entity as Player).playerLevel ?? (entity as Npc).playerLevel,
    playerClass: (entity as Player).playerClass || (entity as Player).classLevel?.split(' ')[0] || (entity as Npc).playerClass,
    cr: type === 'npc' ? (entity as Npc).cr : undefined,
    flurryUsed: false,
  };
}

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [combat, setCombat] = useState<CombatSession | null>(null);
  const { isGM, profile } = useUserSession();

  const broadcastCombatState = async (newState: CombatSession | null = combat) => {
    window.dispatchEvent(new CustomEvent('send_broadcast', { 
      detail: { type: 'combat_update', payload: newState } 
    }));
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      setCombat(e.detail as CombatSession);
    };
    
    const handleSyncEntity = (e: any) => {
      const { entity, type } = e.detail;
      setCombat(prev => {
        if (!prev) return prev;
        const pIndex = prev.participants.findIndex(p => p.refId === entity.id);
        if (pIndex === -1) return prev;
        
        const newBase = toCombatParticipant(entity, type);
        const oldP = prev.participants[pIndex];
        
        const newParticipants = [...prev.participants];
        newParticipants[pIndex] = {
          ...newBase,
          hpCurrent: oldP.hpCurrent,
          initiative: oldP.initiative,
          actionSpent: oldP.actionSpent,
          bonusActionSpent: oldP.bonusActionSpent,
          reactionSpent: oldP.reactionSpent,
          movementSpent: oldP.movementSpent,
          attacksMade: oldP.attacksMade,
          flurryUsed: oldP.flurryUsed,
          isDead: oldP.isDead
        };
        
        const newCombat = { ...prev, participants: newParticipants };
        broadcastCombatState(newCombat);
        return newCombat;
      });
    };

    window.addEventListener('sync_combat_update', handleSync);
    window.addEventListener('sync_entity_to_combat', handleSyncEntity);
    return () => {
      window.removeEventListener('sync_combat_update', handleSync);
      window.removeEventListener('sync_entity_to_combat', handleSyncEntity);
    };
  }, []);

  const startCombat = (players: Player[], npcs: Npc[]) => {
    try {
      if (!isGM) return;
      const baseParticipants = [
        ...players.map(p => toCombatParticipant(p, 'player')),
        ...npcs.map(n => toCombatParticipant(n, 'npc'))
      ];

      const initialLog: CombatLogEntry[] = [];

      const participants = baseParticipants.map(p => {
        // Init modifier is DEX mod + any custom parseable init from the entity
        // p.init doesn't exist directly on CombatParticipant, we need the original entity.
        // Wait, toCombatParticipant maps it to initiative: 0. 
        // Let's calculate the dex modifier:
        const dexMod = Math.floor((p.dex - 10) / 2);
        
        // roll 1d20 + dexMod + custom initMod
        const totalMod = dexMod + p.initMod;
        const rollResult = rollExpression(`1d20+${totalMod}`);
        p.initiative = rollResult.total;

        initialLog.push({
          id: generateId(),
          round: 1,
          actorName: 'Sistema',
          action: `🎲 ${p.name} rolou iniciativa ${p.initiative} (d20: ${rollResult.rolls[0]} | Mod: ${totalMod >= 0 ? '+' : ''}${totalMod})`,
          timestamp: new Date().toISOString()
        });

        return p;
      });

      // Sort by initiative descending
      participants.sort((a, b) => b.initiative - a.initiative);

      const newCombat: CombatSession = {
        id: generateId(),
        isActive: true,
        round: 1,
        currentTurnIndex: 0,
        participants,
        log: [
          {
            id: generateId(),
            round: 1,
            actorName: 'Sistema',
            action: 'O combate começou!',
            timestamp: new Date().toISOString()
          },
          ...initialLog
        ]
      };
      
      setCombat(newCombat);
      broadcastCombatState(newCombat);
    } catch (err: any) {
      window.alert("ERRO AO INICIAR COMBATE: " + err.message);
      console.error("Erro em startCombat:", err);
    }
  };

  const endCombat = async () => {
    if (!isGM || !combat) return;
    // Persisting logic will be handled via events or API later, 
    // for now we just clear the state and broadcast.
    setCombat(null);
    await broadcastCombatState(null);
    
    // We should trigger an event to update the parent gameData here, 
    // or the parent will read it. For now, we dispatch a generic event.
    window.dispatchEvent(new CustomEvent('combat_ended', { detail: combat.participants }));
  };

  const nextTurn = () => {
    if (!combat) return;
    let nextIndex = combat.currentTurnIndex + 1;
    let nextRound = combat.round;
    if (nextIndex >= combat.participants.length) {
      nextIndex = 0;
      nextRound += 1;
    }
    
    // F4: Reset action economy for the incoming participant
    const incomingParticipantId = combat.participants[nextIndex].refId;
    const newParticipants = combat.participants.map(p => 
      p.refId === incomingParticipantId 
        ? { ...p, actionSpent: false, bonusActionSpent: false, reactionSpent: false, movementSpent: false, attacksMade: 0, flurryUsed: false } 
        : p
    );
    
    const newCombat = { ...combat, currentTurnIndex: nextIndex, round: nextRound, participants: newParticipants };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
  };

  const updateParticipant = (participantId: string, updates: Partial<CombatParticipant>) => {
    setCombat(prev => {
      if (!prev) return prev;
      const newParticipants = prev.participants.map(p => 
        p.refId === participantId ? { ...p, ...updates } : p
      );
      const newCombat = { ...prev, participants: newParticipants };
      broadcastCombatState(newCombat);
      return newCombat;
    });
  };

  const applyDamage = (participantId: string, amount: number) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;

    let current = p.hpCurrent;
    let temp = p.tempHp;

    if (temp > 0) {
      const absorbed = Math.min(temp, amount);
      const remaining = amount - absorbed;
      temp -= absorbed;
      if (remaining > 0) current = Math.max(0, current - remaining);
    } else {
      current = Math.max(0, current - amount);
    }

    updateParticipant(participantId, { hpCurrent: current, tempHp: temp, isDead: current <= 0 && temp <= 0 });
  };

  const applyHeal = (participantId: string, amount: number) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;

    const current = Math.min(p.hpMax, p.hpCurrent + amount);
    updateParticipant(participantId, { hpCurrent: current, isDead: current <= 0 && p.tempHp <= 0 });
  };

  const addCondition = (participantId: string, condition: string) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;
    if (!p.conditions.includes(condition)) {
      updateParticipant(participantId, { conditions: [...p.conditions, condition] });
    }
  };

  const removeCondition = (participantId: string, condition: string) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;
    updateParticipant(participantId, { conditions: p.conditions.filter(c => c !== condition) });
  };

  const setInitiative = (participantId: string, value: number) => {
    if (!combat || !isGM) return;
    const newParticipants = combat.participants.map(p => 
      p.refId === participantId ? { ...p, initiative: value } : p
    ).sort((a, b) => b.initiative - a.initiative);
    
    const newCombat = { ...combat, participants: newParticipants };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
  };

  const addToLog = (action: string, actorName: string = 'Sistema', type: 'attack'|'damage'|'critical'|'crit_fail'|'initiative'|'system'|'heal' = 'system') => {
    setCombat(prev => {
      if (!prev) return prev;
      const newEntry: CombatLogEntry = {
        id: generateId(),
        round: prev.round,
        actorName,
        action,
        type,
        timestamp: new Date().toISOString()
      };
      const newCombat = { ...prev, log: [newEntry, ...prev.log] };
      broadcastCombatState(newCombat);
      return newCombat;
    });
  };

  const triggerRollEvent = (event: Omit<RollFeedbackEvent, 'id' | 'timestamp'>) => {
    if (!combat || !isGM) return;
    const newEvent: RollFeedbackEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now()
    };
    const newCombat = { ...combat, latestRollEvent: newEvent };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
  };

  const setTarget = (participantId: string | null) => {
    if (!combat) return;

    if (!isGM) {
      const activeParticipant = combat.participants[combat.currentTurnIndex];
      const isMyTurn = activeParticipant && activeParticipant.type === 'player' && activeParticipant.refId === profile?.player_id;
      if (!isMyTurn) {
        console.warn("Targeting locked: It is not your turn.");
        return; // Only GM can target outside of their turn
      }
    }

    const newCombat = { ...combat, selectedTargetId: participantId };
    setCombat(newCombat);
    
    // We send a broadcast so everyone sees the target lock.
    window.dispatchEvent(new CustomEvent('send_broadcast', { 
      detail: { type: 'combat_update', payload: newCombat } 
    }));
  };

  const clearLog = () => {
    setCombat(prev => {
      if (!prev) return prev;
      const newCombat = { ...prev, log: [] };
      broadcastCombatState(newCombat);
      return newCombat;
    });
  };

  return (
    <CombatContext.Provider value={{
      combat,
      startCombat,
      endCombat,
      nextTurn,
      applyDamage,
      applyHeal,
      addCondition,
      removeCondition,
      setInitiative,
      broadcastCombatState,
      addToLog,
      updateParticipant,
      triggerRollEvent,
      setTarget,
      clearLog
    }}>
      {children}
    </CombatContext.Provider>
  );
}

export function useCombat() {
  const context = useContext(CombatContext);
  if (context === undefined) {
    throw new Error('useCombat must be used within a CombatProvider');
  }
  return context;
}
