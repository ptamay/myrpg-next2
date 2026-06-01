'use client'
import { useEffect } from 'react'
import { useUserSession } from '@/contexts/UserSessionContext'
import { useGameSync } from '@/hooks/useGameSync'
import Sidebar from '@/components/layout/Sidebar'

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
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Aguarde o GM associar seu personagem.</p>
        
        {process.env.NODE_ENV === 'development' && (
          <button 
            className="btn secondary-btn"
            style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}
            onClick={async () => {
              const { getSupabaseClient } = await import('@/lib/supabase/client');
              const supabase = getSupabaseClient();
              await supabase.from('profiles').update({ role: 'gm' }).eq('id', profile.id);
              window.location.reload();
            }}
          >
            🛠️ [DevMode] Forçar minha conta como GM
          </button>
        )}
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
            style={{ minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

