import { rollDie, rollWithAdvantage, rollWithDisadvantage } from './dnd5e';

export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
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

export function rollDamage(expr: string, isCritical: boolean = false) {
  const { count, sides, modifier } = parseDiceExpression(expr);
  const actualCount = isCritical ? count * 2 : count;
  
  let total = 0;
  const rolls = [];

  for (let i = 0; i < actualCount; i++) {
    const r = rollDie(sides);
    rolls.push(r);
    total += r;
  }

  total += modifier;

  return { total, rolls, modifier, actualCount, sides };
}
