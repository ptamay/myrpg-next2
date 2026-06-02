"use client";

import React from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useState } from "react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NpcImportTextModal({ isOpen, onClose }: ImportModalProps) {
  const { showAlert } = useSystemDialog();
  const { activeData, setActiveData, setModals } = useAppContext();
  const [text, setText] = useState("");
  const templateStr = `Nome: \nTítulo/Ocupação: \nFacção (ally/neutral/enemy): \nRaça: \nAlinhamento: \nND: \nPV Máx: \nCA: \nDeslocamento: \nIniciativa: \nPercepção: \nFOR: 10\nDES: 10\nCON: 10\nINT: 10\nSAB: 10\nCAR: 10\nAtaque Principal: \nResistências: \nImunidades: \nAções (Livre): \nMotivações: \nSegredos: \nTraços: \nItens Visíveis: \nItens Ocultos: \nNotas Extras: \nMagias Diárias: 1º[0] 2º[0] 3º[0] 4º[0] 5º[0] 6º[0] 7º[0] 8º[0] 9º[0]`;

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateStr);
      showAlert({ title: "Copiado", message: "Template copiado para a área de transferência.", type: "success" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcess = () => {
    try {
      const lines = text.split("\n");
      const data: any = {};
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        let key = "";
        let value = "";
        
        if (trimmed.includes(":")) {
          const parts = trimmed.split(":");
          key = parts[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
          value = parts.slice(1).join(":").trim();
        } else {
          const lowerLine = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const knownKeys = [
            "titulo ou ocupacao", "itens visiveis", "itens ocultos", "ataque principal", "pv max",
            "nome", "titulo", "ocupacao", "faccao", "raca", "alinhamento", "nd", "cr", "pv", "hp", "ca", "ac",
            "deslocamento", "speed", "iniciativa", "init", "percepcao", "perc",
            "for", "str", "des", "dex", "con", "int", "sab", "wis", "car", "cha",
            "ataque", "resistencias", "resistencia", "imunidades", "imunidade",
            "acoes", "acao", "motivacoes", "motivacao", "segredos", "segredo",
            "tracos", "traco", "visiveis", "visivel", "ocultos", "oculto", "escondidos",
            "notas", "extras", "magias"
          ];
          const foundKey = knownKeys.find(k => lowerLine.startsWith(k + " ") || lowerLine === k);
          if (foundKey) {
            key = foundKey;
            const wordsInKey = foundKey.split(" ").length;
            value = trimmed.split(" ").slice(wordsInKey).join(" ");
          } else {
            return;
          }
        }
        
        if (key === "nome") data.name = value;
        if (key.includes("titulo") || key.includes("ocupacao")) data.title = value;
        if (key.includes("faccao")) {
           const lVal = value.toLowerCase();
           if(lVal.includes('ally') || lVal.includes('aliado')) data.faction = 'ally';
           else if(lVal.includes('enemy') || lVal.includes('inimigo')) data.faction = 'enemy';
           else data.faction = 'neutral';
        }
        if (key === "raca") data.race = value;
        if (key === "alinhamento") data.alignment = value;
        if (key === "nd" || key === "cr") data.cr = value;
        if (key.includes("pv") || key.includes("hp")) data.hpMax = parseInt(value) || 0;
        if (key === "ca" || key === "ac") data.ac = value;
        if (key === "deslocamento" || key === "speed") data.speed = value;
        if (key === "iniciativa" || key === "init") data.init = value;
        if (key === "percepcao" || key === "perc") data.perc = value;
        if (key === "for" || key === "str") data.str = parseInt(value) || 10;
        if (key === "des" || key === "dex") data.dex = parseInt(value) || 10;
        if (key === "con") data.con = parseInt(value) || 10;
        if (key === "int") data.int = parseInt(value) || 10;
        if (key === "sab" || key === "wis") data.wis = parseInt(value) || 10;
        if (key === "car" || key === "cha") data.cha = parseInt(value) || 10;
        if (key === "ataque principal" || key.includes("ataque")) data.mainAttack = value;
        if (key === "resistencias" || key.includes("resistencia")) data.res = value;
        if (key === "imunidades" || key.includes("imunidade")) data.imm = value;
        if (key.includes("acoes") || key.includes("acao")) data.actions = value;
        if (key === "motivacoes" || key === "motivacao") data.mot = value;
        if (key === "segredos" || key === "segredo") data.sec = value;
        if (key === "tracos" || key === "traco") data.traits = value;
        if (key.includes("visiveis") || key.includes("visivel")) data.itemsVis = value;
        if (key.includes("ocultos") || key.includes("oculto") || key.includes("escondidos")) data.itemsHid = value;
        if (key.includes("notas") || key.includes("extras")) data.notes = value;
        if (key.includes("magias")) {
          data.hasSpells = true;
          data.spellSlots = {};
          const slots = value.split(" ");
          slots.forEach(slot => {
            const match = slot.match(/(\d+)º\[(\d+)\]/);
            if (match) {
               data.spellSlots[parseInt(match[1])] = parseInt(match[2]);
            }
          });
        }
      });
      const event = new CustomEvent('npcImported', { 
        detail: { 
          data, 
          target: activeData?.importTarget || 'original'
        } 
      });
      window.dispatchEvent(event);
      onClose();
      setModals((prev: any) => ({ ...prev, npcForm: true }));
      showAlert({ title: "Sucesso", message: "Ficha pré-preenchida com sucesso!", type: "success" });
    } catch (e) {
      showAlert({ title: "Erro", message: "Não foi possível processar o texto.", type: "danger" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="npc-import-text-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: "600px" }}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Automação</span>
            <h2 className="modal-title">Colar Estrutura de Texto</h2>
          </div>
          <button className="btn secondary-btn small-btn" onClick={handleCopyTemplate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar Template
          </button>
        </header>
        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Cole a estrutura de texto do NPC abaixo para preencher os campos automaticamente.
          </p>
          <textarea 
            className="journey-input form-textarea" 
            style={{ minHeight: "300px", fontSize: "0.85rem" }} 
            placeholder="Cole aqui a ficha do NPC..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
        </div>
        <footer className="modal-footer">
          <button className="btn danger-btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary-btn" onClick={handleProcess}>Processar e Preencher</button>
        </footer>
      </div>
    </Modal>
  );
}

export function NpcImportOptionsModal({ isOpen, onClose }: ImportModalProps) {
  const { dadosGlobais, setDadosGlobais, activeData, salvarEstadoLocal } = useAppContext();
  
  const importedNpcs = activeData?.importedNpcs || [];
  const count = importedNpcs.length;

  const handleMerge = () => {
    if (count === 0) return;
    const currentNpcs = [...(dadosGlobais.npcs || [])];
    
    // Mescla usando ID ou Nome como chave
    importedNpcs.forEach((newNpc: any) => {
      const idx = currentNpcs.findIndex(n => n.id === newNpc.id || n.name === newNpc.name);
      if (idx !== -1) {
        currentNpcs[idx] = { ...currentNpcs[idx], ...newNpc };
      } else {
        currentNpcs.push(newNpc);
      }
    });

    setDadosGlobais({ ...dadosGlobais, npcs: currentNpcs });
    setTimeout(salvarEstadoLocal, 100);
    onClose();
  };

  const handleReplace = () => {
    if (count === 0) return;
    setDadosGlobais({ ...dadosGlobais, npcs: importedNpcs });
    setTimeout(salvarEstadoLocal, 100);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="npc-import-options-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: "500px" }}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Importador de Elenco</span>
            <h2 className="modal-title">Como importar os NPCs?</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Identificamos <strong style={{ color: "var(--accent-primary)" }}>{count}</strong> NPCs no arquivo selecionado. Como deseja prosseguir com a importação?
          </p>
          <div className="import-options-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button className="btn secondary-btn" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "1.25rem", gap: "4px", borderLeft: "4px solid var(--success)", width: "100%" }} onClick={handleMerge}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-success"><path d="M12 5v14M5 12h14"/></svg>
                Mesclar com o Elenco Atual
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                Adiciona novos NPCs e atualiza os já existentes (mesmo ID ou Nome). Nenhum NPC atual será excluído.
              </div>
            </button>
            <button className="btn danger-btn" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "1.25rem", gap: "4px", borderLeft: "4px solid var(--danger)", width: "100%" }} onClick={handleReplace}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>
                Substituir Elenco Atual
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>
                Apaga permanentemente todos os NPCs cadastrados atualmente e instala os novos NPCs do arquivo.
              </div>
            </button>
          </div>
        </div>
        <footer className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn secondary-btn" style={{ padding: "0.6rem 1.2rem" }} onClick={onClose}>Cancelar</button>
        </footer>
      </div>
    </Modal>
  );
}
