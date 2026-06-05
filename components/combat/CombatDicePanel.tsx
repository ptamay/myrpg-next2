"use client";

import React, { useState, useEffect } from "react";
import { CombatParticipant, PendingAttack } from "@/contexts/CombatContext";
import { rollDie, rollWithAdvantage, rollWithDisadvantage } from "@/lib/dice/dnd5e";

type AdvantageType = "normal" | "advantage" | "disadvantage";
type AnimState = "idle" | "spinning" | "scrambling" | "revealing";
type RollMode = "free" | "attack" | "damage" | "save";

export interface RollEntry {
  id: string;
  actorName: string;
  dieFaces: number;
  dieResult: number;
  modifier: number;
  total: number;
  isCritical: boolean;
  isCritFail: boolean;
  advantage: AdvantageType;
  rolls: number[];
  timestamp: string;
  rollMode: RollMode;
  saveAttr?: string;
  saveDC?: number;
}

interface Props {
  activeParticipant: CombatParticipant | null;
  participants: CombatParticipant[];
  onRoll: (entry: RollEntry) => void;
  pendingAttack?: PendingAttack | null;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

function HexSvg({ children, className }: { children?: React.ReactNode, className?: string }) {
  return (
    <div className={`hex-btn ${className || ''}`}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
        <polygon points="50 3, 95 25, 95 75, 50 97, 5 75, 5 25" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      <div style={{ position: 'relative', zIndex: 1, fontWeight: 'bold' }}>{children}</div>
    </div>
  );
}

export default function CombatDicePanel({ activeParticipant, participants, onRoll, pendingAttack }: Props) {
  const [advantage, setAdvantage] = useState<AdvantageType>("normal");
  const [modifier, setModifier] = useState<string>("0");
  const [rollMode, setRollMode] = useState<RollMode>("free");
  const [saveAttr, setSaveAttr] = useState<string>("Destreza");
  const [saveDC, setSaveDC] = useState<number>(15);
  
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [displayNumber, setDisplayNumber] = useState<string | number>("");
  const [lastRoll, setLastRoll] = useState<RollEntry | null>(null);
  const [activeDie, setActiveDie] = useState<number | null>(null);

  useEffect(() => {
    if (pendingAttack) {
      setRollMode("attack");
      const bonusNum = parseInt(pendingAttack.bonus.replace('+', '')) || 0;
      setModifier(bonusNum.toString());
    }
  }, [pendingAttack]);
  
  const handleRoll = (faces: number) => {
    if (animState !== "idle") return;
    setActiveDie(faces);
    setAnimState("spinning");
    setDisplayNumber("");

    setTimeout(() => {
      setAnimState("scrambling");
      const scramble = setInterval(() => setDisplayNumber(Math.floor(Math.random() * faces) + 1), 50);

      setTimeout(() => {
        clearInterval(scramble);

        let dieResult: number;
        let rolls: number[];

        if (faces === 20 && advantage === "advantage") {
          const r = rollWithAdvantage(20);
          dieResult = r.result;
          rolls = r.rolls;
        } else if (faces === 20 && advantage === "disadvantage") {
          const r = rollWithDisadvantage(20);
          dieResult = r.result;
          rolls = r.rolls;
        } else {
          dieResult = rollDie(faces);
          rolls = [dieResult];
        }

        const mod = parseInt(modifier) || 0;
        const total = dieResult + mod;
        const isCritical = faces === 20 && dieResult === 20;
        const isCritFail = faces === 20 && dieResult === 1;
        
        const entry: RollEntry = {
          id: generateId(),
          actorName: activeParticipant?.name || "Mestre",
          dieFaces: faces,
          dieResult,
          modifier: mod,
          total,
          isCritical,
          isCritFail,
          advantage: faces === 20 ? advantage : "normal",
          rolls,
          timestamp: new Date().toISOString(),
          rollMode,
        };

        setLastRoll(entry);
        setDisplayNumber(dieResult);
        setAnimState("revealing");
        onRoll(entry);

        setTimeout(() => setAnimState("idle"), 800);
      }, 600);
    }, 400);
  };

  const handleSaveTest = () => {
    const entry: RollEntry = {
      id: generateId(),
      actorName: activeParticipant?.name || "Mestre",
      dieFaces: 0,
      dieResult: 0,
      modifier: 0,
      total: 0,
      isCritical: false,
      isCritFail: false,
      advantage: "normal",
      rolls: [],
      timestamp: new Date().toISOString(),
      rollMode: "save",
      saveAttr,
      saveDC
    };
    onRoll(entry);
  };

  return (
    <div className="dice-panel-container">
      {/* Roll Mode Selector */}
      <div className="dice-panel-header">
        <select 
          className="journey-input dice-mode-select" 
          value={rollMode} 
          onChange={e => setRollMode(e.target.value as RollMode)}
          disabled={!!pendingAttack}
        >
          <option value="free">🎲 Rolagem Livre</option>
          <option value="attack">⚔️ Ataque (CA)</option>
          <option value="damage">🩸 Dano (HP)</option>
          <option value="save">🛡️ Resistência (CD)</option>
        </select>
        <div className="dice-modifier">
          Mod: 
          <input 
            type="number" 
            className="journey-input modifier-input" 
            value={modifier} 
            onChange={e => setModifier(e.target.value)} 
            disabled={!!pendingAttack}
          />
        </div>
      </div>

      {rollMode === "save" ? (
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: "bold" }}>ATRIBUTO</div>
              <select className="journey-input" value={saveAttr} onChange={e => setSaveAttr(e.target.value)} style={{ width: "100%", padding: "6px" }}>
                <option>Força</option><option>Destreza</option><option>Constituição</option>
                <option>Inteligência</option><option>Sabedoria</option><option>Carisma</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: "bold" }}>CD ALVO</div>
              <input type="number" className="journey-input" value={saveDC} onChange={e => setSaveDC(Number(e.target.value))} style={{ width: "100%", padding: "6px", textAlign: "center" }} />
            </div>
          </div>
          <button className="btn primary-btn" style={{ width: "100%", padding: "10px", marginTop: "4px", background: "#a855f7" }} onClick={handleSaveTest}>
            Rolar p/ Alvos Selecionados
          </button>
        </div>
      ) : (
        <>
      {/* Container Hexagonal Buttons */}
      <div className="dice-hex-grid">
        <div className="dice-hex-row top-row">
          {[4, 6, 8, 10].map(faces => {
            const isAttackAndNotD20 = rollMode === "attack" && faces !== 20;
            return (
              <div 
                key={faces} 
                className="hex-wrapper" 
                onClick={() => !isAttackAndNotD20 && handleRoll(faces)}
                style={{ opacity: isAttackAndNotD20 ? 0.3 : 1, cursor: isAttackAndNotD20 ? 'not-allowed' : 'pointer' }}
              >
                <HexSvg className={`static-hex ${activeDie === faces ? 'highlight' : ''}`}>d{faces}</HexSvg>
              </div>
            );
          })}
        </div>
        <div className="dice-hex-row bottom-row">
          {[12, 20].map(faces => {
            const isAttackAndNotD20 = rollMode === "attack" && faces !== 20;
            const isPendingD20 = pendingAttack && faces === 20;
            return (
              <div 
                key={faces} 
                className="hex-wrapper" 
                onClick={() => !isAttackAndNotD20 && handleRoll(faces)}
                style={{ opacity: isAttackAndNotD20 ? 0.3 : 1, cursor: isAttackAndNotD20 ? 'not-allowed' : 'pointer' }}
              >
                <HexSvg className={`static-hex ${activeDie === faces ? 'highlight' : ''} ${isPendingD20 ? 'pulsing-d20' : ''}`}>d{faces}</HexSvg>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advantage Selection */}
      {rollMode !== "damage" && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: "bold" }}>
            Vantagem (Apenas d20)
          </div>
          <div className="adv-toggle-group-premium">
            <button className={`adv-btn ${advantage === "disadvantage" ? "active-desv" : ""}`} onClick={() => setAdvantage("disadvantage")}>DESV</button>
            <button className={`adv-btn ${advantage === "normal" ? "active-norm" : ""}`} onClick={() => setAdvantage("normal")}>NORMAL</button>
            <button className={`adv-btn ${advantage === "advantage" ? "active-vant" : ""}`} onClick={() => setAdvantage("advantage")}>VANT</button>
          </div>
        </div>
      )}

      {/* Modifier Input */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "1rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase" }}>Modificador:</span>
        <input
          type="number"
          value={modifier}
          onChange={e => setModifier(e.target.value)}
          className="dice-modifier-input"
        />
      </div>
        </>
      )}

      {/* Central Animation / Result Display */}
      <div className="dice-result-area" style={{ height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginTop: '1rem' }}>
        {animState !== 'idle' && activeDie && (
          <div className={`rolling-die-container ${animState}`}>
            <HexSvg className={`rolling-hex ${activeDie === 20 ? 'highlight' : ''}`} />
            {displayNumber !== "" && (
              <div className="rolling-die-number">{displayNumber}</div>
            )}
          </div>
        )}
        
        {animState === 'idle' && lastRoll && (
          <div className="dice-result-summary">
            <div className="summary-dice">
              d{lastRoll.dieFaces} {lastRoll.modifier !== 0 ? (lastRoll.modifier > 0 ? `+${lastRoll.modifier}` : lastRoll.modifier) : ""}
              {lastRoll.advantage !== "normal" && lastRoll.dieFaces === 20 && (
                <span className={`summary-adv ${lastRoll.advantage}`}>
                  {lastRoll.advantage === "advantage" ? " [VANT]" : " [DESV]"}
                </span>
              )}
            </div>
            <div className={`summary-total ${lastRoll.isCritical ? 'crit' : lastRoll.isCritFail ? 'fail' : ''}`}>
              {lastRoll.total}
            </div>
            {lastRoll.rolls.length > 1 && (
              <div className="summary-rolls">
                Rolagens: {lastRoll.rolls.join(" e ")}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .pulsing-d20 {
          animation: pulseD20 1.5s infinite;
          fill: rgba(255, 165, 0, 0.4) !important;
          stroke: #ffa500 !important;
        }
        @keyframes pulseD20 {
          0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255,165,0,0.5)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(255,165,0,1)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255,165,0,0.5)); }
        }
      `}</style>
    </div>
  );
}
