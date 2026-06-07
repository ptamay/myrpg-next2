"use client";

import { useMemo, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { blocosDeTempo } from "@/lib/gameData";
import { getInitialJornada } from "@/lib/dataHelpers";
import DashboardBlock from "./DashboardBlock";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useCampaignInfo, useNpcs, usePlayers } from "@/hooks/useGameData";
import BackgroundEffects from "@/components/layout/BackgroundEffects";

export default function DashboardView() {
  const { openModal, setActiveData } = useApp();
  const { isGM } = useUserSession();
  const { showConfirm, showAlert } = useSystemDialog();

  const { diaAtual, setDiaAtual, indiceBlocoAtivo, setIndiceBlocoAtivo, jornadaPorDia, setJornadaPorDia, dadosGlobais, setDadosGlobais } = useApp();
  
  const players = dadosGlobais?.players || [];
  const setPlayers = (newPlayers: any) => setDadosGlobais({ ...dadosGlobais, players: newPlayers });
  
  const npcs = dadosGlobais?.npcs || [];
  const setNpcs = (newNpcs: any) => setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
  
  const isFirstLoad = false;

  useEffect(() => {
    const bloco = blocosDeTempo[indiceBlocoAtivo];
    if (bloco) {
      document.body.classList.remove(
        'theme-diurnal', 'theme-nocturnal',
        'theme-block-1', 'theme-block-2', 'theme-block-3',
        'theme-block-4', 'theme-block-5', 'theme-block-6'
      );
      document.body.classList.add(`theme-${bloco.tema}`, `theme-block-${bloco.id}`);
    }
  }, [indiceBlocoAtivo]);

  const handleExportLog = () => {
    let rel = "RELATÓRIO DE CAMPANHA\n\n";
    Object.keys(jornadaPorDia).sort((a, b) => Number(a) - Number(b)).forEach((d) => {
      const dayNum = Number(d);
      const day = jornadaPorDia[dayNum];
      if (!day) return;
      rel += `DIA ${dayNum}\n`;
      blocosDeTempo.forEach((b, i) => {
        const bData = day.blocos && day.blocos[i] ? day.blocos[i] : null;
        if (!bData) return;
        rel += `  [${b.nome}] - Clima: ${bData.weatherEffect || 'clear'}\n`;
        if (bData.timeline && bData.timeline.length > 0) {
          rel += `    EVENTOS GLOBAIS:\n`;
          bData.timeline.forEach((t: any) => rel += `      - ${t.title || t}\n`);
        }
        if (bData.plots && bData.plots.length > 0) {
          rel += `    OBJETIVOS GLOBAIS:\n`;
          bData.plots.forEach((p: any) => rel += `      - ${p.text || p}\n`);
        }
        if (bData.sidequests && bData.sidequests.length > 0) {
          rel += `    SIDE QUESTS (NPCs):\n`;
          bData.sidequests.forEach((sq: any) => rel += `      - [${sq.npc || 'Sem NPC'}] ${sq.text}\n`);
        }
        if (bData.acoesPersonagens && bData.acoesPersonagens.length > 0) {
          bData.acoesPersonagens.forEach((p: any) => {
            if (p.acao) rel += `    ${p.concluido ? '[X]' : '[ ]'} ${p.nome}: ${p.acao}\n`;
          });
        }
      });
      rel += "\n";
    });
    const blob = new Blob([rel], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Campanha_Relatorio_Dia_${diaAtual}.txt`;
    a.click();
  };

  const handleResetCampaign = async () => {
    if (await showConfirm({ title: "Resetar Campanha", message: "Apagar todos os dados da campanha e voltar ao Dia 1? Isso não pode ser desfeito.", type: "danger" })) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('reset_campaign');
      if (error) {
        console.error("Erro ao resetar campanha", error);
        await showAlert({ title: "Erro ao resetar", message: error.message, type: "danger" });
        return;
      }
      localStorage.removeItem("myrpg_dia_atual");
      localStorage.removeItem("myrpg_bloco_ativo");
      localStorage.removeItem("myrpg_dados_globais");
      localStorage.removeItem("myrpg_jornada_por_dia");
      window.location.reload();
    }
  };

  const totalDays = useMemo(() => {
    const maxDayInJornada = Object.keys(jornadaPorDia).length > 0 ? Math.max(...Object.keys(jornadaPorDia).map(Number)) : 1;
    return Math.max(diaAtual, maxDayInJornada);
  }, [jornadaPorDia, diaAtual]);

  const daysArray = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [totalDays]);

  const handleAddDay = () => {
    const nextDay = totalDays + 1;
    setJornadaPorDia((prev: any) => {
      const updated = { ...prev };
      if (!updated[nextDay]) {
        const initial = getInitialJornada();
        updated[nextDay] = initial[1]; // Usa o dia 1 como template
        
        // Propaga o clima do último dia conhecido
        const lastKnownWeather = prev[totalDays]?.blocos?.[0]?.weatherEffect || "clear";
        if (updated[nextDay].blocos) {
          updated[nextDay].blocos.forEach((b: any) => {
            b.weatherEffect = lastKnownWeather;
          });
        }
      }
      return updated;
    });
  };

  const handleRemoveDay = async () => {
    if (totalDays <= 5) {
      await showAlert({ title: "Remover Dia", message: "É necessário manter pelo menos 5 dias na campanha.", type: "warning" });
      return;
    }
    
    if (await showConfirm({ title: "Remover Último Dia", message: `Tem certeza que deseja remover o Dia ${totalDays}? Todos os dados deste dia serão perdidos permanentemente.`, type: "danger" })) {
      setJornadaPorDia((prev: any) => {
        const updated = { ...prev };
        delete updated[totalDays];
        return updated;
      });
      if (diaAtual === totalDays) {
        setDiaAtual(totalDays - 1);
        setIndiceBlocoAtivo(0);
      }
    }
  };

  if (isFirstLoad) {
    return (
      <div style={{ display: 'flex', height: '100%', minHeight: '60vh', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div id="view-dashboard" className="view active" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <BackgroundEffects weatherEffect={jornadaPorDia[diaAtual]?.blocos?.[indiceBlocoAtivo]?.weatherEffect || "clear"} />
      <div className="dash-ultra-wrapper">
        <header className="dash-ultra-header glass-panel">
          <div className="dash-day-control">
            <span className="dash-label">JORNADA</span>
            <div className="day-selector" id="day-selector">
              {daysArray.map((d) => (
                <button
                  key={d}
                  className={`day-btn ${d === diaAtual ? "active" : ""} ${!isGM ? "disabled" : ""}`}
                  onClick={() => {
                    if (isGM) {
                      setJornadaPorDia((prev: any) => {
                        const updated = { ...prev };
                        if (!updated[d]) {
                          const initial = getInitialJornada();
                          updated[d] = initial[1];
                          const lastKnownWeather = prev[d - 1]?.blocos?.[0]?.weatherEffect || "clear";
                          if (updated[d].blocos) {
                            updated[d].blocos.forEach((b: any) => {
                              b.weatherEffect = lastKnownWeather;
                            });
                          }
                        }
                        return updated;
                      });
                      setDiaAtual(d);
                    }
                  }}
                >
                  {d}
                </button>
              ))}
              {isGM && (
                <>
                  {totalDays > 5 && (
                    <button className="day-btn add-day-btn" onClick={handleRemoveDay} title="Remover Último Dia">
                      -
                    </button>
                  )}
                  <button className="day-btn add-day-btn" onClick={handleAddDay} title="Adicionar Dia Extra">
                    +
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="dash-stepper" id="moment-selector">
            {blocosDeTempo.map((b, i) => (
              <button
                key={b.id}
                className={`moment-btn ${i === indiceBlocoAtivo ? "active" : ""} ${!isGM ? "disabled" : ""}`}
                onClick={() => isGM && setIndiceBlocoAtivo(i)}
                style={{ cursor: isGM ? "pointer" : "default" }}
              >
                <span className="moment-dot"></span>
                {b.nome}
              </button>
            ))}
          </div>
          <div className="dash-header-actions">
            {isGM && (
              <button id="btn-combat-mode" className="btn primary-btn" style={{ backgroundColor: "var(--danger)" }} onClick={() => openModal('combatSetup', null)}>
                <span style={{ marginRight: '4px' }}>⚔️</span>
                <span>Iniciar Combate</span>
              </button>
            )}
            {isGM && (
              <button id="btn-pass-day" className="btn primary-btn" onClick={() => openModal('passDay')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span>Passar o Dia</span>
              </button>
            )}
            {isGM && (
              <button id="btn-new-day" className="btn danger-btn" title="Resetar Campanha" onClick={handleResetCampaign}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </header>

        <div className="dash-ultra-grid">
          <main className="dash-main-content" id="blocks-grid">
            <DashboardBlock 
              diaAtual={diaAtual} 
              indiceBlocoAtivo={indiceBlocoAtivo} 
              jornadaPorDia={jornadaPorDia} 
              setJornadaPorDia={setJornadaPorDia} 
              npcs={npcs}
              players={players}
              setPlayers={setPlayers}
              setNpcs={setNpcs}
            />
          </main>

          <aside className="dash-side-panel glass-panel">
            <div className="side-panel-header">
              <h3>Status do Elenco</h3>
              <div className="pulse-indicator"></div>
            </div>
            <div className="npc-status-group mt-3">
              <h4 className="text-success">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>{" "}
                Aliados & Vivos
              </h4>
              <ul id="display-npcs-alive" className="npc-status-list">
                {players?.filter((p: any) => !p.isDead).map((p: any) => (
                  <li key={p.id} onClick={() => { setActiveData(p); openModal('summaryCard'); }} style={{ cursor: "pointer", fontWeight: "bold", color: "var(--primary-color)" }}>
                    {p.name}
                  </li>
                ))}
                {npcs?.filter((n: any) => !n.isDead && !n.isHidden && n.faction !== 'enemy')
                  .sort((a: any, b: any) => {
                    const parseCr = (cr: string) => {
                      if (!cr) return -1;
                      if (cr.includes('/')) {
                        const [num, den] = cr.split('/');
                        return Number(num) / Number(den);
                      }
                      return Number(cr) || 0;
                    };
                    return parseCr(b.cr) - parseCr(a.cr);
                  })
                  .map((n: any) => (
                  <li key={n.id} onClick={() => { setActiveData(n); openModal('summaryCard'); }} style={{ cursor: "pointer" }}>
                    {n.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="npc-status-group mt-4">
              <h4 className="text-danger">
                Caídos / Mortos
              </h4>
              <ul id="display-npcs-dead" className="npc-status-list">
                {players?.filter((p: any) => p.isDead).map((p: any) => (
                  <li key={p.id} className="dead-member" onClick={() => { setActiveData(p); openModal('summaryCard'); }} style={{ cursor: "pointer", fontWeight: "bold" }}>
                    💀 {p.name}
                  </li>
                ))}
                {npcs?.filter((n: any) => n.isDead && !n.isHidden && n.faction !== 'enemy')
                  .sort((a: any, b: any) => {
                    const parseCr = (cr: string) => {
                      if (!cr) return -1;
                      if (cr.includes('/')) {
                        const [num, den] = cr.split('/');
                        return Number(num) / Number(den);
                      }
                      return Number(cr) || 0;
                    };
                    return parseCr(b.cr) - parseCr(a.cr);
                  })
                  .map((n: any) => (
                  <li key={n.id} className="dead-member" onClick={() => { setActiveData(n); openModal('summaryCard'); }} style={{ cursor: "pointer" }}>
                    💀 {n.name}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
