import React, { useState } from 'react';
import { SpellEntry } from '@/lib/gameData';
import SpellEntryEditor from './SpellEntryEditor';
import { getSpellSlotsForLevel } from '@/lib/constants/dnd5eClasses';

interface SpellsSectionProps {
  hasSpells: boolean;
  onHasSpellsChange: (val: boolean) => void;
  spellcastingAbility: string;
  onAbilityChange: (val: string) => void;
  spellSlotType: string;
  onSlotTypeChange: (val: string) => void;
  spellSlots: Record<number, number>;
  onSpellSlotsChange: (slots: Record<number, number>) => void;
  spellsKnown: SpellEntry[];
  onSpellsKnownChange: (spells: SpellEntry[]) => void;
  playerClass?: string;
  playerLevel?: number;
}

export default function SpellsSection({
  hasSpells, onHasSpellsChange,
  spellcastingAbility, onAbilityChange,
  spellSlotType, onSlotTypeChange,
  spellSlots, onSpellSlotsChange,
  spellsKnown, onSpellsKnownChange,
  playerClass, playerLevel
}: SpellsSectionProps) {
  const [editingSpell, setEditingSpell] = useState<SpellEntry | null>(null);
  const [isAddingSpell, setIsAddingSpell] = useState(false);

  const handleSlotChange = (level: number, value: string) => {
    const num = value === "" ? "" : parseInt(value);
    onSpellSlotsChange({ ...spellSlots, [level]: (isNaN(num as number) && value !== "" ? 0 : num) as any });
  };

  const handleSaveSpell = (spell: SpellEntry) => {
    if (editingSpell) {
      onSpellsKnownChange(spellsKnown.map(s => s.id === spell.id ? spell : s));
    } else {
      onSpellsKnownChange([...spellsKnown, spell]);
    }
    setEditingSpell(null);
    setIsAddingSpell(false);
  };

  const handleDeleteSpell = (id: string) => {
    if (confirm("Deseja realmente remover esta magia?")) {
      onSpellsKnownChange(spellsKnown.filter(s => s.id !== id));
    }
  };

  return (
    <div className="spells-section mt-4">
      <div className="form-row" style={{ marginBottom: '15px' }}>
        <div className="form-group flex-1" style={{ display: 'flex', alignItems: 'center' }}>
          <label className="custom-checkbox" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
            <input type="checkbox" checked={hasSpells ?? false} onChange={(e) => onHasSpellsChange(e.target.checked)} />
            <span className="checkmark"></span>
            <span>Possui Conjuração de Magias?</span>
          </label>
        </div>
      </div>

      {hasSpells && (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div className="form-row" style={{ marginBottom: '15px', gap: '15px' }}>
            <div className="form-group flex-1">
              <label>Atributo de Conjuração</label>
              <select className="journey-input" value={spellcastingAbility || "int"} onChange={(e) => onAbilityChange(e.target.value)}>
                <option value="int">Inteligência</option>
                <option value="wis">Sabedoria</option>
                <option value="cha">Carisma</option>
                <option value="con">Constituição</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label>Tipo de Slots</label>
              <select className="journey-input" value={spellSlotType || "standard"} onChange={(e) => onSlotTypeChange(e.target.value)}>
                <option value="standard">Padrão (Magos, Clérigos, etc)</option>
                <option value="pact">Magia de Pacto (Bruxo)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0 10px 0' }}>
            <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Espaços de Magia (Máximo)</h5>
            {playerClass && playerLevel && (
              <button 
                type="button" 
                className="btn secondary-btn small-btn" 
                onClick={() => {
                  if (confirm(`Deseja preencher os slots sugeridos para um ${playerClass} nível ${playerLevel}?`)) {
                    onSpellSlotsChange(getSpellSlotsForLevel(playerClass, playerLevel));
                  }
                }}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Sugerir Slots
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
              <div key={lvl} className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '2px' }}>{lvl}º</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button type="button" onClick={() => handleSlotChange(lvl, Math.max(0, (spellSlots?.[lvl] || 0) - 1).toString())} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRight: 'none', color: '#fff', width: '24px', height: '28px', cursor: 'pointer', borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <input type="number" className="journey-input" min="0" value={spellSlots?.[lvl] ?? ""} onChange={(e) => handleSlotChange(lvl, e.target.value)} style={{ textAlign: 'center', padding: '4px 0', width: '32px', height: '28px', borderRadius: '0', borderLeft: 'none', borderRight: 'none' }} />
                  <button type="button" onClick={() => handleSlotChange(lvl, ((spellSlots?.[lvl] || 0) + 1).toString())} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderLeft: 'none', color: '#fff', width: '24px', height: '28px', cursor: 'pointer', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>Magias Conhecidas</h5>
            {!isAddingSpell && !editingSpell && (
              <button type="button" className="btn success-btn small-btn" onClick={() => setIsAddingSpell(true)}>+ Adicionar Magia</button>
            )}
          </div>

          {(isAddingSpell || editingSpell) ? (
            <SpellEntryEditor 
              spell={editingSpell || undefined} 
              onSave={handleSaveSpell} 
              onCancel={() => { setIsAddingSpell(false); setEditingSpell(null); }} 
            />
          ) : (
            <div className="spells-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {spellsKnown.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: 0 }}>Nenhuma magia cadastrada.</p>
              ) : (
                spellsKnown.map(spell => (
                  <div key={spell.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{spell.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                        {spell.level === 0 ? 'Truque' : `${spell.level}º Círculo`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button type="button" className="btn secondary-btn small-btn" style={{ padding: '4px 8px' }} onClick={() => setEditingSpell(spell)}>Editar</button>
                      <button type="button" className="btn danger-btn small-btn" style={{ padding: '4px 8px' }} onClick={() => handleDeleteSpell(spell.id)}>Excluir</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
