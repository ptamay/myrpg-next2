"use client";

import React, { useState } from 'react';
import { useCombat } from '@/contexts/CombatContext';
import InitiativeBar from './InitiativeBar';
import BattleBoard from './BattleBoard';
import ActionPanel from './ActionPanel';
import PlayerActionBar from './PlayerActionBar';
import DiceRollFeedback from './DiceRollFeedback';
import BackgroundEffects from '@/components/layout/BackgroundEffects';
import { useCampaignInfo } from '@/hooks/useGameData';

export default function CombatArena() {
  const { combat, setTarget } = useCombat();
  const { diaAtual, indiceBlocoAtivo, jornadaPorDia } = useCampaignInfo();
  
  if (!combat) return null;

  // The ActionPanel should ALWAYS reflect the Active Turn Participant.
  const displayId = combat.participants[combat.currentTurnIndex]?.refId;

  const weather = jornadaPorDia[diaAtual]?.blocos?.[indiceBlocoAtivo]?.weatherEffect || 'clear';

  return (
    <div className="combat-arena">
      <BackgroundEffects weatherEffect={weather} />
      <DiceRollFeedback />
      <InitiativeBar />
      <PlayerActionBar />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <BattleBoard 
          onSelectParticipant={(id) => {
            setTarget(id);
          }}
          onClearTarget={() => setTarget(null)}
        />
        
        <ActionPanel 
          participantId={displayId} 
          onClose={() => setTarget(null)}
        />
      </div>
    </div>
  );
}
