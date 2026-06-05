"use client";

import React, { useState } from 'react';
import { useCombat, PendingAttack } from '@/contexts/CombatContext';
import InitiativeBar from './InitiativeBar';
import BattleBoard from './BattleBoard';
import ActionPanel from './ActionPanel';
import PlayerActionBar from './PlayerActionBar';
import DiceRollFeedback from './DiceRollFeedback';
import BackgroundEffects from '@/components/layout/BackgroundEffects';
import { useCampaignInfo } from '@/hooks/useGameData';
import { useUserSession } from '@/contexts/UserSessionContext';

export default function CombatArena() {
  const { combat, toggleTarget } = useCombat();
  const { profile, isGM } = useUserSession();
  const { diaAtual, indiceBlocoAtivo, jornadaPorDia } = useCampaignInfo();

  // ID do participante atualmente exibido no ActionPanel
  // Por padrão, mostra o participante ativo (quem está jogando)
  const [viewedParticipantId, setViewedParticipantId] = useState<string | null>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  if (!combat) return null;

  const weather = jornadaPorDia[diaAtual]?.blocos?.[indiceBlocoAtivo]?.weatherEffect || 'clear';

  // Se não há nenhum selecionado, exibe o participante ativo do turno
  const activeId = combat.participants[combat.currentTurnIndex]?.refId ?? null;
  const displayId = viewedParticipantId; // Removido fallback automático para activeId

  return (
    <div className="combat-arena">
      <BackgroundEffects weatherEffect={weather} />
      <DiceRollFeedback />
      <InitiativeBar />
      <PlayerActionBar pendingAttack={pendingAttack} setPendingAttack={setPendingAttack} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <BattleBoard
          onSelectParticipant={(id) => {
            const isMe = id === profile?.player_id;
            const myTurn = activeId === profile?.player_id;
            const isActiveParticipant = id === activeId;
            
            if (isGM) {
              if (isActiveParticipant) {
                // GM clicou no cara do turno -> abre a ficha dele para usar as ações
                setViewedParticipantId(prev => (prev === id ? null : id));
              } else {
                // GM clicou em qualquer outro -> apenas marca como alvo (mirar)
                toggleTarget(id);
              }
            } else {
              if (isMe) {
                // Jogador clica em si mesmo -> abre sua própria ficha
                setViewedParticipantId(prev => (prev === id ? null : id));
              } else {
                // Jogador clica nos outros
                if (myTurn && !isActiveParticipant) {
                  // Só pode marcar como alvo se for a vez dele e não for ele mesmo
                  toggleTarget(id);
                  setViewedParticipantId(null);
                }
              }
            }
          }}
        />

        <ActionPanel
          participantId={displayId}
          onClose={() => setViewedParticipantId(null)}
          pendingAttack={pendingAttack}
          setPendingAttack={setPendingAttack}
        />
      </div>
    </div>
  );
}
