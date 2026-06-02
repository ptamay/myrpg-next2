"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { motion, AnimatePresence } from "framer-motion";

export default function FoodView() {
  const { dadosGlobais, setDadosGlobais, salvarEstadoLocal } = useAppContext();
  const { isGM } = useUserSession();
  const { showConfirm } = useSystemDialog();
  const [activeTab, setActiveTab] = useState("food-panel");

  const [adjustType, setAdjustType] = useState<"water"|"food"|"both">("water");
  const [adjustOperation, setAdjustOperation] = useState<"add"|"sub">("add");
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");

  const [manualWater, setManualWater] = useState<number | "">(dadosGlobais.food?.water || 0);
  const [manualFood, setManualFood] = useState<number | "">(dadosGlobais.food?.food || 0);

  const [peopleAmount, setPeopleAmount] = useState(dadosGlobais.food?.people || 0);
  const [consumptionRate, setConsumptionRate] = useState<number>(dadosGlobais.food?.consumptionRate || 1);

  const handleAdjustConfirm = () => {
    if (!adjustAmount) return;
    const amount = Number(adjustAmount);
    setDadosGlobais((prev: any) => {
       let newWater = prev.food?.water || 0;
       let newFood = prev.food?.food || 0;
       
       if (adjustType === "both" || adjustType === "water") {
          newWater = adjustOperation === "add" ? newWater + amount : Math.max(0, newWater - amount);
       }
       if (adjustType === "both" || adjustType === "food") {
          newFood = adjustOperation === "add" ? newFood + amount : Math.max(0, newFood - amount);
       }
       setManualWater(newWater);
       setManualFood(newFood);
       
       const newHistoryEntry = {
         id: Date.now(),
         date: new Date().toISOString(),
         type: adjustType,
         operation: adjustOperation,
         amount: amount,
         reason: adjustReason || "Ajuste manual",
         // TODO: Integrar com Supabase (tabela food_history)
       };
       const newHistory = [newHistoryEntry, ...(prev.food?.history || [])];

       return { ...prev, food: { ...prev.food, water: newWater, food: newFood, history: newHistory } };
    });
    setAdjustAmount("");
    setAdjustReason("");
    setTimeout(salvarEstadoLocal, 100);
  };

  const handleSetBoth = () => {
    setDadosGlobais((prev: any) => ({
      ...prev,
      food: {
        ...prev.food,
        water: manualWater === "" ? (prev.food?.water || 0) : Number(manualWater),
        food: manualFood === "" ? (prev.food?.food || 0) : Number(manualFood)
      }
    }));
    setTimeout(salvarEstadoLocal, 100);
  };

  const handleClearHistory = async () => {
    if (await showConfirm({ title: "Limpar Histórico", message: "Tem certeza que deseja limpar todo o histórico de transações?", type: "danger" })) {
      setDadosGlobais((prev: any) => ({
        ...prev,
        food: { ...prev.food, history: [] }
      }));
      setTimeout(salvarEstadoLocal, 100);
    }
  };

  const handleSetPeople = () => {
    const waterNeeds = Number(peopleAmount) * Number(consumptionRate);
    const foodNeeds = Number(peopleAmount) * Number(consumptionRate);
    
    setDadosGlobais((prev: any) => {
      const currentWater = prev.food?.water || 0;
      const currentFood = prev.food?.food || 0;
      const nextWater = Math.max(0, currentWater - waterNeeds);
      const nextFood = Math.max(0, currentFood - foodNeeds);

      setManualWater(nextWater);
      setManualFood(nextFood);

      return {
        ...prev,
        food: {
          ...prev.food,
          people: Number(peopleAmount),
          consumptionRate: Number(consumptionRate),
          water: nextWater,
          food: nextFood
        }
      };
    });
    setTimeout(salvarEstadoLocal, 100);
  };

  const activePeople = dadosGlobais.food?.people || 0;
  const rate = dadosGlobais.food?.consumptionRate || 1;
  const dailyWaterNeeds = activePeople * rate;
  const dailyFoodNeeds = activePeople * rate;

  const waterDays = dailyWaterNeeds > 0 ? Math.floor((dadosGlobais.food?.water || 0) / dailyWaterNeeds) : 0;
  const foodDays = dailyFoodNeeds > 0 ? Math.floor((dadosGlobais.food?.food || 0) / dailyFoodNeeds) : 0;

  const historyPanel = (
    <div className="glass-panel" style={{ padding: "1.5rem", height: "100%", display: "flex", flexDirection: "column", minHeight: "300px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Log de Transações</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Histórico de consumo diário e ajustes.</p>
        </div>
        {isGM && (
          <button className="btn danger-btn small-btn" onClick={handleClearHistory} style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }}>Limpar Histórico</button>
        )}
      </div>
      <div className="history-table-wrapper" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <table className="history-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, position: "sticky", top: 0, background: "var(--bg-dark)", zIndex: 10 }}>
              <th style={{ padding: "0.6rem 0.8rem" }}>Dia</th>
              <th style={{ padding: "0.6rem 0.8rem" }}>Momento</th>
              <th style={{ padding: "0.6rem 0.8rem" }}>Suprimento</th>
              <th style={{ padding: "0.6rem 0.8rem" }}>Qtd</th>
              <th style={{ padding: "0.6rem 0.8rem" }}>Motivo</th>
              <th style={{ padding: "0.6rem 0.8rem" }}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {dadosGlobais.food?.history?.map((entry: any) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(entry.date).toLocaleDateString()}</td>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{new Date(entry.date).toLocaleTimeString()}</td>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem" }}>
                  {entry.type === 'water' ? '💧 Água' : entry.type === 'food' ? '🍖 Comida' : '💧+🍖 Ambos'}
                </td>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: entry.operation === 'add' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {entry.operation === 'add' ? '+' : '-'}{entry.amount}
                </td>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{entry.reason}</td>
                <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Supabase Sync Pendente</td>
              </tr>
            ))}
            {(!dadosGlobais.food?.history || dadosGlobais.food.history.length === 0) && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="food-view-container" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: 0 }}>
      <header className="npc-header glass-panel">
        <div className="npc-header-info">
          <h1 className="view-title">Gestão de Suprimentos</h1>
          <p className="view-subtitle">Controle de rações e água. A escassez pode ser letal.</p>
        </div>
      </header>

      {isGM && (
        <div className="food-tabs-nav">
          <button
            className={`food-tab-btn ${activeTab === "food-panel" ? "active" : ""}`}
            onClick={() => setActiveTab("food-panel")}
          >
            Painel Geral
          </button>
          <button
            className={`food-tab-btn ${activeTab === "food-history" ? "active" : ""}`}
            onClick={() => setActiveTab("food-history")}
          >
            Histórico de Alterações
          </button>
        </div>
      )}

      {isGM && (
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "food-panel" && (
            <motion.div
              key="food-panel"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="food-tab-content"
              style={{
                display: "flex",
                gap: "1.5rem",
                marginTop: "1rem",
                flex: 1,
                overflowY: "auto",
                alignItems: "stretch",
                flexDirection: "row"
              }}
            >
              <div className="food-left-column" style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="control-card modern-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.5rem", flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Tripulação & Consumo</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: 0 }}>Defina a tripulação ativa para o cálculo automático diário.</p>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginTop: "0.25rem" }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", marginBottom: "4px", display: "block", color: "var(--text-secondary)", fontWeight: 600 }}>Nº de Pessoas</label>
                        <input type="number" className="journey-input modern-input" min="0" value={peopleAmount} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') handleSetPeople(); }} onChange={(e) => setPeopleAmount(Number(e.target.value))} style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", fontWeight: "bold", fontSize: "1rem" }} />
                      </div>
                      <div className="form-group" style={{ flex: 1.5, margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", marginBottom: "4px", display: "block", color: "var(--text-secondary)", fontWeight: 600 }}>Modificador</label>
                        <select className="journey-input modern-input" value={consumptionRate} onChange={(e) => setConsumptionRate(Number(e.target.value))} style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", fontWeight: "bold", fontSize: "0.85rem" }}>
                          <option value={1}>Eficiente - Sopa Vivo (1 p/ dia)</option>
                          <option value={2}>Normal - Cozinheiro (2 p/ dia)</option>
                          <option value={3}>Precário - S/ Cozinheiro (3 p/ dia)</option>
                        </select>
                      </div>
                      <button className="btn primary-btn" onClick={handleSetPeople} style={{ height: "42px", padding: "0 1.5rem", fontSize: "0.85rem", borderRadius: "8px", fontWeight: 700 }}>Confirmar</button>
                    </div>
                    <div className="consumption-badge" style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem", fontWeight: 800 }}>
                      Consumo diário: {dailyWaterNeeds} Água / {dailyFoodNeeds} Comida
                    </div>
                  </div>

                  <div className="control-card modern-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.5rem", flex: 1, border: "1px solid rgba(139, 92, 246, 0.3)", background: "linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(0,0,0,0) 100%)" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                      Gestão do Mestre
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: 0 }}>Defina os valores absolutos dos suprimentos.</p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                      <div className="supply-input-wrapper">
                        <span style={{ fontSize: "1.1rem" }}>💧</span>
                        <input type="number" className="supply-input-field" min="0" placeholder="Água" value={manualWater} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') handleSetBoth(); }} onChange={(e) => setManualWater(e.target.value ? Number(e.target.value) : "")} />
                      </div>
                      <div className="supply-input-wrapper">
                        <span style={{ fontSize: "1.1rem" }}>🍖</span>
                        <input type="number" className="supply-input-field" min="0" placeholder="Comida" value={manualFood} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') handleSetBoth(); }} onChange={(e) => setManualFood(e.target.value ? Number(e.target.value) : "")} />
                      </div>
                      <button className="btn" onClick={handleSetBoth} style={{ flex: 0.8, height: "42px", fontSize: "0.85rem", background: "#8b5cf6", color: "#fff", fontWeight: 700, borderRadius: "8px" }}>Salvar</button>
                    </div>
                  </div>
                </div>

                <div className="control-card modern-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.5rem", flex: 1.3 }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Ajuste Rápido de Estoque</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: 0 }}>Adicione ou remova suprimentos.</p>
                  <div className="manual-adjustment-form" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", alignItems: "stretch", margin: 0 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                      <div className="form-group" style={{ flex: 1.5, margin: 0 }}>
                        <select className="journey-input modern-input w-full" value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)} style={{ height: "42px", padding: "0 12px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", fontWeight: 600 }}>
                          <option value="water">💧 Água</option>
                          <option value="food">🍖 Comida</option>
                          <option value="both">💧 + 🍖 Ambos</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <select className="journey-input modern-input w-full" value={adjustOperation} onChange={(e) => setAdjustOperation(e.target.value as any)} style={{ height: "42px", padding: "0 12px", fontSize: "0.9rem", color: adjustOperation === "add" ? "#10b981" : "#ef4444", fontWeight: "bold", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}>
                          <option value="add">➕ Add</option>
                          <option value="sub">➖ Sub</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <input type="number" className="journey-input modern-input" min="0" placeholder="Qtd" value={adjustAmount} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('adjustReasonInput')?.focus(); }} onChange={(e) => setAdjustAmount(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%", height: "42px", padding: "0 12px", fontSize: "1rem", textAlign: "center", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", fontWeight: "bold" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <input type="text" id="adjustReasonInput" className="journey-input modern-input" placeholder="Detalhes (Opcional. Ex: dado rolado...)" value={adjustReason} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter') handleAdjustConfirm(); }} onChange={(e) => setAdjustReason(e.target.value)} style={{ width: "100%", height: "42px", padding: "0 12px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff" }} />
                      </div>
                      <button className={`btn ${adjustOperation === "add" ? "success-btn" : "danger-btn"}`} onClick={handleAdjustConfirm} style={{ height: "42px", padding: "0 1.5rem", borderRadius: "8px", fontWeight: 800, fontSize: "0.85rem" }}>
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="food-right-column" style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
                <div className="supply-card modern-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", width: "100%", flex: 1, overflow: "hidden", textAlign: "center" }}>
                  <div className="supply-icon text-primary" style={{ margin: "0 auto", padding: "0.8rem", background: "rgba(0, 102, 204, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                    </svg>
                  </div>
                  <h3 style={{ margin: "0.5rem 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>Estoque de Água</h3>
                  <div className="supply-value" style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1.1, margin: "0.5rem 0", color: "var(--text-primary)", textShadow: "0 0 20px rgba(0, 102, 204, 0.4)" }}>{dadosGlobais.food?.water || 0}</div>
                </div>

                <div className="supply-card modern-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", width: "100%", flex: 1, overflow: "hidden", textAlign: "center" }}>
                  <div className="supply-icon text-warning" style={{ margin: "0 auto", padding: "0.8rem", background: "rgba(251, 191, 36, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.4 9.5a4 4 0 0 0-5.5 0l-3 3a4 4 0 0 0 0 5.5l.3.3a3 3 0 0 0 4.1 0l3-3a3 3 0 0 0 0-4.1z" />
                      <path d="M11.2 13.8l-4.7 4.7" />
                      <path d="M8.5 21a2 2 0 1 1-3-3" />
                      <path d="M5.5 18a2 2 0 1 1-3-3" />
                    </svg>
                  </div>
                  <h3 style={{ margin: "0.5rem 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>Estoque de Comida</h3>
                  <div className="supply-value" style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1.1, margin: "0.5rem 0", color: "var(--text-primary)", textShadow: "0 0 20px rgba(251, 191, 36, 0.4)" }}>{dadosGlobais.food?.food || 0}</div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "food-history" && (
            <motion.div
              key="food-history"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="food-tab-content"
              style={{
                marginTop: "1rem",
                flex: 1,
                overflowY: "auto",
              }}
            >
              {historyPanel}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {!isGM && (
        <div
          className="food-tab-content"
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "1rem",
            flex: 1,
            overflowY: "auto",
            alignItems: "stretch",
            flexDirection: "column"
          }}
        >
          <div className="food-right-column" style={{ display: "flex", flexDirection: "row", gap: "1rem", height: "auto" }}>
            <div className="supply-card modern-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", width: "100%", flex: 1, overflow: "hidden", textAlign: "center" }}>
              <div className="supply-icon text-primary" style={{ margin: "0 auto", padding: "0.8rem", background: "rgba(0, 102, 204, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
              </div>
              <h3 style={{ margin: "0.5rem 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>Estoque de Água</h3>
              <div className="supply-value" style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1.1, margin: "0.5rem 0", color: "var(--text-primary)", textShadow: "0 0 20px rgba(0, 102, 204, 0.4)" }}>{dadosGlobais.food?.water || 0}</div>
            </div>

            <div className="supply-card modern-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", width: "100%", flex: 1, overflow: "hidden", textAlign: "center" }}>
              <div className="supply-icon text-warning" style={{ margin: "0 auto", padding: "0.8rem", background: "rgba(251, 191, 36, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.4 9.5a4 4 0 0 0-5.5 0l-3 3a4 4 0 0 0 0 5.5l.3.3a3 3 0 0 0 4.1 0l3-3a3 3 0 0 0 0-4.1z" />
                  <path d="M11.2 13.8l-4.7 4.7" />
                  <path d="M8.5 21a2 2 0 1 1-3-3" />
                  <path d="M5.5 18a2 2 0 1 1-3-3" />
                </svg>
              </div>
              <h3 style={{ margin: "0.5rem 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>Estoque de Comida</h3>
              <div className="supply-value" style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1.1, margin: "0.5rem 0", color: "var(--text-primary)", textShadow: "0 0 20px rgba(251, 191, 36, 0.4)" }}>{dadosGlobais.food?.food || 0}</div>
            </div>
          </div>
          {historyPanel}
        </div>
      )}
    </div>
  );
}
