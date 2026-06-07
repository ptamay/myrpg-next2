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
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const filteredSpells = SPELLS_DB.filter(spell => {
    if (filterLevel !== 'all' && spell.level !== filterLevel) return false;
    if (searchTerm && !spell.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (filterClass !== 'all') {
      if (!spell.classes || !spell.classes.includes(filterClass)) return false;
    }
    
    if (filterSchool !== 'all') {
      if (spell.school.toLowerCase() !== filterSchool.toLowerCase()) return false;
    }
    
    if (filterTime !== 'all') {
      if (filterTime === 'action' && spell.castingTime !== 'action') return false;
      if (filterTime === 'bonus' && spell.castingTime !== 'bonus') return false;
      if (filterTime === 'reaction' && spell.castingTime !== 'reaction') return false;
      if (filterTime === 'other' && ['action', 'bonus', 'reaction'].includes(spell.castingTime)) return false;
    }
    
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
      school: spell.school,
      range: spell.range,
      duration: spell.duration,
      components: spell.components
    };

    const finalAbility = {
      ...ability,
      targetType: spell.targetType,
      reactionTrigger: spell.reactionTrigger,
      tempAcBonus: spell.tempAcBonus,
      spellLevel: spell.level,
      savingThrow: spell.savingThrow,
      saveAttr: spell.saveAttr
    } as Ability;

    onSelectSpell(finalAbility);
    onClose();
  };

  const getActionLabel = (cost: string) => {
    switch(cost) {
      case 'action': return 'Ação';
      case 'bonus': return 'Ação Bônus';
      case 'reaction': return 'Reação';
      case 'free': return 'Livre';
      default: return cost;
    }
  };

  const getClassColor = (cls: string) => {
    const colors: Record<string, string> = {
      'mago': '#3b82f6',
      'feiticeiro': '#ef4444',
      'bruxo': '#8b5cf6',
      'bardo': '#ec4899',
      'clerigo': '#eab308',
      'paladino': '#f59e0b',
      'druida': '#22c55e',
      'guardinha': '#10b981'
    };
    return colors[cls] || '#a1a1aa';
  };

  const inputStyle = {
    background: 'hsla(0,0%,0%,0.4)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    padding: '8px 12px',
    borderRadius: '4px',
    outline: 'none',
  };

  return createPortal(
    <div className="modal-overlay active" onClick={onClose} style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* HEADER & FILTERS (Sticky Area) */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'hsla(240, 10%, 6%, 0.8)', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Compêndio de Magias</h2>
            <button className="btn-remove-topic" onClick={onClose} style={{ width: '32px', height: '32px' }}>✕</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar magia pelo nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, gridColumn: 'span 3' }}
            />
            
            <select 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              style={inputStyle}
            >
              <option value="all">Todos os Níveis</option>
              <option value="0">Truques (Nv. 0)</option>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
              <option value="4">Nível 4</option>
              <option value="5">Nível 5</option>
              <option value="6">Nível 6</option>
              <option value="7">Nível 7</option>
              <option value="8">Nível 8</option>
              <option value="9">Nível 9</option>
            </select>

            <select style={inputStyle} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="all">Todas as Classes</option>
              <option value="bardo">Bardo</option>
              <option value="bruxo">Bruxo</option>
              <option value="clerigo">Clérigo</option>
              <option value="druida">Druida</option>
              <option value="feiticeiro">Feiticeiro</option>
              <option value="mago">Mago</option>
              <option value="paladino">Paladino</option>
              <option value="guardinha">Patrulheiro</option>
            </select>

            <select style={inputStyle} value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
              <option value="all">Todas as Escolas</option>
              <option value="abjuração">Abjuração</option>
              <option value="adivinhação">Adivinhação</option>
              <option value="conjuração">Conjuração</option>
              <option value="encantamento">Encantamento</option>
              <option value="evocação">Evocação</option>
              <option value="ilusão">Ilusão</option>
              <option value="necromancia">Necromancia</option>
              <option value="transmutação">Transmutação</option>
            </select>
            
            <select style={{ ...inputStyle, gridColumn: 'span 3' }} value={filterTime} onChange={e => setFilterTime(e.target.value)}>
              <option value="all">Qualquer Tempo de Conjuração</option>
              <option value="action">Ação</option>
              <option value="bonus">Ação Bônus</option>
              <option value="reaction">Reação</option>
              <option value="other">Outros (Minutos/Horas)</option>
            </select>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Exibindo {filteredSpells.length} magia{filteredSpells.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* LIST AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'hsla(0,0%,0%,0.2)' }}>
          {filteredSpells.map(spell => (
            <div key={spell.id} className="npc-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'row', padding: '1rem', gap: '1.5rem', animation: 'cardFadeIn 0.3s ease backwards', background: 'hsla(240, 10%, 10%, 0.6)' }}>
              
              {/* Left Side: Name and Badges */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{spell.name}</h3>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'hsla(0,0%,100%,0.1)', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontWeight: 'bold' }}>
                    {spell.level === 0 ? 'Truque' : `Nível ${spell.level}`}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'hsla(280, 80%, 40%, 0.2)', color: '#d8b4fe', borderRadius: '4px', border: '1px solid hsla(280, 80%, 40%, 0.4)' }}>
                    {spell.school}
                  </span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {spell.description}
                </p>

                {/* Spell Meta details */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div><strong>Tempo:</strong> {getActionLabel(spell.castingTime)}</div>
                  <div><strong>Alcance:</strong> {spell.range}</div>
                  <div><strong>Duração:</strong> {spell.duration} {spell.isConcentration && '(C)'}</div>
                </div>

                {/* Class tags */}
                {spell.classes && spell.classes.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {spell.classes.map(c => (
                      <span key={c} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'hsla(0,0%,0%,0.3)', border: `1px solid ${getClassColor(c)}`, color: getClassColor(c), textTransform: 'capitalize' }}>
                        {c === 'guardinha' ? 'Patrulheiro' : c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Action Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '1rem', borderLeft: '1px solid var(--border-subtle)' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleSelect(spell)}
                  style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.5rem' }}
                >
                  Adicionar
                </button>
              </div>

            </div>
          ))}

          {filteredSpells.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', fontSize: '1.1rem', background: 'hsla(0,0%,100%,0.02)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
              Nenhuma magia encontrada com os filtros atuais.
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
