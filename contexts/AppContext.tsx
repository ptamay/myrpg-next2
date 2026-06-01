'use client'
import { createContext, useContext, useState } from 'react'

type View = 'dashboard' | 'cronicas' | 'maps' | 'settings' | 'users'

type ModalState = { isOpen: boolean; data?: unknown }

type AppContextType = {
  activeView: View
  setActiveView: (v: View) => void
  openModal: (name: string, data?: unknown) => void
  closeModal: (name: string) => void
  getModal: (name: string) => ModalState
  
  // Backward compatibility
  modals: any
  activeData: any
  setActiveData: (data: any) => void
  setModals: (updater: any) => void
  
  // Legacy State
  diaAtual: number
  setDiaAtual: (d: number | ((prev: number) => number)) => void
  indiceBlocoAtivo: number
  setIndiceBlocoAtivo: (i: number | ((prev: number) => number)) => void
  jornadaPorDia: Record<number, any>
  setJornadaPorDia: (j: any) => void
  dadosGlobais: any
  setDadosGlobais: (d: any) => void
  salvarEstadoLocal: () => void
}

const AppContext = createContext<AppContextType | null>(null)

import { useCampaignInfo, useNpcs, usePlayers, useSupplies } from '@/hooks/useGameData'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [modals, setModalsState] = useState<Record<string, ModalState>>({})
  const [activeData, setActiveData] = useState<any>(null)

  // Backward compatibility hooks
  const { diaAtual, setDiaAtual, indiceBlocoAtivo, setIndiceBlocoAtivo, jornadaPorDia, setJornadaPorDia } = useCampaignInfo()
  const { npcs, setNpcs } = useNpcs()
  const { players, setPlayers } = usePlayers()
  const { food, setFood } = useSupplies()

  const dadosGlobais = { players, npcs, food }
  const setDadosGlobais = (newObj: any) => {
    if (newObj.players) setPlayers(newObj.players)
    if (newObj.npcs) setNpcs(newObj.npcs)
    if (newObj.food) setFood(newObj.food)
  }
  const salvarEstadoLocal = () => {} // no-op

  const openModal = (name: string, data?: unknown) =>
    setModalsState(prev => ({ ...prev, [name]: { isOpen: true, data } }))

  const closeModal = (name: string) =>
    setModalsState(prev => ({ ...prev, [name]: { isOpen: false } }))

  const getModal = (name: string): ModalState =>
    modals[name] ?? { isOpen: false }

  const setModals = (updater: any) => {
    if (typeof updater === 'function') {
      const oldFormat = updater({});
      Object.keys(oldFormat).forEach(key => {
        if (oldFormat[key] === true) openModal(key);
        else if (oldFormat[key] === false) closeModal(key);
      });
    }
  }

  return (
    <AppContext.Provider value={{ 
      activeView, setActiveView, 
      openModal, closeModal, getModal,
      modals, activeData, setActiveData, setModals,
      diaAtual, setDiaAtual,
      indiceBlocoAtivo, setIndiceBlocoAtivo,
      jornadaPorDia, setJornadaPorDia,
      dadosGlobais, setDadosGlobais,
      salvarEstadoLocal
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
