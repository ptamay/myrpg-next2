// ORDEM OBRIGATÓRIA dos providers
import { UserSessionProvider } from '@/contexts/UserSessionContext'
import { AppProvider } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import ModalsContainer from '@/components/modals/ModalsContainer'
import { CombatProvider } from '@/contexts/CombatContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserSessionProvider>
      <AppProvider>
        <CombatProvider>
          <AppShell>
            {children}
          </AppShell>
          <ModalsContainer />
        </CombatProvider>
      </AppProvider>
    </UserSessionProvider>
  )
}
