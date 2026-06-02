"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlobalData } from "@/lib/gameData";
import { mapDBToNpc, mapDBToPlayer, mapNpcToDB, mapPlayerToDB } from "@/lib/supabase/mappers";
import { getInitialJornada } from "@/lib/dataHelpers";
import { useAuth } from "@/contexts/AuthContext";

import { useRealtimeSync } from "./useRealtime";

const defaultGlobalData: GlobalData = {
  npcs: [],
  players: [],
  food: { water: 0, food: 0, people: 0 },
  maps: [],
};

export function useGameSync() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  
  // Local States
  const [diaAtual, setDiaAtualLocal] = useState<number>(1);
  const [indiceBlocoAtivo, setIndiceBlocoAtivoLocal] = useState<number>(0);
  const [dadosGlobais, setDadosGlobaisLocal] = useState<GlobalData>(defaultGlobalData);
  const [jornadaPorDia, setJornadaPorDiaLocal] = useState<Record<number, any>>({});
  const campaignIdRef = useRef<string | null>(null);
  const { userProfile, loading: authLoading } = useAuth();
  
  const userProfileRef = useRef<{ role: 'gm' | 'player' | null; playerId: string | null }>({ role: null, playerId: null });
  
  // Atualiza imediatamente (sem aguardar useEffect) para evitar descartes silenciosos de dados no callback
  userProfileRef.current = {
    role: (userProfile?.role as 'gm' | 'player') || null,
    playerId: userProfile?.playerId || null,
  };

  // Callbacks para refetch
  const fetchCampaign = useCallback(async () => {
    const { data } = await supabase.from("campaign").select("*").limit(1).single();
    if (data) {
      setDiaAtualLocal(data.current_day);
      setIndiceBlocoAtivoLocal(data.active_block_index);
    }
  }, [supabase]);

  const fetchNpcs = useCallback(async () => {
    const { data } = await supabase.from("npcs").select("*");
    setDadosGlobaisLocal(prev => ({ ...prev, npcs: (data || []).map(mapDBToNpc) }));
  }, [supabase]);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from("players").select("*");
    setDadosGlobaisLocal(prev => ({ ...prev, players: (data || []).map(mapDBToPlayer) }));
  }, [supabase]);

  const fetchSupplies = useCallback(async () => {
    const { data } = await supabase.from("supplies").select("*").limit(1).single();
    setDadosGlobaisLocal(prev => ({ ...prev, food: data ? { water: data.water, food: data.food, people: data.people } : { water: 0, food: 0, people: 0 } }));
  }, [supabase]);

  const fetchJourney = useCallback(async () => {
    const { data: blocks } = await supabase.from("journey_blocks").select("*, journey_days(day_number)");
    if (blocks && blocks.length > 0) {
      const newJornada: Record<number, any> = {};
      blocks.forEach(block => {
        const dayNum = block.journey_days?.day_number;
        if (dayNum) {
          if (!newJornada[dayNum]) newJornada[dayNum] = { blocos: [] };
          newJornada[dayNum].blocos[block.block_index] = {
            weather: block.weather,
            weatherEffect: block.weather_effect,
            timeline: block.timeline || [],
            plots: block.plots || [],
            sidequests: block.sidequests || [],
            playerSessions: block.player_sessions || {}
          };
        }
      });
      setJornadaPorDiaLocal(newJornada);
    }
  }, [supabase]);

  const fetchMaps = useCallback(async () => {
    const { data } = await supabase.from("maps").select("*");
    setDadosGlobaisLocal(prev => ({ ...prev, maps: data || [] }));
  }, [supabase]);

  // Hook de Realtime
  const syncChannel = useRealtimeSync(supabase, {
    onNpcsChange: fetchNpcs,
    onPlayersChange: fetchPlayers,
    onCampaignChange: fetchCampaign,
    onJourneyChange: fetchJourney,
    onSuppliesChange: fetchSupplies,
    onMapsChange: fetchMaps,
  });

  const userProfileId = userProfile?.id;
  const userProfileRole = userProfile?.role;

  useEffect(() => {
    if (authLoading) return;
    // Aguardar até que o perfil esteja completamente carregado (não apenas authLoading=false)
    // Se há userProfileId mas o perfil ainda não chegou, aguardar
    if (userProfileId && !userProfileRole) return;
    // Se authLoading acabou mas o perfil ainda não foi populado, aguardar mais um ciclo
    // Isso evita rodar o fetch sem saber o role (GM ou Player)
    if (!userProfile) return;

    async function fetchInitialData() {
      console.log("[useGameSync] fetchInitialData started", { role: userProfileRef.current.role });
      try {
        const [campaignResp, npcsResp, playersResp, suppliesResp, mapsResp, blocksResp] = await Promise.all([
          supabase.from("campaign").select("*").limit(1).maybeSingle(),
          supabase.from("npcs").select("*"),
          supabase.from("players").select("*"),
          supabase.from("supplies").select("*").limit(1).maybeSingle(),
          supabase.from("maps").select("*"),
          supabase.from("journey_blocks").select("*, journey_days(day_number)")
        ]);
        
        console.log("[useGameSync] Fetch responses:", {
           campaign: campaignResp.data,
           campaignErr: campaignResp.error,
           blocks: blocksResp.data?.length,
           blocksErr: blocksResp.error
        });

        let campaign = campaignResp.data;
        if (!campaign && userProfileRef.current.role === 'gm') {
          const { data: newCampaign, error } = await supabase.from("campaign")
            .insert({ name: 'Campanha MyRPG', current_day: 1, active_block_index: 0 })
            .select("*").single();
          if (!error && newCampaign) {
            campaign = newCampaign;
          }
        }

        if (campaign) {
          campaignIdRef.current = campaign.id;
          setDiaAtualLocal(campaign.current_day);
          setIndiceBlocoAtivoLocal(campaign.active_block_index);
        }

        const npcs = npcsResp.data;
        const players = playersResp.data;
        const supplies = suppliesResp.data;
        const maps = mapsResp.data;
        const blocks = blocksResp.data;

        setDadosGlobaisLocal({
          npcs: (npcs || []).map(mapDBToNpc),
          players: (players || []).map(mapDBToPlayer),
          food: supplies ? { water: supplies.water, food: supplies.food, people: supplies.people } : { water: 0, food: 0, people: 0 },
          maps: maps || []
        });

        if (blocks && blocks.length > 0) {
          console.log("[useGameSync] Found blocks, hydrating from DB", blocks.length);
          const newJornada: Record<number, any> = {};
          blocks.forEach(block => {
            const dayNum = block.journey_days?.day_number;
            if (dayNum) {
              if (!newJornada[dayNum]) newJornada[dayNum] = { blocos: [] };
              newJornada[dayNum].blocos[block.block_index] = {
                weather: block.weather,
                weatherEffect: block.weather_effect,
                timeline: block.timeline || [],
                plots: block.plots || [],
                sidequests: block.sidequests || [],
                playerSessions: block.player_sessions || {}
              };
            }
          });
          console.log("[useGameSync] Setting newJornada:", Object.keys(newJornada));
          setJornadaPorDiaLocal(newJornada);
        } else {
          console.log("[useGameSync] No blocks found in DB, hydrating local defaults");
          // Se o banco estiver zerado, hidrata a jornada local imediatamente com a configuração padrão
          setJornadaPorDiaLocal(getInitialJornada());
        }
      } catch (error: any) {
        console.error("Erro ao carregar dados do Supabase:", error);
        console.error("Erro ao carregar dados do Supabase:", error);
        window.dispatchEvent(new CustomEvent('system-alert', { detail: { message: `Erro ao sincronizar dados: ${error.message || 'Desconhecido'}`, type: 'danger' } }));
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [supabase, authLoading, userProfileId, userProfileRole, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setters wrap local state update and Supabase mutation
  const setDiaAtual = useCallback((val: number | ((prev: number) => number)) => {
    setDiaAtualLocal(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (campaignIdRef.current) {
        supabase.from("campaign").update({ current_day: next }).eq("id", campaignIdRef.current)
          .then(({ error }) => { 
            if (error) console.error("Erro ao atualizar dia:", error); 
            else syncChannel?.send({ type: 'broadcast', event: 'refresh_campaign' });
          });
      }
      return next;
    });
  }, [supabase, syncChannel]);

  const setIndiceBlocoAtivo = useCallback((val: number | ((prev: number) => number)) => {
    setIndiceBlocoAtivoLocal(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (campaignIdRef.current) {
        supabase.from("campaign").update({ active_block_index: next }).eq("id", campaignIdRef.current)
          .then(({ error }) => { 
            if (error) console.error("Erro ao atualizar bloco:", error); 
            else syncChannel?.send({ type: 'broadcast', event: 'refresh_campaign' });
          });
      }
      return next;
    });
  }, [supabase, syncChannel]);

  const setDadosGlobais = useCallback((val: GlobalData | ((prev: GlobalData) => GlobalData)) => {
    setDadosGlobaisLocal(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (!campaignIdRef.current) return next;
      const cid = campaignIdRef.current;
      const { role, playerId } = userProfileRef.current;

      // Sync deltas
      // NPCs
      if (prev.npcs !== next.npcs && role === 'gm') {
        const changedNpcs = next.npcs.filter(n => {
          const prevNpc = prev.npcs.find(pn => pn.id === n.id);
          return !prevNpc || JSON.stringify(prevNpc) !== JSON.stringify(n);
        });

        if (changedNpcs.length > 0) {
          const mappedNpcs = changedNpcs.map(n => mapNpcToDB(n, cid));
          supabase.from("npcs").upsert(mappedNpcs).then(({ error }) => {
            if (error) {
              window.dispatchEvent(new CustomEvent('system-alert', { detail: { message: `Erro do banco de dados ao salvar NPC: ${error.message}`, type: 'danger' } }));
            } else {
              syncChannel?.send({ type: 'broadcast', event: 'refresh_npcs' });
            }
          });
        }
        
        const prevIds = prev.npcs.map(n => n.id);
        const nextIds = new Set(next.npcs.map(n => n.id));
        const deletedIds = prevIds.filter(id => !nextIds.has(id));
        if (deletedIds.length > 0) {
          supabase.from("npcs").delete().in("id", deletedIds).then(({ error }) => {
            if (error) console.error("Erro ao deletar NPCs no Supabase:", error);
            else syncChannel?.send({ type: 'broadcast', event: 'refresh_npcs' });
          });
        }
      }
      // Players
      if (prev.players !== next.players) {
        const changedPlayers = next.players.filter(p => {
          const prevPlayer = prev.players.find(pp => pp.id === p.id);
          return !prevPlayer || JSON.stringify(prevPlayer) !== JSON.stringify(p);
        });

        if (changedPlayers.length > 0) {
          const mappedPlayers = changedPlayers.map(p => mapPlayerToDB(p, cid));
          if (role === 'gm') {
            supabase.from("players").upsert(mappedPlayers).then(({ error }) => {
              if (error) {
                window.dispatchEvent(new CustomEvent('system-alert', { detail: { message: `Erro do banco de dados ao salvar Player: ${error.message}`, type: 'danger' } }));
              } else {
                syncChannel?.send({ type: 'broadcast', event: 'refresh_players' });
              }
            });
          } else if (role === 'player' && playerId) {
            const myPlayer = mappedPlayers.find(p => p.id === playerId);
            if (myPlayer) {
              supabase.from("players").update(myPlayer).eq("id", playerId).then(({ error }) => {
                if (error) {
                  window.dispatchEvent(new CustomEvent('system-alert', { detail: { message: `Erro ao salvar seu Player: ${error.message}`, type: 'danger' } }));
                } else {
                  syncChannel?.send({ type: 'broadcast', event: 'refresh_players' });
                }
              });
            }
          }
        }

        const prevIds = prev.players.map(p => p.id);
        const nextIds = new Set(next.players.map(p => p.id));
        const deletedIds = prevIds.filter(id => !nextIds.has(id));
        if (deletedIds.length > 0 && role === 'gm') {
          supabase.from("players").delete().in("id", deletedIds).then(({ error }) => {
            if (error) console.error("Erro ao deletar players no Supabase:", error);
            else syncChannel?.send({ type: 'broadcast', event: 'refresh_players' });
          });
        }
      }
      // Food
      if (prev.food !== next.food && role === 'gm') {
        supabase.from("supplies").upsert({
          campaign_id: cid,
          water: next.food.water,
          food: next.food.food,
          people: next.food.people
        }, { onConflict: 'campaign_id' }).then(({ error }) => {
          if (error) console.error("Erro ao salvar suprimentos:", error);
          else syncChannel?.send({ type: 'broadcast', event: 'refresh_supplies' });
        });
      }
      
      return next;
    });
  }, [supabase, syncChannel]);

  const setJornadaPorDia = useCallback((val: Record<number, any> | ((prev: Record<number, any>) => Record<number, any>)) => {
    setJornadaPorDiaLocal(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (!campaignIdRef.current) return next;
      const cid = campaignIdRef.current;
      const { role } = userProfileRef.current;

      // Sync all modified days
      const allDays = new Set([
        ...Object.keys(prev).map(Number),
        ...Object.keys(next).map(Number)
      ]);

      allDays.forEach(day => {
        if (prev[day] !== next[day] && next[day] && next[day].blocos) {
          syncJourneyToSupabase(cid, day, next[day].blocos, supabase, syncChannel, role, userProfileRef.current.playerId);
        }
      });
      return next;
    });
  }, [supabase, syncChannel]);

  return {
    diaAtual,
    setDiaAtual,
    indiceBlocoAtivo,
    setIndiceBlocoAtivo,
    dadosGlobais,
    setDadosGlobais,
    jornadaPorDia,
    setJornadaPorDia,
    loading
  };
}

// Helper to sync journey blocks
async function syncJourneyToSupabase(campaignId: string, dayNumber: number, blocos: any[], supabase: any, syncChannel: any, role: string | null, playerId: string | null) {
  try {
    if (role === 'gm') {
      // 1. Upsert day
      const { data: dayData } = await supabase.from("journey_days")
        .upsert({ campaign_id: campaignId, day_number: dayNumber }, { onConflict: 'campaign_id,day_number' })
        .select('id').single();

      if (!dayData) return;

      // 2. Upsert blocks
      const mappedBlocks = blocos.map((b, index) => ({
        day_id: dayData.id,
        block_index: index,
        weather: b?.weather || 'clear',
        weather_effect: b?.weatherEffect || 'clear',
        timeline: b?.timeline || [],
        plots: b?.plots || [],
        sidequests: b?.sidequests || [],
        player_sessions: b?.playerSessions || {}
      }));

      await supabase.from("journey_blocks").upsert(mappedBlocks, { onConflict: 'day_id,block_index' });
      syncChannel?.send({ type: 'broadcast', event: 'refresh_journey' });
      
    } else if (role === 'player' && playerId) {
      // Find the block IDs first
      const { data: dayData } = await supabase.from("journey_days").select("id").eq("campaign_id", campaignId).eq("day_number", dayNumber).single();
      if (!dayData) return;
      
      const { data: blockRecords } = await supabase.from("journey_blocks").select("id, block_index").eq("day_id", dayData.id);
      
      if (blockRecords) {
         for (const b of blockRecords) {
            const localBlock = blocos[b.block_index];
            const playerSession = localBlock?.playerSessions?.[playerId];
            if (playerSession) {
               await supabase.rpc('merge_player_session', { p_block_id: b.id, p_player_id: playerId, p_session_data: playerSession });
            }
         }
         syncChannel?.send({ type: 'broadcast', event: 'refresh_journey' });
      }
    }
  } catch (error) {
    console.error("Erro ao sincronizar jornada:", error);
  }
}

