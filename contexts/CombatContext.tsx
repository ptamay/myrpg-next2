"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Npc, Ability } from '@/lib/gameData';
import { ActiveBuff } from '@/lib/types/buffs';
import { parseAC, parseSpeed, parseProfBonus } from '@/lib/dice/dnd5e';
const generateId = () => Math.random().toString(36).substring(2, 15);
import { useGameSync, SyncEvent } from '@/hooks/useGameSync';
import { useUserSession } from '@/contexts/UserSessionContext';
import { rollExpression, parseDiceExpression } from '@/lib/dice/rollParser';

export interface CombatClassResource {
  id: string;
  name: string;
  current: number;
  max: number;
}

export interface CombatParticipant {
  type: 'player' | 'npc';
  faction: 'player' | 'ally' | 'enemy' | 'neutral';
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
  tempAc?: number;
  speed: number;           
  conditions: string[];
  conditionDurations?: Record<string, number>;
  activeBuffs: ActiveBuff[];
  isDelayed: boolean;
  isDead: boolean;
  saves: string[];
  profBonus: number;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
  attacks: { 
    name: string; 
    bonus: string; 
    dmg: string;
    actionCost?: string;
    resourceCost?: { resourceName: string; amount: number };
  }[];
  resistances: string[];
  immunities: string[];
  abilities: Ability[];
  
  // F4: Action Economy Tracker
  actionSpent: boolean;
  bonusActionSpent: boolean;
  reactionSpent: boolean;
  movementSpent: boolean;
  
  // F5: Extra Attack Tracking
  attacksMade: number;
  flurryUsed?: boolean;
  multiattack_count?: number;
  playerLevel?: number;
  playerClass?: string;
  subclass?: string;
  cr?: string;         // ND do NPC
  combatFaction: 'ally' | 'enemy'; // Facção ativa neste combate específico

  // Spell Slots
  spellSlots?: Record<number, number>;
  spellSlotsUsed?: Record<number, number>;
  spellcastingAbility?: 'str'|'dex'|'con'|'int'|'wis'|'cha';

  // Class Resources (Ki, Fúria, etc.)
  classResources?: CombatClassResource[];

  // Special States
  isRaging?: boolean;           // Bárbaro em Fúria
  isConcentrating?: boolean;    // Concentrando em uma magia
  concentrationSpell?: string;  // Nome da magia em concentração

  // --- Transformation State ---
  availableTransformation?: any; // Snapshot da forma cadastrada (Npc | Player)
  preTransformHp?: number;
  preTransformHpMax?: number;
  preTransformAc?: number;
  preTransformSpeed?: number;
  preTransformStr?: number;
  preTransformDex?: number;
  preTransformCon?: number;
  preTransformInt?: number;
  preTransformWis?: number;
  preTransformCha?: number;
  preTransformAbilities?: any[];
  preTransformResistances?: string[];
  preTransformImmunities?: string[];
  preTransformSaves?: string[];
  preTransformAttacks?: { 
    name: string; 
    bonus: string; 
    dmg: string;
    actionCost?: string;
    resourceCost?: { resourceName: string; amount: number };
  }[];
  preTransformImage?: string;
  preTransformName?: string;
  combatTransformActive?: boolean;
  combatTransformName?: string;
}

export type PendingAttack = {
  name: string;     // "Machado Grande"
  bonus: string;    // "+5"
  dmg: string;      // "1d12+3 cortante"
  actionCost?: string;
  resourceCost?: { resourceName: string; amount: number };
  saveAttr?: string;
  saveDC?: number;
  conditionApplied?: string;
  advantage?: 'normal' | 'advantage' | 'disadvantage';
  description?: string;
};

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
  targetsStatus?: { name: string; status: 'hit' | 'miss' | 'pass' | 'fail' }[];
}

export interface CombatSession {
  id: string;
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  participants: CombatParticipant[];
  log: CombatLogEntry[];
  latestRollEvent?: RollFeedbackEvent;
  selectedTargetIds: string[]; // Múltiplos alvos selecionados
}

export interface CombatContextValue {
  combat: CombatSession | null;
  startCombat: (participantsConfig: { entity: Player | Npc; type: 'player' | 'npc'; role: 'ally' | 'enemy' }[]) => void;
  endCombat: () => Promise<void>;
  nextTurn: () => void;
  prevTurn: () => void;
  applyDamage: (participantId: string, amount: number, damageType?: string) => void;
  applyHeal: (participantId: string, amount: number) => void;
  addCondition: (participantId: string, condition: string, durationRounds?: number) => void;
  removeCondition: (participantId: string, condition: string) => void;
  setInitiative: (participantId: string, value: number) => void;
  broadcastCombatState: (newState: CombatSession | null, prevCombat?: CombatSession | null) => void;
  addToLog: (action: string, actorName?: string, type?: LogEntryType) => void;
  updateParticipant: (participantId: string, updates: Partial<CombatParticipant>) => void;
  removeParticipant: (participantId: string) => void;
  triggerRollEvent: (event: Omit<RollFeedbackEvent, 'id' | 'timestamp'>) => void;
  clearLog: () => void;
  toggleTarget: (participantId: string) => void;
  clearTargets: () => void;
  transformParticipant: (participantId: string, transformData: any | null) => void;
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

function parseResText(text: string): string[] {
  if (!text) return [];
  return text.split(/[,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

function toCombatParticipant(entity: Player | Npc, type: 'player' | 'npc'): CombatParticipant {
  const activeForm = (entity.isTransformed && entity.transformation)
    ? { ...entity, ...entity.transformation }
    : entity;

  // Determinar facção
  let faction: CombatParticipant['faction'];
  if (type === 'player') {
    faction = 'player';
  } else {
    const npcFaction = (entity as Npc).faction?.toLowerCase() || 'enemy';
    if (npcFaction === 'ally' || npcFaction === 'aliado') faction = 'ally';
    else if (npcFaction === 'neutral' || npcFaction === 'neutro') faction = 'neutral';
    else faction = 'enemy';
  }

  // Mapear classResources
  const rawResources = activeForm.classResources || [];
  const classResources: CombatClassResource[] = rawResources.map((r: any) => ({
    id: r.id,
    name: r.name,
    current: r.current ?? r.max ?? 0,
    max: r.max ?? 0,
  }));

  const dexValue = parseInt(activeForm.dex as any) || 10;
  const dexMod = Math.floor((dexValue - 10) / 2);
  let baseAc = parseAC(activeForm.ac || 10);
  const buffs = Array.isArray(activeForm.activeBuffs) ? activeForm.activeBuffs : [];
  let acOverride = 0;
  buffs.forEach((b: any) => {
    if (b.effects?.baseAcOverride && b.effects.baseAcOverride > acOverride) {
      acOverride = b.effects.baseAcOverride;
    }
  });
  if (acOverride > 0) {
    baseAc = Math.max(baseAc, acOverride + dexMod);
  }

  return {
    type,
    faction,
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
    ac: baseAc + sumBuffs(activeForm.activeBuffs, 'acBonus'),
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
    resistances: Array.isArray(activeForm.resistances) ? activeForm.resistances : parseResText((activeForm as Npc).res || ''),
    immunities: Array.isArray(activeForm.immunities) ? activeForm.immunities : parseResText((activeForm as Npc).imm || ''),
    abilities: activeForm.abilities || [],
    actionSpent: false,
    bonusActionSpent: false,
    reactionSpent: false,
    movementSpent: false,
    attacksMade: 0,
    playerLevel: (entity as Player).playerLevel ?? (entity as Npc).playerLevel,
    playerClass: (entity as Player).playerClass || (entity as Player).classLevel?.split(' ')[0] || (entity as Npc).playerClass,
    cr: type === 'npc' ? (entity as Npc).cr : undefined,
    multiattack_count: (entity as Npc).multiattackCount || 1,
    flurryUsed: false,
    spellSlots: activeForm.spellSlots ? { ...activeForm.spellSlots } : undefined,
    spellSlotsUsed: activeForm.spellSlotsUsed ? { ...activeForm.spellSlotsUsed } : {},
    spellcastingAbility: activeForm.spellcastingAbility,
    classResources,
    isRaging: false,
    isConcentrating: false,
    concentrationSpell: undefined,
    availableTransformation: entity.transformation ? { ...entity.transformation } : undefined,
    combatTransformActive: false,
    combatFaction: 'enemy',
  };
}

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [combat, setCombat] = useState<CombatSession | null>(null);
  const { isGM, profile } = useUserSession();

  const broadcastCombatState = (newState: CombatSession | null, prevCombat?: CombatSession | null) => {
    if (!newState || !prevCombat) {
      window.dispatchEvent(new CustomEvent('send_broadcast', { 
        detail: { type: 'combat_update', payload: { fullState: newState } } 
      }));
      return;
    }

    const changedParticipants = newState.participants.filter(p => {
      const old = prevCombat.participants.find(o => o.refId === p.refId);
      return !old || old !== p; 
    });

    const newLogs = newState.log.filter(l => !prevCombat.log.some(o => o.id === l.id));

    const meta: Partial<CombatSession> = {};
    if (newState.round !== prevCombat.round) meta.round = newState.round;
    if (newState.currentTurnIndex !== prevCombat.currentTurnIndex) meta.currentTurnIndex = newState.currentTurnIndex;
    if (newState.isActive !== prevCombat.isActive) meta.isActive = newState.isActive;
    if (newState.selectedTargetIds !== prevCombat.selectedTargetIds) meta.selectedTargetIds = newState.selectedTargetIds;
    if (newState.latestRollEvent !== prevCombat.latestRollEvent) meta.latestRollEvent = newState.latestRollEvent;

    const payload: any = {};
    if (changedParticipants.length > 0) payload.participants = changedParticipants;
    if (newLogs.length > 0) payload.newLogs = newLogs;
    if (Object.keys(meta).length > 0) payload.meta = meta;

    const oldIds = prevCombat.participants.map(p => p.refId).join(',');
    const newIds = newState.participants.map(p => p.refId).join(',');
    if (oldIds !== newIds) {
      payload.participants = newState.participants;
      payload.fullParticipantsList = true;
    }

    window.dispatchEvent(new CustomEvent('send_broadcast', { 
      detail: { type: 'combat_update', payload } 
    }));
  };

  const updateCombatAndBroadcast = (updater: (prev: CombatSession | null) => CombatSession | null) => {
    setCombat(prev => {
      const newState = updater(prev);
      broadcastCombatState(newState, prev);
      return newState;
    });
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      const payload = e.detail;
      if (payload === null) {
        setCombat(null);
        return;
      }
      setCombat(prev => {
        if (payload.fullState !== undefined) return payload.fullState;
        if (!prev) return prev;
        
        let newParticipants = prev.participants;
        if (payload.participants) {
          if (payload.fullParticipantsList) {
             newParticipants = payload.participants;
          } else {
             newParticipants = prev.participants.map(p => {
               const updated = payload.participants.find((up: any) => up.refId === p.refId);
               return updated ? updated : p;
             });
          }
        }

        return {
          ...prev,
          ...payload.meta,
          participants: newParticipants,
          log: payload.newLogs ? [...payload.newLogs, ...prev.log] : prev.log
        };
      });
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
          isDead: oldP.isDead,
          combatFaction: oldP.combatFaction
        };
        
        const newCombat = { ...prev, participants: newParticipants };
        broadcastCombatState(newCombat, prev);
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

  const startCombat = (participantsConfig: { entity: Player | Npc; type: 'player' | 'npc'; role: 'ally' | 'enemy' }[]) => {
    try {
      if (!isGM) return;
      const baseParticipants = participantsConfig.map(cfg => {
        const p = toCombatParticipant(cfg.entity, cfg.type);
        p.combatFaction = cfg.role;
        return p;
      });

      const initialLog: CombatLogEntry[] = [];

      const participants = baseParticipants.map(p => {
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
        selectedTargetIds: [],
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
      broadcastCombatState(newCombat, null);
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
    broadcastCombatState(null, combat);
    
    // We should trigger an event to update the parent gameData here, 
    // or the parent will read it. For now, we dispatch a generic event.
    window.dispatchEvent(new CustomEvent('combat_ended', { detail: combat.participants }));
  };

  const nextTurn = () => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      let nextIndex = prev.currentTurnIndex + 1;
      let nextRound = prev.round;
      if (nextIndex >= prev.participants.length) {
        nextIndex = 0;
        nextRound += 1;
      }
      
      const incomingParticipantId = prev.participants[nextIndex].refId;
      let logEntries: CombatLogEntry[] = [];
      const newParticipants = prev.participants.map(p => {
        if (p.refId === incomingParticipantId) {
          // Process Condition Durations at start of turn
          let newConditions = [...p.conditions];
          let newDurations = p.conditionDurations ? { ...p.conditionDurations } : undefined;
          
          if (newDurations) {
            for (const [condName, duration] of Object.entries(newDurations)) {
              if (duration > 0) {
                newDurations[condName] = duration - 1;
                if (newDurations[condName] <= 0) {
                  delete newDurations[condName];
                  newConditions = newConditions.filter(c => c !== condName);
                  logEntries.push({
                    id: generateId(),
                    round: nextRound,
                    actorName: 'Sistema',
                    action: `A condição **${condName}** dissipou-se de ${p.name}.`,
                    type: 'system',
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          }
          
          return { 
            ...p, 
            conditions: newConditions,
            conditionDurations: newDurations,
            actionSpent: false, 
            bonusActionSpent: false, 
            reactionSpent: false, 
            movementSpent: false, 
            attacksMade: 0, 
            flurryUsed: false 
          };
        }
        return p;
      });
      
      return { 
        ...prev, 
        currentTurnIndex: nextIndex, 
        round: nextRound, 
        participants: newParticipants, 
        selectedTargetIds: [],
        log: logEntries.length > 0 ? [ ...logEntries, ...prev.log ] : prev.log
      };
    });
  };

  const prevTurn = () => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      let prevIndex = prev.currentTurnIndex - 1;
      let prevRound = prev.round;
      if (prevIndex < 0) {
        prevIndex = prev.participants.length - 1;
        prevRound = Math.max(1, prevRound - 1);
      }
      
      const incomingParticipantId = prev.participants[prevIndex].refId;
      const newParticipants = prev.participants.map(p => 
        p.refId === incomingParticipantId 
          ? { ...p, actionSpent: false, bonusActionSpent: false, reactionSpent: false, movementSpent: false, attacksMade: 0, flurryUsed: false } 
          : p
      );
      
      return { ...prev, currentTurnIndex: prevIndex, round: prevRound, participants: newParticipants, selectedTargetIds: [] };
    });
  };

  const updateParticipant = (participantId: string, updates: Partial<CombatParticipant>) => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      const newParticipants = prev.participants.map(p => 
        p.refId === participantId ? { ...p, ...updates } : p
      );
      return { ...prev, participants: newParticipants };
    });
  };

  const transformParticipant = (participantId: string, transformData: any | null) => {
    setCombat(prev => {
      if (!prev) return prev;
      const pIndex = prev.participants.findIndex(x => x.refId === participantId);
      if (pIndex === -1) return prev;
      const p = prev.participants[pIndex];

      let newParticipants = [...prev.participants];
      let actionLog = '';

      if (transformData) {
        const newHpCurrent = transformData.hpCurrent ?? transformData.hpMax ?? 0;
        newParticipants[pIndex] = {
          ...p,
          preTransformHp: p.hpCurrent,
          preTransformHpMax: p.hpMax,
          preTransformAc: p.ac,
          preTransformSpeed: p.speed,
          preTransformStr: p.str,
          preTransformDex: p.dex,
          preTransformCon: p.con,
          preTransformInt: p.int,
          preTransformWis: p.wis,
          preTransformCha: p.cha,
          preTransformAbilities: p.abilities,
          preTransformResistances: p.resistances,
          preTransformImmunities: p.immunities,
          preTransformSaves: p.saves,
          preTransformAttacks: p.attacks,
          preTransformImage: p.image,
          preTransformName: p.name,
          combatTransformActive: true,
          combatTransformName: transformData.name,
          hpCurrent: newHpCurrent,
          hpMax: transformData.hpMax ?? 0,
          ac: parseAC(transformData.ac || 10),
          speed: parseSpeed(transformData.speed || "30 ft"),
          str: parseInt(transformData.str) || 10,
          dex: parseInt(transformData.dex) || 10,
          con: parseInt(transformData.con) || 10,
          int: parseInt(transformData.int) || 10,
          wis: parseInt(transformData.wis) || 10,
          cha: parseInt(transformData.cha) || 10,
          abilities: Array.isArray(transformData.abilities) ? transformData.abilities : [],
          resistances: Array.isArray(transformData.resistances) ? transformData.resistances : (transformData.res ? transformData.res.split(',') : []),
          immunities: Array.isArray(transformData.immunities) ? transformData.immunities : (transformData.imm ? transformData.imm.split(',') : []),
          saves: Array.isArray(transformData.saves) ? transformData.saves : (transformData.saves ? [transformData.saves] : []),
          attacks: Array.isArray(transformData.attacks) ? transformData.attacks : [],
          image: transformData.image,
          name: `${transformData.name} (${p.originalName || p.name})`
        };
        actionLog = `🐺 ${p.name} se transformou em **${transformData.name}**!`;
      } else {
        newParticipants[pIndex] = {
          ...p,
          combatTransformActive: false,
          combatTransformName: undefined,
          hpCurrent: p.preTransformHp ?? p.hpCurrent,
          hpMax: p.preTransformHpMax ?? p.hpMax,
          ac: p.preTransformAc ?? p.ac,
          speed: p.preTransformSpeed ?? p.speed,
          str: p.preTransformStr ?? p.str,
          dex: p.preTransformDex ?? p.dex,
          con: p.preTransformCon ?? p.con,
          int: p.preTransformInt ?? p.int,
          wis: p.preTransformWis ?? p.wis,
          cha: p.preTransformCha ?? p.cha,
          abilities: p.preTransformAbilities ?? p.abilities,
          resistances: p.preTransformResistances ?? p.resistances,
          immunities: p.preTransformImmunities ?? p.immunities,
          saves: p.preTransformSaves ?? p.saves,
          attacks: p.preTransformAttacks ?? p.attacks,
          image: p.preTransformImage ?? p.image,
          name: p.preTransformName ?? p.name,
        };
        actionLog = `🧍 ${p.preTransformName ?? p.name} reverteu para a forma original.`;
      }

      const logEntry: CombatLogEntry = {
        id: generateId(),
        round: prev.round,
        actorName: 'Sistema',
        action: actionLog,
        type: 'system',
        timestamp: new Date().toISOString()
      };

      return { ...prev, participants: newParticipants, log: [...prev.log, logEntry] };
    });
  };

  const applyDamage = (participantId: string, amount: number, damageType?: string) => {
    setCombat(prev => {
      if (!prev) return prev;
      const pIndex = prev.participants.findIndex(x => x.refId === participantId);
      if (pIndex === -1) return prev;
      const p = prev.participants[pIndex];

      let current = p.hpCurrent;
      let temp = p.tempHp;

      let finalAmount = amount;
      let logResistance = false;
      let logImmunity = false;

      const matchDmgType = (typeList: string[], dt?: string) => {
        if (!dt) return false;
        const normalized = dt.toLowerCase().trim();
        return typeList.some(t => {
           const nt = t.toLowerCase().trim();
           return nt === normalized || nt.includes(normalized) || normalized.includes(nt);
        });
      };

      if (damageType) {
        if (matchDmgType(p.immunities, damageType)) {
          finalAmount = 0;
          logImmunity = true;
        } else {
          let hasResistance = matchDmgType(p.resistances, damageType);
          
          if (!hasResistance && p.isRaging) {
            const RAGE_PHYSICAL_TYPES = ['cortante', 'perfurante', 'contundente', 'slashing', 'piercing', 'bludgeoning'];
            hasResistance = matchDmgType(RAGE_PHYSICAL_TYPES, damageType);
          }

          if (hasResistance) {
            finalAmount = Math.floor(amount / 2);
            logResistance = true;
          }
        }
      }

      if (temp > 0) {
        const absorbed = Math.min(temp, finalAmount);
        const remaining = finalAmount - absorbed;
        temp -= absorbed;
        if (remaining > 0) current = current - remaining; // permite ficar negativo para checar overflow
      } else {
        current = current - finalAmount;
      }

      let newParticipants = [...prev.participants];
      let logEntries: CombatLogEntry[] = [];

      if (logImmunity) {
        logEntries.push({
          id: generateId(),
          round: prev.round,
          actorName: 'Sistema',
          action: `🔒 ${p.name} é imune a ${damageType}! Dano ignorado.`,
          type: 'system',
          timestamp: new Date().toISOString()
        });
      } else if (logResistance) {
        logEntries.push({
          id: generateId(),
          round: prev.round,
          actorName: 'Sistema',
          action: `🛡️ ${p.name} resistiu! ${amount} → ${finalAmount} de dano ${damageType}`,
          type: 'system',
          timestamp: new Date().toISOString()
        });
      }

      if (finalAmount > 0 && p.isConcentrating) {
        const concDc = Math.max(10, Math.floor(finalAmount / 2));
        logEntries.push({
          id: generateId(),
          round: prev.round,
          actorName: 'Sistema',
          action: `⚠️ **${p.name}** sofreu dano enquanto concentrava! Faça um Teste de Constituição **CD ${concDc}** para manter a concentração.`,
          type: 'system',
          timestamp: new Date().toISOString()
        });
      }

      if (p.combatTransformActive && current <= 0) {
        const overflow = Math.abs(current);
        const origHp = Math.max(0, (p.preTransformHp ?? p.hpCurrent) - overflow);
        newParticipants[pIndex] = {
          ...p,
          combatTransformActive: false,
          combatTransformName: undefined,
          hpCurrent: origHp,
          hpMax: p.preTransformHpMax ?? p.hpMax,
          tempHp: temp,
          isDead: origHp <= 0 && temp <= 0,
          ac: p.preTransformAc ?? p.ac,
          speed: p.preTransformSpeed ?? p.speed,
          str: p.preTransformStr ?? p.str,
          dex: p.preTransformDex ?? p.dex,
          con: p.preTransformCon ?? p.con,
          int: p.preTransformInt ?? p.int,
          wis: p.preTransformWis ?? p.wis,
          cha: p.preTransformCha ?? p.cha,
          abilities: p.preTransformAbilities ?? p.abilities,
          resistances: p.preTransformResistances ?? p.resistances,
          immunities: p.preTransformImmunities ?? p.immunities,
          saves: p.preTransformSaves ?? p.saves,
          attacks: p.preTransformAttacks ?? p.attacks,
          image: p.preTransformImage ?? p.image,
          name: p.preTransformName ?? p.name,
        };
        logEntries.push({
          id: generateId(),
          round: prev.round,
          actorName: 'Sistema',
          action: `💥 ${p.name} saiu da forma! ${overflow > 0 ? `**${overflow}** de dano excedente aplicado.` : ''}`,
          type: 'system',
          timestamp: new Date().toISOString()
        });
      } else {
        current = Math.max(0, current);
        
        if (current === 0 && temp <= 0 && p.availableTransformation && !p.combatTransformActive) {
          const transData = p.availableTransformation;
          
          newParticipants[pIndex] = {
            ...p,
            isDead: false,
            hpCurrent: parseInt(transData.hpMax) || 1,
            combatTransformActive: true,
            combatTransformName: transData.name,
            preTransformHp: 0,
            preTransformHpMax: p.hpMax,
            preTransformAc: p.ac,
            preTransformSpeed: p.speed,
            preTransformStr: p.str,
            preTransformDex: p.dex,
            preTransformCon: p.con,
            preTransformAttacks: p.attacks,
            preTransformImage: p.image,
            preTransformName: p.name,
            hpMax: parseInt(transData.hpMax) || p.hpMax,
            ac: parseInt(transData.ac) || p.ac,
            speed: parseInt(transData.speed) || p.speed,
            str: parseInt(transData.str) || p.str,
            dex: parseInt(transData.dex) || p.dex,
            con: parseInt(transData.con) || p.con,
            attacks: Array.isArray(transData.attacks) ? transData.attacks : [],
            image: transData.image || p.image,
            name: `${transData.name} (${p.originalName || p.name})`
          };
          
          logEntries.push({
            id: generateId(),
            round: prev.round,
            actorName: 'Sistema',
            action: `🐺 ${p.name} chegou a 0 HP e assumiu automaticamente a forma de **${transData.name}**!`,
            type: 'system',
            timestamp: new Date().toISOString()
          });
        } else {
          newParticipants[pIndex] = {
            ...p,
            hpCurrent: current,
            tempHp: temp,
            isDead: current <= 0 && temp <= 0
          };
        }
      }

      return { 
        ...prev, 
        participants: newParticipants,
        log: logEntries.length > 0 ? [...prev.log, ...logEntries] : prev.log 
      };
    });
  };

  const applyHeal = (participantId: string, amount: number) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;

    const current = Math.min(p.hpMax, p.hpCurrent + amount);
    updateParticipant(participantId, { hpCurrent: current, isDead: current <= 0 && p.tempHp <= 0 });
  };

  const addCondition = (participantId: string, condition: string, durationRounds?: number) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;
    
    let newConditions = [...p.conditions];
    if (!newConditions.includes(condition)) {
      newConditions.push(condition);
    }
    
    let newDurations = p.conditionDurations ? { ...p.conditionDurations } : {};
    if (durationRounds && durationRounds > 0) {
      newDurations[condition] = durationRounds;
    }
    
    updateParticipant(participantId, { 
      conditions: newConditions,
      conditionDurations: Object.keys(newDurations).length > 0 ? newDurations : p.conditionDurations
    });
  };

  const removeCondition = (participantId: string, condition: string) => {
    if (!combat) return;
    const p = combat.participants.find(p => p.refId === participantId);
    if (!p) return;
    
    let newDurations = p.conditionDurations ? { ...p.conditionDurations } : undefined;
    if (newDurations && newDurations[condition] !== undefined) {
      delete newDurations[condition];
    }
    
    updateParticipant(participantId, { 
      conditions: p.conditions.filter(c => c !== condition),
      conditionDurations: newDurations
    });
  };

  const setInitiative = (participantId: string, value: number) => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      const newParticipants = prev.participants.map(p => 
        p.refId === participantId ? { ...p, initiative: value } : p
      ).sort((a, b) => b.initiative - a.initiative);
      return { ...prev, participants: newParticipants };
    });
  };

  const addToLog = (action: string, actorName: string = 'Sistema', type: 'attack'|'damage'|'critical'|'crit_fail'|'initiative'|'system'|'heal' = 'system') => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      const newEntry: CombatLogEntry = {
        id: generateId(),
        round: prev.round,
        actorName,
        action,
        type,
        timestamp: new Date().toISOString()
      };
      return { ...prev, log: [newEntry, ...prev.log] };
    });
  };

  const triggerRollEvent = (event: Omit<RollFeedbackEvent, 'id' | 'timestamp'>) => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      const newEvent: RollFeedbackEvent = {
        ...event,
        id: generateId(),
        timestamp: Date.now()
      };
      return { ...prev, latestRollEvent: newEvent };
    });
  };

  const clearLog = () => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      return { ...prev, log: [] };
    });
  };

  const removeParticipant = (participantId: string) => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      let newTurnIndex = prev.currentTurnIndex;
      const indexToRemove = prev.participants.findIndex(p => p.refId === participantId);
      
      if (indexToRemove === -1) return prev;

      // Se o removido for antes do atual, recua o index
      if (indexToRemove < newTurnIndex) {
        newTurnIndex--;
      }
      
      const newParticipants = prev.participants.filter(p => p.refId !== participantId);
      const newSelectedTargets = prev.selectedTargetIds.filter(id => id !== participantId);
      
      // Ajuste caso o index estoure o array (ex: era o último da lista)
      if (newTurnIndex >= newParticipants.length) {
        newTurnIndex = 0; // Volta pro topo se acabou a rodada
      }

      return { 
        ...prev, 
        participants: newParticipants, 
        currentTurnIndex: newTurnIndex,
        selectedTargetIds: newSelectedTargets
      };
    });
  };

  const toggleTarget = (participantId: string) => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      const current = prev.selectedTargetIds || [];
      const isSelected = current.includes(participantId);
      const newTargets = isSelected 
        ? current.filter(id => id !== participantId) 
        : [...current, participantId];
      
      return { ...prev, selectedTargetIds: newTargets };
    });
  };

  const clearTargets = () => {
    updateCombatAndBroadcast(prev => {
      if (!prev) return prev;
      return { ...prev, selectedTargetIds: [] };
    });
  };

  return (
    <CombatContext.Provider value={{
      combat,
      startCombat,
      endCombat,
      nextTurn,
      prevTurn,
      applyDamage,
      applyHeal,
      addCondition,
      removeCondition,
      setInitiative,
      broadcastCombatState,
      addToLog,
      updateParticipant,
      removeParticipant,
      triggerRollEvent,
      clearLog,
      toggleTarget,
      clearTargets,
      transformParticipant,
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
