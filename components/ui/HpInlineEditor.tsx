import React, { useState, useEffect } from "react";

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
  const [inputValue, setInputValue] = useState("");
  const [tempInputValue, setTempInputValue] = useState(tempHp.toString());

  useEffect(() => {
    setTempInputValue(tempHp.toString());
  }, [tempHp]);

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
    <div className="hp-inline-editor" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
      <div className="hp-display-area" style={{ flexShrink: 0, fontWeight: "bold", fontSize: "0.95rem" }}>
        <span className="current-hp" style={{ color: hpCurrent <= 0 ? "var(--danger)" : "#fff" }}>{hpCurrent}</span> 
        <span className="max-hp" style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "2px" }}>/ {hpMax}</span>
        {tempHp > 0 && <span className="temp-hp" title="Pontos de Vida Temporários" style={{ color: "var(--accent-primary)", fontSize: "0.8rem", marginLeft: "6px" }}>+{tempHp}</span>}
      </div>

      <div style={{ display: "flex", gap: "4px", flexWrap: "nowrap" }}>
        <input
          type="number"
          placeholder="Qtd"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyDamage();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "45px", padding: "4px", fontSize: "0.85rem", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "white", textAlign: "center" }}
        />
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); applyDamage(); }}
          disabled={!inputValue || parseInt(inputValue) <= 0}
          style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Dano"
        >
          🗡️
        </button>
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); applyHeal(); }}
          disabled={!inputValue || parseInt(inputValue) <= 0}
          style={{ padding: "4px 8px", background: "rgba(34, 197, 94, 0.2)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.4)", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Cura"
        >
          💚
        </button>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>TMP</span>
        <input
          type="number"
          value={tempInputValue}
          onChange={(e) => setTempInputValue(e.target.value)}
          onBlur={handleTempSubmit}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTempSubmit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          min="0"
          style={{ width: "40px", padding: "4px", fontSize: "0.85rem", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "var(--accent-primary)", textAlign: "center" }}
          title="HP Temporário"
        />
      </div>
    </div>
  );
}
