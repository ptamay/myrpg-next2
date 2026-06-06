import React, { useState } from 'react';
import { CombatParticipant, useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';

interface Props {
  participant: CombatParticipant;
  isActive: boolean;
  index: number;
  onClick: (e: React.MouseEvent) => void;
}

function getResourceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ki')) return '🌀';
  if (n.includes('fúria') || n.includes('furia') || n.includes('rage')) return '🔥';
  if (n.includes('inspiração') || n.includes('bardo')) return '🎵';
  if (n.includes('forma selvagem') || n.includes('wildshape')) return '🐺';
  if (n.includes('surto')) return '⚡';
  if (n.includes('retomar')) return '💨';
  if (n.includes('canalizar') || n.includes('divindade')) return '✨';
  if (n.includes('feitiçaria') || n.includes('feiticeiro')) return '💜';
  if (n.includes('mãos') || n.includes('cura')) return '🤲';
  return '◆';
}

function SpellSlotPips({ slots, used }: { slots: Record<number, number>; used: Record<number, number> }) {
  const levels = Object.keys(slots).map(Number).filter(lvl => slots[lvl] > 0).sort((a, b) => a - b);
  if (levels.length === 0) return null;

  return (
    <div style={{ marginTop: '4px' }}>
      {levels.map(lvl => {
        const max = slots[lvl];
        const usedCount = used?.[lvl] || 0;
        const available = max - usedCount;
        return (
          <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '16px', textAlign: 'right' }}>{lvl}°</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: max }).map((_, i) => (
                <div key={i} title={`Slot nível ${lvl}`} style={{ width: '9px', height: '9px', borderRadius: '50%', background: i < available ? '#a78bfa' : 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)' }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResourcePips({ name, current, max }: { name: string; current: number; max: number }) {
  const icon = getResourceIcon(name);
  const displayMax = Math.min(max, 10);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
      <span style={{ fontSize: '0.75rem', minWidth: '16px', textAlign: 'center' }}>{icon}</span>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {Array.from({ length: displayMax }).map((_, i) => (
          <div key={i} title={`${name}: ${current}/${max}`} style={{ width: '9px', height: '9px', borderRadius: '2px', background: i < current ? '#fb923c' : 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)' }} />
        ))}
        {max > 10 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{current}/{max}</span>}
      </div>
    </div>
  );
}

export default function CombatantCard({ participant, isActive, index, onClick }: Props) {
  const { combat, applyDamage, applyHeal, updateParticipant, addToLog } = useCombat();
  const { isGM } = useUserSession();

  const [hpInput, setHpInput] = useState('');
  const [showHpEditor, setShowHpEditor] = useState(false);

  const hpPercent = participant.hpMax > 0
    ? Math.max(0, Math.min(100, (participant.hpCurrent / participant.hpMax) * 100))
    : 0;

  let hpClass = 'high';
  if (hpPercent <= 25) hpClass = 'low';
  else if (hpPercent <= 50) hpClass = 'med';

  const isDead = participant.isDead || participant.hpCurrent <= 0;
  const isEnemy = participant.combatFaction === 'enemy';
  const hideHpData = !isGM && isEnemy;
  const isAllyFaction = participant.combatFaction === 'ally';
  const isNeutral = participant.faction === 'neutral';
  const isTargeted = false;

  const hasCond = (cMatch: string) => (participant.conditions || []).some(c => c.toLowerCase().includes(cMatch));

  const classNames = [
    'combatant-card',
    isAllyFaction ? 'ally' : 'enemy',
    isActive && !isDead ? 'active' : '',
    isDead ? 'dead' : '',
    participant.isRaging ? 'is-raging' : '',
    participant.isConcentrating ? 'is-concentrating' : '',
    isNeutral ? 'neutral' : '',
    isTargeted ? 'is-targeted' : '',
    hasCond('envenenado') ? 'is-poisoned' : '',
    (hasCond('furtivo') || hasCond('escondido') || hasCond('invisível')) ? 'is-stealth' : '',
    hasCond('amedrontado') ? 'is-frightened' : ''
  ].filter(Boolean).join(' ');

  const hasSpellSlots = participant.spellSlots && Object.values(participant.spellSlots).some(v => v > 0);
  const hasResources = participant.classResources && participant.classResources.length > 0;
  const hasConditions = (participant.conditions || []).length > 0;

  const handleApplyHp = (type: 'dmg' | 'heal' | 'temp') => {
    const val = parseInt(hpInput, 10);
    if (isNaN(val) || val <= 0) return;

    if (type === 'dmg') {
      applyDamage(participant.refId, val);
      addToLog(`sofreu **${val}** de dano.`, participant.name, 'damage');
    } else if (type === 'heal') {
      applyHeal(participant.refId, val);
      addToLog(`curou **${val}** HP.`, participant.name, 'heal');
    } else if (type === 'temp') {
      updateParticipant(participant.refId, { tempHp: participant.tempHp + val });
      addToLog(`recebeu **${val}** de Vida Temporária.`, participant.name, 'system');
    }
    setHpInput('');
    setShowHpEditor(false);
  };

  return (
    <div className="combatant-card-wrapper" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
      <div className={classNames} onClick={onClick} data-combat-id={participant.refId}>
        {/* Target reticle removed */}
        
        <div className="card-portrait">
          {participant.image ? <img src={participant.image} alt={participant.name} /> : <div style={{ fontSize: '2.5rem', color: '#666' }}>{participant.name.charAt(0)}</div>}
          {participant.isRaging && <div className="rage-overlay" title="Em Fúria!" />}
          {hasConditions && (
            <div className="conditions-overlay">
              {(participant.conditions || []).map(c => <div key={c} className="condition-badge">{c}</div>)}
            </div>
          )}
        </div>

        <div className="card-content">
          <div className="card-name" title={participant.name}>
            {participant.name}
            {isDead && ' 💀'}
            {participant.combatTransformActive && <span className="transform-badge" style={{ fontSize: '0.75rem', padding: '0 4px', borderRadius: '4px', marginLeft: '4px' }}>🐺</span>}
            {(!participant.combatTransformActive && participant.isTransformed) && ' 🐾'}
            {participant.isRaging && ' 🔥'}
            {participant.isConcentrating && <span title={`Concentração: ${participant.concentrationSpell || 'magia'}`}> 🌀</span>}
          </div>

          <div className="card-stats">
            <span>👟 {participant.speed} m</span>
          </div>

          {!hideHpData && hasSpellSlots && <div style={{ marginBottom: '6px' }}><SpellSlotPips slots={participant.spellSlots!} used={participant.spellSlotsUsed || {}} /></div>}
          {!hideHpData && hasResources && <div style={{ marginBottom: '6px' }}>{(participant.classResources || []).map(res => <ResourcePips key={res.id} name={res.name} current={res.current} max={res.max} />)}</div>}

          <div style={{ marginTop: 'auto' }}>
            {participant.combatTransformActive && (
              <div style={{ marginBottom: '6px', padding: '4px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #6b7280' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>
                  <span>❤️ Original</span>
                  <span>{participant.preTransformHp} / {participant.preTransformHpMax}</span>
                </div>
                <div className="hp-bar-container" style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div className="hp-bar" style={{ width: `${Math.max(0, Math.min(100, ((participant.preTransformHp || 0) / (participant.preTransformHpMax || 1)) * 100))}%`, background: '#6b7280', borderRadius: '2px' }} />
                </div>
              </div>
            )}

            <div className="card-hp-wrapper" style={{ marginBottom: isGM ? '4px' : '0' }}>
              {!hideHpData && (
                <>
                  <div className="hp-bar-container" style={{ height: '8px' }}>
                    <div className={`hp-bar ${hpClass} ${participant.combatTransformActive ? 'hp-bar-transform' : ''}`} style={{ width: `${hpPercent}%` }} />
                  </div>
                  <div className="hp-text" style={{ color: isDead ? 'var(--danger)' : 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {participant.hpCurrent} / {participant.hpMax}
                      {participant.tempHp > 0 && <span style={{ color: '#eab308', marginLeft: '4px' }}>(+{participant.tempHp})</span>}
                    </span>
                    {isGM && (
                      <button 
                        className="btn secondary-btn" 
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                        onClick={(e) => { e.stopPropagation(); setShowHpEditor(!showHpEditor); }}
                      >
                        HP ⚙️
                      </button>
                    )}
                  </div>
                </>
              )}
              {hideHpData && (
                <div className="hp-text" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                  Facção Inimiga
                </div>
              )}
            </div>

            {isGM && showHpEditor && (
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '6px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  <input
                    type="number"
                    className="journey-input"
                    placeholder="Qtd..."
                    value={hpInput}
                    onChange={e => setHpInput(e.target.value)}
                    style={{ width: '100%', padding: '4px', fontSize: '0.8rem', textAlign: 'center' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn secondary-btn" style={{ flex: 1, padding: '4px 0', fontSize: '0.7rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleApplyHp('dmg')}>Dano</button>
                  <button className="btn secondary-btn" style={{ flex: 1, padding: '4px 0', fontSize: '0.7rem', color: '#22c55e', borderColor: '#22c55e' }} onClick={() => handleApplyHp('heal')}>Cura</button>
                  <button className="btn secondary-btn" style={{ flex: 1, padding: '4px 0', fontSize: '0.7rem', color: '#eab308', borderColor: '#eab308' }} onClick={() => handleApplyHp('temp')}>Temp</button>
                </div>
                {isDead && (
                  <button 
                    className="btn primary-btn" 
                    style={{ width: '100%', marginTop: '4px', padding: '4px', fontSize: '0.7rem' }}
                    onClick={() => {
                      updateParticipant(participant.refId, { isDead: false });
                      addToLog(`foi estabilizado/revivido!`, participant.name, 'heal');
                    }}
                  >
                    ⚕️ Reviver/Estabilizar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
