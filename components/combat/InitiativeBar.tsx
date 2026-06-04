import React from 'react';
import { useCombat } from '@/contexts/CombatContext';

export default function InitiativeBar() {
  const { combat } = useCombat();

  if (!combat) return null;

  return (
    <div className="initiative-bar">
      <div className="initiative-list">
        {combat.participants.map((p, idx) => {
          const isActive = idx === combat.currentTurnIndex;
          const isDead = p.isDead || p.hpCurrent <= 0;
          
          let classNames = 'initiative-portrait';
          if (isActive && !isDead) classNames += ' active';
          if (isDead) classNames += ' dead';

          return (
            <div key={p.refId} className={classNames} title={`${p.name} (Iniciativa: ${p.initiative})`}>
              {p.image ? (
                <img src={p.image} alt={p.name} />
              ) : (
                <span className="fallback-initial">{p.name.charAt(0)}</span>
              )}
              {isDead && <span className="dead-icon">💀</span>}
              <div className="init-badge">{p.initiative}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontWeight: 'bold' }}>
        Rodada {combat.round}
      </div>
    </div>
  );
}
