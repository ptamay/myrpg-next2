"use client";

import React, { useEffect, useState, useRef } from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";

// --- MAIN QUEST MODALS ---

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MainQuestModal({ isOpen, onClose }: QuestModalProps) {
  const { diaAtual, jornadaPorDia, setJornadaPorDia, activeData, salvarEstadoLocal } = useAppContext();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [phases, setPhases] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && activeData?.data) {
      const data = activeData.data;
      if (formRef.current) {
        const form = formRef.current;
        (form.elements.namedItem("title") as HTMLInputElement).value = data.title || "";
        (form.elements.namedItem("notes") as HTMLTextAreaElement).value = data.notes || "";
      }
      setPhases(data.phases || []);
    } else if (isOpen) {
      setPhases([]);
    }
  }, [isOpen, activeData]);

  const handleAddPhase = () => {
    setPhases([...phases, { description: "", action: "", coefficient: "", npcRole: "", done: false }]);
  };

  const handlePhaseChange = (index: number, field: string, value: any) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const handleRemovePhase = (index: number) => {
    const newPhases = [...phases];
    newPhases.splice(index, 1);
    setPhases(newPhases);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current || !activeData) return;
    
    const form = formRef.current;
    const questData = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      day: activeData.data?.day || diaAtual,
      phases: phases,
    };

    const blocoIndex = activeData.blocoIndex;
    const newJornada = { ...jornadaPorDia };
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[blocoIndex] = { ...newJornada[diaAtual].blocos[blocoIndex] };
    newJornada[diaAtual].blocos[blocoIndex].plots = [...newJornada[diaAtual].blocos[blocoIndex].plots];
    const plots = newJornada[diaAtual].blocos[blocoIndex].plots;

    if (activeData.topicIndex !== undefined) {
      plots[activeData.topicIndex] = questData;
    } else {
      plots.push(questData);
    }

    setJornadaPorDia(newJornada);
    onClose();
  };

  const handleDelete = () => {
    if (!activeData || activeData.topicIndex === undefined) return;
    
    const blocoIndex = activeData.blocoIndex;
    const newJornada = { ...jornadaPorDia };
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[blocoIndex] = { ...newJornada[diaAtual].blocos[blocoIndex] };
    newJornada[diaAtual].blocos[blocoIndex].plots = [...newJornada[diaAtual].blocos[blocoIndex].plots];
    newJornada[diaAtual].blocos[blocoIndex].plots.splice(activeData.topicIndex, 1);

    setJornadaPorDia(newJornada);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="main-quest-modal">
      <div className="modal-content modal-xl glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Campanha</span>
            <h2 className="modal-title">Quest Principal</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <form ref={formRef} onSubmit={handleSave} className="modal-body custom-scrollbar">
          <div className="form-group">
            <label>Título da Quest</label>
            <input type="text" name="title" className="journey-input modern-input" placeholder="Ex: A Busca pelo Artefato Perdido" required />
          </div>
          <div className="form-group mt-3">
            <label>Notas de Resolução (Visão Geral)</label>
            <textarea name="notes" className="journey-input form-textarea" style={{ minHeight: "80px" }} placeholder="Detalhes sobre o andamento e conclusão desta etapa..."></textarea>
          </div>
          <h4 className="form-section-title mt-4">Fases da Quest</h4>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>Divida a quest em etapas menores para facilitar o acompanhamento.</p>
          <div className="phases-list">
            {phases.map((phase, i) => (
              <div key={i} className="phase-item" style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", position: "relative" }}>
                <button type="button" onClick={() => handleRemovePhase(i)} style={{ position: "absolute", top: "10px", right: "10px", background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}>✕</button>
                <div className="form-group">
                  <label>Descrição da Fase</label>
                  <input type="text" className="journey-input" value={phase.description} onChange={(e) => handlePhaseChange(i, "description", e.target.value)} />
                </div>
                <div className="form-row mt-2">
                  <div className="form-group flex-1">
                    <label>Ação Relacionada</label>
                    <input type="text" className="journey-input" value={phase.action} onChange={(e) => handlePhaseChange(i, "action", e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label>Coeficiente de Progresso</label>
                    <input type="text" className="journey-input" value={phase.coefficient} onChange={(e) => handlePhaseChange(i, "coefficient", e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label>Papel de NPCs/Facções</label>
                    <input type="text" className="journey-input" value={phase.npcRole} onChange={(e) => handlePhaseChange(i, "npcRole", e.target.value)} />
                  </div>
                </div>
                <div className="form-group mt-2" style={{ display: "flex", alignItems: "center" }}>
                  <label className="custom-checkbox-container">
                    <input type="checkbox" checked={phase.done} onChange={(e) => handlePhaseChange(i, "done", e.target.checked)} />
                    Marcar Fase como Concluída
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary-btn small-btn mt-3" style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }} onClick={handleAddPhase}>
            + Adicionar Nova Fase
          </button>
        </form>
        <footer className="modal-footer">
          {activeData?.topicIndex !== undefined && (
            <button type="button" className="btn danger-btn ghost-delete-btn" style={{ padding: "0.5rem 1rem" }} onClick={handleDelete}>Excluir Quest</button>
          )}
          <button type="submit" className="btn primary-btn" onClick={(e) => {
            const form = (e.target as HTMLElement).closest('.modal-content')?.querySelector('form');
            if (form) form.requestSubmit();
          }}>Salvar Quest</button>
        </footer>
      </div>
    </Modal>
  );
}

export function MainQuestDetailModal({ isOpen, onClose }: QuestModalProps) {
  const { activeData, setModals } = useAppContext();
  
  if (!activeData || !activeData.data) return null;
  const { title, notes, day, phases } = activeData.data;

  const handleEdit = () => {
    setModals((prev: any) => ({ ...prev, mainQuestDetail: false, mainQuest: true }));
  };

  const doneCnt = phases ? phases.filter((ph: any) => ph.done).length : 0;
  const total = phases ? phases.length : 0;
  const allDone = total > 0 && doneCnt === total;

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="main-quest-detail-modal">
      <div className="modal-content modal-xl glass-panel">
        <header className="modal-header" style={{ background: "hsla(0,0%,0%,0.3)" }}>
          <div className="modal-title-group">
            <span className="modal-subtitle">Campanha — Quest Principal</span>
            <h2 className="modal-title" style={{ fontSize: "1.5rem" }}>{title || 'Quest Sem Título'}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={handleEdit} className="btn primary-btn small-btn" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.4rem 0.9rem" }}>
              Editar Quest
            </button>
            <button className="close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>
        <div className="modal-body custom-scrollbar" style={{ gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span className="meta-tag" style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}>Criada no Dia {day || '?'}</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: allDone ? "var(--success)" : "var(--text-secondary)" }}>
              {allDone ? 'Concluída' : 'Em Andamento'}
            </span>
          </div>

          {notes && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-primary)", fontStyle: "italic", borderLeft: "3px solid var(--accent-primary)", paddingLeft: "1rem" }}>
                "{notes}"
              </p>
            </div>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Fases da Quest ({doneCnt}/{total})</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {phases && phases.length > 0 ? phases.map((ph: any, i: number) => (
                <div key={i} className="glass-panel" style={{ padding: "1.25rem", borderLeft: ph.done ? "4px solid var(--success)" : "4px solid var(--accent-primary)", background: ph.done ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h5 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: ph.done ? "var(--success)" : "#fff", textDecoration: ph.done ? "line-through" : "none" }}>{ph.description || `Fase ${i + 1}`}</h5>
                    {ph.done && <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--success)", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "12px" }}>CONCLUÍDO</span>}
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                    {ph.action && (
                      <div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Ação</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ph.action}</span>
                      </div>
                    )}
                    {ph.coefficient && (
                      <div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Coeficiente</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ph.coefficient}</span>
                      </div>
                    )}
                    {ph.npcRole && (
                      <div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>NPCs/Facções</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ph.npcRole}</span>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Nenhuma fase registrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// --- SIDE QUEST MODALS ---

export function SideQuestModal({ isOpen, onClose }: QuestModalProps) {
  const { diaAtual, jornadaPorDia, setJornadaPorDia, activeData, salvarEstadoLocal } = useAppContext();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && activeData?.data) {
      const data = activeData.data;
      if (formRef.current) {
        const form = formRef.current;
        (form.elements.namedItem("title") as HTMLInputElement).value = data.title || "";
        (form.elements.namedItem("desc") as HTMLTextAreaElement).value = data.desc || "";
        (form.elements.namedItem("npc") as HTMLInputElement).value = data.npc || "";
      }
      setTests(data.tests || []);
    } else if (isOpen) {
      setTests([]);
    }
  }, [isOpen, activeData]);

  const handleAddTest = () => {
    setTests([...tests, { description: "", done: false }]);
  };

  const handleTestChange = (index: number, field: string, value: any) => {
    const newTests = [...tests];
    newTests[index] = { ...newTests[index], [field]: value };
    setTests(newTests);
  };

  const handleRemoveTest = (index: number) => {
    const newTests = [...tests];
    newTests.splice(index, 1);
    setTests(newTests);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current || !activeData) return;
    
    const form = formRef.current;
    const questData = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      desc: (form.elements.namedItem("desc") as HTMLTextAreaElement).value,
      npc: (form.elements.namedItem("npc") as HTMLInputElement).value,
      day: activeData.data?.day || diaAtual,
      tests: tests,
    };

    const blocoIndex = activeData.blocoIndex;
    const newJornada = { ...jornadaPorDia };
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[blocoIndex] = { ...newJornada[diaAtual].blocos[blocoIndex] };
    newJornada[diaAtual].blocos[blocoIndex].sidequests = [...newJornada[diaAtual].blocos[blocoIndex].sidequests];
    const sidequests = newJornada[diaAtual].blocos[blocoIndex].sidequests;

    if (activeData.topicIndex !== undefined) {
      sidequests[activeData.topicIndex] = questData;
    } else {
      sidequests.push(questData);
    }

    setJornadaPorDia(newJornada);
    onClose();
  };

  const handleDelete = () => {
    if (!activeData || activeData.topicIndex === undefined) return;
    
    const blocoIndex = activeData.blocoIndex;
    const newJornada = { ...jornadaPorDia };
    newJornada[diaAtual] = { ...newJornada[diaAtual] };
    newJornada[diaAtual].blocos = [...newJornada[diaAtual].blocos];
    newJornada[diaAtual].blocos[blocoIndex] = { ...newJornada[diaAtual].blocos[blocoIndex] };
    newJornada[diaAtual].blocos[blocoIndex].sidequests = [...newJornada[diaAtual].blocos[blocoIndex].sidequests];
    newJornada[diaAtual].blocos[blocoIndex].sidequests.splice(activeData.topicIndex, 1);

    setJornadaPorDia(newJornada);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="side-quest-modal">
      <div className="modal-content modal-md glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Mundo Aberto</span>
            <h2 className="modal-title">Side Quest / Rumor</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <form ref={formRef} onSubmit={handleSave} className="modal-body custom-scrollbar">
          <div className="form-group">
            <label>Título ou Rumor</label>
            <input type="text" name="title" className="journey-input modern-input" placeholder="Ex: A Fera dos Bosques" required />
          </div>
          <div className="form-group mt-3">
            <label>Descrição do Problema</label>
            <textarea name="desc" className="journey-input form-textarea" style={{ minHeight: "80px" }}></textarea>
          </div>
          <div className="form-group mt-3">
            <label>Recompensa / Desfecho Prometido (ou NPC vinculado)</label>
            <input type="text" name="npc" className="journey-input modern-input" placeholder="Ex: 50 PO e a gratidão da vila" />
          </div>
          
          <h4 className="form-section-title mt-4">Testes Relacionados</h4>
          <div className="phases-list">
            {tests.map((test, i) => (
              <div key={i} className="phase-item" style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", position: "relative" }}>
                <button type="button" onClick={() => handleRemoveTest(i)} style={{ position: "absolute", top: "10px", right: "10px", background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}>✕</button>
                <div className="form-group">
                  <label>Descrição do Teste (ex: Rastrear pegadas CD 15)</label>
                  <input type="text" className="journey-input" value={test.description} onChange={(e) => handleTestChange(i, "description", e.target.value)} />
                </div>
                <div className="form-group mt-2" style={{ display: "flex", alignItems: "center" }}>
                  <label className="custom-checkbox-container">
                    <input type="checkbox" checked={test.done} onChange={(e) => handleTestChange(i, "done", e.target.checked)} />
                    Marcar como Concluído
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary-btn small-btn mt-3" style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }} onClick={handleAddTest}>
            + Adicionar Novo Teste
          </button>
        </form>
        <footer className="modal-footer">
          {activeData?.topicIndex !== undefined && (
             <button type="button" className="btn danger-btn ghost-delete-btn" style={{ padding: "0.5rem 1rem" }} onClick={handleDelete}>Excluir Missão</button>
          )}
          <button type="submit" className="btn primary-btn" onClick={(e) => {
            const form = (e.target as HTMLElement).closest('.modal-content')?.querySelector('form');
            if (form) form.requestSubmit();
          }}>Salvar Missão</button>
        </footer>
      </div>
    </Modal>
  );
}

export function SideQuestDetailModal({ isOpen, onClose }: QuestModalProps) {
  const { activeData, setModals } = useAppContext();
  
  if (!activeData || !activeData.data) return null;
  const { title, desc, npc, day, tests } = activeData.data;

  const handleEdit = () => {
    setModals((prev: any) => ({ ...prev, sideQuestDetail: false, sideQuest: true }));
  };

  const doneCnt = tests ? tests.filter((t: any) => t.done).length : 0;
  const total = tests ? tests.length : 0;
  const allDone = total > 0 && doneCnt === total;

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="side-quest-detail-modal">
      <div className="modal-content modal-md glass-panel">
        <header className="modal-header" style={{ background: "hsla(0,0%,0%,0.3)" }}>
          <div className="modal-title-group">
            <span className="modal-subtitle">Mundo Aberto — Side Quest</span>
            <h2 className="modal-title" style={{ fontSize: "1.4rem" }}>{title || 'Side Quest Sem Título'}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={handleEdit} className="btn primary-btn small-btn" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.4rem 0.9rem" }}>
              Editar Missão
            </button>
            <button className="close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>
        <div className="modal-body custom-scrollbar" style={{ gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <span className="meta-tag" style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}>Dia {day || '?'}</span>
            {npc && (
              <span style={{ fontSize: "0.8rem", color: "var(--accent-secondary)", fontWeight: 700 }}>NPC/Recompensa: {npc}</span>
            )}
          </div>

          {desc && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-primary)", fontStyle: "italic", borderLeft: "3px solid var(--warning)", paddingLeft: "1rem" }}>
                "{desc}"
              </p>
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Testes Relacionados ({doneCnt}/{total})</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tests && tests.length > 0 ? tests.map((t: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px", border: t.done ? "1px solid var(--success)" : "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ marginTop: "2px" }}>
                    {t.done ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    )}
                  </div>
                  <span style={{ fontSize: "0.9rem", color: t.done ? "var(--text-secondary)" : "#fff", textDecoration: t.done ? "line-through" : "none", lineHeight: 1.4 }}>
                    {t.description || `Teste ${i + 1}`}
                  </span>
                </div>
              )) : (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Nenhum teste registrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
