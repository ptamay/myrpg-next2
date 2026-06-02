"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useGameSync } from "@/hooks/useGameSync";
import { getInitialJornada } from "@/lib/dataHelpers";

import { GlobalData } from "@/lib/gameData";

// ... keeping AppContextData exact same

interface AppContextData {
  diaAtual: number;
  setDiaAtual: (dia: number | ((prev: number) => number)) => void;
  indiceBlocoAtivo: number;
  setIndiceBlocoAtivo: (index: number | ((prev: number) => number)) => void;
  dadosGlobais: GlobalData;
  setDadosGlobais: (val: GlobalData | ((prev: GlobalData) => GlobalData)) => void;
  jornadaPorDia: Record<number, any>;
  setJornadaPorDia: (val: Record<number, any> | ((prev: Record<number, any>) => Record<number, any>)) => void;
  salvarEstadoLocal: () => void;
  syncLoading: boolean;
  modals: {
    npcForm: boolean;
    npcDetail: boolean;
    playerForm: boolean;
    playerManage: boolean;
    playerDetail: boolean;
    passDay: boolean;
    globalEvent: boolean;
    globalEventDetail: boolean;
    crop: boolean;
    mainQuest: boolean;
    mainQuestDetail: boolean;
    sideQuest: boolean;
    sideQuestDetail: boolean;
    importNpcText: boolean;
    importNpcOptions: boolean;
    summaryCard: boolean;
    sessionPlayer: boolean;
    personalNote: boolean;
    personalNoteDetail: boolean;
  };
  setModals: React.Dispatch<React.SetStateAction<any>>;
  activeData: any;
  setActiveData: React.Dispatch<React.SetStateAction<any>>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const {
    diaAtual, setDiaAtual,
    indiceBlocoAtivo, setIndiceBlocoAtivo,
    dadosGlobais, setDadosGlobais,
    jornadaPorDia, setJornadaPorDia,
    loading: syncLoading
  } = useGameSync();
  
  
  const [modals, setModals] = useState({
    npcForm: false,
    npcDetail: false,
    playerForm: false,
    playerManage: false,
    playerDetail: false,
    passDay: false,
    globalEvent: false,
    globalEventDetail: false,
    crop: false,
    mainQuest: false,
    mainQuestDetail: false,
    sideQuest: false,
    sideQuestDetail: false,
    importNpcText: false,
    importNpcOptions: false,
    summaryCard: false,
    sessionPlayer: false,
    personalNote: false,
    personalNoteDetail: false,
  });
  const [activeData, setActiveData] = useState<any>(null);



  useEffect(() => {
    if (!syncLoading) {
      setJornadaPorDia((prev) => {
        // Só inicializa se não vier NADA do banco
        if (Object.keys(prev).length > 0) return prev;
        
        return getInitialJornada();
      });
    }
  }, [syncLoading, setJornadaPorDia]);

  const salvarEstadoLocal = () => {
    // Agora o salvamento ocorre automaticamente nos wrappers de setX do useGameSync
  };

  // IMPORTANT: Do NOT block rendering here with !mounted or syncLoading checks.
  // These blocking patterns cause infinite loading screens. Data loads in the
  // background and components handle their own empty/loading states.
  return (
    <AppContext.Provider
      value={{
        diaAtual,
        setDiaAtual,
        indiceBlocoAtivo,
        setIndiceBlocoAtivo,
        dadosGlobais,
        setDadosGlobais,
        jornadaPorDia,
        setJornadaPorDia,
        salvarEstadoLocal,
        syncLoading,
        modals,
        setModals,
        activeData,
        setActiveData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
