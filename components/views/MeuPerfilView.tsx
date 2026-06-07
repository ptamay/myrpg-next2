"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";

import { SAVES_MAP, SKILLS_MAP } from "@/lib/dndConstants";
import { Player } from "@/lib/gameData";
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export default function MeuPerfilView() {
  const { openModal, setActiveData, dadosGlobais, setDadosGlobais } = useApp();
  const { session } = useUserSession();
  // Reutiliza a lista de players do AppContext (evita subscription duplicada ao Realtime)
  const players = dadosGlobais?.players || [];
  const setPlayers = (val: any) => setDadosGlobais({ ...dadosGlobais, players: val });
  
  const player = players?.find((p: any) => p.id === session?.player_id);
  
  const [newItemName, setNewItemName] = useState("");
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [activeBioTab, setActiveBioTab] = useState<"history" | "goals" | "notes">("history");

  const [backgroundText, setBackgroundText] = useState("");
  const [personalGoalsText, setPersonalGoalsText] = useState("");
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    if (player) {
      setBackgroundText(player.background || "");
      setPersonalGoalsText(player.personalGoals || "");
      setNotesText(player.notes || "");
    }
  }, [player?.id, player?.background, player?.personalGoals, player?.notes]);

  if (!player) {
    return (
      <div className="empty-state">
        <p>Perfil não encontrado ou você não tem um personagem atribuído.</p>
      </div>
    );
  }

  const items = Array.isArray(player.inventory) ? player.inventory : [];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    const newItem = { id: Date.now().toString(), name: newItemName, qtd: newItemQtd };
    const newInventory = [...items, newItem];
    
    updatePlayer({ inventory: newInventory });
    setNewItemName("");
    setNewItemQtd(1);
  };

  const handleRemoveItem = (itemId: string) => {
    const newInventory = items.filter((i: any) => i.id !== itemId);
    updatePlayer({ inventory: newInventory });
  };

  const updatePlayer = (updates: any) => {
    const newPlayers = players.map((p: any) => 
      p.id === player.id ? { ...p, ...updates } : p
    );
    setPlayers(newPlayers);
  };

  const calcMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const profBonus = player.profBonus || "2";
  const parsedSaves = Array.isArray(player.saves) ? player.saves : (typeof player.saves === 'string' && player.saves ? ((player.saves as any) as string).split(',').map((s: string) => s.trim()) : []);
  const parsedSkills = Array.isArray(player.skills) ? player.skills : (typeof player.skills === 'string' && player.skills ? ((player.skills as any) as string).split(',').map((s: string) => s.trim()) : []);

  const hpPct = player.hpMax > 0 ? Math.max(0, Math.min(100, ((player.hpCurrent !== undefined ? player.hpCurrent : player.hpMax) / player.hpMax) * 100)) : 0;
  let hpColor = "#4ade80";
  if (hpPct <= 50) hpColor = "#f87171";
  else if (hpPct <= 75) hpColor = "#fbbf24";

  return (
    <div className="scrollable-area custom-scrollbar" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: "1.5rem", width: "100%", height: "100%", alignItems: "stretch", minHeight: 0 }}>
        
        {/* Coluna Esquerda: Ficha Principal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          
          {/* Cabeçalho do Perfil Compacto */}
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", gap: "1.5rem", alignItems: "center", borderRadius: "12px", position: "relative" }}>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
              <button 
                className="btn primary-btn small-btn" 
                onClick={() => {
                  setActiveData(player);
                  openModal('playerForm', null);
                }}
              >
                Editar Ficha
              </button>
            </div>
            
            {player.image ? (
              <OptimizedImage src={player.image} alt={player.name} loading="lazy" style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border-subtle)" }} />
            ) : (
              <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: "bold", color: "var(--text-muted)", border: "3px solid var(--border-subtle)" }}>
                {player.name?.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div style={{ flex: 1, minWidth: 0, paddingRight: "100px" }}>
              <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.8rem", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</h1>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {player.playerClass || player.classLevel || 'Sem classe'} {player.playerLevel ? `Nv. ${player.playerLevel}` : ''} • {player.race || 'Desconhecida'}
              </p>
              
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", maxWidth: "260px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.75rem", fontWeight: 600 }}>
                    <span>HP ({player.hpCurrent} / {player.hpMax})</span>
                  </div>
                  <div style={{ height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${hpPct}%`, background: hpColor, transition: "width 0.3s" }} />
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "1.25rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>CA</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>{player.ac || '--'}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Iniciativa</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>{player.init || '--'}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Deslocamento</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>{player.speed || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Atributos em Linha Única */}
          <div className="glass-panel" style={{ padding: "1rem", borderRadius: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem" }}>
              {SAVES_MAP.map(attr => (
                <div key={attr.key} style={{ background: "rgba(0,0,0,0.2)", padding: "0.5rem 0.25rem", borderRadius: "8px", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{attr.key}</span>
                  <span style={{ display: "block", fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)", margin: "2px 0" }}>{calcMod((player as any)[attr.attr])}</span>
                  <span style={{ display: "inline-block", fontSize: "0.75rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: "10px" }}>{(player as any)[attr.attr] || 10}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid de Inventário e Bio Tabulada */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
            
            {/* Itens da Campanha */}
            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.05rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", fontWeight: 700 }}>Itens da Campanha</h3>
              
              <form onSubmit={handleAddItem} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <input 
                  type="text" 
                  placeholder="Nome do Item..." 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="modern-input" 
                  style={{ flex: 1, padding: "0.5rem", fontSize: "0.85rem", color: "#fff" }}
                  required
                />
                <input 
                  type="number" 
                  min="1"
                  value={newItemQtd}
                  onChange={(e) => setNewItemQtd(parseInt(e.target.value) || 1)}
                  className="modern-input" 
                  style={{ width: "60px", textAlign: "center", padding: "0.5rem", fontSize: "0.85rem", color: "#fff" }}
                />
                <button type="submit" className="btn primary-btn small-btn" style={{ padding: "0 1rem", height: "34px", fontSize: "0.8rem" }}>Adicionar</button>
              </form>

              <div style={{ flex: 1, overflowY: "auto", maxHeight: "180px", paddingRight: "0.25rem" }} className="custom-scrollbar">
                {items.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", marginTop: "2rem" }}>Nenhum item adicionado ainda.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {items.map((item: any) => (
                      <li key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", marginRight: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "6px" }}>Qtd:</span>
                            <input 
                              type="number" 
                              min="0"
                              value={item.qtd} 
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                if (val === 0) {
                                  handleRemoveItem(item.id);
                                } else {
                                  const newInventory = items.map((i: any) => i.id === item.id ? { ...i, qtd: val } : i);
                                  updatePlayer({ inventory: newInventory });
                                }
                              }}
                              style={{
                                width: "60px",
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                color: "#fff",
                                fontSize: "0.75rem",
                                textAlign: "center"
                              }}
                            />
                          </div>
                        </div>
                        <button onClick={() => handleRemoveItem(item.id)} style={{ background: "none", border: "none", color: "var(--text-danger)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }} title="Remover item">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* História / Objetivos Tabulados */}
            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem", gap: "1rem" }}>
                <button 
                  onClick={() => setActiveBioTab("history")} 
                  style={{ 
                    padding: "4px 8px 6px", 
                    background: "transparent", 
                    border: "none", 
                    color: activeBioTab === "history" ? "#fff" : "var(--text-muted)", 
                    borderBottom: activeBioTab === "history" ? "2px solid var(--accent-primary)" : "2px solid transparent", 
                    fontWeight: 700, 
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "color 0.2s"
                  }}
                >
                  História / Background
                </button>
                <button 
                  onClick={() => setActiveBioTab("goals")} 
                  style={{ 
                    padding: "4px 8px 6px", 
                    background: "transparent", 
                    border: "none", 
                    color: activeBioTab === "goals" ? "#fff" : "var(--text-muted)", 
                    borderBottom: activeBioTab === "goals" ? "2px solid var(--accent-primary)" : "2px solid transparent", 
                    fontWeight: 700, 
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "color 0.2s"
                  }}
                >
                  Objetivos Pessoais
                </button>
                <button 
                  onClick={() => setActiveBioTab("notes")} 
                  style={{ 
                    padding: "4px 8px 6px", 
                    background: "transparent", 
                    border: "none", 
                    color: activeBioTab === "notes" ? "#fff" : "var(--text-muted)", 
                    borderBottom: activeBioTab === "notes" ? "2px solid var(--accent-primary)" : "2px solid transparent", 
                    fontWeight: 700, 
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "color 0.2s"
                  }}
                >
                  Minhas Anotações
                </button>
              </div>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <textarea 
                  key={activeBioTab}
                  className="modern-input" 
                  style={{ flex: 1, minHeight: "120px", resize: "none", padding: "0.75rem", background: "rgba(0,0,0,0.2)", fontFamily: "'Fira Code', 'Courier New', Consolas, monospace", fontSize: "0.85rem", lineHeight: 1.4, color: "#fff" }} 
                  placeholder={activeBioTab === "history" ? "Escreva a história do seu personagem..." : activeBioTab === "goals" ? "Quais são as motivações e objetivos do seu personagem?" : "Espaço livre para suas anotações pessoais..."}
                  value={activeBioTab === "history" ? backgroundText : activeBioTab === "goals" ? personalGoalsText : notesText}
                  onChange={(e) => {
                    if (activeBioTab === "history") {
                      setBackgroundText(e.target.value);
                    } else if (activeBioTab === "goals") {
                      setPersonalGoalsText(e.target.value);
                    } else {
                      setNotesText(e.target.value);
                    }
                  }}
                />
                
                <button 
                  onClick={() => {
                    updatePlayer({ background: backgroundText, personalGoals: personalGoalsText, notes: notesText });
                  }} 
                  className="btn primary-btn small-btn" 
                  style={{ alignSelf: "flex-end", padding: "0 1.25rem", height: "34px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span>Salvar</span>
                </button>
              </div>
            </div>
            
          </div>
        </div>

        {/* Coluna Direita: Perícias & Salvaguardas */}
        <div className="glass-panel" style={{ width: "360px", padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Perícias & Salvaguardas</h3>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#e2b43b" }}>Bônus Prof: +{profBonus}</span>
          </div>
          
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", paddingRight: "0.25rem" }}>
            {/* Salvaguardas */}
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#8a8a8a", marginBottom: "0.5rem", display: "block" }}>Salvaguardas</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {SAVES_MAP.map((sv) => {
                  const baseVal = parseInt((((player as any)[sv.attr] as string | number) || 10).toString());
                  const mod = Math.floor((baseVal - 10) / 2);
                  const isProf = parsedSaves.some((s: string) => s.toLowerCase().trim() === sv.key.toLowerCase().trim());
                  const total = mod + (isProf ? parseInt(profBonus) : 0);
                  const totalStr = total >= 0 ? `+${total}` : `${total}`;
                  return (
                    <div key={sv.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: isProf ? "#fff" : "#a1a1aa" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", border: isProf ? "2px solid #e2b43b" : "1.5px solid rgba(255,255,255,0.3)", background: isProf ? "#e2b43b" : "transparent", flexShrink: 0 }}></div>
                      <span style={{ width: "22px", fontWeight: isProf ? 800 : 500, color: isProf ? "#e2b43b" : "inherit", textAlign: "right", flexShrink: 0 }}>{totalStr}</span>
                      <span style={{ fontWeight: isProf ? 800 : 600, textTransform: "uppercase" }}>{sv.key}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Perícias */}
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#8a8a8a", marginBottom: "0.5rem", display: "block" }}>Perícias</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "12px", rowGap: "8px" }}>
                {SKILLS_MAP.map((sk) => {
                  const baseVal = parseInt((((player as any)[sk.attr] as string | number) || 10).toString());
                  const mod = Math.floor((baseVal - 10) / 2);
                  const isProf = parsedSkills.some((s: string) => s.toLowerCase().trim() === sk.label.toLowerCase().trim() || s.toLowerCase().trim() === sk.name.toLowerCase().trim());
                  const total = mod + (isProf ? parseInt(profBonus) : 0);
                  const totalStr = total >= 0 ? `+${total}` : `${total}`;
                  const attrIndex = sk.label.indexOf(" (");
                  const displayName = attrIndex !== -1 ? sk.label.substring(0, attrIndex) : sk.label;
                  const displayAttr = attrIndex !== -1 ? sk.label.substring(attrIndex).trim() : "";
                  return (
                    <div key={sk.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: isProf ? "#fff" : "#a1a1aa", minWidth: 0 }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", border: isProf ? "2px solid #e2b43b" : "1.5px solid rgba(255,255,255,0.3)", background: isProf ? "#e2b43b" : "transparent", flexShrink: 0 }}></div>
                      <span style={{ width: "22px", fontWeight: isProf ? 800 : 500, color: isProf ? "#e2b43b" : "inherit", textAlign: "right", flexShrink: 0 }}>{totalStr}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isProf ? 700 : 500 }}>
                        <strong style={{ fontWeight: isProf ? 800 : 600, color: isProf ? "#fff" : "inherit" }}>{displayName}</strong>
                        {" "}
                        <span style={{ color: "#71717a", fontSize: "0.75rem", fontWeight: 400 }}>{displayAttr}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
