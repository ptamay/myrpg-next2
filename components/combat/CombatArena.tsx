"use client";

import React, { useState, useEffect } from 'react';
import { useCombat, PendingAttack } from '@/contexts/CombatContext';
import InitiativeBar from './InitiativeBar';
import BattleBoard from './BattleBoard';
import ActionPanel from './ActionPanel';
import TurnActionModal from './TurnActionModal';
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

  // Removido useEffect que abria o modal automaticamente

  if (!combat) return null;

  const weather = jornadaPorDia[diaAtual]?.blocos?.[indiceBlocoAtivo]?.weatherEffect || 'clear';

  // Se não há nenhum selecionado, exibe o participante ativo do turno
  const activeParticipant = combat.participants[combat.currentTurnIndex] ?? null;
  const activeId = activeParticipant?.refId ?? null;
  const displayId = viewedParticipantId; // Removido fallback automático para activeId

  return (
    <div className="combat-arena">
      <BackgroundEffects weatherEffect={weather} />
      <DiceRollFeedback />
      <InitiativeBar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Banner de Turno */}
        {activeParticipant && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.7), rgba(0,0,0,0.7), transparent)',
            padding: '15px 100px',
            pointerEvents: 'none',
            textAlign: 'center',
            textShadow: '0 2px 10px rgba(0,0,0,1)',
            animation: 'fadeInDownFadeOut 4s ease-in-out forwards'
          }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900', 
              color: '#fff', 
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              <span style={{ 
                fontSize: '1rem', 
                color: '#fbbf24', 
                display: 'block', 
                letterSpacing: '6px', 
                marginBottom: '-5px',
                fontWeight: 'bold'
              }}>VEZ DE</span>
              {activeParticipant.name}
            </h1>
            <style>{`
              @keyframes fadeInDownFadeOut {
                0% { opacity: 0; transform: translate(-50%, -20px); }
                10% { opacity: 1; transform: translate(-50%, 0); }
                80% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -20px); }
              }
            `}</style>
          </div>
        )}

        <BattleBoard
          onSelectParticipant={(id) => {
            const isMe = id === profile?.player_id;
            const isActiveParticipant = id === activeId;
            
            if (isGM) {
              // GM clicou -> abre o modal de ação do participante
              setViewedParticipantId(prev => (prev === id ? null : id));
            } else {
              // Jogador
              if (isMe) {
                // Jogador clica em si mesmo -> abre sua própria ficha
                setViewedParticipantId(prev => (prev === id ? null : id));
              }
              // Jogador clica em outro não faz nada, pois a mira é dentro do modal
            }
          }}
        />

        <ActionPanel />
      </div>

      {viewedParticipantId && (
        <TurnActionModal 
          participantId={viewedParticipantId}
          onClose={() => setViewedParticipantId(null)}
          pendingAttack={pendingAttack}
          setPendingAttack={setPendingAttack}
        />
      )}
    </div>
  );
}
