import React, { useState } from 'react';
import { useCombat, CombatParticipant } from '@/contexts/CombatContext';
import CombatantCard from './CombatantCard';

interface Props {
  onSelectParticipant: (id: string) => void;
}

export default function BattleBoard({ onSelectParticipant }: Props) {
  const { combat } = useCombat();

  if (!combat) return null;

  // Zone-bottom: players + NPCs aliados
  // Zone-top: inimigos + neutros
  const topZone: CombatParticipant[] = [];
  const bottomZone: CombatParticipant[] = [];

  combat.participants.forEach((p) => {
    if (p.combatFaction === 'ally') {
      bottomZone.push(p);
    } else {
      topZone.push(p); // enemy
    }
  });

  const activeId = combat.participants[combat.currentTurnIndex]?.refId;

  return (
    <div className="battle-board">
      <div className="battle-zone" id="zone-top">
        {topZone.map((p, idx) => (
          <CombatantCard
            key={p.refId}
            participant={p}
            isActive={p.refId === activeId}
            index={idx}
            onClick={(e) => { e.stopPropagation(); onSelectParticipant(p.refId); }}
          />
        ))}
      </div>

      <div className="battle-divider" />

      <div className="battle-zone" id="zone-bottom">
        {bottomZone.map((p, idx) => (
          <CombatantCard
            key={p.refId}
            participant={p}
            isActive={p.refId === activeId}
            index={idx + topZone.length}
            onClick={(e) => { e.stopPropagation(); onSelectParticipant(p.refId); }}
          />
        ))}
      </div>
    </div>
  );
}
