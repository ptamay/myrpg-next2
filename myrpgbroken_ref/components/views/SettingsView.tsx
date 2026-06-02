"use client";

import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { createClient } from "@/lib/supabase/client";

export default function SettingsView() {
  const { diaAtual, indiceBlocoAtivo, jornadaPorDia, dadosGlobais, setDiaAtual, setIndiceBlocoAtivo, setDadosGlobais, setJornadaPorDia } = useAppContext();
  const { showAlert, showConfirm } = useSystemDialog();
  const { isGM } = useUserSession();

  if (!isGM) {
    return (
      <div className="npc-view-container">
        <header className="npc-header glass-panel">
          <div className="npc-header-info">
            <h1 className="view-title">Grimório de Dados</h1>
            <p className="view-subtitle">Acesso restrito. Apenas o mestre pode exportar ou restaurar a campanha.</p>
          </div>
        </header>
      </div>
    );
  }

  const handleExportFull = () => {
    const data = {
      diaAtual,
      indiceBlocoAtivo,
      jornadaPorDia,
      dadosGlobais
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Backup_RPG_Tempo_Dia_${diaAtual}.json`;
    a.click();
  };

  const handleImportFull = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (imported.dadosGlobais && imported.jornadaPorDia) {
            if (await showConfirm({ title: "Restaurar Grimório", message: "Isso irá substituir TODOS os seus dados atuais pelo backup selecionado. Tem certeza?", type: "warning" })) {
              setDiaAtual(imported.diaAtual || 1);
              setIndiceBlocoAtivo(imported.indiceBlocoAtivo || 0);
              setDadosGlobais(imported.dadosGlobais);
              setJornadaPorDia(imported.jornadaPorDia);
              await showAlert({ title: "Sucesso", message: "Backup restaurado com sucesso! Os dados foram enviados para o servidor.", type: "success" });
              window.location.reload();
            }
          } else {
            await showAlert({ title: "Erro na Restauração", message: "Formato inválido. O arquivo de backup completo deve conter 'dadosGlobais' e 'jornadaPorDia'.", type: "danger" });
          }
        } catch (err) {
          await showAlert({ title: "Erro na Restauração", message: "Erro ao ler o arquivo de backup.", type: "danger" });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = async () => {
    if (await showConfirm({ title: "Limpar Tudo", message: "Apagar absolutamente todos os dados e resetar a campanha para o estado inicial? Isso não pode ser desfeito.", type: "danger" })) {
      const supabase = createClient();
      const { error } = await supabase.rpc('reset_campaign');
      if (error) {
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

  return (
    <div className="npc-view-container">
      <header className="npc-header glass-panel">
        <div className="npc-header-info">
          <h1 className="view-title">Grimório de Dados</h1>
          <p className="view-subtitle">Exporte ou importe sua campanha para garantir que nada se perca.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: "3rem", display: "flex", flexDirection: "column", gap: "3rem" }}>
        <section>
          <h3 className="section-title" style={{ marginBottom: "1rem" }}>Backup da Jornada</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Crie um arquivo físico (.json) com todos os NPCs, Linha do Tempo e Objetivos para usar em outros dispositivos.
          </p>
          <button className="btn primary-btn" onClick={handleExportFull}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Baixar Backup Completo</span>
          </button>
        </section>

        <section style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "3rem" }}>
          <h3 className="section-title" style={{ marginBottom: "1rem" }}>Restaurar Grimório</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Importe um arquivo de backup para substituir os dados atuais deste navegador.
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <input type="file" accept=".json" className="hidden" id="import-json-settings" onChange={handleImportFull} style={{ display: "none" }} />
            <label htmlFor="import-json-settings" className="btn secondary-btn" style={{ cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Selecionar Arquivo</span>
            </label>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "3rem" }}>
          <h3 className="section-title" style={{ marginBottom: "1rem", color: "var(--danger)" }}>Zona de Perigo</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Apagar todos os dados e resetar a campanha para o estado inicial.
          </p>
          <button className="btn danger-btn" onClick={handleReset}>Limpar Tudo e Recomeçar</button>
        </section>
      </div>
    </div>
  );
}
