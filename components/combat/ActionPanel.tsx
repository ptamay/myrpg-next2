import React from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';

function LogTypeIcon(type?: string) {
  switch (type) {
    case 'critical': return '💥';
    case 'crit_fail': return '💀';
    case 'attack':   return '⚔️';
    case 'damage':   return '🩸';
    case 'heal':     return '💚';
    default:         return '🎲';
  }
}

function renderLogMarkdown(text: string) {
  const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ActionPanel() {
  const { combat, clearLog } = useCombat();
  const { isGM } = useUserSession();

  if (!combat) return null;

  return (
    <div className="action-panel" style={{ display: 'flex', flexDirection: 'column', width: '420px', minWidth: '380px', overflowY: 'hidden' }}>

      {/* ZONA 1 — LOG DE COMBATE (Agora Ocupa Tudo) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: 'linear-gradient(to bottom, rgba(15,15,20,0.8), rgba(0,0,0,0.9))' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
            📋 Registro de Combate
          </span>
          {isGM && (
            <button
              className="btn secondary-btn"
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--text-muted)' }}
              onClick={clearLog}
              title="Limpar log"
            >
              🧹 Limpar
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(combat.log || []).map(entry => (
            <div key={entry.id} className={`combat-log-entry type-${entry.type || 'system'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{entry.actorName}</span>
                <span>Rodada {entry.round}</span>
              </div>
              <div className="log-action" style={{ fontSize: '1.05rem', lineHeight: '1.5' }}>
                {LogTypeIcon(entry.type)} {renderLogMarkdown(entry.action)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
