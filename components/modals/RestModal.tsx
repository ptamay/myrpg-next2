import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Player, ClassResource } from '@/lib/gameData';
import { rollDie } from '@/lib/dice/dnd5e';

interface RestModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  totalSleepHours: number;
  onApplyRest: (updates: Partial<Player>) => void;
}

export default function RestModal({ isOpen, onClose, player, totalSleepHours, onApplyRest }: RestModalProps) {
  const [hdToSpend, setHdToSpend] = useState<number>(0);

  if (!isOpen) return null;

  const hasTakenShortRest = player.shortRestTakenToday === true;
  const canShortRest = totalSleepHours >= 4;
  const canLongRest = totalSleepHours >= 8 && !hasTakenShortRest;

  // Calculate available Hit Dice
  const hdTotalRegex = player.hdTotal ? player.hdTotal.match(/(\d+)d(\d+)/) : null;
  const hdMax = hdTotalRegex ? parseInt(hdTotalRegex[1]) : 1;
  const hdDie = hdTotalRegex ? parseInt(hdTotalRegex[2]) : 8;
  const hdSpent = player.hdSpent || 0;
  const hdAvailable = Math.max(0, hdMax - hdSpent);
  
  const conMod = Math.floor((Number(player.con || 10) - 10) / 2);

  const applyShortRest = () => {
    const updates: Partial<Player> = {};

    // Recover HP based on spent Hit Dice (Rolled automatically now)
    if (hdToSpend > 0) {
      let totalHpRegained = 0;
      const rolls = [];
      
      for (let i = 0; i < hdToSpend; i++) {
        const result = rollDie(hdDie);
        rolls.push(result);
        totalHpRegained += Math.max(1, result + conMod); // min 1 hp per die
      }

      const rollEvent = new CustomEvent('sync_dice_roll', {
        detail: {
          id: crypto.randomUUID(),
          rolledBy: player.id, // Make sure it matches what DiceRollFeed expects
          characterName: player.name,
          diceType: `d${hdDie}` as any,
          modifier: conMod * hdToSpend,
          rolls: rolls,
          result: rolls.reduce((a, b) => a + b, 0),
          total: totalHpRegained,
          rollType: 'custom',
          ability: 'Descanso Curto (Cura)',
          timestamp: new Date().toISOString(),
          advantage: 'normal',
          isCritical: false,
          isCritFail: false,
          visibility: 'public'
        }
      });
      window.dispatchEvent(rollEvent);

      const currentHp = player.hpCurrent !== undefined ? player.hpCurrent : player.hpMax;
      updates.hpCurrent = Math.min(player.hpMax, currentHp + totalHpRegained);
      updates.hdSpent = hdSpent + hdToSpend;
    }

    // Recover Pact Magic slots (Bruxo)
    if (player.spellSlotType === 'pact' && player.spellSlotsUsed) {
      updates.spellSlotsUsed = {};
    }

    // Recover Class Resources (Short Rest)
    if (player.classResources) {
      updates.classResources = player.classResources.map((res: ClassResource) => {
        if (res.resetOn === 'short') return { ...res, current: res.max };
        return res;
      });
    }

    updates.shortRestTakenToday = true;

    onApplyRest(updates);
    onClose();
  };

  const applyLongRest = () => {
    const updates: Partial<Player> = {};

    // Fully recover HP
    updates.hpCurrent = player.hpMax;

    // Recover Half of Max Hit Dice (minimum 1)
    const hdRecovered = Math.max(1, Math.floor(hdMax / 2));
    updates.hdSpent = Math.max(0, hdSpent - hdRecovered);

    // Recover all spell slots
    updates.spellSlotsUsed = {};

    // Recover Class Resources (Short and Long)
    if (player.classResources) {
      updates.classResources = player.classResources.map((res: ClassResource) => {
        if (res.resetOn === 'short' || res.resetOn === 'long') return { ...res, current: res.max };
        return res;
      });
    }

    // Reset Exhaustion by 1
    if (player.exhaustionLevel && player.exhaustionLevel > 0) {
      updates.exhaustionLevel = player.exhaustionLevel - 1;
    }

    onApplyRest(updates);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="rest-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
        <header className="modal-header">
          <h2 className="modal-title">🏕️ Acampamento e Descanso</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Horas de sono acumuladas hoje:</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: totalSleepHours >= 8 ? 'var(--success-color)' : totalSleepHours >= 4 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
              {totalSleepHours}h
            </div>
            {totalSleepHours < 4 && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginTop: '5px' }}>
                É necessário dormir pelo menos 4 horas para realizar um descanso.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* SHORT REST PANEL */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: canShortRest ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '15px', opacity: canShortRest ? 1 : 0.5 }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fbbf24', marginTop: 0, marginBottom: '10px' }}>Descanso Curto (4h+)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Recupera recursos de classe marcados como "Curto" (ex: Ki) e Espaços de Pacto (Bruxo). Você pode gastar Dados de Vida para se curar.
              </p>
              
              {canShortRest && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Gastar Dados de Vida (HD)</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Disponíveis: <strong style={{ color: '#fff' }}>{hdAvailable} / {hdMax}</strong> (d{hdDie})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="number" className="journey-input" value={hdToSpend} onChange={e => setHdToSpend(Math.min(hdAvailable, Math.max(0, parseInt(e.target.value) || 0)))} min="0" max={hdAvailable} placeholder="Qtd" style={{ width: '70px' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Os dados serão rolados automaticamente ao aplicar.</span>
                  </div>
                </div>
              )}

              <button className="btn warning-btn" onClick={applyShortRest} disabled={!canShortRest} style={{ width: '100%', padding: '10px', background: '#d97706', color: '#fff' }}>
                Aplicar Descanso Curto
              </button>
            </div>

            {/* LONG REST PANEL */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: canLongRest ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '15px', opacity: canLongRest ? 1 : 0.5 }}>
              <h3 style={{ fontSize: '1.1rem', color: '#34d399', marginTop: 0, marginBottom: '10px' }}>Descanso Longo (8h+)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Cura totalmente o HP. Recupera todos os Espaços de Magia. Restaura metade dos Dados de Vida (HD). Zera recursos de classe Curtos e Longos. Reduz exaustão em 1.
              </p>

              {hasTakenShortRest && (
                <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 'bold' }}>
                  🚫 Você já realizou um Descanso Curto hoje e não pode mais realizar um Descanso Longo até o próximo dia.
                </div>
              )}
              
              <button className="btn success-btn" onClick={applyLongRest} disabled={!canLongRest} style={{ width: '100%', padding: '10px' }}>
                Aplicar Descanso Longo
              </button>
            </div>

          </div>
        </div>
      </div>
    </Modal>
  );
}
