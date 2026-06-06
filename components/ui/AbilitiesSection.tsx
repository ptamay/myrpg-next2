import React from 'react';
import { Ability, ClassResource } from '@/lib/gameData';
import { getDefaultAbilities } from '@/lib/constants/dnd5eClasses';
import { CONDITIONS_MAP } from '@/lib/constants/dnd5e';
import SpellCompendiumModal from '../modals/SpellCompendiumModal';

interface AbilitiesSectionProps {
  abilities: Ability[];
  onChange: (abilities: Ability[]) => void;
  classResources?: ClassResource[];
  playerClass?: string;
  playerLevel?: number;
}

export default function AbilitiesSection({
  abilities,
  onChange,
  classResources = [],
  playerClass,
  playerLevel
}: AbilitiesSectionProps) {
  const [isCompendiumOpen, setIsCompendiumOpen] = React.useState(false);

  const addAbility = () => {
    const newAb: Ability = {
      id: crypto.randomUUID(),
      name: '',
      actionCost: 'action',
      effect: 'utility',
    };
    onChange([...abilities, newAb]);
  };

  const updateAbility = (id: string, updates: Partial<Ability>) => {
    onChange(abilities.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAbility = (id: string) => {
    onChange(abilities.filter(a => a.id !== id));
  };

  const suggestAbilities = () => {
    if (!playerClass || !playerLevel) return;
    const defaults = getDefaultAbilities(playerClass, playerLevel);
    if (defaults.length === 0) {
      alert("Nenhuma habilidade padrão encontrada para esta classe neste nível.");
      return;
    }
    
    const newAbilities = [...abilities];
    for (const def of defaults) {
      const existing = newAbilities.find(a => a.name.toLowerCase() === def.name.toLowerCase());
      if (!existing) {
        newAbilities.push(def);
      }
    }
    onChange(newAbilities);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 className="form-section-title" style={{ margin: 0 }}>⚡ Habilidades Especiais</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {playerClass && playerLevel && (
            <button type="button" onClick={suggestAbilities} className="btn secondary-btn small-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
              Sugerir da Classe
            </button>
          )}
          <button type="button" onClick={() => setIsCompendiumOpen(true)} className="btn secondary-btn small-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#c084fc', color: '#c084fc' }}>
            🔮 Compêndio de Magias
          </button>
          <button type="button" onClick={addAbility} className="btn success-btn small-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            + Adicionar
          </button>
        </div>
      </div>

      {abilities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
          Nenhuma habilidade especial cadastrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {abilities.map(ab => (
            <div key={ab.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
              
              <div className="form-row" style={{ gap: '10px', marginBottom: '8px' }}>
                <div className="form-group flex-2">
                  <label>Nome</label>
                  <input type="text" className="journey-input" value={ab.name} onChange={e => updateAbility(ab.id, { name: e.target.value })} placeholder="ex: Fúria" />
                </div>
                <div className="form-group flex-1">
                  <label>Tipo de Ação</label>
                  <select className="journey-input" value={ab.actionCost} onChange={e => updateAbility(ab.id, { actionCost: e.target.value as any })}>
                    <option value="action">Ação</option>
                    <option value="bonus">Ação Bônus</option>
                    <option value="reaction">Reação</option>
                    <option value="free">Ação Gratuita</option>
                    <option value="movement">Movimento</option>
                    <option value="none">Nenhum / Passiva</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Efeito</label>
                  <select className="journey-input" value={ab.effect} onChange={e => updateAbility(ab.id, { effect: e.target.value as any })}>
                    <option value="damage">Dano</option>
                    <option value="heal">Cura</option>
                    <option value="condition">Condição</option>
                    <option value="buff">Buff</option>
                    <option value="utility">Utilidade</option>
                    <option value="passive">Passiva</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <label style={{ marginRight: '8px' }}>Passiva?</label>
                  <input type="checkbox" checked={!!ab.isPassive} onChange={e => updateAbility(ab.id, { isPassive: e.target.checked })} />
                </div>
              </div>

              <div className="form-row" style={{ gap: '10px', marginBottom: '8px' }}>
                <div className="form-group flex-2">
                  <label>Custo de Recurso (Opcional)</label>
                  <select 
                    className="journey-input" 
                    value={ab.resourceCost?.resourceName || ''} 
                    onChange={e => {
                      if (!e.target.value) {
                        updateAbility(ab.id, { resourceCost: undefined });
                      } else {
                        updateAbility(ab.id, { resourceCost: { resourceName: e.target.value, amount: ab.resourceCost?.amount || 1 } });
                      }
                    }}
                  >
                    <option value="">Nenhum</option>
                    {classResources.map(res => (
                      <option key={res.id} value={res.name}>{res.name}</option>
                    ))}
                  </select>
                </div>
                {ab.resourceCost?.resourceName && (
                  <div className="form-group flex-1">
                    <label>Qtd Gasta</label>
                    <input 
                      type="number" 
                      className="journey-input" 
                      value={ab.resourceCost.amount} 
                      onChange={e => updateAbility(ab.id, { resourceCost: { ...ab.resourceCost!, amount: parseInt(e.target.value) || 1 } })} 
                      min="1" 
                    />
                  </div>
                )}
                <div className="form-group flex-2">
                  <label>Condição Aplicada</label>
                  <input 
                    type="text" 
                    className="journey-input" 
                    value={ab.conditionApplied || ''} 
                    onChange={e => updateAbility(ab.id, { conditionApplied: e.target.value })} 
                    placeholder="ex: Fúria ou Amedrontado" 
                    list="conditions-list"
                  />
                  <datalist id="conditions-list">
                    {CONDITIONS_MAP.map(c => (
                      <option key={c.id} value={c.label} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="form-row" style={{ gap: '10px' }}>
                <div className="form-group flex-1">
                  <label>Exige Resistência?</label>
                  <select 
                    className="journey-input" 
                    value={ab.savingThrow || ''} 
                    onChange={e => updateAbility(ab.id, { savingThrow: e.target.value || undefined })}
                  >
                    <option value="">Nenhum</option>
                    <option value="for">Força</option>
                    <option value="des">Destreza</option>
                    <option value="con">Constituição</option>
                    <option value="int">Inteligência</option>
                    <option value="sab">Sabedoria</option>
                    <option value="car">Carisma</option>
                  </select>
                </div>
                {ab.savingThrow && (
                  <div className="form-group flex-1">
                    <label>CD Fixa (Vazio = Auto)</label>
                    <input 
                      type="number" 
                      className="journey-input" 
                      value={ab.saveDC || ''} 
                      onChange={e => updateAbility(ab.id, { saveDC: e.target.value ? parseInt(e.target.value) : undefined })} 
                      placeholder="ex: 15"
                    />
                  </div>
                )}
              </div>

              <div className="form-row" style={{ gap: '10px' }}>
                <div className="form-group flex-1">
                  <label>Descrição</label>
                  <input type="text" className="journey-input" value={ab.description || ''} onChange={e => updateAbility(ab.id, { description: e.target.value })} placeholder="O que esta habilidade faz..." />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <button type="button" onClick={() => removeAbility(ab.id)} className="btn danger-btn small-btn" title="Remover Habilidade" style={{ padding: '6px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      )}

      <SpellCompendiumModal 
        isOpen={isCompendiumOpen} 
        onClose={() => setIsCompendiumOpen(false)} 
        onSelectSpell={(spellAbility) => {
          onChange([...abilities, spellAbility]);
        }} 
      />
    </div>
  );
}
