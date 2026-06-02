'use client'
import { useEffect } from 'react'
import { useUserSession } from '@/contexts/UserSessionContext'
import { useGameSync } from '@/hooks/useGameSync'
import Sidebar from '@/components/layout/Sidebar'
import DiceWidget from '@/components/ui/DiceWidget'
import DiceRollFeed from '@/components/ui/DiceRollFeed'
import CombatTracker from '@/components/combat/CombatTracker'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sessionLoading, profile } = useUserSession()
  const pathname = usePathname()

  // Canal único montado no nível mais alto da app autenticada
  const { broadcast } = useGameSync((event) => {
    console.log('[AppShell] Sync recebido:', event.type)
    window.dispatchEvent(new CustomEvent(`sync_${event.type}`, { detail: event.payload }))
  })

  // Permite que hooks locais enviem broadcast globalmente
  useEffect(() => {
    const handleSend = (e: any) => {
      broadcast(e.detail);
    };
    window.addEventListener('send_broadcast', handleSend);
    return () => window.removeEventListener('send_broadcast', handleSend);
  }, [broadcast]);

  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-indicator" />
      </div>
    )
  }

  // Player sem personagem vinculado
  if (profile && profile.role === 'player' && !profile.player_id) {
    return (
      <div className="waiting-screen" style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div className="glass-panel" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏳</div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>Aguardando Vinculação</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
            Seu usuário ainda não possui um personagem associado. Aguarde até que o Mestre (GM) vincule um personagem à sua conta.
          </p>
          <div className="pulse-indicator" style={{ marginTop: '1rem' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <DiceWidget />
      <DiceRollFeed />
      <CombatTracker />
    </div>
  )
}

