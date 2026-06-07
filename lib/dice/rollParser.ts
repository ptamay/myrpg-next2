import { rollDie, rollWithAdvantage, rollWithDisadvantage } from './dnd5e';

export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

export interface ParsedDamage {
  dieCount: number;   // número de dados (ex: 1)
  dieSides: number;   // faces do dado (ex: 8)
  modifier: number;   // modificador fixo (ex: 3)
  damageType: string; // tipo de dano (ex: "cortante")
  raw: string;        // string original
  isLifesteal?: boolean; // indica se o ataque cura o atacante
}

/**
 * Parseia uma string de dano no formato "NdX[+/-M] [tipo]"
 * Exemplos: "1d8+3 cortante", "2d6 fogo", "1d4", "1d4+2 perfurante"
 */
export function parseDmgString(expr: string): ParsedDamage {
  const defaultResult: ParsedDamage = {
    dieCount: 1, dieSides: 6, modifier: 0, damageType: '', raw: expr
  };
  if (!expr) return defaultResult;

  const lowerExpr = expr.toLowerCase();
  const isLifesteal = lowerExpr.includes('[roubo de vida]') || lowerExpr.includes('[lifesteal]') || lowerExpr.includes('[cura]');

  // Separar a parte numérica do tipo de dano
  // Ex: "1d8+3 cortante" → dice="1d8+3", type="cortante"
  const trimmed = expr.replace(/\[.*?\]/g, '').trim(); // Remove tags the text
  const diceTypeRegex = /^(\d*d\d+(?:[+-]\d+)?)\s*(.*)/i;
  const match = trimmed.match(diceTypeRegex);

  if (!match) return { ...defaultResult, isLifesteal };

  const diceStr = match[1];
  const damageType = match[2]?.trim() || '';

  const diceRegex = /^(\d*)d(\d+)([+-]\d+)?$/i;
  const diceMatch = diceStr.match(diceRegex);

  if (!diceMatch) return { ...defaultResult, isLifesteal };

  return {
    dieCount: diceMatch[1] ? parseInt(diceMatch[1], 10) : 1,
    dieSides: parseInt(diceMatch[2], 10),
    modifier: diceMatch[3] ? parseInt(diceMatch[3], 10) : 0,
    damageType,
    raw: expr,
    isLifesteal
  };
}

export function parseDiceExpression(expr: string): DiceExpression {
  const defaultExpr = { count: 1, sides: 20, modifier: 0 };
  if (!expr) return defaultExpr;

  const clean = expr.toLowerCase().replace(/\s/g, '');
  const regex = /^(\d*)d(\d+)([+-]\d+)?$/;
  const match = clean.match(regex);

  if (!match) {
    // If just a number (e.g. "+5" or "5")
    const mod = parseInt(clean.replace(/\+/g, ''), 10);
    if (!isNaN(mod)) return { count: 1, sides: 20, modifier: mod };
    return defaultExpr;
  }

  return {
    count: match[1] ? parseInt(match[1], 10) : 1,
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

export function rollExpression(expr: string) {
  const { count, sides, modifier } = parseDiceExpression(expr);
  let total = 0;
  const rolls = [];

  for (let i = 0; i < count; i++) {
    const r = rollDie(sides);
    rolls.push(r);
    total += r;
  }

  total += modifier;

  return { total, rolls, modifier };
}

export function rollAttack(bonusStr: string, advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal') {
  const bonus = parseInt(bonusStr.replace(/\+/g, ''), 10) || 0;
  
  let rollResult = 0;
  let rolls: number[] = [];

  if (advantage === 'advantage') {
    const res = rollWithAdvantage(20);
    rollResult = res.result;
    rolls = res.rolls;
  } else if (advantage === 'disadvantage') {
    const res = rollWithDisadvantage(20);
    rollResult = res.result;
    rolls = res.rolls;
  } else {
    rollResult = rollDie(20);
    rolls = [rollResult];
  }

  const isCritical = rollResult === 20;
  const isCritFail = rollResult === 1;
  const total = rollResult + bonus;

  return { total, rollResult, rolls, bonus, isCritical, isCritFail };
}

export function rollDamage(expr: string, isCritical: boolean = false, extraCritDice: number = 0) {
  const { dieCount, dieSides, modifier } = parseDmgString(expr);
  const actualCount = isCritical ? (dieCount * 2) + extraCritDice : dieCount;
  
  let total = 0;
  const rolls = [];

  for (let i = 0; i < actualCount; i++) {
    const r = rollDie(dieSides);
    rolls.push(r);
    total += r;
  }

  total += modifier;

  return { total, rolls, modifier, actualCount, sides: dieSides };
}
