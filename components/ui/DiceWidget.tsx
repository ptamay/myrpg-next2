"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useGameSync } from "@/hooks/useGameSync";
import { useCombat } from "@/contexts/CombatContext";
import {
  rollDie,
  rollWithAdvantage,
  rollWithDisadvantage,
  RollResult,
} from "@/lib/dice/dnd5e";
const generateId = () => Math.random().toString(36).substring(2, 15);

type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";
type AdvantageType = "normal" | "advantage" | "disadvantage";
type RollCategory = "attack" | "damage" | "ability" | "save" | "initiative" | "custom";
type VisibilityType = "public" | "private" | "gm";

export default function DiceWidget() {
  const { session, isGM } = useUserSession();
  const { dadosGlobais } = useApp();
  const { combat, applyDamage, addToLog } = useCombat();

  const [isOpen, setIsOpen] = useState(false);
  
  // Refs for Dragging (no re-renders on move)
  const widgetRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 20, y: 80 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Roll State
  const [selectedDie, setSelectedDie] = useState<DiceType>("d20");
  const [advantage, setAdvantage] = useState<AdvantageType>("normal");
  const [rollCategory, setRollCategory] = useState<RollCategory>("custom");
  const [customModifier, setCustomModifier] = useState<string>("0");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [visibility, setVisibility] = useState<VisibilityType>("public");

  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    const savedPos = localStorage.getItem("dice-widget-pos");
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        pos.current = parsed;
      } catch (e) {}
    }

    const savedState = localStorage.getItem("dice-widget-state");
    if (savedState === "open") setIsOpen(true);
    
    const savedHistory = sessionStorage.getItem("dice-roll-history");
    if (savedHistory) {
      try {
        setRollHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const clearHistory = () => {
    setRollHistory([]);
    sessionStorage.removeItem("dice-roll-history");
  };

  const toggleWidget = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    localStorage.setItem("dice-widget-state", nextState ? "open" : "closed");
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, select, input")) return;
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX - pos.current.x, y: e.clientY - pos.current.y };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !widgetRef.current) return;
      
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      
      // Keep within bounds
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - 300));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - 50));
      
      pos.current = { x: boundedX, y: boundedY };
      widgetRef.current.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        localStorage.setItem("dice-widget-pos", JSON.stringify(pos.current));
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Context Selection options
  const characters = [
    ...(dadosGlobais.players || []).map((p: any) => ({ id: p.id, name: p.name, type: 'player' })),
    ...(dadosGlobais.npcs || []).map((n: any) => ({ id: n.id, name: n.name, type: 'npc' }))
  ];

  const activeCharacter = characters.find(c => c.id === selectedCharacterId) || 
                          characters.find(c => c.id === session?.playerId);

  const getActiveCharacterName = () => {
    if (activeCharacter) return activeCharacter.name;
    if (isGM) return "Mestre";
    return (session as any)?.playerName || "Jogador";
  };

  const handleRoll = async () => {
    if (isRolling) return;
    setIsRolling(true);

    const sides = parseInt(selectedDie.replace("d", ""));
    const mod = parseInt(customModifier) || 0;

    setTimeout(async () => {
      let result = 0;
    let rolls: number[] = [];

    if (advantage === "advantage") {
      const advRoll = rollWithAdvantage(sides);
      result = advRoll.result;
      rolls = advRoll.rolls;
    } else if (advantage === "disadvantage") {
      const disRoll = rollWithDisadvantage(sides);
      result = disRoll.result;
      rolls = disRoll.rolls;
    } else {
      const r = rollDie(sides);
      result = r;
      rolls = [r];
    }

    const isCritical = selectedDie === "d20" && result === 20;
    const isCritFail = selectedDie === "d20" && result === 1;

    const rollData: RollResult = {
      id: generateId(),
      rolledBy: session?.playerId || "system",
      characterName: getActiveCharacterName(),
      diceType: selectedDie,
      modifier: mod,
      rolls,
      result,
      total: result + mod,
      rollType: rollCategory,
      timestamp: new Date().toISOString(),
      advantage,
      isCritical,
      isCritFail,
      visibility
    };

    setLastRoll(rollData);
    setRollHistory(prev => {
      const newHistory = [rollData, ...prev].slice(0, 50);
      sessionStorage.setItem("dice-roll-history", JSON.stringify(newHistory));
      return newHistory;
    });

    // Integration with Combat
    if (combat?.isActive) {
      if (targetId) {
        const target = combat.participants.find(p => p.refId === targetId);
        if (target) {
          if (rollCategory === "attack") {
            const hit = result + mod >= target.ac;
            addToLog(`${rollData.characterName} atacou ${target.name} com ${result + mod} vs CA ${target.ac} -> ${hit ? 'ACERTO!' : 'ERRO!'}`, "Sistema");
          } else if (rollCategory === "damage") {
            const finalDmg = isCritical ? (result + mod) * 2 : result + mod;
            applyDamage(targetId, finalDmg);
            addToLog(`${rollData.characterName} causou ${finalDmg} de dano em ${target.name}`, "Sistema");
          }
        }
      } else {
        // Se rolou no combate sem alvo, loga a rolagem genericamente se for public ou gm
        if (visibility === 'public' || (visibility === 'gm' && isGM)) {
          let logStr = `${rollData.characterName} rolou ${selectedDie} (${rollCategory}): ${result + mod}`;
          if (isCritical) logStr += ' [CRÍTICO]';
          if (isCritFail) logStr += ' [FALHA CRÍTICA]';
          addToLog(logStr, "Sistema");
        }
      }
    }

      // Broadcast
      window.dispatchEvent(new CustomEvent('send_broadcast', { 
        detail: { type: 'dice_roll', payload: rollData } 
      }));
      setIsRolling(false);
    }, 800);
  };

  if (!isOpen) {
    return (
      <button 
        className="dice-widget-toggle"
        onClick={toggleWidget}
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          zIndex: 100,
          background: "var(--accent-primary)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "56px",
          height: "56px",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        🎲
      </button>
    );
  }

  return (
    <div 
      className="dice-widget-container"
      ref={widgetRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${pos.current.x}px, ${pos.current.y}px)`,
        width: "300px",
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#09090b"
      }}
    >
      <div 
        className="dice-widget-header" 
        onMouseDown={onMouseDown}
        style={{
          padding: "10px",
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          cursor: "grab",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>🎲</span>
          <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Rolagem D&D 5e</span>
        </div>
        <button 
          onClick={toggleWidget}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {isGM && (
          <div className="dice-context-selector">
            <select 
              className="journey-input" 
              style={{ width: "100%", padding: "6px" }}
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
            >
              <option value="">(Mestre) Rolagem Livre</option>
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.type === 'npc' ? '👹' : '🧑'} {c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="dice-selector" style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
          {(["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as DiceType[]).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDie(d)}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: selectedDie === d ? "var(--accent-primary)" : "rgba(0,0,0,0.3)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.8rem",
                flex: "1 0 calc(25% - 6px)",
                transition: "all 0.2s"
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="dice-options" style={{ display: "flex", gap: "8px" }}>
          <select 
            className="journey-input" 
            value={rollCategory} 
            onChange={(e) => setRollCategory(e.target.value as RollCategory)}
            style={{ flex: 1, padding: "6px" }}
          >
            <option value="custom">Livre</option>
            <option value="attack">Ataque</option>
            <option value="damage">Dano</option>
            <option value="ability">Habilidade</option>
            <option value="save">Salvaguarda</option>
            <option value="initiative">Iniciativa</option>
          </select>
          
          {combat?.isActive && (rollCategory === "attack" || rollCategory === "damage") && (
            <select 
              className="journey-input" 
              value={targetId} 
              onChange={(e) => setTargetId(e.target.value)}
              style={{ flex: 1, padding: "6px" }}
            >
              <option value="">Alvo Livre</option>
              {combat.participants.filter(p => !p.isDead).map(p => (
                <option key={p.refId} value={p.refId}>Alvo: {p.name}</option>
              ))}
            </select>
          )}

          <select 
            className="journey-input" 
            value={advantage} 
            onChange={(e) => setAdvantage(e.target.value as AdvantageType)}
            style={{ flex: 1, padding: "6px" }}
            disabled={selectedDie !== "d20"}
          >
            <option value="normal">Normal</option>
            <option value="advantage">Vantagem</option>
            <option value="disadvantage">Desvantagem</option>
          </select>
        </div>

        <div className="dice-visibility" style={{ display: "flex", gap: "8px" }}>
          <select 
            className="journey-input" 
            value={visibility} 
            onChange={(e) => setVisibility(e.target.value as VisibilityType)}
            style={{ flex: 1, padding: "6px", color: visibility === 'private' ? 'var(--warning)' : 'inherit' }}
          >
            <option value="public">Público (Todos)</option>
            <option value="gm">Mestre (Eu e Mestre)</option>
            <option value="private">Privado (Só Eu)</option>
          </select>
        </div>

        <div className="dice-modifier" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Bônus:</span>
          <input 
            type="number" 
            className="journey-input" 
            value={customModifier} 
            onChange={(e) => setCustomModifier(e.target.value)}
            style={{ width: "60px", padding: "6px", textAlign: "center" }}
          />
        </div>

        <button 
          onClick={handleRoll}
          style={{
            width: "100%",
            padding: "12px",
            background: "var(--accent-primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: "pointer",
            marginTop: "4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}
        >
          {isRolling ? "🎲 ROLANDO..." : "🎲 ROLAR"}
        </button>

        {lastRoll && (
          <div className="dice-result-area" style={{ 
            marginTop: "8px", 
            padding: "12px", 
            background: "rgba(0,0,0,0.4)", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              {lastRoll.advantage !== "normal" && (
                <span style={{ color: lastRoll.advantage === "advantage" ? "#4ade80" : "#f87171" }}>
                  {lastRoll.advantage === "advantage" ? "Vantagem " : "Desvantagem "}
                </span>
              )}
              ({lastRoll.diceType} = {lastRoll.result} {lastRoll.modifier !== 0 ? `${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier}` : ''})
            </div>
            
            <div style={{ 
              fontSize: "2.5rem", 
              fontWeight: 900, 
              color: lastRoll.isCritical ? "#4ade80" : lastRoll.isCritFail ? "#f87171" : "white",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)"
            }}>
              {lastRoll.total}
            </div>

            {lastRoll.isCritical && <div style={{ color: "#4ade80", fontSize: "0.85rem", fontWeight: "bold", marginTop: "4px" }}>CRÍTICO!</div>}
            {lastRoll.isCritFail && <div style={{ color: "#f87171", fontSize: "0.85rem", fontWeight: "bold", marginTop: "4px" }}>FALHA CRÍTICA!</div>}
          </div>
        )}
      </div>

      {rollHistory.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(0,0,0,0.2)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "bold" }}>Histórico ({rollHistory.length})</span>
            <button onClick={clearHistory} style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: "0.7rem", cursor: "pointer", fontWeight: "bold" }}>Limpar</button>
          </div>
          <div style={{ padding: "0 10px 10px", maxHeight: "150px", overflowY: "auto" }}>
            {rollHistory.slice(1).map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", padding: "4px 0", color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <span>
                  {r.characterName}: {r.rollType} 
                  {r.visibility === 'private' && <span style={{ color: 'var(--warning)', marginLeft: '4px' }}>(P)</span>}
                  {r.visibility === 'gm' && <span style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>(M)</span>}
                </span>
                <span style={{ fontWeight: "bold", color: r.isCritical ? "#4ade80" : r.isCritFail ? "#f87171" : "white" }}>{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
