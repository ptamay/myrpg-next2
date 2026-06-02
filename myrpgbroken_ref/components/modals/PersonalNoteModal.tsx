"use client";

import React, { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";

interface PersonalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNoteStyle = (type: string) => {
  let noteBg = "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)";
  let noteBorder = "rgba(251, 191, 36, 0.4)";
  let noteAccent = "#fcd34d";
  let noteIcon = "📌";

  switch(type) {
    case 'importante':
      noteBg = "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%)";
      noteBorder = "rgba(239, 68, 68, 0.4)";
      noteAccent = "#fca5a5";
      noteIcon = "❗";
      break;
    case 'pista':
      noteBg = "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 58, 138, 0.05) 100%)";
      noteBorder = "rgba(59, 130, 246, 0.4)";
      noteAccent = "#93c5fd";
      noteIcon = "🔍";
      break;
    case 'npc':
      noteBg = "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(88, 28, 135, 0.05) 100%)";
      noteBorder = "rgba(168, 85, 247, 0.4)";
      noteAccent = "#d8b4fe";
      noteIcon = "👤";
      break;
    case 'missao':
      noteBg = "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(133, 77, 14, 0.05) 100%)";
      noteBorder = "rgba(234, 179, 8, 0.4)";
      noteAccent = "#fde047";
      noteIcon = "⭐";
      break;
  }
  return { noteBg, noteBorder, noteAccent, noteIcon };
};

export default function PersonalNoteModal({ isOpen, onClose }: PersonalNoteModalProps) {
  const { diaAtual, indiceBlocoAtivo, jornadaPorDia, setJornadaPorDia, activeData, salvarEstadoLocal } = useAppContext();
  const { session } = useUserSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedType, setSelectedType] = useState("padrao");

  useEffect(() => {
    if (isOpen && formRef.current && activeData?.data) {
      const form = formRef.current;
      const data = activeData.data;
      (form.elements.namedItem("title") as HTMLInputElement).value = data.title || "";
      (form.elements.namedItem("desc") as HTMLTextAreaElement).value = data.desc || "";
      if (form.elements.namedItem("type")) {
        const t = data.type || "padrao";
        (form.elements.namedItem("type") as HTMLSelectElement).value = t;
        setSelectedType(t);
      }
    } else if (isOpen && formRef.current && !activeData?.data) {
      const form = formRef.current;
      (form.elements.namedItem("title") as HTMLInputElement).value = "";
      (form.elements.namedItem("desc") as HTMLTextAreaElement).value = "";
      if (form.elements.namedItem("type")) {
        (form.elements.namedItem("type") as HTMLSelectElement).value = "padrao";
      }
      setSelectedType("padrao");
    }
  }, [isOpen, activeData]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current || !session?.id) return;
    
    const form = formRef.current;
    const noteData = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      desc: (form.elements.namedItem("desc") as HTMLTextAreaElement).value,
      type: (form.elements.namedItem("type") as HTMLSelectElement).value,
      date: new Date().toISOString()
    };

    const newJornada = { ...jornadaPorDia };
    if (!newJornada[diaAtual]) return;
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[indiceBlocoAtivo] = { ...newJornada[diaAtual].blocos[indiceBlocoAtivo] };
    const bData = newJornada[diaAtual].blocos[indiceBlocoAtivo];
    
    if (!bData.playerSessions) bData.playerSessions = {};
    else bData.playerSessions = { ...bData.playerSessions };

    if (!bData.playerSessions[session.id]) {
      bData.playerSessions[session.id] = { acoes: [], objetivos: [], concluido: false, notes: [] };
    } else {
      bData.playerSessions[session.id] = { ...bData.playerSessions[session.id] };
    }
    
    let notes = bData.playerSessions[session.id].notes || [];
    notes = [...notes];

    if (activeData && activeData.topicIndex !== undefined) {
      notes[activeData.topicIndex] = { ...notes[activeData.topicIndex], ...noteData };
    } else {
      notes.push({ id: Date.now(), ...noteData });
    }
    
    bData.playerSessions[session.id].notes = notes;
    setJornadaPorDia(newJornada);
    onClose();
  };

  const handleDelete = () => {
    if (!activeData || activeData.topicIndex === undefined || !session?.id) return;
    
    const newJornada = { ...jornadaPorDia };
    if (!newJornada[diaAtual]) return;
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[indiceBlocoAtivo] = { ...newJornada[diaAtual].blocos[indiceBlocoAtivo] };
    const bData = newJornada[diaAtual].blocos[indiceBlocoAtivo];
    
    if (bData.playerSessions && bData.playerSessions[session.id]) {
      bData.playerSessions = { ...bData.playerSessions };
      bData.playerSessions[session.id] = { ...bData.playerSessions[session.id] };
      if (bData.playerSessions[session.id].notes) {
        bData.playerSessions[session.id].notes = [...bData.playerSessions[session.id].notes];
        bData.playerSessions[session.id].notes.splice(activeData.topicIndex, 1);
      }
    }

    setJornadaPorDia(newJornada);
    onClose();
  };

  const { noteBg, noteBorder, noteAccent, noteIcon } = getNoteStyle(selectedType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="personal-note-modal">
      <div className="modal-content modal-md post-it-modal" style={{
        background: noteBg,
        border: `1px solid ${noteBorder}`,
        borderTop: `4px solid ${noteBorder}`,
        borderRadius: "2px 8px 8px 8px",
        boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        position: "relative",
        padding: "1.5rem"
      }}>
        {/* Tape effect at the top */}
        <div style={{
          position: "absolute",
          top: "-8px",
          left: "50%",
          marginLeft: "-40px",
          width: "80px",
          height: "20px",
          background: "rgba(255, 255, 255, 0.15)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 0 2px rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(4px)",
          borderRadius: "2px"
        }}></div>

        <header className="modal-header" style={{ padding: 0, marginBottom: "1.5rem", borderBottom: `1px solid ${noteBorder}`, paddingBottom: "1rem" }}>
          <div className="modal-title-group" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.8rem", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{noteIcon}</span>
            <div>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: noteAccent, opacity: 0.8, letterSpacing: "0.05em" }}>Anotação Pessoal</span>
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "white", fontWeight: 800 }}>{activeData?.data ? "Editar Anotação" : "Nova Anotação"}</h2>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} style={{ color: "white", background: "rgba(0,0,0,0.2)", borderRadius: "50%", padding: "4px" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="modal-body custom-scrollbar" style={{ padding: 0 }}>
          <div style={{ background: "rgba(0, 0, 0, 0.2)", padding: "0.75rem", borderRadius: "8px", borderLeft: `3px solid ${noteAccent}`, marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
              <strong>Atenção:</strong> As anotações salvas aqui ficarão registradas também no seu <strong>Diário de Bordo</strong> (aba Crônicas) para consultas futuras.
            </p>
          </div>
          <form ref={formRef} onSubmit={handleSave}>
            <div className="form-group">
              <label style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Título / Assunto</label>
              <input type="text" name="title" className="journey-input modern-input" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${noteBorder}`, color: "white" }} placeholder="Ex: A chave de prata" required />
            </div>
            <div className="form-group mt-3">
              <label style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Tipo de Anotação</label>
              <select name="type" className="journey-input modern-input" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${noteBorder}`, color: "white" }} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="padrao" style={{ background: "#1f1f1f" }}>Padrão / Nota</option>
                <option value="importante" style={{ background: "#1f1f1f" }}>Importante</option>
                <option value="pista" style={{ background: "#1f1f1f" }}>Pista / Investigação</option>
                <option value="npc" style={{ background: "#1f1f1f" }}>NPC / Personagem</option>
                <option value="missao" style={{ background: "#1f1f1f" }}>Missão / Objetivo</option>
              </select>
            </div>
            <div className="form-group mt-3">
              <label style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Conteúdo da Anotação</label>
              <textarea name="desc" className="journey-input form-textarea" style={{ 
                minHeight: "200px", 
                background: "rgba(0,0,0,0.2)", 
                border: `1px solid ${noteBorder}`, 
                color: "white",
                fontFamily: "'Indie Flower', 'Caveat', 'Comic Sans MS', cursive, sans-serif",
                fontSize: "1.1rem",
                lineHeight: 1.6,
                letterSpacing: "0.02em",
                padding: "1rem"
              }} placeholder="Escreva o que quiser lembrar..."></textarea>
            </div>
          </form>
        </div>
        <footer className="modal-footer" style={{ padding: "1.5rem 0 0 0", marginTop: "1rem", borderTop: `1px solid ${noteBorder}`, display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button type="submit" className="btn primary-btn" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${noteAccent}`, color: noteAccent, fontWeight: 800 }} onClick={(e) => {
            const form = (e.target as HTMLElement).closest('.modal-content')?.querySelector('form');
            if (form) form.requestSubmit();
          }}>Salvar Anotação</button>
        </footer>
      </div>
    </Modal>
  );
}

export function PersonalNoteDetailModal({ isOpen, onClose }: PersonalNoteModalProps) {
  const { activeData, setModals, diaAtual, indiceBlocoAtivo, jornadaPorDia, setJornadaPorDia } = useAppContext();
  const { session } = useUserSession();
  
  if (!activeData || !activeData.data) return null;
  const { title, desc, type } = activeData.data;

  const handleEdit = () => {
    setModals((prev: any) => ({ ...prev, personalNoteDetail: false, personalNote: true }));
  };

  const handleDelete = () => {
    if (!activeData || activeData.topicIndex === undefined || !session?.id) return;
    
    const newJornada = { ...jornadaPorDia };
    if (!newJornada[diaAtual]) return;
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[indiceBlocoAtivo] = { ...newJornada[diaAtual].blocos[indiceBlocoAtivo] };
    const bData = newJornada[diaAtual].blocos[indiceBlocoAtivo];
    
    if (bData.playerSessions && bData.playerSessions[session.id]) {
      bData.playerSessions = { ...bData.playerSessions };
      bData.playerSessions[session.id] = { ...bData.playerSessions[session.id] };
      if (bData.playerSessions[session.id].notes) {
        bData.playerSessions[session.id].notes = [...bData.playerSessions[session.id].notes];
        bData.playerSessions[session.id].notes.splice(activeData.topicIndex, 1);
      }
    }

    setJornadaPorDia(newJornada);
    onClose();
  };

  const { noteBg, noteBorder, noteAccent, noteIcon } = getNoteStyle(type || "padrao");

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="personal-note-detail-modal">
      <div className="modal-content modal-md post-it-modal" style={{
        background: noteBg,
        border: `1px solid ${noteBorder}`,
        borderTop: `4px solid ${noteBorder}`,
        borderRadius: "2px 8px 8px 8px",
        boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        position: "relative",
        padding: "2rem"
      }}>
        {/* Tape effect at the top */}
        <div style={{
          position: "absolute",
          top: "-8px",
          left: "50%",
          marginLeft: "-40px",
          width: "80px",
          height: "20px",
          background: "rgba(255, 255, 255, 0.15)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 0 2px rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(4px)",
          borderRadius: "2px"
        }}></div>

        <header className="modal-header" style={{ padding: 0, marginBottom: "1.5rem", borderBottom: `1px solid ${noteBorder}`, paddingBottom: "1.5rem" }}>
          <div className="modal-title-group" style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <span style={{ fontSize: "2.5rem", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{noteIcon}</span>
            <div>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: noteAccent, opacity: 0.8, letterSpacing: "0.05em" }}>Anotação Pessoal</span>
              <h2 style={{ margin: 0, fontSize: "1.8rem", color: "white", fontWeight: 800, lineHeight: 1.2 }}>{title || 'Sem Título'}</h2>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={handleEdit} className="btn primary-btn small-btn" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${noteAccent}`, color: noteAccent, display: "flex", alignItems: "center", gap: "6px", padding: "0.4rem 0.9rem", fontWeight: 700 }}>
              Editar
            </button>
            <button onClick={handleDelete} className="btn danger-btn small-btn" style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", display: "flex", alignItems: "center", gap: "6px", padding: "0.4rem 0.9rem", fontWeight: 700 }}>
              Excluir
            </button>
            <button className="close-btn" onClick={onClose} style={{ color: "white", background: "rgba(0,0,0,0.2)", borderRadius: "50%", padding: "4px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>
        <div className="modal-body custom-scrollbar" style={{ padding: 0 }}>
          {desc ? (
            <div style={{ minHeight: "150px" }}>
              <p style={{ 
                margin: 0,
                fontSize: "1.2rem", 
                lineHeight: 1.7, 
                color: "rgba(255,255,255,0.9)", 
                whiteSpace: "pre-wrap",
                fontFamily: "'Indie Flower', 'Caveat', 'Comic Sans MS', cursive, sans-serif",
                letterSpacing: "0.02em"
              }}>
                {desc}
              </p>
            </div>
          ) : (
            <div style={{ minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
              <p style={{ fontStyle: "italic", fontSize: "1.1rem" }}>Nenhum conteúdo escrito.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
