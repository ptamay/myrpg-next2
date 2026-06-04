import { ClassResource } from '@/lib/gameData';

export type ClassFeature = 'sneakAttack' | 'cunningAction' | 'layOnHands' | 'divineSmite';

export interface DnD5eClass {
  id: string;
  label: string;
  hitDie: number;
  casterType: 'none' | 'half' | 'full' | 'pact';
  spellAbility: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null;
  savingThrows: string[];
  features?: ClassFeature[];
}

export const DND5E_CLASSES: DnD5eClass[] = [
  { id: 'barbaro',    label: 'Bárbaro',   hitDie: 12, casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','CON'] },
  { id: 'bardo',      label: 'Bardo',     hitDie: 8,  casterType: 'full',      spellAbility: 'cha', savingThrows: ['DES','CAR'] },
  { id: 'clerigo',    label: 'Clérigo',   hitDie: 8,  casterType: 'full',      spellAbility: 'wis', savingThrows: ['SAB','CAR'] },
  { id: 'druida',     label: 'Druida',    hitDie: 8,  casterType: 'full',      spellAbility: 'wis', savingThrows: ['INT','SAB'] },
  { id: 'guerreiro',  label: 'Guerreiro', hitDie: 10, casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','CON'] },
  { id: 'ladino',     label: 'Ladino',    hitDie: 8,  casterType: 'none',      spellAbility: null,  savingThrows: ['DES','INT'],
    features: ['sneakAttack', 'cunningAction'] },
  { id: 'mago',       label: 'Mago',      hitDie: 6,  casterType: 'full',      spellAbility: 'int', savingThrows: ['INT','SAB'] },
  { id: 'monge',      label: 'Monge',     hitDie: 8,  casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','DES'] },
  { id: 'paladino',   label: 'Paladino',  hitDie: 10, casterType: 'half',      spellAbility: 'cha', savingThrows: ['SAB','CAR'],
    features: ['layOnHands', 'divineSmite'] },
  { id: 'guardinha',  label: 'Patrulheiro (Ranger)', hitDie: 10, casterType: 'half',      spellAbility: 'wis', savingThrows: ['FOR','DES'] },
  { id: 'feiticeiro', label: 'Feiticeiro',hitDie: 6,  casterType: 'full',      spellAbility: 'cha', savingThrows: ['CON','CAR'] },
  { id: 'bruxo',      label: 'Bruxo',     hitDie: 8,  casterType: 'pact',      spellAbility: 'cha', savingThrows: ['SAB','CAR'] },
];

export function getClassData(classId?: string): DnD5eClass | undefined {
  if (!classId) return undefined;
  return DND5E_CLASSES.find(c => c.id === classId.toLowerCase() || c.label.toLowerCase() === classId.toLowerCase());
}

export function isCaster(classId?: string): boolean {
  const cls = getClassData(classId);
  return cls ? cls.casterType !== 'none' : false;
}

export function getCasterType(classId?: string): 'none' | 'half' | 'full' | 'pact' {
  const cls = getClassData(classId);
  return cls ? cls.casterType : 'none';
}

export const FULL_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1: {1: 2}, 2: {1: 3}, 3: {1: 4, 2: 2}, 4: {1: 4, 2: 3}, 5: {1: 4, 2: 3, 3: 2},
  6: {1: 4, 2: 3, 3: 3}, 7: {1: 4, 2: 3, 3: 3, 4: 1}, 8: {1: 4, 2: 3, 3: 3, 4: 2},
  9: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1}, 10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
  11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1}, 12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
  13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1}, 14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
  15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1}, 16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
  17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1}, 18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1},
  19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1}, 20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1}
};

export const HALF_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1: {}, 2: {1: 2}, 3: {1: 3}, 4: {1: 3}, 5: {1: 4, 2: 2},
  6: {1: 4, 2: 2}, 7: {1: 4, 2: 3}, 8: {1: 4, 2: 3},
  9: {1: 4, 2: 3, 3: 2}, 10: {1: 4, 2: 3, 3: 2},
  11: {1: 4, 2: 3, 3: 3}, 12: {1: 4, 2: 3, 3: 3},
  13: {1: 4, 2: 3, 3: 3, 4: 1}, 14: {1: 4, 2: 3, 3: 3, 4: 1},
  15: {1: 4, 2: 3, 3: 3, 4: 2}, 16: {1: 4, 2: 3, 3: 3, 4: 2},
  17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1}, 18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
  19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}, 20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2}
};

export const PACT_MAGIC_SLOTS: Record<number, Record<number, number>> = {
  1: {1: 1}, 2: {1: 2}, 3: {2: 2}, 4: {2: 2}, 5: {3: 2},
  6: {3: 2}, 7: {4: 2}, 8: {4: 2}, 9: {5: 2}, 10: {5: 2},
  11: {5: 3}, 12: {5: 3}, 13: {5: 3}, 14: {5: 3}, 15: {5: 3},
  16: {5: 3}, 17: {5: 4}, 18: {5: 4}, 19: {5: 4}, 20: {5: 4}
};

export function getSpellSlotsForLevel(classId: string, level: number): Record<number, number> {
  const cType = getCasterType(classId);
  const lvl = Math.max(1, Math.min(20, level));
  if (cType === 'full') return FULL_CASTER_SLOTS[lvl] || {};
  if (cType === 'half') return HALF_CASTER_SLOTS[lvl] || {};
  if (cType === 'pact') return PACT_MAGIC_SLOTS[lvl] || {};
  return {};
}

export function getProficiencyBonus(level: number): number {
  return Math.max(2, Math.ceil((Math.max(1, Math.min(20, level)) + 3) / 4));
}

export function getSneakAttackDice(level: number): string {
  const diceCount = Math.max(1, Math.ceil(Math.max(1, Math.min(20, level)) / 2));
  return `${diceCount}d6`;
}

export function getDefaultClassResources(classId: string, level: number): ClassResource[] {
  const resources: ClassResource[] = [];
  const cid = classId.toLowerCase();

  const addRes = (name: string, max: number, resetOn: 'short' | 'long' | 'other') => {
    resources.push({
      id: crypto.randomUUID(),
      name,
      current: max,
      max,
      resetOn
    });
  };

  if (cid === 'barbaro') {
    let rages = 2;
    if (level >= 20) rages = 999;
    else if (level >= 17) rages = 6;
    else if (level >= 12) rages = 5;
    else if (level >= 6) rages = 4;
    else if (level >= 3) rages = 3;
    addRes('Fúria', rages, 'long');
  }
  
  if (cid === 'bardo') {
    addRes('Inspiração de Bardo', Math.max(1, Math.ceil(level / 4) + 2), level >= 5 ? 'short' : 'long'); // Assuming CHA is decent
  }

  if (cid === 'monge' && level >= 2) {
    addRes('Pontos de Ki', level, 'short');
  }

  if (cid === 'feiticeiro' && level >= 2) {
    addRes('Pontos de Feitiçaria', level, 'long');
  }

  if (cid === 'druida' && level >= 2) {
    addRes('Forma Selvagem', 2, 'short');
  }

  if (cid === 'guerreiro') {
    addRes('Retomar o Fôlego', 1, 'short');
    if (level >= 2) addRes('Surto de Ação', level >= 17 ? 2 : 1, 'short');
  }

  if (cid === 'paladino') {
    addRes('Cura pelas Mãos (PV)', level * 5, 'long');
    if (level >= 3) addRes('Canalizar Divindade', 1, 'short');
  }

  if (cid === 'clerigo' && level >= 2) {
    let cd = 1;
    if (level >= 18) cd = 3;
    else if (level >= 6) cd = 2;
    addRes('Canalizar Divindade', cd, 'short');
  }

  return resources;
}
