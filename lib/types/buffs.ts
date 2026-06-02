export interface ActiveBuff {
  id: string;
  name: string;
  source: string;
  effects: {
    acBonus?: number;
    speedBonus?: number;
    darkvision?: number;
    advantage?: string[];    // ex: ['STR_save', 'DEX_check']
    resistance?: string[];
    custom?: string;
  };
  duration: 'combat' | 'short_rest' | 'long_rest' | 'permanent' | number;
  appliedAt?: string;
}
