"use client";

import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import PlayerCard from "./PlayerCard";
import MeuPerfilView from "./MeuPerfilView";

export default function PlayersView() {
  const { dadosGlobais, setDadosGlobais, setModals, setActiveData } = useAppContext();
  const { isGM, session } = useUserSession();
  const { showConfirm, showAlert } = useSystemDialog();

  const hasProfile = !isGM && !!session?.playerId;
  const [activeTab, setActiveTab] = useState<"perfil" | "jogadores">(hasProfile ? "perfil" : "jogadores");

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosGlobais.players || [], null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `myrpg_players_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          
          let list: any[] = [];
          if (Array.isArray(imported)) {
            list = imported;
          } else if (imported.dadosGlobais && Array.isArray(imported.dadosGlobais.players)) {
            list = imported.dadosGlobais.players;
          } else if (imported.players && Array.isArray(imported.players)) {
            list = imported.players;
          }

          if (list.length > 0) {
            if (await showConfirm({ title: "Importar Jogadores", message: `Isso irá adicionar/atualizar ${list.length} jogadores. Continuar?`, type: "warning" })) {
              const currentMap = new Map((dadosGlobais.players || []).map((n: any) => [n.id, n]));
              list.forEach((n: any) => currentMap.set(n.id, n));
              setDadosGlobais((prev: any) => ({ ...prev, players: Array.from(currentMap.values()) }));
              await showAlert({ title: "Importação Concluída", message: "Jogadores importados com sucesso!", type: "success" });
            }
          } else {
            await showAlert({ title: "Erro na Importação", message: "Formato inválido. Não foram encontrados jogadores neste arquivo.", type: "danger" });
          }
        } catch (err: any) {
          console.error("Erro de parsing JSON:", err);
          await showAlert({ title: "Erro na Importação", message: "Erro ao ler o arquivo JSON. Detalhes: " + (err.message || err), type: "danger" });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="npc-view-container">
      <div className="sticky-npc-header">
        <header className="npc-header glass-panel">
          <div className="npc-header-info">
            <h1 className="view-title">Personagens da Campanha</h1>
            <p className="view-subtitle">{isGM ? "Cadastre os jogadores ou importe a ficha em PDF." : "Conheça o grupo da campanha."}</p>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {hasProfile && (
              <div className="filter-tags">
                <button
                  className={`filter-tag ${activeTab === "perfil" ? "active" : ""}`}
                  onClick={() => setActiveTab("perfil")}
                >
                  Meu Perfil
                </button>
                <button
                  className={`filter-tag ${activeTab === "jogadores" ? "active" : ""}`}
                  onClick={() => setActiveTab("jogadores")}
                >
                  Jogadores
                </button>
              </div>
            )}

            {isGM && (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <button className="btn secondary-btn icon-only" title="Exportar Backup de Jogadores" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <label className="btn secondary-btn icon-only" title="Importar Backup de Jogadores" style={{ margin: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </label>
                <button className="btn primary-btn" onClick={() => { setActiveData(null); setModals((prev: any) => ({ ...prev, playerForm: true })); }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Novo Jogador</span>
                </button>
              </div>
            )}
          </div>
        </header>
      </div>

      <div className="npc-cards-wrapper scrollable-area" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "perfil" ? (
          <MeuPerfilView />
        ) : (
          <div className="npc-cards-grid" id="player-cards-grid">
            {(!dadosGlobais.players || dadosGlobais.players.length === 0) ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p>Nenhum personagem de jogador cadastrado ainda.</p>
              </div>
            ) : (
              dadosGlobais.players.map((player: any) => (
                <PlayerCard key={player.id} player={player} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
