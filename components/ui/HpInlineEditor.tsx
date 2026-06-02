import React, { useState, useRef, useEffect } from "react";

interface HpInlineEditorProps {
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  onApplyDamage: (amount: number) => void;
  onApplyHeal: (amount: number) => void;
  onSetTempHp: (amount: number) => void;
  onSetHp?: (amount: number) => void;
}

export default function HpInlineEditor({
  hpCurrent,
  hpMax,
  tempHp,
  onApplyDamage,
  onApplyHeal,
  onSetTempHp,
  onSetHp
}: HpInlineEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tempInputValue, setTempInputValue] = useState(tempHp.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempInputValue(tempHp.toString());
  }, [tempHp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      if (inputRef.current) inputRef.current.focus();
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const applyDamage = () => {
    const amount = parseInt(inputValue);
    if (!isNaN(amount) && amount > 0) {
      if (tempHp > 0) {
        const absorbed = Math.min(tempHp, amount);
        const remaining = amount - absorbed;
        onSetTempHp(tempHp - absorbed);
        if (remaining > 0) onApplyDamage(remaining);
      } else {
        onApplyDamage(amount);
      }
      setInputValue("");
    }
  };

  const applyHeal = () => {
    const amount = parseInt(inputValue);
    if (!isNaN(amount) && amount > 0) {
      onApplyHeal(Math.min(amount, Math.max(0, hpMax - hpCurrent)));
      setInputValue("");
    }
  };

  const handleTempSubmit = () => {
    const amount = parseInt(tempInputValue);
    if (!isNaN(amount) && amount >= 0) {
      onSetTempHp(amount);
    }
  };

  return (
    <div className="hp-inline-editor" ref={containerRef}>
      <div 
        className="hp-display-area" 
        onClick={() => setIsOpen(!isOpen)}
        title="Clique para editar PV"
      >
        <div className="hp-values">
          <span className="current-hp">{hpCurrent}</span> / <span className="max-hp">{hpMax}</span>
          {tempHp > 0 && <span className="temp-hp" title="Pontos de Vida Temporários">+{tempHp}</span>}
        </div>
      </div>

      {isOpen && (
        <div className="hp-editor-panel" style={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', width: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Section: Damage/Heal (Relative) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dano / Cura</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                ref={inputRef}
                type="number"
                className="hp-editor-input journey-input"
                placeholder="Ex: 5"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyDamage();
                }}
                style={{ flex: 1, padding: '6px', fontSize: '1rem', minWidth: '0' }}
              />
              <button 
                type="button" 
                className="hp-btn-damage" 
                onClick={applyDamage}
                disabled={!inputValue || parseInt(inputValue) <= 0}
                style={{ padding: '6px 10px' }}
                title="Aplicar Dano"
              >
                🗡️
              </button>
              <button 
                type="button" 
                className="hp-btn-heal" 
                onClick={applyHeal}
                disabled={!inputValue || parseInt(inputValue) <= 0}
                style={{ padding: '6px 10px' }}
                title="Aplicar Cura"
              >
                💚
              </button>
            </div>
          </div>

          {/* Section: Set Exact (Absolute) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Setar HP</label>
              <input
                type="number"
                className="hp-editor-input journey-input"
                placeholder={hpCurrent.toString()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(e.currentTarget.value);
                    if (!isNaN(val) && onSetHp) {
                      onSetHp(val);
                      setIsOpen(false);
                    }
                  }
                }}
                style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--warning)', textTransform: 'uppercase' }}>Temp</label>
              <input
                type="number"
                className="hp-temp-input journey-input"
                value={tempInputValue}
                onChange={(e) => setTempInputValue(e.target.value)}
                onBlur={handleTempSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTempSubmit();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                min="0"
                style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
