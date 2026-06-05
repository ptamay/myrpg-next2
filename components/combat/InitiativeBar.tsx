import React from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';

export default function InitiativeBar() {
  const { combat, nextTurn, endCombat, addToLog, removeParticipant } = useCombat();
  const { isGM } = useUserSession();

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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontWeight: 'bold' }}>
          Rodada {combat.round}
        </div>
        
        {isGM && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn secondary-btn"
              style={{ borderColor: 'var(--warning)', color: 'var(--warning)', padding: '0.5rem 1rem' }}
              onClick={() => {
                const active = combat.participants[combat.currentTurnIndex];
                if(confirm(`Tem certeza que ${active.name} quer tentar fugir? Se confirmado, ele será removido do combate.`)) {
                  addToLog(`está tentando fugir do combate!`, active.name, 'system');
                  removeParticipant(active.refId);
                }
              }}
            >
              🏃 Fugir
            </button>
            <button 
              className="btn primary-btn" 
              style={{ background: '#f59e0b', color: '#fff', border: 'none' }}
              onClick={() => {
                addToLog('O turno foi passado.', 'Mestre', 'system');
                nextTurn();
              }}
            >
              Avançar Turno ⏭️
            </button>
            <button
              className="btn secondary-btn"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.5rem' }}
              onClick={endCombat}
              title="Encerrar Combate"
            >
              ✖
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
