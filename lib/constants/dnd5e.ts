import { Player } from "../gameData";

export const SAVES_LIST = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

export const SKILLS_LIST = [
  "Acrobacia (Des)", "Arcanismo (Int)", "Atletismo (For)", "Atuação (Car)",
  "Enganação (Car)", "Furtividade (Des)", "História (Int)", "Intimidação (Car)",
  "Intuição (Sab)", "Investigação (Int)", "Lidar c/ Animais (Sab)", "Medicina (Sab)",
  "Natureza (Int)", "Percepção (Sab)", "Persuasão (Car)", "Prestidigitação (Des)",
  "Religião (Int)", "Sobrevivência (Sab)"
];

export const CONDITIONS_LIST = [
  "amedrontado", "atordoado", "cego", "surdo", "envenenado",
  "incapacitado", "imobilizado", "paralisado", "petrificado",
  "prone", "restringido", "invisível", "inconsciente", "exausto"
];

// Mapeamento ability abreviação → campo
export const ABILITY_MAP: Record<string, keyof Player> = {
  'FOR': 'str', 'DES': 'dex', 'CON': 'con',
  'INT': 'int', 'SAB': 'wis', 'CAR': 'cha'
};
