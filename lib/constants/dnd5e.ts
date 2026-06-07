import { Player } from "../gameData";

export const SAVES_MAP = [
  { key: "FOR", attr: "str" },
  { key: "DES", attr: "dex" },
  { key: "CON", attr: "con" },
  { key: "INT", attr: "int" },
  { key: "SAB", attr: "wis" },
  { key: "CAR", attr: "cha" }
];

export const SKILLS_MAP = [
  { name: "Acrobacia", attr: "dex", label: "Acrobacia (Des)" },
  { name: "Arcanismo", attr: "int", label: "Arcanismo (Int)" },
  { name: "Atletismo", attr: "str", label: "Atletismo (For)" },
  { name: "Atuação", attr: "cha", label: "Atuação (Car)" },
  { name: "Enganação", attr: "cha", label: "Enganação (Car)" },
  { name: "Furtividade", attr: "dex", label: "Furtividade (Des)" },
  { name: "História", attr: "int", label: "História (Int)" },
  { name: "Intimidação", attr: "cha", label: "Intimidação (Car)" },
  { name: "Intuição", attr: "wis", label: "Intuição (Sab)" },
  { name: "Investigação", attr: "int", label: "Investigação (Int)" },
  { name: "Lidar c/ Animais", attr: "wis", label: "Lidar c/ Animais (Sab)" },
  { name: "Medicina", attr: "wis", label: "Medicina (Sab)" },
  { name: "Natureza", attr: "int", label: "Natureza (Int)" },
  { name: "Percepção", attr: "wis", label: "Percepção (Sab)" },
  { name: "Persuasão", attr: "cha", label: "Persuasão (Car)" },
  { name: "Prestidigitação", attr: "dex", label: "Prestidigitação (Des)" },
  { name: "Religião", attr: "int", label: "Religião (Int)" },
  { name: "Sobrevivência", attr: "wis", label: "Sobrevivência (Sab)" }
];

export const CONDITIONS_MAP = [
  { id: 'amedrontado',   label: 'Amedrontado',   effect: { attackDisadvantage: true, checkDisadvantage: true } },
  { id: 'atordoado',     label: 'Atordoado',     effect: { failForceDex: true, attackAdvantageOnTarget: true } },
  { id: 'cego',          label: 'Cego',          effect: { attackDisadvantage: true, attackAdvantageOnTarget: true, failVisionChecks: true } },
  { id: 'surdo',         label: 'Surdo',         effect: { failHearingChecks: true } },
  { id: 'envenenado',    label: 'Envenenado',    effect: { attackDisadvantage: true, checkDisadvantage: true } },
  { id: 'incapacitado',  label: 'Incapacitado',  effect: { noActions: true, noReactions: true } },
  { id: 'imobilizado',   label: 'Imobilizado',   effect: { speedZero: true, attackAdvantageOnTarget: true, attackDisadvantage: true, failDexSave: true } },
  { id: 'paralisado',    label: 'Paralisado',    effect: { autoMeleeCrit: true, failForceDex: true, attackAdvantageOnTarget: true, noActions: true, noReactions: true } },
  { id: 'petrificado',   label: 'Petrificado',   effect: { attackAdvantageOnTarget: true, resistanceAll: true, failForceDex: true, noActions: true, noReactions: true } },
  { id: 'prone',         label: 'Caído (Prone)', effect: { meleeAdvantageOnTarget: true, rangedDisadvantageOnTarget: true, attackDisadvantage: true } },
  { id: 'restringido',   label: 'Restringido',   effect: { speedZero: true, attackAdvantageOnTarget: true, attackDisadvantage: true, disadvantageDexSave: true } },
  { id: 'invisível',     label: 'Invisível',     effect: { attackAdvantage: true, attackDisadvantageOnTarget: true } },
  { id: 'inconsciente',  label: 'Inconsciente',  effect: { noActions: true, noReactions: true, failForceDex: true, attackAdvantageOnTarget: true, autoMeleeCrit: true, prone: true } },
  { id: 'exausto',       label: 'Exausto',       effect: { checkDisadvantage: true } },
  { id: 'esquiva',       label: 'Esquiva',       effect: { attackDisadvantageOnTarget: true, advantageDexSave: true } }
] as const;

export const SAVES_LIST = SAVES_MAP.map(s => s.key);
export const SKILLS_LIST = SKILLS_MAP.map(s => s.label);
export const CONDITIONS_LIST = CONDITIONS_MAP.map(c => c.id);

// Mapeamento ability abreviação → campo
export const ABILITY_MAP: Record<string, keyof Player> = {
  'FOR': 'str', 'DES': 'dex', 'CON': 'con',
  'INT': 'int', 'SAB': 'wis', 'CAR': 'cha'
};
