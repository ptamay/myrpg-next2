'use client'
import { useEffect } from 'react'
import { useUserSession } from '@/contexts/UserSessionContext'
import { useGameSync } from '@/hooks/useGameSync'
import Sidebar from '@/components/layout/Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sessionLoading, profile } = useUserSession()

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
      <div className="waiting-screen">
        <p>Aguarde o GM associar seu personagem.</p>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
