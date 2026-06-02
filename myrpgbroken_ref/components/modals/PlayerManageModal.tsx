"use client";

import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";

interface PlayerManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: any;
}

export default function PlayerManageModal({ isOpen, onClose, player }: PlayerManageModalProps) {
  const { diaAtual, jornadaPorDia, setJornadaPorDia, activeData, salvarEstadoLocal } = useAppContext();
  
  const [acoes, setAcoes] = useState<string[]>([]);
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (isOpen && player && activeData) {
      const blocoIndex = activeData.blocoIndex;
      const session = jornadaPorDia[diaAtual]?.blocos?.[blocoIndex]?.playerSessions?.[player.id];
      
      setAcoes(session?.acoes || []);
      setObjetivos(session?.objetivos || []);
      setConcluido(session?.concluido || false);
    } else if (isOpen) {
      setAcoes([]);
      setObjetivos([]);
      setConcluido(false);
    }
  }, [isOpen, player, activeData, diaAtual, jornadaPorDia]);

  const handleAddAcao = () => {
    setAcoes([...acoes, ""]);
  };

  const handleAcaoChange = (index: number, value: string) => {
    const newAcoes = [...acoes];
    newAcoes[index] = value;
    setAcoes(newAcoes);
  };

  const handleRemoveAcao = (index: number) => {
    const newAcoes = [...acoes];
    newAcoes.splice(index, 1);
    setAcoes(newAcoes);
  };

  const handleAddObjetivo = () => {
    setObjetivos([...objetivos, ""]);
  };

  const handleObjetivoChange = (index: number, value: string) => {
    const newObj = [...objetivos];
    newObj[index] = value;
    setObjetivos(newObj);
  };

  const handleRemoveObjetivo = (index: number) => {
    const newObj = [...objetivos];
    newObj.splice(index, 1);
    setObjetivos(newObj);
  };

  const handleSave = () => {
    if (!player || !activeData) return;
    
    const blocoIndex = activeData.blocoIndex;
    const newJornada = { ...jornadaPorDia };
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[blocoIndex] = { ...newJornada[diaAtual].blocos[blocoIndex] };
    const blocos = newJornada[diaAtual].blocos;
    
    if (!blocos[blocoIndex].playerSessions) {
      blocos[blocoIndex].playerSessions = {};
    } else {
      blocos[blocoIndex].playerSessions = { ...blocos[blocoIndex].playerSessions };
    }

    // Filtra strings vazias
    const filteredAcoes = acoes.filter(a => a.trim() !== "");
    const filteredObjetivos = objetivos.filter(o => o.trim() !== "");

    blocos[blocoIndex].playerSessions[player.id] = {
      acoes: filteredAcoes,
      objetivos: filteredObjetivos,
      concluido: concluido
    };

    setJornadaPorDia(newJornada);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="player-manage-modal">
      {player && (
      <div className="modal-content modal-md glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Gerenciamento de Personagem</span>
            <h2 className="modal-title" id="player-modal-name">{player.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="modal-body custom-scrollbar">
          <div className="player-modal-sections">
            <section className="player-modal-section">
              <div className="section-header-row">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h4>Ações Significativas</h4>
                </div>
                <button className="btn primary-btn small-btn" onClick={handleAddAcao}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Adicionar
                </button>
              </div>
              <div className="player-topic-list">
                {acoes.map((acao, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input type="text" className="journey-input" value={acao} onChange={(e) => handleAcaoChange(i, e.target.value)} placeholder="Descreva a ação..." />
                    <button className="btn danger-btn small-btn" onClick={() => handleRemoveAcao(i)}>✕</button>
                  </div>
                ))}
                {acoes.length === 0 && <p className="text-muted" style={{ fontSize: "0.8rem" }}>Nenhuma ação registrada neste bloco.</p>}
              </div>
            </section>

            <section className="player-modal-section mt-4">
              <div className="section-header-row">
                <h4>Objetivos e Pistas</h4>
                <button className="btn primary-btn small-btn" onClick={handleAddObjetivo}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Adicionar
                </button>
              </div>
              <div className="player-topic-list">
                {objetivos.map((obj, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input type="text" className="journey-input" value={obj} onChange={(e) => handleObjetivoChange(i, e.target.value)} placeholder="Descreva o objetivo ou pista..." />
                    <button className="btn danger-btn small-btn" onClick={() => handleRemoveObjetivo(i)}>✕</button>
                  </div>
                ))}
                {objetivos.length === 0 && <p className="text-muted" style={{ fontSize: "0.8rem" }}>Nenhum objetivo registrado neste bloco.</p>}
              </div>
            </section>
          </div>
        </div>
        <footer className="modal-footer">
          <div className="modal-footer-status">
            <label className="custom-checkbox">
              <input type="checkbox" checked={concluido} onChange={(e) => setConcluido(e.target.checked)} />
              <div className="checkmark"></div>
              <span>Marcar como Resolvido</span>
            </label>
          </div>
          <button className="btn primary-btn" onClick={handleSave}>Salvar Alterações</button>
        </footer>
      </div>
      )}
    </Modal>
  );
}
