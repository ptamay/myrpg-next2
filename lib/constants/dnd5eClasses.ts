import { ClassResource, Ability } from '@/lib/gameData';

export type ClassFeature = 'sneakAttack' | 'cunningAction' | 'layOnHands' | 'divineSmite';

export const DAMAGE_TYPES: string[] = [
  'cortante', 'perfurante', 'contundente',
  'fogo', 'frio', 'raio', 'trovão',
  'ácido', 'veneno', 'psíquico', 'necrótico',
  'radiante', 'força', 'energia'
];

export const RAGE_PHYSICAL_TYPES: string[] = [
  'cortante', 'perfurante', 'contundente', 
  'slashing', 'piercing', 'bludgeoning'
];

export interface DnD5eClass {
  id: string;
  label: string;
  hitDie: number;
  casterType: 'none' | 'one_third' | 'half' | 'full' | 'pact';
  spellAbility: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null;
  savingThrows: string[];
  features?: ClassFeature[];
  subclasses?: { id: string; label: string; minLevel: number }[];
}

export const DND5E_CLASSES: DnD5eClass[] = [
  { id: 'barbaro',    label: 'Bárbaro',   hitDie: 12, casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','CON'] },
  { id: 'bardo',      label: 'Bardo',     hitDie: 8,  casterType: 'full',      spellAbility: 'cha', savingThrows: ['DES','CAR'] },
  { id: 'clerigo',    label: 'Clérigo',   hitDie: 8,  casterType: 'full',      spellAbility: 'wis', savingThrows: ['SAB','CAR'] },
  { id: 'druida',     label: 'Druida',    hitDie: 8,  casterType: 'full',      spellAbility: 'wis', savingThrows: ['INT','SAB'] },
  { id: 'guerreiro',  label: 'Guerreiro', hitDie: 10, casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','CON'],
    subclasses: [
      { id: 'campeao', label: 'Campeão', minLevel: 3 },
      { id: 'mestre_batalha', label: 'Mestre de Batalha', minLevel: 3 },
      { id: 'cavaleiro_arcano', label: 'Cavaleiro Arcano', minLevel: 3 }
    ]
  },
  { id: 'ladino',     label: 'Ladino',    hitDie: 8,  casterType: 'none',      spellAbility: null,  savingThrows: ['DES','INT'],
    features: ['sneakAttack', 'cunningAction'] },
  { id: 'mago',       label: 'Mago',      hitDie: 6,  casterType: 'full',      spellAbility: 'int', savingThrows: ['INT','SAB'] },
  { id: 'monge',      label: 'Monge',     hitDie: 8,  casterType: 'none',      spellAbility: null,  savingThrows: ['FOR','DES'],
    subclasses: [
      { id: 'mao_aberta', label: 'Caminho da Mão Aberta', minLevel: 3 },
      { id: 'sombras', label: 'Caminho das Sombras', minLevel: 3 },
      { id: 'quatro_elementos', label: 'Caminho dos Quatro Elementos', minLevel: 3 },
      { id: 'misericordia', label: 'Caminho da Misericórdia', minLevel: 3 }
    ]
  },
  { id: 'paladino',   label: 'Paladino',  hitDie: 10, casterType: 'half',      spellAbility: 'cha', savingThrows: ['SAB','CAR'],
    features: ['layOnHands', 'divineSmite'],
    subclasses: [
      { id: 'devocao', label: 'Juramento de Devoção', minLevel: 3 },
      { id: 'ancioes', label: 'Juramento dos Anciões', minLevel: 3 },
      { id: 'vinganca', label: 'Juramento de Vingança', minLevel: 3 },
      { id: 'gloria', label: 'Juramento da Glória', minLevel: 3 }
    ]
  },
  { id: 'guardinha',  label: 'Patrulheiro (Ranger)', hitDie: 10, casterType: 'half',      spellAbility: 'wis', savingThrows: ['FOR','DES'] },
  { id: 'feiticeiro', label: 'Feiticeiro',hitDie: 6,  casterType: 'full',      spellAbility: 'cha', savingThrows: ['CON','CAR'],
    subclasses: [
      { id: 'draconica', label: 'Linhagem Dracônica', minLevel: 1 },
      { id: 'magia_selvagem', label: 'Magia Selvagem', minLevel: 1 },
      { id: 'tempestade', label: 'Feitiçaria da Tempestade', minLevel: 1 }
    ]
  },
  { id: 'bruxo',      label: 'Bruxo',     hitDie: 8,  casterType: 'pact',      spellAbility: 'cha', savingThrows: ['SAB','CAR'] },
];

export function getClassData(classId?: string): DnD5eClass | undefined {
  if (!classId) return undefined;
  return DND5E_CLASSES.find(c => c.id === classId.toLowerCase() || c.label.toLowerCase() === classId.toLowerCase());
}

export function isCaster(classId?: string, subclassId?: string): boolean {
  if (classId?.toLowerCase() === 'guerreiro' && subclassId === 'cavaleiro_arcano') return true;
  if (classId?.toLowerCase() === 'ladino' && subclassId === 'trapaceiro_arcano') return true;
  const cls = getClassData(classId);
  return cls ? cls.casterType !== 'none' : false;
}

export function getCasterType(classId?: string, subclassId?: string): 'none' | 'one_third' | 'half' | 'full' | 'pact' {
  if (classId?.toLowerCase() === 'guerreiro' && subclassId === 'cavaleiro_arcano') return 'one_third';
  if (classId?.toLowerCase() === 'ladino' && subclassId === 'trapaceiro_arcano') return 'one_third';
  const cls = getClassData(classId);
  return cls ? cls.casterType : 'none';
}

export function getSpellcastingAbility(classId?: string, subclassId?: string): 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' {
  if (classId?.toLowerCase() === 'guerreiro' && subclassId === 'cavaleiro_arcano') return 'int';
  if (classId?.toLowerCase() === 'ladino' && subclassId === 'trapaceiro_arcano') return 'int';
  const cls = getClassData(classId);
  return (cls?.spellAbility as any) || 'int';
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

export const ONE_THIRD_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1: {}, 2: {}, 3: {1: 2}, 4: {1: 3}, 5: {1: 3}, 6: {1: 3},
  7: {1: 4, 2: 2}, 8: {1: 4, 2: 2}, 9: {1: 4, 2: 2}, 10: {1: 4, 2: 3},
  11: {1: 4, 2: 3}, 12: {1: 4, 2: 3}, 13: {1: 4, 2: 3, 3: 2},
  14: {1: 4, 2: 3, 3: 2}, 15: {1: 4, 2: 3, 3: 2}, 16: {1: 4, 2: 3, 3: 3},
  17: {1: 4, 2: 3, 3: 3}, 18: {1: 4, 2: 3, 3: 3}, 19: {1: 4, 2: 3, 3: 3, 4: 1}, 20: {1: 4, 2: 3, 3: 3, 4: 1}
};

export function getSpellSlotsForLevel(classId: string, level: number, subclassId?: string): Record<number, number> {
  const cType = getCasterType(classId, subclassId);
  const lvl = Math.max(1, Math.min(20, level));
  if (cType === 'full') return FULL_CASTER_SLOTS[lvl] || {};
  if (cType === 'half') return HALF_CASTER_SLOTS[lvl] || {};
  if (cType === 'one_third') return ONE_THIRD_CASTER_SLOTS[lvl] || {};
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

export function getDefaultClassResources(classId: string, level: number, subclass?: string): ClassResource[] {
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
    if (level >= 3 && subclass === 'mestre_batalha') {
      let dice = 4;
      if (level >= 15) dice = 6;
      else if (level >= 7) dice = 5;
      addRes('Dados de Superioridade', dice, 'short');
    }
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

  // Inject Spell Slots automatically
  const spellSlots = getSpellSlotsForLevel(classId, level);
  const casterType = getCasterType(classId);
  const resetOn = casterType === 'pact' ? 'short' : 'long';
  
  for (const [lvlStr, maxSlots] of Object.entries(spellSlots)) {
    if (maxSlots > 0) {
      addRes(`Espaço Nível ${lvlStr}`, maxSlots, resetOn);
    }
  }

  return resources;
}

export function getDefaultAbilities(classId: string, level: number, subclass?: string): Ability[] {
  const cid = classId.toLowerCase();
  const abilities: Ability[] = [];

  if (cid === 'barbaro') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Fúria',
      actionCost: 'bonus',
      resourceCost: { resourceName: 'Fúria', amount: 1 },
      effect: 'buff',
      conditionApplied: 'Fúria',
      description: 'Ação Bônus. Bônus de dano em ataques físicos, resistência a dano de arma.'
    });
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Golpe Descuidado',
      actionCost: 'free',
      effect: 'buff',
      description: 'Ataque livre no 1º turno. Vantagem no ataque, mas inimigos também têm.'
    });
    if (level >= 5) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Movimento Rápido',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: '+10ft movimento.'
      });
    }
  }

  if (cid === 'monge') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Artes Marciais',
      actionCost: 'bonus',
      effect: 'damage',
      description: 'Após Atacar na Ação, 1 ataque desarmado extra.'
    });
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Chuva de Golpes',
        actionCost: 'bonus',
        resourceCost: { resourceName: 'Pontos de Ki', amount: 2 },
        effect: 'damage',
        description: 'Após usar Ação Atacar, +2 ataques adicionais.'
      });
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Defesa Paciente',
        actionCost: 'bonus',
        resourceCost: { resourceName: 'Pontos de Ki', amount: 1 },
        effect: 'condition',
        conditionApplied: 'Esquivando',
        description: 'Gasta 1 Ki para Esquivar como Ação Bônus.'
      });
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Passo do Vento',
        actionCost: 'bonus',
        resourceCost: { resourceName: 'Pontos de Ki', amount: 1 },
        effect: 'utility',
        description: 'Gasta 1 Ki para Disparar ou Desengajar como Ação Bônus.'
      });
    }
    if (level >= 4) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Queda Vagarosa',
        actionCost: 'reaction',
        effect: 'utility',
        description: `Reduz dano de queda em ${level * 5}.`
      });
    }
    if (level >= 9) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Esquiva Aprimorada',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'Ataques contra o Monge nunca têm vantagem.'
      });
    }
    if (level >= 3) {
      if (subclass === 'mao_aberta') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Técnica da Mão Aberta',
          actionCost: 'free',
          effect: 'utility',
          description: 'Quando acerta ataque da Chuva de Golpes, pode impor efeito: Derrubar, Empurrar ou Remover Reação.'
        });
      } else if (subclass === 'sombras') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Artes das Sombras',
          actionCost: 'action',
          resourceCost: { resourceName: 'Pontos de Ki', amount: 2 },
          effect: 'utility',
          description: 'Gasta 2 Ki para lançar Escuridão, Visão no Escuro, Passos sem Pegadas ou Silêncio.'
        });
      } else if (subclass === 'quatro_elementos') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Sintonia Elemental',
          actionCost: 'action',
          effect: 'utility',
          description: 'Pode usar magias elementais gastando Ki.'
        });
      } else if (subclass === 'misericordia') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Mãos que Curam / Mãos de Dano',
          actionCost: 'action',
          resourceCost: { resourceName: 'Pontos de Ki', amount: 1 },
          effect: 'utility',
          description: 'Gasta 1 Ki para curar (Dado de Artes Marciais + Sab) ou causar Dano Necrótico extra ao acertar um golpe desarmado.'
        });
      }
    }
  }

  if (cid === 'ladino') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Ataque Furtivo',
      actionCost: 'none',
      effect: 'passive',
      isPassive: true,
      description: 'Automático quando não há desvantagem e vantagem.'
    });
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Ação Ladina',
        actionCost: 'bonus',
        effect: 'utility',
        description: 'Disparar, Desengajar ou Esconder como Ação Bônus.'
      });
    }
    if (level >= 5) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Esquiva Prodigiosa',
        actionCost: 'reaction',
        effect: 'utility',
        description: 'Metade do dano de 1 ataque.'
      });
    }
    if (level >= 7) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Evasão',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'DEX save = 0 dano; falha = metade.'
      });
    }
  }

  if (cid === 'guerreiro') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Segundo Vento',
      actionCost: 'bonus',
      resourceCost: { resourceName: 'Retomar o Fôlego', amount: 1 },
      effect: 'heal',
      dmg: `1d10+${level}`,
      description: `Cura 1d10+${level} PV como Ação Bônus.`
    });
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Surto de Ação',
        actionCost: 'bonus',
        resourceCost: { resourceName: 'Surto de Ação', amount: 1 },
        effect: 'utility',
        description: 'Ação Bônus. Ganha 1 Ação extra neste turno.'
      });
    }
    if (level >= 5) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Ataque Extra',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'Pode atacar mais de uma vez quando usa a ação Atacar.'
      });
    }
    if (level >= 3) {
      if (subclass === 'campeao') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Acerto Crítico Aprimorado',
          actionCost: 'none',
          effect: 'passive',
          isPassive: true,
          description: 'Acertos críticos em 19 ou 20.'
        });
      } else if (subclass === 'mestre_batalha') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Manobras de Combate',
          actionCost: 'free',
          resourceCost: { resourceName: 'Dados de Superioridade', amount: 1 },
          effect: 'utility',
          description: 'Gasta um Dado de Superioridade para usar uma manobra (Desarmar, Empurrar, Fintar, etc).'
        });
      } else if (subclass === 'cavaleiro_arcano') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Vínculo com Arma',
          actionCost: 'bonus',
          effect: 'utility',
          description: 'Invoca sua arma vinculada para a sua mão.'
        });
      }
    }
  }

  if (cid === 'paladino') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Sentido Divino',
      actionCost: 'action',
      effect: 'utility',
      description: 'Detecta criaturas sobrenaturais próximas.'
    });
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Sentido Divino',
      actionCost: 'action',
      effect: 'utility',
      description: 'Detecta mortos-vivos, celestiais ou corruptores em 18m.'
    });
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Cura pelas Mãos',
      actionCost: 'action',
      resourceCost: { resourceName: 'Cura pelas Mãos (PV)', amount: 1 },
      effect: 'heal',
      description: 'Cura pelo toque gastando PV do pool.'
    });
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Smite Divino',
        actionCost: 'free',
        effect: 'damage',
        description: 'Após acertar, gaste um slot de magia para converter em dano extra.'
      });
    }
    if (level >= 3) {
      if (subclass === 'devocao') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Arma Sagrada',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'buff',
          conditionApplied: 'Arma Sagrada',
          targetType: 'self',
          description: 'Adiciona seu modificador de Carisma às jogadas de ataque e a arma brilha.'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Afastar os Ímpios',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'condition',
          saveAttr: 'Sabedoria',
          conditionApplied: 'Afastado',
          description: 'Amedronta mortos-vivos e corruptores que falharem no teste.'
        });
      } else if (subclass === 'ancioes') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Fúria da Natureza',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'condition',
          saveAttr: 'Força',
          conditionApplied: 'Imobilizado',
          description: 'Invoca vinhas que prendem o inimigo.'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Afastar os Desvalidos',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'condition',
          saveAttr: 'Sabedoria',
          conditionApplied: 'Amedrontado',
          description: 'Assusta fadas e demônios.'
        });
      } else if (subclass === 'vinganca') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Voto de Inimizade',
          actionCost: 'bonus',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'condition',
          conditionApplied: 'Inimigo Jurado',
          targetType: 'single',
          description: 'Ganha vantagem em ataques contra este alvo.'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Abjurar o Inimigo',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'condition',
          saveAttr: 'Sabedoria',
          conditionApplied: 'Amedrontado',
          description: 'Amedronta e reduz movimento a 0.'
        });
      } else if (subclass === 'gloria') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Atleta Incomparável',
          actionCost: 'bonus',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'utility',
          description: 'Vantagem em Atletismo/Acrobacia e salta mais longe (dura 10 min).'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Destruição Inspiradora',
          actionCost: 'bonus',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'utility',
          description: 'Distribui PVs Temporários (2d8 + Nível) após usar Destruição Divina.'
        });
      } else {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Canalizar Divindade',
          actionCost: 'action',
          resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
          effect: 'utility',
          description: 'Efeito baseado no juramento.'
        });
      }
    }
    if (level >= 5) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Ataque Extra',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'Pode atacar mais de uma vez quando usa a ação Atacar.'
      });
    }
  }

  if (cid === 'druida' && level >= 2) {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Forma Selvagem',
      actionCost: 'action',
      resourceCost: { resourceName: 'Forma Selvagem', amount: 1 },
      effect: 'utility',
      description: 'Transforma-se em animal.'
    });
  }

  if (cid === 'feiticeiro' && level >= 2) {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Fonte de Magia',
      actionCost: 'bonus',
      resourceCost: { resourceName: 'Pontos de Feitiçaria', amount: 1 },
      effect: 'utility',
      description: 'Gaste pontos para criar slots de magia ou converta slots em pontos.'
    });
  }

  if (cid === 'bardo') {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Inspiração de Bardo',
      actionCost: 'bonus',
      resourceCost: { resourceName: 'Inspiração de Bardo', amount: 1 },
      effect: 'buff',
      description: 'Dá um dado de inspiração para um aliado.'
    });
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Canção de Descanso',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'Cura extra em descanso curto.'
      });
    }
  }

  if (cid === 'clerigo' && level >= 2) {
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Expulsar Mortos-Vivos',
      actionCost: 'action',
      resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
      effect: 'utility',
      description: 'Mortos-vivos devem passar em Sab ou fugir.'
    });
    abilities.push({
      id: crypto.randomUUID(),
      name: 'Canalizar Divindade',
      actionCost: 'action',
      resourceCost: { resourceName: 'Canalizar Divindade', amount: 1 },
      effect: 'utility',
      description: 'Efeito do domínio.'
    });
  }

  if (cid === 'bruxo') {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Magia de Pacto',
        actionCost: 'none',
        effect: 'passive',
        isPassive: true,
        description: 'Espaços de magia recuperam em Descanso Curto.'
      });
    }

  if (cid === 'feiticeiro') {
    if (level >= 2) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Fonte de Magia',
        actionCost: 'bonus',
        effect: 'utility',
        description: 'Converte Pontos de Feitiçaria em Espaços de Magia ou vice-versa.'
      });
    }
    if (level >= 3) {
      abilities.push({
        id: crypto.randomUUID(),
        name: 'Metamágica',
        actionCost: 'free',
        effect: 'buff',
        description: 'Gasta Pontos de Feitiçaria para alterar magias (ex: Magia Acelerada, Magia Gêmea).'
      });
    }
    
    if (level >= 1) {
      if (subclass === 'draconica') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Resiliência Dracônica',
          actionCost: 'none',
          effect: 'passive',
          isPassive: true,
          description: '+1 PV máximo por nível. CA base é 13 + Mod. Destreza.'
        });
      } else if (subclass === 'magia_selvagem') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Surto de Magia Selvagem',
          actionCost: 'none',
          effect: 'passive',
          isPassive: true,
          description: 'Ao lançar magia de nível 1 ou maior, o Mestre pode pedir rolagem de 1d20. Se der 1, rola na Tabela de Magia Selvagem.'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Maré de Caos',
          actionCost: 'none',
          effect: 'utility',
          description: 'Ganha Vantagem em uma rolagem de ataque, teste de atributo ou salvaguarda.'
        });
      } else if (subclass === 'tempestade') {
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Magia Tempestuosa',
          actionCost: 'bonus',
          effect: 'buff',
          conditionApplied: 'Voo Tempestuoso',
          description: 'Antes ou depois de lançar uma magia de 1º círculo ou superior, você pode voar até 3m (10ft) sem provocar ataques de oportunidade.'
        });
        abilities.push({
          id: crypto.randomUUID(),
          name: 'Orador do Vento',
          actionCost: 'none',
          effect: 'passive',
          isPassive: true,
          description: 'Sabe falar, ler e escrever Primordial (e seus dialetos Aquan, Auran, Ignan e Terran).'
        });
      }
    }
    
    if (level >= 6 && subclass === 'tempestade') {
        abilities.push({
            id: crypto.randomUUID(),
            name: 'Coração da Tempestade',
            actionCost: 'none',
            effect: 'damage',
            isPassive: true,
            description: `Você ganha resistência a dano elétrico e trovejante. Ao conjurar magia de 1º círculo ou maior que cause dano elétrico ou trovejante, pode causar ${Math.floor(level/2)} de dano elétrico ou trovejante a criaturas a até 3m de você.`
        });
        abilities.push({
            id: crypto.randomUUID(),
            name: 'Guia da Tempestade',
            actionCost: 'bonus',
            effect: 'utility',
            description: 'Você pode controlar sutilmente o clima ao redor, parando a chuva ou alterando a direção do vento a até 30m.'
        });
    }

    if (level >= 14 && subclass === 'tempestade') {
        abilities.push({
            id: crypto.randomUUID(),
            name: 'Fúria da Tempestade',
            actionCost: 'reaction',
            effect: 'damage',
            saveAttr: 'for',
            conditionApplied: 'Empurrado',
            description: `Ao ser atingido por um ataque corpo a corpo, você pode causar ${level} de dano elétrico ao atacante. Ele deve passar num teste de Força ou ser empurrado 6m (20ft) para trás.`,
            reactionTrigger: 'when_hit'
        });
    }

    if (level >= 18 && subclass === 'tempestade') {
        abilities.push({
            id: crypto.randomUUID(),
            name: 'Alma do Vento',
            actionCost: 'none',
            effect: 'passive',
            isPassive: true,
            description: 'Imunidade a dano elétrico e trovejante. Deslocamento de voo de 18m (60ft).'
        });
        abilities.push({
            id: crypto.randomUUID(),
            name: 'Compartilhar Ventos',
            actionCost: 'action',
            effect: 'buff',
            description: 'Com uma ação, reduza seu deslocamento de voo para 9m e conceda 9m de voo para até 3+Mod CAR aliados por 1 hora.'
        });
    }
  }

  return abilities;
}
