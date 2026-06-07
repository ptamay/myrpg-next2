export interface ActiveBuff {
  id: string;
  name: string;
  source: string;
  effects: {
    acBonus?: number;
    speedBonus?: number;
    attackBonus?: number;
    damageBonus?: number;
    savingThrowBonus?: number;
    darkvision?: number;
    advantage?: string[];
    disadvantage?: string[];
    resistance?: string[];
    immunity?: string[];
    custom?: string;
    baseAcOverride?: number;
  };
  duration: 'combat' | 'short_rest' | 'long_rest' | 'permanent' | number;
  durationRounds?: number;
  appliedAt?: string;
  isConcentration?: boolean;
}
