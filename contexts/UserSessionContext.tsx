'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getSupabaseClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  email: string
  display_name: string | null
  role: 'gm' | 'player'
  player_id: string | null
  playerId?: string | null // backward compatibility
  name?: string | null // backward compatibility
}

type Player = {
  id: string
  name: string
  class: string
  hp: number
  max_hp: number
}

type UserSessionContextType = {
  profile: Profile | null
  session: Profile | null
  isGM: boolean
  playerCharacter: Player | null
  sessionLoading: boolean
  refreshProfile: () => Promise<void>
}

const UserSessionContext = createContext<UserSessionContextType | null>(null)

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playerCharacter, setPlayerCharacter] = useState<Player | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const supabase = getSupabaseClient()

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setPlayerCharacter(null)
      setSessionLoading(false)
      return
    }

    setSessionLoading(true)
    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

      // 1. Busca o próprio profile (toda policy permite id = auth.uid())
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, player_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        const errorDetails = profileError.message || JSON.stringify(profileError, null, 2)
        console.error('[UserSessionContext] Erro real do Supabase:', errorDetails, profileError)
        setSessionLoading(false)
        return
      }

      // Perfil não existe ainda — cria via fallback (caso trigger não tenha rodado)
      if (!profileData) {
        const defaultRole: 'gm' | 'player' = user.email === adminEmail ? 'gm' : 'player'
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email ?? '',
            display_name: user.email?.split('@')[0] ?? 'Jogador',
            role: defaultRole,
            player_id: null,
          })
          .select()
          .maybeSingle()

        if (insertError || !newProfile) {
          console.error('[UserSessionContext] Erro ao criar profile:', insertError)
          setSessionLoading(false)
          return
        }

        setProfile({
          ...newProfile,
          role: defaultRole,
          playerId: newProfile.player_id,
          name: newProfile.display_name || newProfile.email,
        })
        setSessionLoading(false)
        return
      }

      // 2. Garante que o admin tenha role 'gm' no banco caso esteja desatualizado
      let resolvedRole: 'gm' | 'player' = profileData.role
      if (adminEmail && profileData.email === adminEmail && profileData.role !== 'gm') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'gm' })
          .eq('id', user.id)
        if (!updateError) resolvedRole = 'gm'
        else console.warn('[UserSessionContext] Não foi possível atualizar role do admin:', updateError)
      }

      setProfile({
        ...profileData,
        role: resolvedRole,
        playerId: profileData.player_id,
        name: profileData.display_name || profileData.email,
      })

      // Não logar dados completos de perfil em produção
      // 3. Se é jogador com personagem vinculado, carrega o personagem
      if (profileData.player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, name, player_class, hp_current, hp_max')
          .eq('id', profileData.player_id)
          .single()
        setPlayerCharacter(playerData ?? null)
      } else {
        setPlayerCharacter(null)
      }
    } catch (err) {
      console.error('[UserSessionContext] Erro inesperado:', err)
    } finally {
      setSessionLoading(false)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return (
    <UserSessionContext.Provider value={{
      profile,
      session: profile,
      isGM: profile?.role === 'gm',
      playerCharacter,
      sessionLoading,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </UserSessionContext.Provider>
  )
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext)
  if (!ctx) throw new Error('useUserSession deve ser usado dentro de UserSessionProvider')
  return ctx
}
