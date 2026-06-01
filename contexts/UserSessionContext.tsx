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
      // 1. Busca profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile não existe ainda — cria (fallback caso trigger falhe)
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email ?? '',
            display_name: user.email?.split('@')[0] ?? 'Jogador',
            role: 'player',
            player_id: null,
          })
          .select()
          .single()
        const mappedProfile = {
          ...newProfile,
          playerId: newProfile.player_id,
          name: newProfile.display_name || newProfile.email
        }
        setProfile(mappedProfile)
      } else {
        const mappedProfile = {
          ...profileData,
          playerId: profileData.player_id,
          name: profileData.display_name || profileData.email
        }
        setProfile(mappedProfile)
      }

      // 2. Se tem player_id, busca o personagem
      if (profileData?.player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', profileData.player_id)
          .single()
        setPlayerCharacter(playerData ?? null)
      } else {
        setPlayerCharacter(null)
      }
    } catch (err) {
      console.error('[UserSessionContext] Erro ao buscar profile:', err)
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
