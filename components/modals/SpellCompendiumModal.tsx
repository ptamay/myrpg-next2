import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SpellEntry, Ability } from '@/lib/gameData';
import { SPELLS_DB } from '@/lib/constants/spellsDB';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSpell: (spellAsAbility: Ability) => void;
}

export default function SpellCompendiumModal({ isOpen, onClose, onSelectSpell }: Props) {
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const filteredSpells = SPELLS_DB.filter(spell => {
    if (filterLevel !== 'all' && spell.level !== filterLevel) return false;
    if (searchTerm && !spell.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (spell: SpellEntry) => {
    const ability: Ability = {
      id: crypto.randomUUID(),
      name: spell.name,
      description: spell.description,
      actionCost: spell.castingTime as any,
      resourceCost: spell.level > 0 ? { resourceName: `Espaço Nível ${spell.level}`, amount: 1 } : undefined,
      effect: spell.effect || 'utility',
      dmg: spell.damageDice,
      dmgType: spell.damageType as any,
      conditionApplied: spell.conditionApplied,
      isPassive: false,
      minLevel: spell.level,
      // Pass-through some custom fields via type casting or directly if we expanded the Ability interface
      // Note: We'll add them temporarily via spread to keep automation intact
    };

    // Append automation fields
    const finalAbility = {
      ...ability,
      targetType: spell.targetType,
      reactionTrigger: spell.reactionTrigger,
      tempAcBonus: spell.tempAcBonus,
      spellLevel: spell.level, // Store the native spell level for upcast UI
      savingThrow: spell.savingThrow
    } as Ability;

    onSelectSpell(finalAbility);
    onClose();
  };

  return createPortal(
    <div className="modal-overlay active" onClick={onClose} style={{ zIndex: 11000 }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
        <div className="modal-header">
          <h2>Compêndio de Magias</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar magia..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <select 
              className="form-input" 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              style={{ width: '150px' }}
            >
              <option value="all">Todos os Níveis</option>
              <option value="0">Truques (Nv. 0)</option>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
              <option value="4">Nível 4</option>
              <option value="5">Nível 5</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredSpells.map(spell => (
              <div key={spell.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#c084fc' }}>{spell.name}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                      {spell.level === 0 ? 'Truque' : `Nível ${spell.level}`}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>{spell.castingTime}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '4px' }}>
                    {spell.description.substring(0, 80)}...
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => handleSelect(spell)}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Adicionar
                </button>
              </div>
            ))}
            
            {filteredSpells.length === 0 && (
              <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '2rem 0' }}>
                Nenhuma magia encontrada.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
