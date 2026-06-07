import { Ability } from "../gameData";

const createUUID = () => crypto.randomUUID();

export const getDefaultRacialResistances = (raceName: string): string[] => {
  if (!raceName) return [];
  const lowerName = raceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const resistances: string[] = [];
  
  if (lowerName.includes("tiefling") || lowerName.includes("tiferino")) {
    resistances.push("Fogo");
  }
  if (lowerName.includes("anao") || lowerName.includes("dwarf")) {
    resistances.push("Veneno");
  }
  if (lowerName.includes("shadar") || lowerName.includes("umbra")) {
    resistances.push("Necrótico");
  }
  if (lowerName.includes("genasi") && (lowerName.includes("agua") || lowerName.includes("water"))) {
    resistances.push("Ácido");
  }
  
  return resistances;
};

export const getDefaultRacialAbilities = (raceName: string): Ability[] => {
  if (!raceName) return [];
  
  const lowerName = raceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const abilities: Ability[] = [];

  // HALFLING (Pequenino)
  if (lowerName.includes("halfling") || lowerName.includes("pequenino")) {
    abilities.push({
      id: createUUID(),
      name: "Sorte (Halfling)",
      description: "Quando você rolar um 1 natural em uma jogada de ataque, teste de habilidade ou teste de resistência, você pode jogar de novo o dado e deve usar a nova rolagem.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Bravura",
      description: "Você tem vantagem em testes de resistência contra ficar amedrontado.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // ELFO (Elf)
  if (lowerName.includes("elfo") || lowerName.includes("elf") || lowerName.includes("drow") || lowerName.includes("shadar") || lowerName.includes("umbra")) {
    if (!lowerName.includes("drow") && !lowerName.includes("elfo negro")) {
      abilities.push({
        id: createUUID(),
        name: "Visão no Escuro",
        description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
        actionCost: "none",
        effect: "passive",
        isPassive: true
      });
    }
    abilities.push({
      id: createUUID(),
      name: "Ancestralidade Feérica",
      description: "Você tem vantagem em testes de resistência contra ser enfeitiçado, e magias não podem colocá-lo para dormir.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Transe",
      description: "Elfos não precisam dormir. Em vez disso, meditam profundamente por 4 horas para receber os mesmos benefícios que um humano ganha com 8 horas de sono.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // DROW (Elfo Negro)
  if (lowerName.includes("drow") || lowerName.includes("elfo negro")) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro Superior",
      description: "Sua visão no escuro tem alcance de 36 metros (120 pés).",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Sensibilidade à Luz do Sol",
      description: "Você tem desvantagem em jogadas de ataque e testes de Sabedoria (Percepção) que dependam de visão quando você, o alvo ou aquilo que você está tentando perceber está sob luz solar direta.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Magia Drow",
      description: "Você conhece o truque Globos de Luz. No 3º nível conjura Fogo das Fadas (1/dia) e no 5º nível Escuridão (1/dia).",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // SHADAR-KAI (Elfo da Umbra)
  if (lowerName.includes("shadar") || lowerName.includes("umbra")) {
    abilities.push({
      id: createUUID(),
      name: "Resistência Necrótica",
      description: "Você tem resistência a dano necrótico.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Passo Feérico (Shadar-kai)",
      description: "Com uma ação bônus, você se teletransporta magicamente até 9 metros. Se você for de 3º nível ou superior, você também ganha resistência a todos os danos até o início de seu próximo turno.",
      actionCost: "bonus",
      effect: "buff",
      conditionApplied: "Fantasmagórico (Resistência Total)",
      isPassive: false
    });
  }

  // ANÃO (Dwarf)
  if (lowerName.includes("anao") || lowerName.includes("dwarf")) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro",
      description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Resiliência Anã",
      description: "Você tem vantagem em testes de resistência contra veneno e tem resistência a dano de veneno.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // TIEFLING
  if (lowerName.includes("tiefling") || lowerName.includes("tiferino")) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro",
      description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Resistência Infernal",
      description: "Você possui resistência a dano de fogo.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // MEIO-ORC (Half-Orc)
  if (lowerName.includes("meio-orc") || lowerName.includes("meio orc") || lowerName.includes("half-orc") || lowerName.includes("orc")) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro",
      description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Resistência Implacável",
      description: "Quando você é reduzido a 0 pontos de vida, mas não é morto instantaneamente, você pode cair para 1 ponto de vida em vez disso. Você não pode usar esta característica novamente até completar um descanso longo.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Ataques Selvagens",
      description: "Quando você consegue um acerto crítico com um ataque com arma corpo a corpo, você pode rolar um dos dados de dano da arma mais uma vez e adicioná-lo ao dano extra do acerto crítico.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // DRACONATO (Dragonborn)
  if (lowerName.includes("draconato") || lowerName.includes("dragonborn")) {
    abilities.push({
      id: createUUID(),
      name: "Arma de Sopro",
      description: "Exalar energia destrutiva (conforme Ancestralidade). Cada criatura na área faz um teste de resistência ou sofre o dano.",
      actionCost: "action",
      effect: "damage",
      targetType: "area",
      isPassive: false
    });
    abilities.push({
      id: createUUID(),
      name: "Resistência Dracônica",
      description: "Você tem resistência ao tipo de dano associado à sua ancestralidade dracônica.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // GNOMO (Gnome)
  if (lowerName.includes("gnomo") || lowerName.includes("gnome")) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro",
      description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Esperteza Gnômica",
      description: "Você tem vantagem em todos os testes de resistência de Inteligência, Sabedoria e Carisma contra magia.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  // GENASI DA ÁGUA
  if (lowerName.includes("genasi") && (lowerName.includes("agua") || lowerName.includes("water"))) {
    abilities.push({
      id: createUUID(),
      name: "Visão no Escuro",
      description: "Você enxerga na meia-luz a até 18 metros como se fosse luz plena, e no escuro como se fosse meia-luz.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Resistência a Ácido",
      description: "Você tem resistência a dano de ácido.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Anfíbio",
      description: "Você pode respirar ar e água. Também possui deslocamento de natação igual ao seu deslocamento de caminhada.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
    abilities.push({
      id: createUUID(),
      name: "Chamado da Onda (Genasi da Água)",
      description: "Você conhece o truque Espirro Ácido. A partir do 3º nível, pode conjurar Criar ou Destruir Água. A partir do 5º nível, pode conjurar Andar na Água. Usos recarregam com Descanso Longo.",
      actionCost: "none",
      effect: "passive",
      isPassive: true
    });
  }

  return abilities;
};
