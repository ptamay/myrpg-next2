export const personagens = ['Kronodyr', 'Alric', 'Marop', 'Vynik'];

export const blocosDeTempo = [
  { id: 1, nome: 'Manhã', horario: '06h - 10h', tema: 'diurnal', ancora: 'O sol desponta no horizonte.' },
  { id: 2, nome: 'Zênite', horario: '10h - 14h', tema: 'diurnal', ancora: 'O sol atinge seu pico.' },
  { id: 3, nome: 'Crepúsculo', horario: '14h - 18h', tema: 'diurnal', ancora: 'O sol mergulha no horizonte.' },
  { id: 4, nome: 'Guarda 1', horario: '18h - 22h', tema: 'nocturnal', ancora: 'A noite cai.' },
  { id: 5, nome: 'Guarda 2', horario: '22h - 02h', tema: 'nocturnal', ancora: 'As sombras se aprofundam.' },
  { id: 6, nome: 'Guarda 3', horario: '02h - 06h', tema: 'nocturnal', ancora: 'A alvorada se aproxima.' }
];

export interface Player {
  id: string;
  name: string;
  playerName: string;
  classLevel: string;
  playerClass?: string;
  playerLevel?: number;
  race: string;
  str: number | string;
  dex: number | string;
  con: number | string;
  int: number | string;
  wis: number | string;
  cha: number | string;
  hpMax: number;
  hpCurrent: number;
  ac: number | string;
  init: string;
  speed: string;
  perc: number | string;
  hdTotal: string;
  inspiration: boolean;
  attacks: { name: string; bonus: string; dmg: string }[];
  image?: string;
  isDead: boolean;
  saves?: string[];
  skills?: string[];
  profBonus?: string;
  minSleepReq?: number;
  isSleepingAction?: boolean;
  exhaustionLevel?: number;
  sleepHoursToday?: number;
  background?: string;
  personalGoals?: string;
  inventory?: string;
  transformation?: Partial<Player>;
  isTransformed?: boolean;
}

export interface Npc {
  id: string;
  name: string;
  title: string;
  faction: string;
  race: string;
  alignment: string;
  cr: string;
  str: number | string;
  dex: number | string;
  con: number | string;
  int: number | string;
  wis: number | string;
  cha: number | string;
  hpMax: number;
  hpCurrent: number;
  ac: number | string;
  init: string;
  speed: string;
  perc: number | string;
  mainAttack: string;
  res: string;
  imm: string;
  actions: string;
  mot: string;
  sec: string;
  traits: string;
  itemsVis: string;
  itemsHid: string;
  notes: string;
  hasSpells: boolean;
  spellSlots?: Record<number, number>;
  spellSlotsUsed?: Record<number, number>;
  isDead: boolean;
  isHidden: boolean;
  image?: string;
  transformation?: Partial<Npc>;
  isTransformed?: boolean;
}

export interface GlobalData {
  npcs: Npc[];
  players: Player[];
  food: { water: number; food: number; people: number; consumptionRate?: number; history?: any[] };
  maps: any[];
  mapsTrigger?: number;
}

export interface PlayerSession {
  acoes: string[];
  objetivos: string[];
  concluido: boolean;
}

export interface TimelineEvent {
  title: string;
  desc: string;
  trigger: string;
  save: string;
  damage: string;
}

export interface PlotPhase {
  description: string;
  action: string;
  coefficient: string;
  npcRole: string;
  done: boolean;
}

export interface Plot {
  title: string;
  day: number;
  notes: string;
  phases: PlotPhase[];
}

export interface SideQuestTest {
  description: string;
  done: boolean;
}

export interface SideQuest {
  title: string;
  day: number;
  npc: string;
  desc: string;
  tests: SideQuestTest[];
}

export interface JornadaBloco {
  weather: string;
  weatherEffect: string;
  timeline: TimelineEvent[];
  plots: Plot[];
  sidequests: SideQuest[];
  acoesPersonagens?: { nome: string; acoes: string[]; objetivos: string[]; concluido: boolean }[];
  playerSessions?: Record<string, PlayerSession>;
}
