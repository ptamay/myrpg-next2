import React, { useState, useEffect } from 'react';
import { SpellEntry } from '@/lib/gameData';

interface SpellEntryEditorProps {
  spell?: SpellEntry;
  onSave: (spell: SpellEntry) => void;
  onCancel: () => void;
}

const initialSpell: SpellEntry = {
  id: '',
  name: '',
  level: 0,
  school: 'Evocação',
  castingTime: '1 ação',
  range: '9 metros',
  components: 'V, S',
  duration: 'Instantânea',
  isConcentration: false,
  isRitual: false,
  description: '',
  damageDice: '',
  damageType: '',
  savingThrow: '',
  spellAttack: false,
  higherLevel: ''
};

export default function SpellEntryEditor({ spell, onSave, onCancel }: SpellEntryEditorProps) {
  const [formData, setFormData] = useState<SpellEntry>(initialSpell);

  useEffect(() => {
    if (spell) {
      setFormData({ ...spell });
    } else {
      setFormData({ ...initialSpell, id: crypto.randomUUID() });
    }
  }, [spell]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'level' ? parseInt(value) || 0 : value);
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert("O nome da magia é obrigatório.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="spell-editor-form" style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '15px' }}>
      <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>{spell ? 'Editar Magia' : 'Nova Magia'}</h4>
      <div>
        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group flex-2">
            <label>Nome *</label>
            <input type="text" name="name" className="journey-input" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group flex-1">
            <label>Nível</label>
            <select name="level" className="journey-input" value={formData.level} onChange={handleChange}>
              <option value="0">Truque (0)</option>
              {[1,2,3,4,5,6,7,8,9].map(lvl => <option key={lvl} value={lvl}>{lvl}º Círculo</option>)}
            </select>
          </div>
          <div className="form-group flex-1">
            <label>Escola</label>
            <input type="text" name="school" className="journey-input" value={formData.school} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group flex-1">
            <label>Tempo de Conjuração</label>
            <input type="text" name="castingTime" className="journey-input" value={formData.castingTime} onChange={handleChange} />
          </div>
          <div className="form-group flex-1">
            <label>Alcance</label>
            <input type="text" name="range" className="journey-input" value={formData.range} onChange={handleChange} />
          </div>
          <div className="form-group flex-1">
            <label>Duração</label>
            <input type="text" name="duration" className="journey-input" value={formData.duration} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group flex-2">
            <label>Componentes (V, S, M)</label>
            <input type="text" name="components" className="journey-input" value={formData.components} onChange={handleChange} />
          </div>
          <div className="form-group flex-1" style={{ display: 'flex', gap: '15px', alignItems: 'center', paddingTop: '20px' }}>
            <label className="custom-checkbox-container" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" name="isConcentration" checked={formData.isConcentration} onChange={handleChange} /> Concentração
            </label>
            <label className="custom-checkbox-container" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" name="isRitual" checked={formData.isRitual} onChange={handleChange} /> Ritual
            </label>
          </div>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group flex-1">
            <label>Rolagem de Dano (ex: 8d6)</label>
            <input type="text" name="damageDice" className="journey-input" value={formData.damageDice || ''} onChange={handleChange} />
          </div>
          <div className="form-group flex-1">
            <label>Tipo de Dano (ex: Fogo)</label>
            <input type="text" name="damageType" className="journey-input" value={formData.damageType || ''} onChange={handleChange} />
          </div>
          <div className="form-group flex-1">
            <label>Salvaguarda (ex: DES)</label>
            <input type="text" name="savingThrow" className="journey-input" value={formData.savingThrow || ''} onChange={handleChange} />
          </div>
          <div className="form-group flex-1" style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
            <label className="custom-checkbox-container" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" name="spellAttack" checked={formData.spellAttack || false} onChange={handleChange} /> Usa Ataque de Magia
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label>Descrição</label>
          <textarea name="description" className="journey-input custom-scrollbar" rows={3} value={formData.description} onChange={handleChange}></textarea>
        </div>

        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label>Em Nível Superior</label>
          <input type="text" name="higherLevel" className="journey-input" value={formData.higherLevel || ''} onChange={handleChange} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn secondary-btn small-btn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn primary-btn small-btn" onClick={handleSubmit}>Salvar Magia</button>
        </div>
      </div>
    </div>
  );
}
