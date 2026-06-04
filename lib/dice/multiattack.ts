/**
 * multiattack.ts
 * Regras D&D 5e de número máximo de ataques por turno.
 *
 * Players  → tabela por classe + nível
 * NPCs com classe → tabela por classe + nível (unificação Phase 5.7)
 * NPCs sem classe → tabela por ND/CR
 * Monge    → +2 ataques extras via Chuva de Golpes (Ação Bônus, gasta Ki)
 */

import { CombatParticipant } from '@/contexts/CombatContext';

// ─── Parse CR ─────────────────────────────────────────────────────────────────

function parseCR(cr?: string | number): number {
  if (!cr) return 0;
  if (typeof cr === 'number') return cr;
  const s = cr.toString().trim();
  if (s.includes('/')) {
    const [n, d] = s.split('/');
    return parseInt(n) / parseInt(d);
  }
  return parseFloat(s) || 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesClass(p: CombatParticipant, ...terms: string[]): boolean {
  const c = (p.playerClass || '').toLowerCase();
  return terms.some(t => c.includes(t));
}

// ─── Tabelas de ataques ───────────────────────────────────────────────────────

/**
 * Retorna o número BASE de ataques por ação conforme classe + nível D&D 5e.
 */
function getAttacksByClass(p: CombatParticipant): number {
  const lvl = Number(p.playerLevel) || 1;

  // Guerreiro: Extra Attack 3× (nv11), 4× (nv20)
  if (matchesClass(p, 'guerreiro', 'fighter')) {
    if (lvl >= 20) return 4;
    if (lvl >= 11) return 3;
    if (lvl >= 5)  return 2;
    return 1;
  }

  // Bárbaro, Paladino, Patrulheiro, Monge: Extra Attack 1× (nv5)
  if (matchesClass(p, 'bárbaro', 'barbarian', 'barbaro',
                      'paladino', 'paladin',
                      'patrulheiro', 'ranger',
                      'monge', 'monk')) {
    return lvl >= 5 ? 2 : 1;
  }

  // Ladinos, conjuradores: 1 ataque
  return 1;
}

/**
 * Tabela de multiataque por ND/CR (para NPCs sem classe definida).
 *
 * ND 0–3  → 1 ataque
 * ND 4–10 → 2 ataques  (Ex: Ogro CR4, Troll CR5)
 * ND 11–16→ 3 ataques  (Ex: Aboleth CR10+, Lich CR21)
 * ND 17+  → 4 ataques  (Ex: Dragões Antigos, Deuses)
 */
function getAttacksByCR(cr?: string | number): number {
  const numCR = parseCR(cr);
  if (numCR >= 17) return 4;
  if (numCR >= 11) return 3;
  if (numCR >= 4)  return 2;
  return 1;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export function isMonk(p: CombatParticipant): boolean {
  return matchesClass(p, 'monge', 'monk');
}

/**
 * Retorna o total de ataques permitidos no turno atual,
 * incluindo Chuva de Golpes se o Monge a ativou.
 */
export function getMaxAttacks(p: CombatParticipant): number {
  let base: number;

  if (p.type === 'npc') {
    // NPC com classe+nível → usa tabela de classe (Phase 5.7)
    base = (p.playerClass && p.playerLevel)
      ? getAttacksByClass(p)
      : getAttacksByCR(p.cr);
  } else {
    // Player → sempre tabela de classe
    base = p.playerClass ? getAttacksByClass(p) : 1;
  }

  // Chuva de Golpes (Flurry of Blows): +2 ataques quando o Monge a ativa
  if (isMonk(p) && p.flurryUsed) base += 2;

  return base;
}

/**
 * Retorna uma label descritiva do estado de ataques do participante.
 * Ex: "(2/3 ataques)" ou "⚡ Chuva de Golpes ativa"
 */
export function getAttackLabel(p: CombatParticipant): string {
  const max = getMaxAttacks(p);
  const made = p.attacksMade;
  if (made === 0) return '';
  if (made >= max) return '(Ataques esgotados)';
  if (isMonk(p) && p.flurryUsed) return `⚡ Chuva de Golpes (${made}/${max})`;
  return `(${made}/${max} ataques)`;
}
