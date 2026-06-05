"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUserSession } from "@/contexts/UserSessionContext";
import {
  rollDie,
  rollWithAdvantage,
  rollWithDisadvantage,
  RollResult,
  parseProfBonus
} from "@/lib/dice/dnd5e";
import { SKILLS_MAP, SAVES_MAP } from "@/lib/constants/dnd5e";

const generateId = () => Math.random().toString(36).substring(2, 15);

function CustomSelect({ value, onChange, options, disabled = false, className = "", placeholder = "Selecione..." }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (val: string) => {
    for (const opt of options) {
      if (opt.group) {
        const found = opt.items.find((i: any) => i.value === val);
        if (found) return found.label;
      } else {
        if (opt.value === val) return opt.label;
      }
    }
    return placeholder;
  };

  return (
    <div ref={ref} className={`custom-select-wrapper ${className}`} style={{ position: "relative", width: "100%", opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          background: "rgba(0,0,0,0.4)", 
          border: "1px solid rgba(255,255,255,0.1)", 
          borderRadius: "6px", 
          padding: "8px 12px", 
          cursor: "pointer", 
          color: "white", 
          fontSize: "0.8rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none"
        }}
      >
          <span style={{ 
            overflow: "hidden", 
            textOverflow: "ellipsis", 
            whiteSpace: "nowrap",
            fontWeight: getLabel(value) !== placeholder ? "bold" : "normal",
            color: getLabel(value) !== placeholder ? "#ffffff" : "var(--accent-primary)",
            textTransform: getLabel(value) === placeholder ? "uppercase" : "none",
            letterSpacing: getLabel(value) === placeholder ? "1px" : "normal"
          }}>
            {getLabel(value)}
          </span>
          <span style={{ fontSize: "0.6rem", opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </div>
      
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          background: "rgba(20, 20, 30, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          maxHeight: "220px",
          overflowY: "auto",
          zIndex: 9999,
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
        }}>
          {options.map((opt: any, i: number) => {
            if (opt.group) {
              return (
                <div key={i}>
                  <div style={{ padding: "6px 12px", fontSize: "0.65rem", textTransform: "uppercase", color: "var(--accent-primary)", fontWeight: "bold", background: "rgba(0,0,0,0.3)" }}>
                    {opt.group}
                  </div>
                  {opt.items.map((item: any) => (
                    <div 
                      key={item.value}
                      onClick={() => { onChange(item.value); setOpen(false); }}
                      style={{ padding: "8px 16px", fontSize: "0.8rem", cursor: "pointer", color: value === item.value ? "white" : "var(--text-muted)", background: value === item.value ? "rgba(255,255,255,0.1)" : "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = value === item.value ? "rgba(255,255,255,0.1)" : "transparent"}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )
            }
            return (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{ padding: "8px 12px", fontSize: "0.8rem", cursor: "pointer", color: value === opt.value ? "white" : "var(--text-muted)", background: value === opt.value ? "rgba(255,255,255,0.1)" : "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = value === opt.value ? "rgba(255,255,255,0.1)" : "transparent"}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";
type AdvantageType = "normal" | "advantage" | "disadvantage";
type SkinType = "fire" | "arcane" | "minimal";
type AnimState = "idle" | "spinning" | "scrambling" | "revealing";

import { useApp } from "@/contexts/AppContext";

export default function DiceWidget() {
  const { session, isGM } = useUserSession();
  const { dadosGlobais } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isGhost, setIsGhost] = useState(false);
  const [skin, setSkin] = useState<SkinType>("fire");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Dragging State
  const widgetRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 20, y: 80 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Roll State
  const [selectedDie, setSelectedDie] = useState<DiceType>("d20");
  const [advantage, setAdvantage] = useState<AdvantageType>("normal");
  const [customModifier, setCustomModifier] = useState<string>("0");
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [displayNumber, setDisplayNumber] = useState<string | number>("");

  const [selectedCharId, setSelectedCharId] = useState<string>("custom");
  const [selectedSkill, setSelectedSkill] = useState<string>("custom");

  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [showCritModal, setShowCritModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  // Initialize from LocalStorage / SessionStorage
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

    const savedSkin = localStorage.getItem("dice-widget-skin") as SkinType;
    if (savedSkin) setSkin(savedSkin);
    
    const savedGhost = localStorage.getItem("dice-widget-ghost");
    if (savedGhost === "true") setIsGhost(true);
    
    const savedHistory = sessionStorage.getItem("dice-roll-history");
    if (savedHistory) {
      try {
        setRollHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Lock Character for Players
  useEffect(() => {
    if (!isGM && session?.playerId) {
      setSelectedCharId(session.playerId);
    }
  }, [isGM, session?.playerId]);

  // Update position CSS variable when opened
  useEffect(() => {
    if (isOpen && widgetRef.current) {
      widgetRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    }
  }, [isOpen]);

  const toggleWidget = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    localStorage.setItem("dice-widget-state", nextState ? "open" : "closed");
  };

  const changeSkin = (newSkin: SkinType) => {
    setSkin(newSkin);
    localStorage.setItem("dice-widget-skin", newSkin);
  };

  const clearHistory = () => {
    setRollHistory([]);
    sessionStorage.removeItem("dice-roll-history");
  };

  // --- Drag Logic ---
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, select, .no-drag")) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleWidgetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDragged.current) return;
    toggleWidget();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !widgetRef.current) return;
      
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
      }
      
      const newX = pos.current.x + dx;
      const newY = pos.current.y + dy;
      
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - (isOpen ? 280 : 60)));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - (isOpen ? 400 : 60)));
      
      widgetRef.current.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        if (hasDragged.current && widgetRef.current) {
          const match = widgetRef.current.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
          if (match) {
            pos.current = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
            localStorage.setItem("dice-widget-pos", JSON.stringify(pos.current));
          }
        }
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isOpen]);

  // --- Roll Logic ---
  const handleRoll = () => {
    if (animState !== "idle") return;
    setAnimState("spinning");
    setDisplayNumber("");
    setShowCritModal(false);
    setShowFailModal(false);

    const sides = parseInt(selectedDie.replace("d", ""));
    const mod = parseInt(customModifier) || 0;

    // FASE 1: Spin (600ms)
    setTimeout(() => {
      setAnimState("scrambling");

      let scrambleInterval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * sides) + 1);
      }, 50);

      // FASE 2: Scramble (600ms)
      setTimeout(() => {
        clearInterval(scrambleInterval);
        
        // Execute real roll
        let result = 0;
        let rolls: number[] = [];

        if (advantage === "advantage") {
          const r = rollWithAdvantage(sides);
          result = r.result;
          rolls = r.rolls;
        } else if (advantage === "disadvantage") {
          const r = rollWithDisadvantage(sides);
          result = r.result;
          rolls = r.rolls;
        } else {
          result = rollDie(sides);
          rolls = [result];
        }

        const isCritical = selectedDie === "d20" && result === 20;
        const isCritFail = selectedDie === "d20" && result === 1;

        let charName = (session as any)?.playerName || "Jogador";
        if (selectedCharId !== "custom" && selectedCharId !== "") {
          const npcs = dadosGlobais?.npcs || [];
          const players = dadosGlobais?.players || [];
          const found = npcs.find((n: any) => n.id === selectedCharId) || players.find((p: any) => p.id === selectedCharId);
          if (found) charName = found.name;
        }

        const skillLabel = selectedSkill === "custom" 
          ? "Rolagem Livre" 
          : selectedSkill.startsWith("attr_") ? `Atributo (${selectedSkill.replace("attr_", "").toUpperCase()})`
          : selectedSkill.startsWith("save_") ? `Salvaguarda (${selectedSkill.replace("save_", "").toUpperCase()})`
          : selectedSkill.startsWith("skill_") ? `Perícia (${SKILLS_MAP.find(s => s.name === selectedSkill.replace("skill_", ""))?.label || selectedSkill})`
          : "Rolagem Livre";

        const rollData: RollResult = {
          id: generateId(),
          rolledBy: session?.playerId || "system",
          characterName: charName,
          diceType: selectedDie,
          modifier: mod,
          rolls,
          result,
          total: result + mod,
          rollType: "custom",
          ability: skillLabel,
          timestamp: new Date().toISOString(),
          advantage,
          isCritical,
          isCritFail,
          visibility: "public"
        };

        setLastRoll(rollData);
        setRollHistory(prev => {
          const newHistory = [rollData, ...prev].slice(0, 50);
          sessionStorage.setItem("dice-roll-history", JSON.stringify(newHistory));
          return newHistory;
        });

        // Broadcast Roll
        window.dispatchEvent(new CustomEvent('send_broadcast', { 
          detail: { type: 'dice_roll', payload: rollData } 
        }));

        // FASE 3: Reveal
        setDisplayNumber(result);
        setAnimState("revealing");

        if (isCritical) {
          setTimeout(() => { setShowCritModal(true); setAnimState("idle"); }, 300);
        } else if (isCritFail) {
          setTimeout(() => { setShowFailModal(true); setAnimState("idle"); }, 300);
        } else {
          setTimeout(() => setAnimState("idle"), 300);
        }

      }, 600);
    }, 600);
  };

  // Ghost Mode (Right Click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextGhost = !isGhost;
    setIsGhost(nextGhost);
    localStorage.setItem("dice-widget-ghost", nextGhost ? "true" : "false");
  };

  // --- SVG d20 Icon ---
  const getD20SVG = () => (
    <svg className="roll-d20-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
      <path d="M12 2L2 9l10 13 10-13-10-7z" />
      <path d="M12 2v20" />
      <path d="M12 22l-6.5-11.5L12 6l6.5 4.5z" />
      <path d="M2 9h20" />
    </svg>
  );

  // COLLAPSED WIDGET
  if (!isOpen) {
    return (
      <div 
        ref={widgetRef}
        onMouseDown={onMouseDown}
        onContextMenu={handleContextMenu}
        className={`skin-${skin}`}
        style={{
          position: "fixed",
          zIndex: 100,
          width: "60px",
          height: "60px",
          cursor: "grab",
          borderRadius: "50%",
          background: "rgba(10, 10, 15, 0.9)",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          transform: `translate(${pos.current.x}px, ${pos.current.y}px)`,
          opacity: isGhost ? 0.3 : 1,
          transition: "opacity 0.2s"
        }}
      >
        <div style={{ width: "100%", height: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={handleWidgetClick}>
          {getD20SVG()}
        </div>
      </div>
    );
  }

  const handleChangeSkill = (skill: string) => {
    setSelectedSkill(skill);
    
    if (skill !== "custom") {
      const npcs = dadosGlobais?.npcs || [];
      const players = dadosGlobais?.players || [];
      const found: any = npcs.find((n: any) => n.id === selectedCharId) || players.find((p: any) => p.id === selectedCharId);
      
      if (found) {
        let mod = 0;
        const profBonus = parseProfBonus(found.profBonus, found.cr);
        
        if (skill.startsWith("attr_")) {
          const attr = skill.replace("attr_", "");
          const score = typeof found[attr] === "number" ? found[attr] : parseInt(found[attr] || "10", 10);
          if (!isNaN(score)) mod = Math.floor((score - 10) / 2);
        } 
        else if (skill.startsWith("save_")) {
          const attr = skill.replace("save_", "");
          const score = typeof found[attr] === "number" ? found[attr] : parseInt(found[attr] || "10", 10);
          if (!isNaN(score)) mod = Math.floor((score - 10) / 2);
          
          const saves = found.saves || [];
          if (saves.includes(attr)) mod += profBonus;
        }
        else if (skill.startsWith("skill_")) {
          const skillName = skill.replace("skill_", "");
          const skillObj = SKILLS_MAP.find(s => s.name === skillName);
          if (skillObj) {
            const attr = skillObj.attr;
            const score = typeof found[attr] === "number" ? found[attr] : parseInt(found[attr] || "10", 10);
            if (!isNaN(score)) mod = Math.floor((score - 10) / 2);
            
            const skills = found.skills || [];
            const expertiseSkills = found.expertiseSkills || [];
            
            if (expertiseSkills.includes(skillName)) {
              mod += profBonus * 2;
            } else if (skills.includes(skillName)) {
              mod += profBonus;
            }
          }
        }
        setCustomModifier(mod.toString());
      }
    }
  };

  // EXPANDED WIDGET
  return (
    <div 
      className={`dice-roller-container skin-${skin}`}
      ref={widgetRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "16px",
        transform: `translate(${pos.current.x}px, ${pos.current.y}px)`
      }}
    >
      <div style={{ width: "280px", background: "var(--bg-panel)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="dice-roller-header" onMouseDown={onMouseDown}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "20px", height: "20px" }}>{getD20SVG()}</div>
          <span style={{ fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Rolador de Dados</span>
        </div>
        <div className="no-drag" style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => changeSkin(skin === 'fire' ? 'arcane' : skin === 'arcane' ? 'minimal' : 'fire')} title="Trocar Tema" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>🎨</button>
          <button onClick={toggleWidget} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Character Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <CustomSelect
            className="no-drag"
            disabled={!isGM}
            value={selectedCharId}
            onChange={(val: string) => setSelectedCharId(val)}
            options={[
              { value: "custom", label: "Rolagem Livre" },
              ...(isGM ? (dadosGlobais?.npcs || []).map((n: any) => ({ value: n.id, label: `${n.name} (NPC)` })) : []),
              ...(!isGM ? (dadosGlobais?.players || []).filter((p: any) => p.id === session?.playerId).map((p: any) => ({ value: p.id, label: p.name })) : [])
            ]}
          />
          {selectedCharId !== "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <CustomSelect
                className="no-drag"
                value={selectedSkill.startsWith("attr_") ? selectedSkill : ""}
                placeholder="Atributos"
                onChange={handleChangeSkill}
                options={[
                  { value: "attr_str", label: "Força" },
                  { value: "attr_dex", label: "Destreza" },
                  { value: "attr_con", label: "Constituição" },
                  { value: "attr_int", label: "Inteligência" },
                  { value: "attr_wis", label: "Sabedoria" },
                  { value: "attr_cha", label: "Carisma" }
                ]}
              />
              <CustomSelect
                className="no-drag"
                value={selectedSkill.startsWith("save_") ? selectedSkill : ""}
                placeholder="Salvaguardas"
                onChange={handleChangeSkill}
                options={SAVES_MAP.map(s => ({ value: `save_${s.attr}`, label: `Salva de ${s.key}` }))}
              />
              <CustomSelect
                className="no-drag"
                value={selectedSkill.startsWith("skill_") ? selectedSkill : ""}
                placeholder="Perícias"
                onChange={handleChangeSkill}
                options={SKILLS_MAP.map(s => ({ value: `skill_${s.name}`, label: s.label }))}
              />
            </div>
          )}
        </div>

        {/* Hexagon Dice Selector */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
          {(["d4", "d6", "d8", "d10", "d12", "d20"] as DiceType[]).map(d => (
            <button
              key={d}
              className={`hex-btn ${selectedDie === d ? 'active' : ''}`}
              onClick={() => setSelectedDie(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Advantage Toggles */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: "bold" }}>Vantagem</div>
          <div className="adv-toggle-group">
            <button className={`adv-btn ${advantage === "disadvantage" ? "active" : ""}`} onClick={() => setAdvantage("disadvantage")} disabled={selectedDie !== "d20"}>DESV</button>
            <button className={`adv-btn ${advantage === "normal" ? "active" : ""}`} onClick={() => setAdvantage("normal")} disabled={selectedDie !== "d20"}>NORMAL</button>
            <button className={`adv-btn ${advantage === "advantage" ? "active" : ""}`} onClick={() => setAdvantage("advantage")} disabled={selectedDie !== "d20"}>VANT</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase" }}>Modificador:</span>
          <input 
            type="number" 
            value={customModifier} 
            onChange={(e) => setCustomModifier(e.target.value)}
            style={{ width: "50px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", padding: "6px", textAlign: "center", fontWeight: "bold" }}
          />
        </div>

        {/* Central Roll Button / Animation Area */}
        <div 
          className="roll-btn-container"
          onClick={handleRoll}
        >
          <div className={animState === "spinning" ? "anim-spinning" : animState === "revealing" ? "anim-revealing" : ""} style={{ width: "100%", height: "100%", opacity: (animState === "scrambling" && !displayNumber) ? 0.3 : 1 }}>
            {getD20SVG()}
          </div>
          {(displayNumber || animState !== "idle") && (
            <div className="dice-result-text">
              {displayNumber}
            </div>
          )}
        </div>

        {/* Result Breakdown */}
        {animState === "idle" && lastRoll && (
          <div style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "8px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {lastRoll.advantage !== "normal" && <span style={{ color: lastRoll.advantage === "advantage" ? "#4ade80" : "#f87171" }}>{lastRoll.advantage === "advantage" ? "Vantagem " : "Desvantagem "}</span>}
              {lastRoll.ability && lastRoll.ability !== "Rolagem Livre" && <span style={{ color: "#a8b1ff", marginRight: "6px" }}>[{lastRoll.ability}]</span>}
              {lastRoll.diceType} {lastRoll.modifier !== 0 ? (lastRoll.modifier > 0 ? `+${lastRoll.modifier}` : lastRoll.modifier) : ""}
            </div>
            {lastRoll.advantage !== "normal" && lastRoll.rolls?.length === 2 && (
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                Dados puros: [{lastRoll.rolls[0]}, {lastRoll.rolls[1]}] 
                <span style={{ marginLeft: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  (Manteve: {lastRoll.result})
                </span>
              </div>
            )}
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: lastRoll.isCritical ? "#ffd700" : lastRoll.isCritFail ? "#ff4444" : "white", marginTop: "4px" }}>
              Resultado: {lastRoll.total}
            </div>
          </div>
        )}
        {/* History Toggle */}
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column" }}>
          <button 
            onClick={() => setHistoryExpanded(!historyExpanded)}
            style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
          >
            {historyExpanded ? "▼ Ocultar Histórico" : "▶ Mostrar Histórico"}
          </button>
        </div>
      </div>
      </div>

      {/* Lateral History Panel */}
      {historyExpanded && (
        <div style={{ display: "flex", flexDirection: "column", width: "200px", background: "var(--bg-panel)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold" }}>Histórico</span>
            <button onClick={clearHistory} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.7rem" }}>Limpar</button>
          </div>
          <div style={{ padding: "8px", overflowY: "auto", maxHeight: "400px", minHeight: "100px" }}>
            {rollHistory.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Nenhuma rolagem ainda.</div>
            ) : rollHistory.map((r, i) => (
              <div key={r.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px", fontSize: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {r.diceType} {r.modifier !== 0 ? (r.modifier > 0 ? `+${r.modifier}` : r.modifier) : ""}
                    {r.advantage !== "normal" && (
                      <span style={{ color: r.advantage === "advantage" ? "#4ade80" : "#f87171", marginLeft: "4px" }}>
                        ({r.advantage === "advantage" ? "Vant" : "Desv"})
                      </span>
                    )}
                  </span>
                  {r.ability && r.ability !== "Rolagem Livre" && <span style={{ color: "#a8b1ff", fontSize: "0.65rem" }}>{r.ability}</span>}
                  {r.advantage !== "normal" && r.rolls?.length === 2 && (
                    <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
                      [{r.rolls[0]}, {r.rolls[1]}] → {r.result}
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: "bold", fontSize: "1.1rem", alignSelf: "center", color: r.isCritical ? "#ffd700" : r.isCritFail ? "#ff4444" : "white" }}>{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    {/* CRIT MODALS */}
      {showCritModal && (
        <div className="dice-modal-overlay crit-modal" onClick={() => setShowCritModal(false)}>
          <div className="particles"></div>
          <div className="anim-revealing" style={{ width: "150px", height: "150px", color: "#ffd700" }}>
            {getD20SVG()}
          </div>
          <div className="dice-result-text" style={{ fontSize: "3.5rem", color: "white" }}>20</div>
          <div className="crit-text">CRÍTICO!!</div>
        </div>
      )}

      {showFailModal && (
        <div className="dice-modal-overlay fail-modal" onClick={() => setShowFailModal(false)}>
          <div className="anim-revealing" style={{ width: "150px", height: "150px", color: "#ff4444" }}>
            {getD20SVG()}
          </div>
          <div className="dice-result-text" style={{ fontSize: "3.5rem", color: "white" }}>1</div>
          <div className="fail-text">FALHA CRÍTICA</div>
        </div>
      )}
    </div>
  );
}
