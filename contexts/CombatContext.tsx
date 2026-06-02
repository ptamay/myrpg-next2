"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Npc } from '@/lib/gameData';
import { ActiveBuff } from '@/lib/types/buffs';
import { parseAC, parseSpeed, parseProfBonus } from '@/lib/dice/dnd5e';
const generateId = () => Math.random().toString(36).substring(2, 15);
import { useGameSync, SyncEvent } from '@/hooks/useGameSync';
import { useUserSession } from '@/contexts/UserSessionContext';

export interface CombatParticipant {
  type: 'player' | 'npc';
  refId: string;           
  name: string;
  image?: string;
  isTransformed: boolean;  
  originalName?: string;   
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
}

export interface CombatLogEntry {
  id: string;
  round: number;
  actorName: string;
  action: string;         
  timestamp: string;
}

export interface CombatSession {
  id: string;
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  participants: CombatParticipant[];
  log: CombatLogEntry[];
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
  addToLog: (action: string, actorName?: string) => void;
  updateParticipant: (participantId: string, updates: Partial<CombatParticipant>) => void;
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
  };
}

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [combat, setCombat] = useState<CombatSession | null>(null);
  const { isGM } = useUserSession();

  useEffect(() => {
    const handleSync = (e: any) => {
      setCombat(e.detail as CombatSession);
    };
    window.addEventListener('sync_combat_update', handleSync);
    return () => window.removeEventListener('sync_combat_update', handleSync);
  }, []);

  const broadcastCombatState = async (newState: CombatSession | null = combat) => {
    if (!isGM) return; // Only GM broadcasts combat state
    window.dispatchEvent(new CustomEvent('send_broadcast', { 
      detail: { type: 'combat_update', payload: newState } 
    }));
  };

  const startCombat = (players: Player[], npcs: Npc[]) => {
    try {
      if (!isGM) return;
      const participants = [
        ...players.map(p => toCombatParticipant(p, 'player')),
        ...npcs.map(n => toCombatParticipant(n, 'npc'))
      ];

      const newCombat: CombatSession = {
        id: generateId(),
        isActive: true,
        round: 1,
        currentTurnIndex: 0,
        participants,
        log: [{
          id: generateId(),
          round: 1,
          actorName: 'Sistema',
          action: 'O combate começou!',
          timestamp: new Date().toISOString()
        }]
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
    if (!combat || !isGM) return;
    let nextIndex = combat.currentTurnIndex + 1;
    let nextRound = combat.round;
    if (nextIndex >= combat.participants.length) {
      nextIndex = 0;
      nextRound += 1;
    }
    
    const newCombat = { ...combat, currentTurnIndex: nextIndex, round: nextRound };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
  };

  const updateParticipant = (participantId: string, updates: Partial<CombatParticipant>) => {
    if (!combat || !isGM) return;
    const newParticipants = combat.participants.map(p => 
      p.refId === participantId ? { ...p, ...updates } : p
    );
    const newCombat = { ...combat, participants: newParticipants };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
  };

  const applyDamage = (participantId: string, amount: number) => {
    if (!combat || !isGM) return;
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
    if (!combat || !isGM) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;

    const current = Math.min(p.hpMax, p.hpCurrent + amount);
    updateParticipant(participantId, { hpCurrent: current, isDead: current <= 0 && p.tempHp <= 0 });
  };

  const addCondition = (participantId: string, condition: string) => {
    if (!combat || !isGM) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;
    if (!p.conditions.includes(condition)) {
      updateParticipant(participantId, { conditions: [...p.conditions, condition] });
    }
  };

  const removeCondition = (participantId: string, condition: string) => {
    if (!combat || !isGM) return;
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

  const addToLog = (action: string, actorName: string = 'Sistema') => {
    if (!combat || !isGM) return;
    const entry: CombatLogEntry = {
      id: generateId(),
      round: combat.round,
      actorName,
      action,
      timestamp: new Date().toISOString()
    };
    const newCombat = { ...combat, log: [entry, ...combat.log].slice(0, 50) };
    setCombat(newCombat);
    broadcastCombatState(newCombat);
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
      updateParticipant
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
