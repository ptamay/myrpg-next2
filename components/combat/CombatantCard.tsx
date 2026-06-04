import React from 'react';
import { CombatParticipant } from '@/contexts/CombatContext';

interface Props {
  participant: CombatParticipant;
  isActive: boolean;
  isTarget?: boolean;
  targetType?: 'hostile' | 'friendly';
  index: number;
  onClick: (e: React.MouseEvent) => void;
}

export default function CombatantCard({ participant, isActive, isTarget, targetType, index, onClick }: Props) {
  const hpPercent = participant.hpMax > 0 
    ? Math.max(0, Math.min(100, (participant.hpCurrent / participant.hpMax) * 100))
    : 0;
    
  let hpClass = 'high';
  if (hpPercent <= 25) hpClass = 'low';
  else if (hpPercent <= 50) hpClass = 'med';

  const isDead = participant.isDead || participant.hpCurrent <= 0;
  const isAlly = participant.type === 'player';
  const classNames = [
    'combatant-card',
    isAlly ? 'ally' : 'enemy',
    isActive && !isDead ? 'active' : '',
    isTarget && !isDead ? `targeted-${targetType || 'hostile'}` : '',
    isDead ? 'dead' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className="combatant-card-wrapper"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animationFillMode: 'forwards'
      }}
    >
      <div 
        className={classNames} 
        onClick={onClick} 
        data-combat-id={participant.refId}
      >
        {isTarget && (
          <div className={`target-crosshair ${targetType || 'hostile'}`}></div>
        )}
        <div className="card-portrait">
        {participant.image ? (
          <img src={participant.image} alt={participant.name} />
        ) : (
          <div style={{ fontSize: '2rem', color: '#666' }}>{participant.name.charAt(0)}</div>
        )}
      </div>
      
      <div className="card-content">
        <div className="card-name" title={participant.name}>
          {participant.name} {isDead && "💀"} {participant.isTransformed && "🐾"}
        </div>
        
        <div className="card-stats">
          <span>🛡️ {participant.ac}</span>
          <span>👟 {participant.speed}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', justifyContent: 'center' }}>
          <div title="Ação Principal" style={{ width: '10px', height: '10px', borderRadius: '50%', background: participant.actionSpent ? '#333' : 'var(--success)', border: '1px solid rgba(255,255,255,0.2)' }}></div>
          <div title="Ação Bônus" style={{ width: '10px', height: '10px', borderRadius: '50%', background: participant.bonusActionSpent ? '#333' : 'var(--warning)', border: '1px solid rgba(255,255,255,0.2)' }}></div>
          <div title="Movimento" style={{ width: '10px', height: '10px', borderRadius: '50%', background: participant.movementSpent ? '#333' : 'var(--info)', border: '1px solid rgba(255,255,255,0.2)' }}></div>
          <div title="Reação" style={{ width: '10px', height: '10px', borderRadius: '50%', background: participant.reactionSpent ? '#333' : '#a855f7', border: '1px solid rgba(255,255,255,0.2)' }}></div>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {(participant.conditions || []).map(c => (
            <span key={c} style={{ fontSize: '0.65rem', background: 'var(--danger)', color: '#fff', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase' }}>
              {c}
            </span>
          ))}
        </div>

        <div className="card-hp-wrapper">
          <div className="hp-bar-container">
            <div className={`hp-bar ${hpClass}`} style={{ width: `${hpPercent}%` }}></div>
          </div>
          <div className="hp-text" style={{ color: isDead ? 'var(--danger)' : 'var(--text-primary)' }}>
            {participant.hpCurrent} / {participant.hpMax} HP
            {participant.tempHp > 0 && <span style={{ color: '#eab308', marginLeft: '4px' }}>(+{participant.tempHp})</span>}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
