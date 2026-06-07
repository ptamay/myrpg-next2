import React from 'react';

interface SpellsSectionProps {
  spellcastingAbility: string;
  onAbilityChange: (val: string) => void;
  spellSlotType: string;
  onSlotTypeChange: (val: string) => void;
  playerClass?: string;
}

export default function SpellsSection({
  spellcastingAbility, onAbilityChange,
  spellSlotType, onSlotTypeChange,
  playerClass
}: SpellsSectionProps) {

  // If not a caster and not custom, maybe we shouldn't show it?
  // Let's just always show it under a magical settings header to let them override.

  return (
    <div className="spells-section mt-4">
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <h5 style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)' }}>Configurações de Conjurador</h5>
        <div className="form-row" style={{ gap: '15px' }}>
          <div className="form-group flex-1">
            <label>Atributo de Conjuração</label>
            <select className="journey-input" value={spellcastingAbility || "none"} onChange={(e) => onAbilityChange(e.target.value)}>
              <option value="none">Nenhum (Não-conjurador)</option>
              <option value="int">Inteligência</option>
              <option value="wis">Sabedoria</option>
              <option value="cha">Carisma</option>
              <option value="con">Constituição</option>
            </select>
          </div>
          <div className="form-group flex-1" style={{ opacity: spellcastingAbility === 'none' ? 0.5 : 1, pointerEvents: spellcastingAbility === 'none' ? 'none' : 'auto' }}>
            <label>Tipo de Slots</label>
            <select className="journey-input" value={spellSlotType || "none"} onChange={(e) => onSlotTypeChange(e.target.value)}>
              <option value="none">Nenhum</option>
              <option value="standard">Padrão (Magos, Clérigos, etc)</option>
              <option value="pact">Magia de Pacto (Bruxo)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
