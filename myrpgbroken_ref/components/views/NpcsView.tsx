"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import NpcCard from "./NpcCard";
import NpcCardPlayer from "../npcs/NpcCardPlayer";
import { useSystemDialog } from "@/contexts/SystemDialogContext";

export default function NpcsView() {
  const { dadosGlobais, setDadosGlobais, setModals, setActiveData } = useAppContext();
  const { isGM } = useUserSession();
  const { showAlert, showConfirm } = useSystemDialog();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [combatMode, setCombatMode] = useState(false);
  const [hideEffects, setHideEffects] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredNpcs = useMemo(() => {
    return dadosGlobais.npcs
      .filter((npc: any) => {
        if (!isGM && npc.isHidden) return false;
        
        if (debouncedSearch && !npc.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && 
            !npc.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) && 
            !npc.faction?.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
        
        if (activeFilter === "all") return isGM ? !npc.isHidden : true;
        if (activeFilter === "dead") return npc.isDead;
        if (activeFilter === "hidden") return npc.isHidden;
        
        if (npc.isDead || npc.isHidden) return false;
        if (activeFilter === "ally") return npc.faction === "ally";
        if (activeFilter === "neutral") return npc.faction === "neutral" || !npc.faction;
        if (activeFilter === "enemy") return npc.faction === "enemy";
        return true;
      })
      .sort((a: any, b: any) => {
        const aDead = a.isDead ? 1 : 0;
        const bDead = b.isDead ? 1 : 0;
        return aDead - bDead;
      });
  }, [dadosGlobais.npcs, debouncedSearch, activeFilter, isGM]);
  
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosGlobais.npcs, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `myrpg_npcs_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          
          let npcList: any[] = [];
          if (Array.isArray(imported)) {
            npcList = imported;
          } else if (imported.dadosGlobais && Array.isArray(imported.dadosGlobais.npcs)) {
            npcList = imported.dadosGlobais.npcs;
          } else if (imported.npcs && Array.isArray(imported.npcs)) {
            npcList = imported.npcs;
          }

          if (npcList.length > 0) {
            if (await showConfirm({ title: "Importar NPCs", message: `Isso irá adicionar/atualizar ${npcList.length} NPCs. Continuar?`, type: "warning" })) {
              // Merge imported NPCs based on ID
              const currentMap = new Map(dadosGlobais.npcs.map((n: any) => [n.id, n]));
              npcList.forEach((n: any) => currentMap.set(n.id, n));
              setDadosGlobais((prev: any) => ({ ...prev, npcs: Array.from(currentMap.values()) }));
              await showAlert({ title: "Importação Concluída", message: "NPCs importados com sucesso!", type: "success" });
            }
          } else {
            await showAlert({ title: "Erro na Importação", message: "Formato inválido. Não foram encontrados NPCs neste arquivo.", type: "danger" });
          }
        } catch (err: any) {
          console.error("Erro de parsing JSON:", err);
          await showAlert({ title: "Erro na Importação", message: "Erro ao ler o arquivo JSON. Detalhes: " + (err.message || err), type: "danger" });
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (combatMode) {
      document.body.classList.add('combat-mode-active');
      if (hideEffects) {
        document.body.classList.add('hide-combat-effects');
      } else {
        document.body.classList.remove('hide-combat-effects');
      }
    } else {
      document.body.classList.remove('combat-mode-active');
      document.body.classList.remove('hide-combat-effects');
    }

    return () => {
      document.body.classList.remove('combat-mode-active');
      document.body.classList.remove('hide-combat-effects');
    };
  }, [combatMode, hideEffects]);

  return (
    <div className="npc-view-container">
      <div className="sticky-npc-header">
        <header className="npc-header glass-panel">
          <div className="npc-header-info">
            <h1 className="view-title">Elenco da Campanha</h1>
            <p className="view-subtitle">Gerencie fichas de combate e perfis narrativos dos NPCs.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button className="btn secondary-btn icon-only" title="Ocultar/Mostrar Filtros" onClick={() => setShowFilters(!showFilters)}>
              <svg className="toggle-arrow" style={{ transform: showFilters ? "rotate(0deg)" : "rotate(180deg)", transition: "0.3s" }} viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isGM && (
              <>
                <button className="btn secondary-btn icon-only" title="Exportar Backup de NPCs" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <label className="btn secondary-btn icon-only" title="Importar Backup de NPCs" style={{ margin: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </label>
                <label className="combat-toggle-label">
                  <input type="checkbox" checked={combatMode} onChange={(e) => setCombatMode(e.target.checked)} />
                  <div className="combat-toggle-box">
                    <span className="toggle-icon">⚔️</span>
                    <span>Modo Combate</span>
                  </div>
                </label>
                {combatMode && (
                  <label className="combat-toggle-label">
                    <input type="checkbox" checked={hideEffects} onChange={(e) => setHideEffects(e.target.checked)} />
                    <div className="combat-toggle-box">
                      <span className="toggle-icon">🛡️</span>
                      <span>Esconder Condições</span>
                    </div>
                  </label>
                )}
                <button className="btn primary-btn" onClick={() => { setActiveData(null); setModals((prev: any) => ({ ...prev, npcForm: true })); }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Novo NPC</span>
                </button>
              </>
            )}
          </div>
        </header>

        {showFilters && (
          <div className="npc-filters glass-panel">
            <input
              type="text"
              className="journey-input"
              placeholder="Buscar por nome, ocupação ou facção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-tags">
              {(isGM ? ["all", "ally", "neutral", "enemy", "dead", "hidden"] : ["all", "ally", "neutral", "enemy", "dead"]).map((filter) => (
                <button
                  key={filter}
                  className={`filter-tag ${activeFilter === filter ? "active" : ""}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "all" ? "Todos" : filter === "ally" ? "Aliados" : filter === "neutral" ? "Neutros" : filter === "enemy" ? "Inimigos" : filter === "dead" ? "Mortos (Baixas)" : "Ocultos"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="npc-cards-wrapper scrollable-area">
        <div className="npc-cards-grid">
          {filteredNpcs.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <p>Nenhum NPC encontrado.</p>
            </div>
          ) : (
            filteredNpcs.map((npc: any) => (
              isGM 
                ? <NpcCard key={npc.id} npc={npc} combatMode={combatMode} hideEffects={hideEffects} />
                : <NpcCardPlayer key={npc.id} npc={npc} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
