import React, { useEffect, useState } from 'react';
import { useCombat, RollFeedbackEvent } from '@/contexts/CombatContext';

export default function DiceRollFeedback() {
  const { combat } = useCombat();
  const [event, setEvent] = useState<RollFeedbackEvent | null>(null);

  useEffect(() => {
    if (combat?.latestRollEvent) {
      setEvent(combat.latestRollEvent);
      // Clear after 3 seconds
      const timer = setTimeout(() => {
        setEvent(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [combat?.latestRollEvent]);

  if (!event) return null;

  let containerClass = 'roll-feedback-toast';
  let badgeClass = 'roll-badge';
  let text = 'Rolagem de ' + (event.type === 'attack' ? 'Ataque' : event.type === 'damage' ? 'Dano' : 'Teste');

  if (event.isCritical) {
    containerClass += ' critical-burst';
    badgeClass += ' critical';
    text = '⚔️ CRÍTICO!';
  } else if (event.isCritFail) {
    containerClass += ' crit-fail-shake';
    badgeClass += ' fail';
    text = '💀 ERRO CRÍTICO!';
  }

  return (
    <div className={containerClass}>
      <div className="roll-actor">{event.actorName}</div>
      <div className="roll-title" style={{ 
        color: event.isCritical ? 'gold' : event.isCritFail ? 'var(--danger)' : '#fff',
        textShadow: event.isCritical ? '0 0 10px gold' : 'none'
      }}>
        {text}
      </div>
      <div className="roll-result-container">
        <div className={badgeClass}>
          d20: {event.result}
        </div>
        <div style={{ fontSize: '1.2rem', margin: '0 10px' }}>+</div>
        <div className="roll-formula">
          {event.formula.split('+')[1] || 0}
        </div>
        <div style={{ fontSize: '1.2rem', margin: '0 10px' }}>=</div>
        <div className="roll-total">
          {event.total}
        </div>
      </div>
    </div>
  );
}
