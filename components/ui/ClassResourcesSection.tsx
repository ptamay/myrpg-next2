import React, { useState } from 'react';
import { ClassResource } from '@/lib/gameData';
import { getDefaultClassResources } from '@/lib/constants/dnd5eClasses';

interface ClassResourcesSectionProps {
  resources: ClassResource[];
  onChange: (resources: ClassResource[]) => void;
  playerClass?: string;
  playerLevel?: number;
}

export default function ClassResourcesSection({
  resources,
  onChange,
  playerClass,
  playerLevel
}: ClassResourcesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addResource = () => {
    const newRes: ClassResource = {
      id: crypto.randomUUID(),
      name: '',
      current: 1,
      max: 1,
      resetOn: 'short'
    };
    onChange([...resources, newRes]);
    setEditingId(newRes.id);
  };

  const updateResource = (id: string, updates: Partial<ClassResource>) => {
    onChange(resources.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeResource = (id: string) => {
    onChange(resources.filter(r => r.id !== id));
  };

  const suggestResources = () => {
    if (!playerClass || !playerLevel) return;
    const defaults = getDefaultClassResources(playerClass, playerLevel);
    if (defaults.length === 0) {
      alert("Nenhum recurso padrão encontrado para esta classe.");
      return;
    }
    
    // Merge without duplicating existing names
    const newResources = [...resources];
    for (const def of defaults) {
      const existing = newResources.find(r => r.name.toLowerCase() === def.name.toLowerCase());
      if (existing) {
        existing.max = def.max;
      } else {
        newResources.push(def);
      }
    }
    onChange(newResources);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 className="form-section-title" style={{ margin: 0 }}>🎒 Recursos de Classe</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {playerClass && playerLevel && (
            <button type="button" onClick={suggestResources} className="btn secondary-btn small-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
              Sugerir Recursos
            </button>
          )}
          <button type="button" onClick={addResource} className="btn success-btn small-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            + Adicionar
          </button>
        </div>
      </div>

      {resources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
          Nenhum recurso cadastrado (ex: Ki, Fúria).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {resources.map(res => (
            <div key={res.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
              <div className="form-row" style={{ gap: '10px' }}>
                <div className="form-group flex-2">
                  <label>Nome do Recurso</label>
                  <input type="text" className="journey-input" value={res.name} onChange={e => updateResource(res.id, { name: e.target.value })} placeholder="ex: Fúria, Ki" />
                </div>
                <div className="form-group flex-1">
                  <label>Quantidade Máxima</label>
                  <input type="number" className="journey-input" value={res.max} onChange={e => updateResource(res.id, { max: parseInt(e.target.value) || 0, current: parseInt(e.target.value) || 0 })} min="1" />
                </div>
                <div className="form-group flex-1">
                  <label>Recuperação</label>
                  <select className="journey-input" value={res.resetOn} onChange={e => updateResource(res.id, { resetOn: e.target.value as any })}>
                    <option value="short">Descanso Curto</option>
                    <option value="long">Descanso Longo</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <button type="button" onClick={() => removeResource(res.id)} className="btn danger-btn small-btn" title="Remover Recurso" style={{ padding: '6px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
