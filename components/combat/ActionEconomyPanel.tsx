import React from 'react';
import { CombatParticipant } from '@/contexts/CombatContext';
import { getMaxAttacks } from '@/lib/dice/multiattack';

interface Props {
  participant: CombatParticipant;
}

export default function ActionEconomyPanel({ participant }: Props) {
  const maxAttacks = getMaxAttacks(participant);
  const currentAttacks = participant.attacksMade || 0;
  
  // Bolinhas de ataques extras se for Ação Principal de ataque
  const attackDots = [];
  for (let i = 0; i < maxAttacks; i++) {
    const isSpent = i < currentAttacks || participant.actionSpent;
    attackDots.push(
      <div 
        key={`atk-${i}`} 
        style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: isSpent ? 'rgba(239, 68, 68, 0.4)' : '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.8)',
          display: 'inline-block',
          boxShadow: isSpent ? 'none' : '0 0 5px rgba(239, 68, 68, 0.6)'
        }}
        title={`Ataque ${i + 1}/${maxAttacks}`}
      />
    );
  }

  const renderIcon = (spent: boolean, label: string, color: string, emoji: string) => (
    <div 
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        opacity: spent ? 0.4 : 1,
        filter: spent ? 'grayscale(100%)' : 'none',
        transition: 'all 0.3s'
      }}
      title={spent ? `${label} Gasta` : `${label} Disponível`}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '8px',
        background: `rgba(${color}, 0.15)`,
        border: `1px solid rgba(${color}, 0.5)`,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: '1.2rem',
        boxShadow: spent ? 'none' : `0 0 10px rgba(${color}, 0.3)`
      }}>
        {emoji}
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="action-economy-panel" style={{ 
      display: 'flex', gap: '20px', alignItems: 'center', padding: '10px 15px', 
      background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border-subtle)',
      justifyContent: 'center', flexWrap: 'wrap'
    }}>
      {renderIcon(participant.actionSpent, 'Ação', '59, 130, 246', '⚔️')}
      
      <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-start', marginTop: '14px', marginLeft: '-12px', marginRight: '8px' }}>
        {attackDots}
      </div>

      {renderIcon(participant.bonusActionSpent, 'Bônus', '34, 197, 94', '⚡')}
      {renderIcon(participant.reactionSpent, 'Reação', '168, 85, 247', '🛡️')}
      {renderIcon(participant.movementSpent, 'Mov.', '245, 158, 11', '🏃')}
    </div>
  );
}
