import React from 'react';
import { DAMAGE_TYPES } from '@/lib/constants/dnd5eClasses';

interface DamageTypeSelectorProps {
  resistances: string[];
  immunities: string[];
  onResistancesChange: (values: string[]) => void;
  onImmunitiesChange: (values: string[]) => void;
}

export default function DamageTypeSelector({
  resistances,
  immunities,
  onResistancesChange,
  onImmunitiesChange
}: DamageTypeSelectorProps) {

  const handleToggle = (type: string, list: string[], onChange: (v: string[]) => void) => {
    if (list.includes(type)) {
      onChange(list.filter(t => t !== type));
    } else {
      onChange([...list, type]);
    }
  };

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div>
        <h4 className="form-section-title" style={{ margin: '0 0 10px 0' }}>🛡️ Resistências (metade do dano)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DAMAGE_TYPES.map(type => {
            const isChecked = resistances.includes(type);
            return (
              <label 
                key={type} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '4px 8px', 
                  background: isChecked ? 'rgba(0,255,0,0.1)' : 'rgba(0,0,0,0.2)', 
                  border: `1px solid ${isChecked ? 'var(--success)' : 'var(--border-subtle)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.85rem'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={() => handleToggle(type, resistances, onResistancesChange)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize', color: isChecked ? 'var(--success)' : 'var(--text-primary)' }}>
                  {type}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="form-section-title" style={{ margin: '0 0 10px 0' }}>🔒 Imunidades (dano zerado)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DAMAGE_TYPES.map(type => {
            const isChecked = immunities.includes(type);
            return (
              <label 
                key={type} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '4px 8px', 
                  background: isChecked ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,0,0.2)', 
                  border: `1px solid ${isChecked ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.85rem'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={() => handleToggle(type, immunities, onImmunitiesChange)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize', color: isChecked ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {type}
                </span>
              </label>
            );
          })}
        </div>
      </div>

    </div>
  );
}
