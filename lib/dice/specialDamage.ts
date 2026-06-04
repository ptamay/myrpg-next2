/**
 * specialDamage.ts
 * Calcula automaticamente danos extras baseados em classe/condições D&D 5e.
 * Usado por ActionPanel (GM) e PlayerActionBar (Jogador).
 */

import { CombatParticipant } from '@/contexts/CombatContext';
import { rollDamage } from './rollParser';

export interface ExtraDamageResult {
  label: string;
  /** Expressão de dados (ex: "3d6") ou bônus flat ("+2") */
  dice: string;
  rolls: number[];
  total: number;
  emoji: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cls(p: CombatParticipant): string {
  return (p.playerClass || '').toLowerCase();
}

function lvl(p: CombatParticipant): number {
  return Number(p.playerLevel) || 1;
}

function hasCondition(p: CombatParticipant, ...terms: string[]): boolean {
  return (p.conditions || []).some(c =>
    terms.some(t => c.toLowerCase().includes(t.toLowerCase()))
  );
}

function matchesClass(p: CombatParticipant, ...terms: string[]): boolean {
  const c = cls(p);
  return terms.some(t => c.includes(t));
}

// ─── ROGUE — Ataque Furtivo ───────────────────────────────────────────────────
// D&D 5e: uma vez por turno, arma de destreza ou à distância,
// com vantagem OU aliado adjacente ao alvo (sem desvantagem).
// Simplificação: dispara se NÃO estiver em desvantagem.

function getSneakAttack(p: CombatParticipant, isCrit: boolean, advType: string): ExtraDamageResult | null {
  if (!matchesClass(p, 'ladino', 'rogue')) return null;
  if (advType === 'disadvantage') return null; // Sem furtivo com desvantagem

  const diceCount = Math.ceil(lvl(p) / 2);
  const dice = `${diceCount}d6`;
  const res = rollDamage(dice, isCrit);
  return {
    label: `Ataque Furtivo (${dice})`,
    dice,
    rolls: res.rolls,
    total: res.total,
    emoji: '🗡️'
  };
}

// ─── BARBARIAN — Bônus de Fúria ──────────────────────────────────────────────
// D&D 5e: +2 dano corpo-a-corpo nv 1-8 / +3 nv 9-15 / +4 nv 16+
// Requer condição "Fúria" ativa no atacante.

function getRageDamage(p: CombatParticipant): ExtraDamageResult | null {
  if (!matchesClass(p, 'bárbaro', 'barbarian', 'barbaro')) return null;
  if (!hasCondition(p, 'fúria', 'furia', 'rage')) return null;

  const level = lvl(p);
  const bonus = level >= 16 ? 4 : level >= 9 ? 3 : 2;
  return {
    label: `Fúria (+${bonus})`,
    dice: `+${bonus}`,
    rolls: [bonus],
    total: bonus,
    emoji: '🔥'
  };
}

// ─── RANGER — Marca do Caçador ────────────────────────────────────────────────
// D&D 5e: +1d6 de dano no alvo marcado (concentração).
// Rastrea condição "Marcado" ou "Marca" no atacante.

function getHuntersMark(p: CombatParticipant, isCrit: boolean): ExtraDamageResult | null {
  if (!hasCondition(p, 'marcado', 'marca', "hunter's mark", 'caçador')) return null;
  const res = rollDamage('1d6', isCrit);
  return {
    label: 'Marca do Caçador (1d6)',
    dice: '1d6',
    rolls: res.rolls,
    total: res.total,
    emoji: '🏹'
  };
}

// ─── WARLOCK — Hex ───────────────────────────────────────────────────────────
// D&D 5e: +1d6 de dano necrótico no alvo amaldiçoado (concentração).
// Rastrea condição "Hex" ou "Maldição" no atacante.

function getHex(p: CombatParticipant, isCrit: boolean): ExtraDamageResult | null {
  if (!hasCondition(p, 'hex', 'maldição', 'maldicao', 'amaldiçoado')) return null;
  const res = rollDamage('1d6', isCrit);
  return {
    label: 'Hex (1d6 Necrótico)',
    dice: '1d6',
    rolls: res.rolls,
    total: res.total,
    emoji: '💜'
  };
}

// ─── PALADIN — Smite Divino ───────────────────────────────────────────────────
// D&D 5e: escolha do paladino, gasta um espaço de magia após acerto.
// (slot nv 1 = 2d8, cada nv adicional +1d8, máx 5d8 normal / 6d8 vs morto-vivo)
// Não é automático — o jogador escolhe o slot. Exportado separadamente.

export function rollDivineSmite(slotLevel: number, isCrit: boolean): ExtraDamageResult {
  const diceCount = Math.min(slotLevel + 1, 5); // máx 5d8
  const dice = `${diceCount}d8`;
  const res = rollDamage(dice, isCrit);
  return {
    label: `Smite Divino — Slot nv.${slotLevel} (${diceCount}d8 Radiante)`,
    dice,
    rolls: res.rolls,
    total: res.total,
    emoji: '⚡'
  };
}

export function isPaladin(p: CombatParticipant): boolean {
  return matchesClass(p, 'paladino', 'paladin');
}

// ─── API Principal ────────────────────────────────────────────────────────────

/**
 * Retorna todos os danos extras automáticos para um participante.
 * Chamar após confirmar o acerto, antes de rolar o dano.
 */
export function computeExtraDamages(
  participant: CombatParticipant,
  isCritical: boolean,
  advantageType: string
): ExtraDamageResult[] {
  const extras: ExtraDamageResult[] = [];

  const sneak = getSneakAttack(participant, isCritical, advantageType);
  if (sneak) extras.push(sneak);

  const rage = getRageDamage(participant);
  if (rage) extras.push(rage);

  const mark = getHuntersMark(participant, isCritical);
  if (mark) extras.push(mark);

  const hex = getHex(participant, isCritical);
  if (hex) extras.push(hex);

  return extras;
}

/**
 * Monta a mensagem de log com breakdown completo do dano.
 */
export function buildDamageLog(
  actor: string,
  targetName: string,
  weaponTotal: number,
  weaponRolls: number[],
  weaponModifier: number,
  weaponExpr: string,
  extras: ExtraDamageResult[],
  isCritical: boolean
): { total: number; message: string } {
  const extraTotal = extras.reduce((sum, e) => sum + e.total, 0);
  const grandTotal = weaponTotal + extraTotal;

  const modStr = weaponModifier !== 0 ? ` + ${weaponModifier}` : '';
  const weaponPart = `⚔️ Arma (${weaponExpr}): [${weaponRolls.join(', ')}]${modStr} = **${weaponTotal}**`;

  const extraLines = extras.map(e => {
    if (e.dice.startsWith('+')) {
      return `${e.emoji} ${e.label}: **${e.total}**`;
    }
    return `${e.emoji} ${e.label}: [${e.rolls.join(', ')}] = **${e.total}**`;
  });

  const critTag = isCritical ? '💥 CRÍTICO! ' : '';
  const allParts = [weaponPart, ...extraLines].join(' | ');
  const message = `${critTag}causou **${grandTotal}** em ${targetName}. [${allParts}]`;

  return { total: grandTotal, message };
}
