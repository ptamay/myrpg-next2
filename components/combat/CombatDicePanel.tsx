"use client";

import React, { useState, useEffect } from "react";
import { useCombat, CombatParticipant, PendingAttack } from "@/contexts/CombatContext";
import { rollDie, rollWithAdvantage, rollWithDisadvantage } from "@/lib/dice/dnd5e";
import { parseDmgString, ParsedDamage, rollDamage } from "@/lib/dice/rollParser";
import { CONDITIONS_MAP } from "@/lib/constants/dnd5e";

type AdvantageType = "normal" | "advantage" | "disadvantage";
type AnimState = "idle" | "spinning" | "revealing";
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
  damageType?: string;
  conditionApplied?: string;
  isLifesteal?: boolean;
  sourceId?: string;
}

interface Props {
  activeParticipant: CombatParticipant | null;
  participants: CombatParticipant[];
  onRoll: (entry: RollEntry) => void;
  pendingAttack?: PendingAttack | null;
  pendingDamage?: { isCritical: boolean; parsedDmg: ParsedDamage } | null;
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

export default function CombatDicePanel({ activeParticipant, participants, onRoll, pendingAttack, pendingDamage }: Props) {
  const [advantage, setAdvantage] = useState<AdvantageType>("normal");
  const [modifier, setModifier] = useState<string>("0");
  const [rollMode, setRollMode] = useState<RollMode>("free");
  const [saveAttr, setSaveAttr] = useState<string>("Destreza");
  const [saveDC, setSaveDC] = useState<number>(15);
  const { combat } = useCombat();
  
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [displayNumber, setDisplayNumber] = useState<string | number>("");
  const [activeDie, setActiveDie] = useState<number | null>(null);

  useEffect(() => {
    if (pendingDamage) {
      setRollMode("damage");
      const mod = pendingDamage.parsedDmg.modifier || 0;
      setModifier(mod.toString());
    } else if (pendingAttack) {
      if (pendingAttack.saveDC) {
        setRollMode("save");
        setSaveAttr(pendingAttack.saveAttr || "Destreza");
        setSaveDC(pendingAttack.saveDC);
      } else {
        setRollMode("attack");
        let baseBonus = parseInt(pendingAttack.bonus.replace('+', '')) || 0;
        
        // Arma Sagrada: Adiciona modificador de Carisma ao Ataque
        if (activeParticipant?.conditions?.includes('Arma Sagrada')) {
          const chaMod = Math.floor((activeParticipant.cha - 10) / 2);
          baseBonus += chaMod;
        }
        
        setModifier(baseBonus.toString());
        
        let hasAdvantage = false;
        let hasDisadvantage = false;

        // Verifica condições do Atacante
        const attackerConditions = activeParticipant?.conditions || [];
        attackerConditions.forEach(condName => {
          const cDef = CONDITIONS_MAP.find(c => c.id.toLowerCase() === condName.toLowerCase() || c.label.toLowerCase() === condName.toLowerCase());
          if (cDef?.effect) {
            const effect: any = cDef.effect;
            if (effect.attackAdvantage) hasAdvantage = true;
            if (effect.attackDisadvantage) hasDisadvantage = true;
          }
          if (condName.toLowerCase() === 'ataque temerário') hasAdvantage = true;
        });

        // Verifica condições do primeiro Alvo selecionado
        if (combat && combat.selectedTargetIds.length > 0) {
          const firstTarget = combat.participants.find(p => p.refId === combat.selectedTargetIds[0]);
          if (firstTarget) {
            const targetConditions = firstTarget.conditions || [];
            targetConditions.forEach(condName => {
              const cDef = CONDITIONS_MAP.find(c => c.id.toLowerCase() === condName.toLowerCase() || c.label.toLowerCase() === condName.toLowerCase());
              if (cDef?.effect) {
                const effect: any = cDef.effect;
                if (effect.attackAdvantageOnTarget || effect.meleeAdvantageOnTarget) hasAdvantage = true;
                if (effect.attackDisadvantageOnTarget || effect.rangedDisadvantageOnTarget) hasDisadvantage = true;
              }
              // Voto de Inimizade: Se o alvo é um "Inimigo Jurado" e o Paladino estiver atacando
              if (condName === 'Inimigo Jurado') {
                 hasAdvantage = true;
              }
            });
          }
        }

        if (hasAdvantage && hasDisadvantage) setAdvantage("normal");
        else if (hasAdvantage) setAdvantage("advantage");
        else if (hasDisadvantage) setAdvantage("disadvantage");
        else setAdvantage("normal");
      }
    } else {
      setRollMode("free");
      setModifier("0");
    }
  }, [pendingAttack, pendingDamage, activeParticipant, combat?.selectedTargetIds]);
  
  const handleRoll = (faces: number) => {
    if (animState !== "idle") return;
    
    // Validar cliques no modo errado
    if (rollMode === "attack" && faces !== 20) return;
    if (rollMode === "damage" && pendingDamage && faces !== pendingDamage.parsedDmg.dieSides) return;
    setActiveDie(faces);
    setAnimState("spinning");
    
    let suspenseFrames = 0;
    const maxFrames = 25; // 2.5s
    const intervalId = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * faces) + 1);
      suspenseFrames++;
      if (suspenseFrames >= maxFrames) {
        clearInterval(intervalId);
        
        let dieResult: number;
        let rolls: number[];
        let mod = parseInt(modifier) || 0;
        let isCritical = false;
        let isCritFail = false;
        let total = 0;

        if (rollMode === "damage" && pendingDamage) {
          const expr = `${pendingDamage.parsedDmg.dieCount}d${faces}+${mod}`;
          
          let extraCrit = 0;
          if (pendingDamage.isCritical && activeParticipant?.abilities) {
            const hasSavageAttacks = activeParticipant.abilities.some(a => a.name.includes("Ataques Selvagens") || a.name.includes("Savage Attacks"));
            if (hasSavageAttacks) {
              extraCrit = 1; // Rola 1 dado de dano extra em crítico (Mecânica Meio-Orc)
            }
          }
          
          const dmgRes = rollDamage(expr, pendingDamage.isCritical, extraCrit);
          total = dmgRes.total;
          rolls = dmgRes.rolls;
          dieResult = rolls[0] || 0; 
        } else {
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
          total = dieResult + mod;
          const hasEnhancedCrit = activeParticipant?.abilities?.some(a => a.name === 'Acerto Crítico Aprimorado');
          const critThreshold = hasEnhancedCrit ? 19 : 20;
          isCritical = faces === 20 && dieResult >= critThreshold;
          isCritFail = faces === 20 && dieResult === 1;

          if (isCritFail && activeParticipant?.abilities?.some(a => a.name.includes('Sorte (Halfling)'))) {
             if (window.confirm("🍀 Você tirou um 1 natural! Deseja usar sua Sorte de Halfling para jogar de novo? (Você deverá usar a nova rolagem).")) {
                 const newRoll = rollDie(faces);
                 dieResult = newRoll;
                 rolls = [newRoll]; // Se for vantagem, perde o primeiro rolamento e assume esse único
                 total = dieResult + mod;
                 isCritical = faces === 20 && dieResult >= critThreshold;
                 isCritFail = faces === 20 && dieResult === 1;
             }
          }
        }
        
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
          damageType: pendingDamage?.parsedDmg.damageType,
          conditionApplied: pendingAttack?.conditionApplied,
          isLifesteal: pendingDamage?.parsedDmg?.isLifesteal || false,
          sourceId: activeParticipant?.refId
        };

        setDisplayNumber(dieResult);
        setAnimState("revealing");
        
        setTimeout(() => {
          setAnimState("idle");
          setActiveDie(null);
          onRoll(entry);
        }, 800);
      }
    }, 100);
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
      saveAttr: rollMode === "save" ? saveAttr : undefined,
      saveDC: rollMode === "save" ? saveDC : undefined,
      conditionApplied: pendingAttack?.conditionApplied
    };
    onRoll(entry);
  };

  const getHexClass = (faces: number) => {
    let classes = "static-hex ";
    if (activeDie === faces) {
      classes += "highlight active-roll ";
    }
    
    if (rollMode === "attack" && faces === 20 && pendingAttack) {
      classes += "pulsing-attack ";
    }
    
    if (rollMode === "damage" && pendingDamage && faces === pendingDamage.parsedDmg.dieSides) {
      classes += pendingDamage.isCritical ? "pulsing-crit " : "pulsing-damage ";
    }
    
    return classes;
  };

  const getHexContent = (faces: number) => {
    if (animState !== "idle" && activeDie === faces) {
      return <span className="inline-roll-result">{displayNumber}</span>;
    }
    if (rollMode === "damage" && pendingDamage && pendingDamage.isCritical && faces === pendingDamage.parsedDmg.dieSides) {
      return <span style={{color: "gold", textShadow: "0 0 5px gold"}}>2×d{faces}</span>;
    }
    if (rollMode === "damage" && pendingDamage && faces === pendingDamage.parsedDmg.dieSides) {
      const count = pendingDamage.parsedDmg.dieCount;
      return <span>{count > 1 ? `${count}d${faces}` : `d${faces}`}</span>;
    }
    return `d${faces}`;
  };

  return (
    <div className="dice-panel-container">
      {/* Roll Mode Selector */}
      <div className="dice-panel-header" style={{ display: 'flex', gap: '8px', marginBottom: '1rem', alignItems: 'center' }}>
        <select 
          className="journey-input dice-mode-select" 
          value={rollMode} 
          onChange={e => setRollMode(e.target.value as RollMode)}
          disabled={!!pendingAttack || !!pendingDamage}
          style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-subtle)' }}
        >
          <option value="free">🎲 Rolagem Livre</option>
          <option value="attack">⚔️ Ataque (CA)</option>
          <option value="damage">🩸 Dano (HP)</option>
          <option value="save">🛡️ Resistência (CD)</option>
        </select>
        
        {rollMode !== "save" && (
          <div className="dice-modifier" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>MOD:</span>
            <input 
              type="number" 
              className="journey-input modifier-input" 
              value={modifier} 
              onChange={e => setModifier(e.target.value)} 
              disabled={!!pendingAttack}
              style={{ width: '50px', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>
        )}
      </div>

      {pendingDamage && (
        <div style={{ marginBottom: '12px', padding: '8px', background: pendingDamage.isCritical ? 'rgba(255,215,0,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: '6px', border: `1px solid ${pendingDamage.isCritical ? 'gold' : '#ef4444'}`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: pendingDamage.isCritical ? 'gold' : '#ef4444' }}>
            {pendingDamage.isCritical ? "💥 CRÍTICO D&D 5E!" : "🩸 DANO CONFIRMADO"}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
            Tipo: <strong>{pendingDamage.parsedDmg.damageType || "Comum"}</strong> 
            {pendingDamage.isCritical ? " (Dados duplicados no cálculo final)" : ""}
          </div>
        </div>
      )}

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
          <div className="dice-hex-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div className="dice-hex-row top-row" style={{ display: 'flex', gap: '12px' }}>
              {[4, 6, 8, 10].map(faces => {
                const isAttackAndNotD20 = rollMode === "attack" && faces !== 20;
                const isDamageAndNotTarget = rollMode === "damage" && pendingDamage && faces !== pendingDamage.parsedDmg.dieSides;
                const disabled = isAttackAndNotD20 || isDamageAndNotTarget;
                
                return (
                  <div 
                    key={faces} 
                    className={`hex-wrapper ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && handleRoll(faces)}
                    style={{ opacity: disabled ? 0.2 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <HexSvg className={getHexClass(faces)}>{getHexContent(faces)}</HexSvg>
                  </div>
                );
              })}
            </div>
            <div className="dice-hex-row bottom-row" style={{ display: 'flex', gap: '12px' }}>
              {[12, 20].map(faces => {
                const isAttackAndNotD20 = rollMode === "attack" && faces !== 20;
                const isDamageAndNotTarget = rollMode === "damage" && pendingDamage && faces !== pendingDamage.parsedDmg.dieSides;
                const disabled = isAttackAndNotD20 || isDamageAndNotTarget;
                
                return (
                  <div 
                    key={faces} 
                    className={`hex-wrapper ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && handleRoll(faces)}
                    style={{ opacity: disabled ? 0.2 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <HexSvg className={getHexClass(faces)}>{getHexContent(faces)}</HexSvg>
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
              <div className="adv-toggle-group-premium" style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', overflow: 'hidden' }}>
                <button className={`adv-btn ${advantage === "disadvantage" ? "active-desv" : ""}`} onClick={() => setAdvantage("disadvantage")} style={{flex: 1, padding: '6px', border: 'none', background: advantage === "disadvantage" ? 'rgba(239,68,68,0.3)' : 'transparent', color: advantage === "disadvantage" ? '#ef4444' : 'var(--text-muted)'}}>DESV</button>
                <button className={`adv-btn ${advantage === "normal" ? "active-norm" : ""}`} onClick={() => setAdvantage("normal")} style={{flex: 1, padding: '6px', border: 'none', background: advantage === "normal" ? 'rgba(251,146,60,0.3)' : 'transparent', color: advantage === "normal" ? '#fb923c' : 'var(--text-muted)'}}>NORM</button>
                <button className={`adv-btn ${advantage === "advantage" ? "active-vant" : ""}`} onClick={() => setAdvantage("advantage")} style={{flex: 1, padding: '6px', border: 'none', background: advantage === "advantage" ? 'rgba(34,197,94,0.3)' : 'transparent', color: advantage === "advantage" ? '#22c55e' : 'var(--text-muted)'}}>VANT</button>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .pulsing-attack {
          animation: pulseD20 1.5s infinite;
          fill: rgba(255, 165, 0, 0.4) !important;
          stroke: #ffa500 !important;
        }
        .pulsing-damage {
          animation: pulseDmg 1.5s infinite;
          fill: rgba(239, 68, 68, 0.4) !important;
          stroke: #ef4444 !important;
        }
        .pulsing-crit {
          animation: pulseCrit 1.2s infinite;
          fill: rgba(255, 215, 0, 0.4) !important;
          stroke: gold !important;
        }
        .inline-roll-result {
          font-size: 1.4rem;
          color: white;
          text-shadow: 0 0 8px rgba(255,255,255,0.8);
          animation: flashResult 0.3s;
        }
        @keyframes pulseD20 {
          0% { filter: drop-shadow(0 0 5px rgba(255,165,0,0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(255,165,0,1)); }
          100% { filter: drop-shadow(0 0 5px rgba(255,165,0,0.5)); }
        }
        @keyframes pulseDmg {
          0% { filter: drop-shadow(0 0 5px rgba(239,68,68,0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(239,68,68,1)); }
          100% { filter: drop-shadow(0 0 5px rgba(239,68,68,0.5)); }
        }
        @keyframes pulseCrit {
          0% { filter: drop-shadow(0 0 8px rgba(255,215,0,0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(255,215,0,1)); transform: scale(1.05); }
          100% { filter: drop-shadow(0 0 8px rgba(255,215,0,0.5)); transform: scale(1); }
        }
        @keyframes flashResult {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .active-roll {
          animation: spinHex 0.4s linear infinite;
        }
        @keyframes spinHex {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
