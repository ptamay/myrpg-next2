"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "../../contexts/AppContext";
import { useSystemDialog } from "../../contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { Npc } from "@/lib/gameData";

interface NpcDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  npc: any; // We'll type this later or pass a detailed object
}

export default function NpcDetailModal({ isOpen, onClose, npc }: NpcDetailModalProps) {
  const [activeTab, setActiveTab] = useState("tab-combat");
  const [isViewingTransformation, setIsViewingTransformation] = useState(false);
  const { setModals, setActiveData, dadosGlobais, setDadosGlobais, salvarEstadoLocal } = useAppContext();
  const { showConfirm } = useSystemDialog();
  const { isGM } = useUserSession();

  // Buscar NPC atualizado no estado global (reatividade)
  const freshNpc = dadosGlobais.npcs.find((n: any) => n.id === npc?.id) || npc;

  React.useEffect(() => {
    if (isOpen && freshNpc) {
      setIsViewingTransformation(freshNpc.isTransformed || false);
    }
  }, [isOpen, freshNpc?.id, freshNpc?.isTransformed]);

  const calcMod = (val: number | string) => {
    const m = Math.floor((parseInt((val || 10).toString()) - 10) / 2);
    return m >= 0 ? `+${m}` : m;
  };

  const handleDelete = async () => {
    if (await showConfirm({ title: "Excluir NPC", message: `Tem certeza que deseja excluir o NPC "${npc.name}" permanentemente?`, type: "danger" })) {
      const newNpcs = dadosGlobais.npcs.filter((n: any) => n.id !== npc.id);
      setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
      setTimeout(salvarEstadoLocal, 100);
      onClose();
    }
  };

  // Determine which NPC data to render
  const activeNpc = (isViewingTransformation && freshNpc?.transformation) ? freshNpc.transformation : freshNpc;

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="npc-detail-modal">
      {freshNpc && (
      <div className="modal-content modal-xl glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Visualização</span>
            <h2 className="modal-title">Ficha do NPC</h2>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {freshNpc.transformation && isGM && (
              <button 
                className={`btn ${isViewingTransformation ? 'primary-btn' : 'secondary-btn'} small-btn`} 
                onClick={() => setIsViewingTransformation(!isViewingTransformation)}
                style={{ transition: 'all 0.3s' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" style={{ marginRight: "4px" }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                {isViewingTransformation ? "Ver Original" : "Transformar!"}
              </button>
            )}
            <button className="btn danger-btn small-btn" onClick={handleDelete}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" style={{ marginRight: "4px" }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Excluir
            </button>
            <button className="btn secondary-btn small-btn" onClick={() => {
              setActiveData(freshNpc);
              setModals((p: any) => ({ ...p, npcForm: true }));
              onClose();
            }}>Editar Ficha</button>
            <button className="close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>
        <div className="modal-body custom-scrollbar p-0">
          <div className="npc-detail-header" style={{ position: "relative" }}>
            {isViewingTransformation && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(45deg, rgba(var(--accent-primary-rgb), 0.1), transparent)", pointerEvents: "none" }} />
            )}
            {activeNpc.image ? (
              <img src={activeNpc.image} alt="Avatar" className="npc-detail-avatar" style={{ border: isViewingTransformation ? "2px solid var(--accent-primary)" : "none" }} />
            ) : (
              <div className="npc-detail-placeholder" style={{ border: isViewingTransformation ? "2px solid var(--accent-primary)" : "none" }}>?</div>
            )}
            <div className="npc-detail-title-area">
              <h1 className="det-name" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ color: isViewingTransformation ? "var(--accent-primary)" : "inherit" }}>{activeNpc.name}</span>
                {isViewingTransformation && <span style={{fontSize: "0.65rem", backgroundColor: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", color: "#fff", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase"}}>Transformado</span>}
                {activeNpc.isHidden && <span className="badge-hidden">Oculto</span>}
              </h1>
              <p className="det-title">{activeNpc.title || "---"}</p>
              <p className="det-meta">
                <span>{activeNpc.race || "---"}</span> • <span>{activeNpc.alignment || "---"}</span> • ND <span>{activeNpc.cr || "---"}</span>
              </p>
            </div>
          </div>

          <div className="npc-detail-tabs-nav">
            <button
              className={`det-tab-btn ${activeTab === "tab-combat" ? "active" : ""}`}
              onClick={() => setActiveTab("tab-combat")}
            >
              Combate
            </button>
            <button
              className={`det-tab-btn ${activeTab === "tab-lore" ? "active" : ""}`}
              onClick={() => setActiveTab("tab-lore")}
            >
              Biografia
            </button>
            <button
              className={`det-tab-btn ${activeTab === "tab-notes" ? "active" : ""}`}
              onClick={() => setActiveTab("tab-notes")}
            >
              Inventário & Notas
            </button>
          </div>

          <div className="npc-detail-tabs-content">
            <div className={`det-tab-content ${activeTab === "tab-combat" ? "active" : ""}`}>
              <div className="det-combat-stats-bar">
                <div className="det-combat-stat"><span className="lbl">PV Máx</span><span className="val">{activeNpc.hpMax || "---"}</span></div>
                <div className="det-combat-stat"><span className="lbl">CA</span><span className="val">{activeNpc.ac || "---"}</span></div>
                <div className="det-combat-stat"><span className="lbl">Iniciativa</span><span className="val">{activeNpc.init || "---"}</span></div>
                <div className="det-combat-stat"><span className="lbl">Desloc.</span><span className="val">{activeNpc.speed || "---"}</span></div>
              </div>
              <div className="det-attr-grid">
                <div className="det-attr-box"><span className="lbl">FOR</span><span className="val">{activeNpc.str || 10}</span><span className="mod">{calcMod(activeNpc.str)}</span></div>
                <div className="det-attr-box"><span className="lbl">DES</span><span className="val">{activeNpc.dex || 10}</span><span className="mod">{calcMod(activeNpc.dex)}</span></div>
                <div className="det-attr-box"><span className="lbl">CON</span><span className="val">{activeNpc.con || 10}</span><span className="mod">{calcMod(activeNpc.con)}</span></div>
                <div className="det-attr-box"><span className="lbl">INT</span><span className="val">{activeNpc.int || 10}</span><span className="mod">{calcMod(activeNpc.int)}</span></div>
                <div className="det-attr-box"><span className="lbl">SAB</span><span className="val">{activeNpc.wis || 10}</span><span className="mod">{calcMod(activeNpc.wis)}</span></div>
                <div className="det-attr-box"><span className="lbl">CAR</span><span className="val">{activeNpc.cha || 10}</span><span className="mod">{calcMod(activeNpc.cha)}</span></div>
              </div>
              <div className="det-text-block mt-4">
                <p><strong>Resistências:</strong> <span>{activeNpc.res || "---"}</span></p>
                <p><strong>Imunidades:</strong> <span>{activeNpc.imm || "---"}</span></p>
              </div>
              <h4 className="det-section-title mt-4">⚔️ Ataque Principal</h4>
              <div style={{ padding: "12px", backgroundColor: "rgba(255, 60, 60, 0.05)", borderLeft: "3px solid var(--danger)", borderRadius: "4px", fontSize: "0.95rem" }}>
                {activeNpc.mainAttack || "---"}
              </div>
              
              <h4 className="det-section-title mt-4">📜 Outras Ações</h4>
              {activeNpc.actions ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeNpc.actions.split('\n').map((line: string, i: number) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    return (
                      <div key={i} style={{ padding: "10px", backgroundColor: "rgba(255,255,255,0.03)", borderLeft: "3px solid var(--accent-primary)", borderRadius: "4px", fontSize: "0.9rem", lineHeight: "1.5" }}>
                        {trimmed}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="det-text-body">---</div>
              )}
            </div>

            <div className={`det-tab-content ${activeTab === "tab-lore" ? "active" : ""}`}>
              <h4 className="det-section-title">Motivações</h4>
              <div className="det-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.mot || "---"}</div>
              <h4 className="det-section-title mt-4">Segredos & Fraquezas</h4>
              <div className="det-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.sec || "---"}</div>
              <h4 className="det-section-title mt-4">Traços</h4>
              <div className="det-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.traits || "---"}</div>
            </div>

            <div className={`det-tab-content ${activeTab === "tab-notes" ? "active" : ""}`}>
              <div className="form-row">
                <div className="flex-1">
                  <h4 className="det-section-title">Itens Visíveis</h4>
                  <div className="det-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.itemsVis || "---"}</div>
                </div>
                <div className="flex-1">
                  <h4 className="det-section-title">Itens Ocultos</h4>
                  <div className="det-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.itemsHid || "---"}</div>
                </div>
              </div>
              <h4 className="det-section-title mt-4">Notas do Mestre</h4>
              <div className="det-text-body highlight-text-body" style={{ whiteSpace: "pre-wrap" }}>{activeNpc.notes || "---"}</div>
            </div>
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
}
