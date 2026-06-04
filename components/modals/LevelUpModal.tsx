import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { DND5E_CLASSES, getProficiencyBonus, getSpellSlotsForLevel, isCaster } from '@/lib/constants/dnd5eClasses';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: any) => void;
  currentLevel: number;
  playerClass: string;
  conModifier: number;
  currentProfBonus: string;
  currentHdTotal: string;
  currentSpellSlots: Record<number, number>;
  currentHpMax: number;
}

export default function LevelUpModal({
  isOpen, onClose, onConfirm,
  currentLevel, playerClass, conModifier,
  currentProfBonus, currentHdTotal, currentSpellSlots, currentHpMax
}: LevelUpModalProps) {
  const [newLevel, setNewLevel] = useState(currentLevel + 1);
  const [hpRoll, setHpRoll] = useState<number | ''>('');
  
  const [applyProfBonus, setApplyProfBonus] = useState(true);
  const [applyHdTotal, setApplyHdTotal] = useState(true);
  const [applySpells, setApplySpells] = useState(true);
  const [applyHp, setApplyHp] = useState(true);

  // Suggested values
  const cls = DND5E_CLASSES.find(c => c.id === playerClass);
  const hitDie = cls?.hitDie || 8;
  const suggestedProfBonus = getProficiencyBonus(newLevel).toString();
  const suggestedHdTotal = `${newLevel}d${hitDie}`;
  const suggestedSpellSlots = cls && isCaster(playerClass) ? getSpellSlotsForLevel(playerClass, newLevel) : {};
  const avgHpGain = Math.floor(hitDie / 2) + 1 + conModifier;

  useEffect(() => {
    if (isOpen) {
      setNewLevel(currentLevel + 1);
      setHpRoll(Math.floor(hitDie / 2) + 1); // Default to average hit die roll
      setApplyProfBonus(true);
      setApplyHdTotal(true);
      setApplySpells(true);
      setApplyHp(true);
    }
  }, [isOpen, currentLevel, hitDie]);

  if (!isOpen) return null;

  const totalHpGain = (typeof hpRoll === 'number' ? hpRoll : 0) + conModifier;
  const suggestedHpMax = currentHpMax + totalHpGain;

  const hasSpellChanges = cls && isCaster(playerClass);

  const handleConfirm = () => {
    const updates: any = { playerLevel: newLevel.toString() };
    if (applyProfBonus && suggestedProfBonus !== currentProfBonus) updates.profBonus = suggestedProfBonus;
    if (applyHdTotal && suggestedHdTotal !== currentHdTotal) updates.hdTotal = suggestedHdTotal;
    if (applySpells && hasSpellChanges) updates.spellSlots = suggestedSpellSlots;
    if (applyHp && totalHpGain > 0) updates.hpMax = suggestedHpMax.toString();
    
    onConfirm(updates);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="level-up-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
        <header className="modal-header">
          <h2 className="modal-title">Subir de Nível</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="modal-body">
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Nível Atual: {currentLevel}</span>
            <span style={{ margin: '0 15px', color: 'var(--accent-primary)' }}>➔</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Novo Nível: 
              <input type="number" min={currentLevel + 1} value={newLevel} onChange={e => setNewLevel(parseInt(e.target.value) || currentLevel + 1)} className="journey-input" style={{ width: '60px', display: 'inline-block', marginLeft: '10px', textAlign: 'center' }} />
            </span>
          </div>

          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Selecione as atualizações que deseja aplicar automaticamente:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label className="custom-checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <input type="checkbox" checked={applyProfBonus} onChange={e => setApplyProfBonus(e.target.checked)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Bônus de Proficiência</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentProfBonus} ➔ {suggestedProfBonus}</div>
              </div>
            </label>

            {cls && (
              <label className="custom-checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <input type="checkbox" checked={applyHdTotal} onChange={e => setApplyHdTotal(e.target.checked)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>Dado de Vida Total</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentHdTotal || '?'} ➔ {suggestedHdTotal}</div>
                </div>
              </label>
            )}

            {hasSpellChanges && (
              <label className="custom-checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <input type="checkbox" checked={applySpells} onChange={e => setApplySpells(e.target.checked)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>Espaços de Magia (Máximos)</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Atualizar para a tabela de nível {newLevel} da classe {cls.label}.</div>
                </div>
              </label>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <label className="custom-checkbox-container" style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={applyHp} onChange={e => setApplyHp(e.target.checked)} />
              </label>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Pontos de Vida Máximos</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <span>Rolagem d{hitDie}:</span>
                  <input type="number" min="1" max={hitDie} value={hpRoll} onChange={e => setHpRoll(parseInt(e.target.value) || '')} className="journey-input" style={{ width: '60px', padding: '4px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>+ {conModifier} (CON) = </span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>+{totalHpGain} HP</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total: {currentHpMax} ➔ {suggestedHpMax}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn secondary-btn" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn success-btn" onClick={handleConfirm}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Aplicar Nível {newLevel}</span>
          </button>
        </footer>
      </div>
    </Modal>
  );
}
