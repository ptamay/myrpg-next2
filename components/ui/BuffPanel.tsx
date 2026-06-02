"use client";

import React, { useState } from "react";
import { ActiveBuff } from "@/lib/types/buffs";
// Usando uuid substituto para evitar erro de build caso não tenha sido instalado perfeitamente:
const generateId = () => Math.random().toString(36).substring(2, 15);

interface BuffPanelProps {
  buffs: ActiveBuff[];
  onUpdateBuffs: (newBuffs: ActiveBuff[]) => void;
  isGM: boolean;
}

export default function BuffPanel({ buffs, onUpdateBuffs, isGM }: BuffPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [duration, setDuration] = useState<string>("combat");
  const [acBonus, setAcBonus] = useState<number>(0);
  const [speedBonus, setSpeedBonus] = useState<number>(0);
  const [customEffect, setCustomEffect] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    
    const newBuff: ActiveBuff = {
      id: generateId(),
      name: name.trim(),
      source: source.trim() || "Desconhecida",
      duration: duration as ActiveBuff["duration"],
      effects: {
        acBonus: acBonus !== 0 ? acBonus : undefined,
        speedBonus: speedBonus !== 0 ? speedBonus : undefined,
        custom: customEffect.trim() || undefined,
      },
      appliedAt: new Date().toISOString()
    };

    onUpdateBuffs([...buffs, newBuff]);
    setIsAdding(false);
    setName("");
    setSource("");
    setDuration("combat");
    setAcBonus(0);
    setSpeedBonus(0);
    setCustomEffect("");
  };

  const handleRemove = (id: string) => {
    onUpdateBuffs(buffs.filter(b => b.id !== id));
  };

  if (!isExpanded && buffs.length === 0 && !isGM) return null;

  return (
    <div className="buff-panel" style={{ marginTop: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>✨</span>
          <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Buffs Ativos ({buffs.length})</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 12px 12px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {buffs.map(buff => (
            <div key={buff.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: "6px" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  {buff.name}
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "normal", background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "4px" }}>
                    {buff.duration === 'combat' ? 'Combate' : buff.duration === 'short_rest' ? 'Até Descanso Curto' : buff.duration === 'long_rest' ? 'Até Descanso Longo' : 'Permanente'}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {buff.effects.acBonus ? `CA ${buff.effects.acBonus > 0 ? '+' : ''}${buff.effects.acBonus} ` : ""}
                  {buff.effects.speedBonus ? `Desl. ${buff.effects.speedBonus > 0 ? '+' : ''}${buff.effects.speedBonus} ` : ""}
                  {buff.effects.custom ? buff.effects.custom : ""}
                </div>
              </div>
              {isGM && (
                <button onClick={(e) => { e.stopPropagation(); handleRemove(buff.id); }} style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px" }}>
                  ×
                </button>
              )}
            </div>
          ))}

          {buffs.length === 0 && !isAdding && (
            <div style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Nenhum buff ativo.
            </div>
          )}

          {isGM && !isAdding && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
              style={{ width: "100%", padding: "6px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer", marginTop: "4px" }}
            >
              + Adicionar Buff
            </button>
          )}

          {isGM && isAdding && (
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              <input type="text" placeholder="Nome da Magia/Efeito (ex: Bênção)" className="journey-input" value={name} onChange={e => setName(e.target.value)} style={{ padding: "6px", fontSize: "0.85rem" }} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Bônus CA</label>
                  <input type="number" className="journey-input" value={acBonus} onChange={e => setAcBonus(parseInt(e.target.value) || 0)} style={{ padding: "6px", fontSize: "0.85rem", width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Bônus Desl.</label>
                  <input type="number" className="journey-input" value={speedBonus} onChange={e => setSpeedBonus(parseInt(e.target.value) || 0)} style={{ padding: "6px", fontSize: "0.85rem", width: "100%" }} />
                </div>
              </div>

              <input type="text" placeholder="Outros efeitos (ex: Vantagem Sabedoria)" className="journey-input" value={customEffect} onChange={e => setCustomEffect(e.target.value)} style={{ padding: "6px", fontSize: "0.85rem" }} />
              
              <select className="journey-input" value={duration} onChange={e => setDuration(e.target.value)} style={{ padding: "6px", fontSize: "0.85rem" }}>
                <option value="combat">Até o fim do combate</option>
                <option value="short_rest">Até Descanso Curto</option>
                <option value="long_rest">Até Descanso Longo</option>
                <option value="permanent">Permanente</option>
              </select>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button className="btn secondary-btn" onClick={() => setIsAdding(false)} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>Cancelar</button>
                <button className="btn primary-btn" onClick={handleAdd} disabled={!name.trim()} style={{ padding: "4px 12px", fontSize: "0.8rem" }}>Salvar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
