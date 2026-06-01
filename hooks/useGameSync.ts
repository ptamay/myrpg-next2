'use client'
import { useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type SyncEventType =
  | 'player_update'
  | 'npc_update'
  | 'supply_update'
  | 'block_update'
  | 'mural_update'
  | 'map_update'
  | 'campaign_update'

export type SyncEvent = {
  type: SyncEventType
  payload: unknown
}

type SyncHandler = (event: SyncEvent) => void

export function useGameSync(onEvent: SyncHandler) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Evita criar canal duplicado
    if (channelRef.current) return

    const channel = supabase.channel('game-sync')

    channel.on('broadcast', { event: 'game_update' }, ({ payload }: any) => {
      try {
        onEvent(payload as SyncEvent)
      } catch (err) {
        console.error('[useGameSync] Erro ao processar evento:', err)
      }
    })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('[useGameSync] Canal conectado')
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast de evento para todos (GM → jogadores)
  const broadcast = useCallback(async (event: SyncEvent) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'game_update',
      payload: event,
    })
  }, [])

  return { broadcast }
}
