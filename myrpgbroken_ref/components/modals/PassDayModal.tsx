"use client";

import React from "react";
import Modal from "../ui/Modal";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { getInitialJornada } from "@/lib/dataHelpers";
import { createClient } from "@/lib/supabase/client";

interface PassDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PassDayModal({ isOpen, onClose }: PassDayModalProps) {
  const { diaAtual, setDiaAtual, setIndiceBlocoAtivo, dadosGlobais, setDadosGlobais, jornadaPorDia, setJornadaPorDia, salvarEstadoLocal } = useAppContext();
  const { showAlert } = useSystemDialog();
  
  const activePeople = dadosGlobais.food?.people || 0;
  const rate = dadosGlobais.food?.consumptionRate || 1;
  const waterCost = activePeople * rate;
  const foodCost = activePeople * rate;

  const exhaustionWarnings = (dadosGlobais.players || []).filter((p: any) => {
    const minSleep = p.minSleepReq || 8;
    const sleepHours = p.sleepHoursToday || 0;
    return sleepHours < minSleep / 2;
  });

  const handleConfirm = async () => {
    // Check sleep and apply exhaustion
    let sleepAlerts: string[] = [];
    const newPlayers = [...(dadosGlobais.players || [])].map((p: any) => {
      const minSleep = p.minSleepReq || 8;
      const sleepHours = p.sleepHoursToday || 0;
      
      let newExhaustion = p.exhaustionLevel || 0;
      if (sleepHours < minSleep / 2) {
        newExhaustion = Math.min(6, newExhaustion + 1);
        sleepAlerts.push(`${p.name} não dormiu o suficiente (${sleepHours}h). Exaustão nível ${newExhaustion} aplicada.`);
      }

      return {
        ...p,
        exhaustionLevel: newExhaustion,
        sleepHoursToday: 0 // Reset for the next day
      };
    });

    if (sleepAlerts.length > 0) {
      await showAlert({ title: "Avisos de Exaustão", message: sleepAlerts.join("\n"), type: "warning" });
    }

    // Debitar suprimentos
    const newFood = {
      ...dadosGlobais.food,
      water: Math.max(0, dadosGlobais.food.water - waterCost),
      food: Math.max(0, dadosGlobais.food.food - foodCost)
    };
    setDadosGlobais({ ...dadosGlobais, food: newFood, players: newPlayers });

    // Avançar dia
    const nextDay = diaAtual + 1;
    setDiaAtual(nextDay);
    setIndiceBlocoAtivo(0);

    // Garantir que a jornada existe para o novo dia
    const lastBlockWeather = jornadaPorDia[diaAtual]?.blocos?.[5]?.weatherEffect || "clear";

    setJornadaPorDia((prev) => {
      const updated = { ...prev };
      if (!updated[nextDay]) {
        const initial = getInitialJornada();
        updated[nextDay] = initial[1]; // Usa o dia 1 como template
      }
      
      // Propagar o clima do dia anterior para todos os blocos do novo dia
      if (updated[nextDay] && updated[nextDay].blocos) {
        updated[nextDay].blocos.forEach((b: any) => {
          b.weatherEffect = lastBlockWeather;
        });
      }
      return updated;
    });

    const supabase = createClient();
    supabase.channel('game-sync').send({
      type: 'broadcast',
      event: 'day_passed',
      payload: { newDay: nextDay }
    });

    setTimeout(salvarEstadoLocal, 100);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="pass-day-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: "450px" }}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Jornada</span>
            <h2 className="modal-title">Passar o Dia</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="modal-body text-center" style={{ padding: "2rem 1.5rem" }}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="var(--warning)" strokeWidth="1.5" style={{ marginBottom: "1rem" }}>
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h3 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>
            Avançar para o Dia <span>{diaAtual + 1}</span>?
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Esta ação irá consumir suprimentos com base na quantidade de pessoas da tripulação e avançar o tempo.
          </p>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", textAlign: "left", borderLeft: "3px solid var(--warning)" }}>
            <p style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
              <strong>Consumo de Água:</strong> <span className="text-danger">{waterCost}</span>
            </p>
            <p style={{ marginBottom: 0, display: "flex", justifyContent: "space-between" }}>
              <strong>Consumo de Comida:</strong> <span className="text-danger">{foodCost}</span>
            </p>
          </div>
          {exhaustionWarnings.length > 0 && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", padding: "1rem", borderRadius: "8px", textAlign: "left", borderLeft: "3px solid #ef4444", marginTop: "1rem" }}>
              <h4 style={{ color: "#ef4444", margin: "0 0 0.5rem 0", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Risco de Exaustão
              </h4>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#fca5a5" }}>
                {exhaustionWarnings.map((p: any) => (
                  <li key={p.id}>{p.name} (Dormiu apenas {p.sleepHoursToday || 0}h)</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <footer className="modal-footer" style={{ justifyContent: "center", gap: "1rem" }}>
          <button className="btn secondary-btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary-btn" style={{ background: "var(--warning)", color: "#000" }} onClick={handleConfirm}>
            Confirmar e Avançar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
