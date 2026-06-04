import React from 'react';
import { useCombat, CombatParticipant } from '@/contexts/CombatContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import CombatantCard from './CombatantCard';

interface Props {
  onSelectParticipant: (id: string) => void;
  onClearTarget?: () => void;
}

export default function BattleBoard({ onSelectParticipant, onClearTarget }: Props) {
  const { combat } = useCombat();
  const { isGM } = useUserSession();

  if (!combat) return null;

  // For GM: NPCs on top, Players on bottom.
  // For Player: Enemies on top, Allies on bottom.
  let topZone: CombatParticipant[] = [];
  let bottomZone: CombatParticipant[] = [];

  combat.participants.forEach((p) => {
    if (isGM) {
      if (p.type === 'npc') topZone.push(p);
      else bottomZone.push(p);
    } else {
      // In a real scenario we'd check p.faction !== 'ally' for enemies, but we don't have faction in CombatParticipant yet.
      // So let's just use 'type === npc' as top for now.
      if (p.type === 'npc') topZone.push(p);
      else bottomZone.push(p);
    }
  });

  const activeParticipant = combat.participants[combat.currentTurnIndex];
  const activeId = activeParticipant?.refId;

  const getTargetType = (p: CombatParticipant) => {
    if (!activeParticipant) return 'hostile';
    return activeParticipant.type === p.type ? 'friendly' : 'hostile';
  };

  return (
    <div className="battle-board" onClick={() => onClearTarget && onClearTarget()}>
      <div className="battle-zone" id="zone-top">
        {topZone.map((p, idx) => (
          <CombatantCard 
            key={p.refId} 
            participant={p} 
            isActive={p.refId === activeId}
            isTarget={p.refId === combat.selectedTargetId}
            targetType={getTargetType(p)}
            index={idx}
            onClick={(e) => { e.stopPropagation(); onSelectParticipant(p.refId); }}
          />
        ))}
      </div>
      
      <div className="battle-divider"></div>

      <div className="battle-zone" id="zone-bottom">
        {bottomZone.map((p, idx) => (
          <CombatantCard 
            key={p.refId} 
            participant={p} 
            isActive={p.refId === activeId}
            isTarget={p.refId === combat.selectedTargetId}
            targetType={getTargetType(p)}
            index={idx + topZone.length}
            onClick={(e) => { e.stopPropagation(); onSelectParticipant(p.refId); }}
          />
        ))}
      </div>
    </div>
  );
}
