import { SpellEntry } from '../gameData';

export const SPELLS_DB: SpellEntry[] = [
  // NÍVEL 0 (TRUQUES)
  {
    id: "fire_bolt",
    name: "Raio de Fogo",
    level: 0,
    school: "Evocação",
    castingTime: "action",
    range: "36 metros",
    components: "V, S",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Você arremessa um cisco de fogo em uma criatura ou objeto. Faça um ataque à distância com magia. Em um acerto, o alvo sofre 1d10 de dano de fogo.",
    damageDice: "1d10",
    damageType: "fogo",
    spellAttack: true,
    effect: "damage",
    targetType: "single"
  },
  
  // NÍVEL 1
  {
    id: "shield",
    name: "Escudo Arcano",
    level: 1,
    school: "Abjuração",
    castingTime: "reaction",
    range: "Pessoal",
    components: "V, S",
    duration: "1 rodada",
    isConcentration: false,
    isRitual: false,
    description: "Uma barreira invisível de força mágica aparece e protege você. Até o início do seu próximo turno, você tem um bônus de +5 na sua CA.",
    effect: "buff",
    targetType: "self",
    reactionTrigger: "when_hit",
    tempAcBonus: 5
  },
  {
    id: "magic_missile",
    name: "Mísseis Mágicos",
    level: 1,
    school: "Evocação",
    castingTime: "action",
    range: "36 metros",
    components: "V, S",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Você cria três dardos brilhantes de força mágica. Cada dardo atinge uma criatura à sua escolha que você possa ver dentro do alcance, causando 1d4 + 1 de dano de força por dardo.",
    damageDice: "3d4+3",
    damageType: "forca",
    spellAttack: false, // Auto-hit
    effect: "damage",
    targetType: "multiple"
  },
  {
    id: "cure_wounds",
    name: "Curar Ferimentos",
    level: 1,
    school: "Evocação",
    castingTime: "action",
    range: "Toque",
    components: "V, S",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Uma criatura que você tocar recupera uma quantidade de pontos de vida igual a 1d8 + seu modificador de habilidade de conjuração.",
    damageDice: "1d8",
    effect: "heal",
    targetType: "single"
  },
  {
    id: "bless",
    name: "Bênção",
    level: 1,
    school: "Encantamento",
    castingTime: "action",
    range: "9 metros",
    components: "V, S, M",
    duration: "1 minuto",
    isConcentration: true,
    isRitual: false,
    description: "Você abençoa até três criaturas. Sempre que um alvo fizer uma jogada de ataque ou teste de resistência antes da magia acabar, ele pode rolar um d4 e adicionar o número rolado ao resultado.",
    effect: "buff",
    targetType: "multiple",
    conditionApplied: "Abençoado"
  },
  
  // NÍVEL 2
  {
    id: "misty_step",
    name: "Passo Nebuloso",
    level: 2,
    school: "Conjuração",
    castingTime: "bonus",
    range: "Pessoal",
    components: "V",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Você é envolto por uma névoa prateada e se teletransporta a até 9 metros para um espaço desocupado que possa ver.",
    effect: "utility",
    targetType: "self"
  },
  
  // NÍVEL 3
  {
    id: "fireball",
    name: "Bola de Fogo",
    level: 3,
    school: "Evocação",
    castingTime: "action",
    range: "45 metros",
    components: "V, S, M",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Uma explosão de fogo em uma esfera de 6m de raio. Cada criatura deve fazer um Teste de Resistência de Destreza. Uma criatura sofre 8d6 de dano de fogo em uma falha, ou metade se passar.",
    damageDice: "8d6",
    damageType: "fogo",
    savingThrow: "des",
    effect: "damage",
    targetType: "area"
  },
  
  // NÍVEL 4
  {
    id: "polymorph",
    name: "Polimorfo",
    level: 4,
    school: "Transmutação",
    castingTime: "action",
    range: "18 metros",
    components: "V, S, M",
    duration: "1 hora",
    isConcentration: true,
    isRitual: false,
    description: "Transforma uma criatura que você possa ver dentro do alcance em uma nova forma. Um alvo involuntário deve ser bem sucedido em um teste de SAB.",
    savingThrow: "sab",
    effect: "utility",
    targetType: "single"
  },

  // NÍVEL 5
  {
    id: "cone_of_cold",
    name: "Cone de Frio",
    level: 5,
    school: "Evocação",
    castingTime: "action",
    range: "Pessoal (Cone 18m)",
    components: "V, S, M",
    duration: "Instantânea",
    isConcentration: false,
    isRitual: false,
    description: "Uma explosão de ar frio entra em erupção de suas mãos. Cada criatura em um cone de 18 metros deve fazer um Teste de Resistência de CON, sofrendo 8d8 dano de frio na falha.",
    damageDice: "8d8",
    damageType: "frio",
    savingThrow: "con",
    effect: "damage",
    targetType: "area"
  }
];
