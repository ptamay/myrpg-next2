"use client";

import { useEffect } from "react";
import Sidebar from "./Sidebar";
import BackgroundEffects from "./BackgroundEffects";
import ModalsContainer from "../modals/ModalsContainer";
import { useAppContext } from "@/contexts/AppContext";
import { blocosDeTempo } from "@/lib/gameData";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { diaAtual, indiceBlocoAtivo, jornadaPorDia } = useAppContext();
  const { logout, loading: authLoading } = useAuth();
  const { showAlert } = useSystemDialog();
  const pathname = usePathname();
  const router = useRouter();
  const { session, isPlayer } = useUserSession();

  const getActiveWeather = () => {
    const dayData = jornadaPorDia[diaAtual];
    if (dayData?.blocos) {
      const bData = dayData.blocos[indiceBlocoAtivo];
      return bData?.weatherEffect || "clear";
    }
    return "clear";
  };

  const getThemeClass = () => {
    const bloco = blocosDeTempo[indiceBlocoAtivo];
    if (!bloco) return "";
    return `theme-${bloco.tema} theme-${bloco.tema === "diurnal" ? "diurna" : "noturna"} theme-block-${bloco.id}`;
  };

  useEffect(() => {
    const classesToRemove = [
      "theme-diurnal", "theme-diurna", "theme-nocturnal", "theme-noturna",
      "theme-block-1", "theme-block-2", "theme-block-3", "theme-block-4", "theme-block-5", "theme-block-6"
    ];
    document.body.classList.remove(...classesToRemove);
    const newClasses = getThemeClass().split(" ").filter(Boolean);
    if (newClasses.length > 0) {
      document.body.classList.add(...newClasses);
    }
  }, [indiceBlocoAtivo]);

  useEffect(() => {
    const handleDayPassed = (e: any) => {
      showAlert({
        title: "Um Novo Dia Raiou",
        message: `O mestre avançou o tempo para o Dia ${e.detail}.`,
        type: "warning"
      });
    };
    window.addEventListener("day-passed-alert", handleDayPassed);
    return () => window.removeEventListener("day-passed-alert", handleDayPassed);
  }, [showAlert]);

  if (authLoading) {
    return (
      <>
        <BackgroundEffects weatherEffect={getActiveWeather()} />
        <div className={`app-shell ${getThemeClass()}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" style={{width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  if (session && isPlayer && !session.playerId) {
    return (
      <>
        <BackgroundEffects weatherEffect={getActiveWeather()} />
        <div className={`app-shell ${getThemeClass()}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', maxWidth: '500px', textAlign: 'center' }}>
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Acesso Restrito</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Aguarde o administrador associar você a um personagem.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  window.location.reload();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Atualizar
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await logout();
                  await new Promise(r => setTimeout(r, 100));
                  router.replace("/login");
                  router.refresh();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sair
              </button>
            </div>
          </div>
          <ModalsContainer />
        </div>
      </>
    );
  }

  return (
    <>
      <BackgroundEffects weatherEffect={getActiveWeather()} />
      <div className={`app-shell ${getThemeClass()}`}>
        <Sidebar />
        <div className="content-area">
          <motion.div
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            {children}
          </motion.div>
        </div>
        <ModalsContainer />
      </div>
    </>
  );
}
