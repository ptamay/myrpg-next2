import { Player, Npc } from '../gameData';

export function parseModifier(str: string | number): number {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const num = parseInt(str.toString().replace(/[^0-9+-]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function parseAC(str: string | number): number {
  if (typeof str === 'number') return str;
  if (!str) return 10;
  const match = str.toString().match(/\d+/);
  return match ? parseInt(match[0], 10) : 10;
}

export function parseSpeed(str: string): number {
  if (!str) return 30; // default 5e speed
  const match = str.toString().match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
}

function parseCR(cr?: string): number {
  if (!cr) return 0;
  if (cr.includes('/')) {
    const [num, den] = cr.split('/');
    return parseInt(num) / parseInt(den);
  }
  return parseFloat(cr) || 0;
}

export function parseProfBonus(str?: string, cr?: string): number {
  if (str) return parseModifier(str);
  // Se não tem profBonus, tenta calcular pelo CR:
  const numCr = parseCR(cr);
  return Math.floor(Math.max(0, numCr - 1) / 4) + 2;
}

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollWithAdvantage(sides: number): { result: number; rolls: number[] } {
  const r1 = rollDie(sides);
  const r2 = rollDie(sides);
  return { result: Math.max(r1, r2), rolls: [r1, r2] };
}

export function rollWithDisadvantage(sides: number): { result: number; rolls: number[] } {
  const r1 = rollDie(sides);
  const r2 = rollDie(sides);
  return { result: Math.min(r1, r2), rolls: [r1, r2] };
}

export function getAbilityModifier(score: number | string): number {
  const numScore = typeof score === 'string' ? parseInt(score) : score;
  if (isNaN(numScore)) return 0;
  return Math.floor((numScore - 10) / 2);
}

// Result of a roll
export interface RollResult {
  id: string;
  rolledBy: string;
  characterName: string;
  diceType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
  modifier: number;
  rolls: number[];       // raw die results
  result: number;        // die used for final (max/min if adv/disadv)
  total: number;         // result + modifier
  rollType: 'attack' | 'damage' | 'ability' | 'save' | 'initiative' | 'custom';
  ability?: string;
  timestamp: string;
  advantage: 'normal' | 'advantage' | 'disadvantage';
  isCritical: boolean;   // d20 = 20
  isCritFail: boolean;   // d20 = 1
  visibility?: 'public' | 'private' | 'gm';
}
