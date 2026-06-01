// SÓ AuthProvider aqui. AppProvider fica no (app)/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext'
import { SystemDialogProvider } from '@/contexts/SystemDialogContext'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import GlobalScripts from '@/components/GlobalScripts'
import './styles/globals.css'
import './styles/base.css'
import './styles/components.css'
import './styles/dashboard.css'
import './styles/players-npcs.css'
import './styles/modals.css'
import './styles/blocks.css'
import './styles/quests-weather.css'
import './styles/sidebar.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
export const metadata: Metadata = { title: 'MyRPG' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
      </head>
      <body>
        <AuthProvider>
          <SystemDialogProvider>
            {children}
          </SystemDialogProvider>
        </AuthProvider>
        <GlobalScripts />
      </body>
    </html>
  )
}
