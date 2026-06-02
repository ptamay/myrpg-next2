"use client";

import { useEffect, useRef, useState } from "react";
import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

// Este hook escuta as mudanças no banco e dispara callbacks para atualizar o estado local
export function useRealtimeSync(
  supabase: SupabaseClient,
  callbacks: {
    onNpcsChange: () => void;
    onPlayersChange: () => void;
    onCampaignChange: () => void;
    onJourneyChange: () => void;
    onSuppliesChange: () => void;
    onMapsChange?: () => void;
  }
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: RealtimeChannel | null = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
      }

      const channelId = `game_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      currentChannel = supabase.channel(channelId)
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "npcs" },
          () => callbacksRef.current.onNpcsChange()
        )
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "players" },
          () => callbacksRef.current.onPlayersChange()
        )
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "campaign" },
          () => callbacksRef.current.onCampaignChange()
        )
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "journey_blocks" },
          () => callbacksRef.current.onJourneyChange()
        )
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "supplies" },
          () => callbacksRef.current.onSuppliesChange()
        )
        .on(
          "postgres_changes", { event: "*", schema: "public", table: "maps" },
          () => callbacksRef.current.onMapsChange && callbacksRef.current.onMapsChange()
        )
        .on("broadcast", { event: "day_passed" }, (payload: any) => {
          window.dispatchEvent(new CustomEvent('day-passed-alert', { detail: payload.payload.newDay }));
        })
        .on("broadcast", { event: "refresh_journey" }, () => callbacksRef.current.onJourneyChange())
        .on("broadcast", { event: "refresh_campaign" }, () => callbacksRef.current.onCampaignChange())
        .on("broadcast", { event: "refresh_players" }, () => callbacksRef.current.onPlayersChange())
        .on("broadcast", { event: "refresh_npcs" }, () => callbacksRef.current.onNpcsChange())
        .on("broadcast", { event: "refresh_supplies" }, () => callbacksRef.current.onSuppliesChange());

      currentChannel.subscribe((status, err) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error(`[game-sync] Realtime status: ${status}. Tentando reconectar em 5s...`, err);
          reconnectTimer = setTimeout(connect, 5000);
        } else if (status === 'SUBSCRIBED') {
          console.log("[game-sync] Conectado com sucesso.");
        }
      });

      setChannel(currentChannel);
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
      }
    };
  }, [supabase]);

  return channel;
}
