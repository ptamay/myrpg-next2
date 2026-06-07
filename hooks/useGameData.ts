"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCampaignId } from "@/lib/supabase/campaignCache";
import { GlobalData, Npc, Player } from "@/lib/gameData";
import { mapDBToNpc, mapDBToPlayer, mapNpcToDB, mapPlayerToDB } from "@/lib/supabase/mappers";
import { getInitialJornada } from "@/lib/dataHelpers";
import { useUserSession } from "@/contexts/UserSessionContext";
import { DiaryEntry, Mural } from "@/types/cronicas";
import { useSystemDialog } from "@/contexts/SystemDialogContext";

// ─────────────────────────────────────────────────────────────
// useCampaignInfo
// ─────────────────────────────────────────────────────────────
export function useCampaignInfo() {
  const [diaAtual, setDiaAtualLocal] = useState<number>(1);
  const [indiceBlocoAtivo, setIndiceBlocoAtivoLocal] = useState<number>(0);
  const [jornadaPorDia, setJornadaPorDiaLocal] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useUserSession();
  const role = profile?.role;
  const playerId = profile?.player_id;

  const fetchCampaign = useCallback(async () => {
    try {
      const { data: campaign } = await supabase
        .from("campaign")
        .select("id, current_day, active_block_index")
        .limit(1)
        .maybeSingle();
      if (campaign) {
        setDiaAtualLocal(campaign.current_day);
        setIndiceBlocoAtivoLocal(campaign.active_block_index);
      }
      
      const { data: blocks } = await supabase
        .from("journey_blocks")
        .select("block_index, weather, weather_effect, timeline, plots, sidequests, player_sessions, journey_days(day_number)");
      if (blocks && blocks.length > 0) {
        const newJornada: Record<number, any> = {};
        blocks.forEach((block: any) => {
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
      } else {
        setJornadaPorDiaLocal(getInitialJornada());
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar campanha.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCampaign();
    const handler = () => fetchCampaign();
    window.addEventListener('sync_campaign_update', handler);
    window.addEventListener('sync_journey_update', handler);
    return () => {
      window.removeEventListener('sync_campaign_update', handler);
      window.removeEventListener('sync_journey_update', handler);
    };
  }, [fetchCampaign]);

  const setDiaAtual = useCallback(async (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(diaAtual) : val;
    setDiaAtualLocal(next);
    if (role === 'gm') {
      const campaignId = await getCampaignId();
      if (campaignId) {
        await supabase.from("campaign").update({ current_day: next }).eq("id", campaignId);
        window.dispatchEvent(new CustomEvent('sync_campaign_update'));
        window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'campaign_update', payload: {} } }));
      }
    }
  }, [diaAtual, role, supabase]);

  const setIndiceBlocoAtivo = useCallback(async (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(indiceBlocoAtivo) : val;
    setIndiceBlocoAtivoLocal(next);
    if (role === 'gm') {
      const campaignId = await getCampaignId();
      if (campaignId) {
        await supabase.from("campaign").update({ active_block_index: next }).eq("id", campaignId);
        window.dispatchEvent(new CustomEvent('sync_campaign_update'));
        window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'campaign_update', payload: {} } }));
      }
    }
  }, [indiceBlocoAtivo, role, supabase]);

  const setJornadaPorDia = useCallback(async (val: Record<number, any> | ((prev: Record<number, any>) => Record<number, any>)) => {
    const next = typeof val === 'function' ? val(jornadaPorDia) : val;
    setJornadaPorDiaLocal(next);
    
    // Sync to Supabase
    try {
      const campaignId = await getCampaignId();
      if (!campaignId) return;
      const campaign = { id: campaignId };

      const allDays = new Set([
        ...Object.keys(jornadaPorDia).map(Number),
        ...Object.keys(next).map(Number)
      ]);

      for (const day of Array.from(allDays)) {
        if (jornadaPorDia[day] && !next[day]) {
          if (role === 'gm') {
            const { data: dayData } = await supabase.from("journey_days").select('id').eq('campaign_id', campaign.id).eq('day_number', day).maybeSingle();
            if (dayData) {
              await supabase.from("journey_blocks").delete().eq("day_id", dayData.id);
              await supabase.from("journey_days").delete().eq("id", dayData.id);
            }
          }
        } else if (jornadaPorDia[day] !== next[day] && next[day]?.blocos) {
          if (role === 'gm') {
            const { data: dayData } = await supabase.from("journey_days")
              .upsert({ campaign_id: campaign.id, day_number: day }, { onConflict: 'campaign_id,day_number' })
              .select('id').single();

            if (dayData) {
              const mappedBlocks = next[day].blocos.map((b: any, index: number) => ({
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
            }
          } else if (role === 'player' && playerId) {
            const { data: dayData } = await supabase.from("journey_days").select("id").eq("campaign_id", campaign.id).eq("day_number", day).single();
            if (dayData) {
              const { data: blockRecords } = await supabase.from("journey_blocks").select("id, block_index").eq("day_id", dayData.id);
              if (blockRecords) {
                 for (const b of blockRecords) {
                    const localBlock = next[day].blocos[b.block_index];
                    const playerSession = localBlock?.playerSessions?.[playerId];
                    if (playerSession) {
                       await supabase.rpc('merge_player_session', { p_block_id: b.id, p_player_id: playerId, p_session_data: playerSession });
                    }
                 }
              }
            }
          }
        }
      }
      window.dispatchEvent(new CustomEvent('sync_journey_update'));
      window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'block_update', payload: {} } }));
    } catch (err) {
      console.error("Erro ao salvar jornada", err);
    }
  }, [jornadaPorDia, role, playerId, supabase]);

  return { diaAtual, setDiaAtual, indiceBlocoAtivo, setIndiceBlocoAtivo, jornadaPorDia, setJornadaPorDia, loading, error };
}

// ─────────────────────────────────────────────────────────────
// useNpcs
// ─────────────────────────────────────────────────────────────
export function useNpcs() {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const npcsRef = useRef<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, sessionLoading } = useUserSession();
  const role = profile?.role;

  // Voltando para '*' porque algumas das colunas virtuais/frontend não existem no Supabase e quebravam a query
  const NPC_FIELDS = "*";

  const fetchNpcs = useCallback(async () => {
    try {
      const { data } = await supabase.from("npcs").select(NPC_FIELDS);
      const mapped = (data || []).map(mapDBToNpc);
      npcsRef.current = mapped;
      setNpcs(mapped);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar NPCs.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    fetchNpcs();

    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.npc) {
        setNpcs(prev => {
          const exists = prev.find(n => n.id === customEvent.detail.npc.id);
          const next = exists 
            ? prev.map(n => n.id === customEvent.detail.npc.id ? customEvent.detail.npc : n) 
            : [...prev, customEvent.detail.npc];
          npcsRef.current = next;
          return next;
        });
      } else {
        fetchNpcs();
      }
    };
    window.addEventListener('force_npcs_refresh', handleLocalUpdate);

    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: any = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) supabase.removeChannel(currentChannel);
      
      const channelId = `npcs_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      currentChannel = supabase.channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "npcs" }, (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedNpc = mapDBToNpc(payload.new as any);
            setNpcs(prev => {
              const exists = prev.find(n => n.id === updatedNpc.id);
              const next = exists ? prev.map(n => n.id === updatedNpc.id ? updatedNpc : n) : [...prev, updatedNpc];
              npcsRef.current = next;
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            setNpcs(prev => {
              const next = prev.filter(n => n.id !== payload.old.id);
              npcsRef.current = next;
              return next;
            });
          }
        });
        
      currentChannel.subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          reconnectTimer = setTimeout(connect, 5000);
        }
      });
    };

    connect();

    return () => {
      isMounted = false;
      window.removeEventListener('force_npcs_refresh', handleLocalUpdate);
      clearTimeout(reconnectTimer);
      if (currentChannel) supabase.removeChannel(currentChannel);
    };
  }, [fetchNpcs, sessionLoading, supabase]);

  const saveNpcs = useCallback(async (val: Npc[] | ((prev: Npc[]) => Npc[])) => {
    if (role !== 'gm') return;
    const currentNpcs = npcsRef.current;
    const next = typeof val === 'function' ? val(currentNpcs) : val;
    npcsRef.current = next;
    setNpcs(next);

    try {
      const campaignId = await getCampaignId();
      if (!campaignId) return;
      const campaign = { id: campaignId };

      const changedNpcs = next.filter(n => {
        const old = currentNpcs.find(o => o.id === n.id);
        return !old || JSON.stringify(old) !== JSON.stringify(n);
      });

      if (changedNpcs.length > 0) {
        const { error } = await supabase.from("npcs").upsert(changedNpcs.map(n => mapNpcToDB(n, campaign.id)));
        if (error) throw new Error(error.message || JSON.stringify(error));
      }

      const prevIds = currentNpcs.map(n => n.id);
      const nextIds = new Set(next.map(n => n.id));
      const deletedIds = prevIds.filter(id => !nextIds.has(id));
      
      if (deletedIds.length > 0) {
        await supabase.from("npcs").delete().in("id", deletedIds);
      }
    } catch (err) {
      console.error("Erro ao salvar NPCs", err);
    }
  }, [role, supabase]);

  return { npcs, setNpcs: saveNpcs, loading, error };
}

// ─────────────────────────────────────────────────────────────
// usePlayers
// ─────────────────────────────────────────────────────────────
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const playersRef = useRef<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, sessionLoading } = useUserSession();
  const role = profile?.role;
  const playerId = profile?.player_id;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Voltando para '*' porque algumas colunas mapeadas no frontend não existem nativamente no Postgres
  const PLAYER_FIELDS = "*";

  const fetchPlayers = useCallback(async () => {
    try {
      const { data } = await supabase.from("players").select(PLAYER_FIELDS);
      const mapped = (data || []).map(mapDBToPlayer);
      playersRef.current = mapped;
      setPlayers(mapped);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar Jogadores.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    fetchPlayers();

    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.player) {
        setPlayers(prev => {
          const exists = prev.find(p => p.id === customEvent.detail.player.id);
          const next = exists 
            ? prev.map(p => p.id === customEvent.detail.player.id ? customEvent.detail.player : p) 
            : [...prev, customEvent.detail.player];
          playersRef.current = next;
          return next;
        });
      } else {
        fetchPlayers(); // fallback
      }
    };
    window.addEventListener('force_players_refresh', handleLocalUpdate);

    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: any = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) supabase.removeChannel(currentChannel);
      
      const channelId = `players_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      currentChannel = supabase.channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "players" }, (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedPlayer = mapDBToPlayer(payload.new as any);
            setPlayers(prev => {
              const exists = prev.find(p => p.id === updatedPlayer.id);
              const next = exists ? prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p) : [...prev, updatedPlayer];
              playersRef.current = next;
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => {
              const next = prev.filter(p => p.id !== payload.old.id);
              playersRef.current = next;
              return next;
            });
          }
        });
        
      currentChannel.subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          reconnectTimer = setTimeout(connect, 5000);
        }
      });
    };

    connect();

    return () => {
      isMounted = false;
      window.removeEventListener('force_players_refresh', handleLocalUpdate);
      clearTimeout(reconnectTimer);
      if (currentChannel) supabase.removeChannel(currentChannel);
    };
  }, [fetchPlayers, sessionLoading, supabase]);

  const savePlayers = useCallback((val: Player[] | ((prev: Player[]) => Player[])) => {
    const currentPlayers = playersRef.current;
    const next = typeof val === 'function' ? val(currentPlayers) : val;
    playersRef.current = next;
    setPlayers(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const campaignId = await getCampaignId();
        if (!campaignId) return;
        const campaign = { id: campaignId };

        const changedPlayers = next.filter(p => {
          const old = currentPlayers.find(o => o.id === p.id);
          return !old || JSON.stringify(old) !== JSON.stringify(p);
        });

        const mapped = changedPlayers.map(p => mapPlayerToDB(p, campaign.id));
        
        if (mapped.length > 0) {
          if (role === 'gm') {
            const { error } = await supabase.from("players").upsert(mapped);
            if (error) throw new Error(error.message || JSON.stringify(error));
          } else if (role === 'player' && playerId) {
            const myPlayer = mapped.find(p => p.id === playerId);
            if (myPlayer) {
              const { error } = await supabase.from("players").update(myPlayer).eq("id", playerId);
              if (error) throw new Error(error.message || JSON.stringify(error));
            }
          }
        }

        if (role === 'gm') {
          const prevIds = currentPlayers.map(n => n.id);
          const nextIds = new Set(next.map(n => n.id));
          const deletedIds = prevIds.filter(id => !nextIds.has(id));
          if (deletedIds.length > 0) {
            await supabase.from("players").delete().in("id", deletedIds);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar Players", err);
      }
    }, 500);
  }, [role, playerId, supabase]);

  return { players, setPlayers: savePlayers, loading, error };
}

// ─────────────────────────────────────────────────────────────
// useSupplies
// ─────────────────────────────────────────────────────────────
export function useSupplies() {
  const [food, setFood] = useState({ water: 0, food: 0, people: 0 });
  const [loading, setLoading] = useState(true);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useUserSession();

  const fetchSupplies = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("supplies")
        .select("water, food, people")
        .limit(1)
        .maybeSingle();
      if (data) {
        setFood({ water: data.water, food: data.food, people: data.people });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSupplies();
    const handler = () => fetchSupplies();
    window.addEventListener('sync_supply_update', handler);
    return () => window.removeEventListener('sync_supply_update', handler);
  }, [fetchSupplies]);

  const saveSupplies = useCallback(async (val: any | ((prev: any) => any)) => {
    if (profile?.role !== 'gm') return;
    const next = typeof val === 'function' ? val(food) : val;
    setFood(next);

    try {
      const campaignId = await getCampaignId();
      if (campaignId) {
        await supabase.from("supplies").upsert({
          campaign_id: campaignId,
          water: next.water,
          food: next.food,
          people: next.people
        }, { onConflict: 'campaign_id' });
        window.dispatchEvent(new CustomEvent('sync_supply_update'));
        window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'supply_update', payload: {} } }));
      }
    } catch (err) {
      console.error(err);
    }
  }, [food, profile?.role, supabase]);

  return { food, setFood: saveSupplies, loading };
}

// ─────────────────────────────────────────────────────────────
// useDiario
// ─────────────────────────────────────────────────────────────
export function useDiario() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useSystemDialog();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { sessionLoading } = useUserSession();

  const fetchEntries = useCallback(async () => {
    try {
      // Carrega apenas campos de listagem — 'content' (texto longo) é carregado sob demanda
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, session_number, session_title, author_id, author_name, image_url, likes, comments, created_at, content')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error?.message || JSON.stringify(error));
      if (data) {
        setEntries(data.map((d: any) => ({
          id: d.id,
          sessionNumber: d.session_number,
          sessionTitle: d.session_title,
          authorId: d.author_id,
          authorName: d.author_name,
          content: d.content,
          imageUrl: d.image_url,
          likes: d.likes || [],
          comments: d.comments || [],
          createdAt: d.created_at || new Date().toISOString()
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar diário:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    
    fetchEntries();

    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: any = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) supabase.removeChannel(currentChannel);
      
      const channelId = `diary_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      currentChannel = supabase.channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "diary_entries" }, (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const d = payload.new as any;
            const updated = {
              id: d.id,
              sessionNumber: d.session_number,
              sessionTitle: d.session_title,
              authorId: d.author_id,
              authorName: d.author_name,
              content: d.content,
              imageUrl: d.image_url,
              likes: d.likes || [],
              comments: d.comments || [],
              createdAt: d.created_at || new Date().toISOString()
            };
            setEntries(prev => {
              const exists = prev.find(e => e.id === updated.id);
              if (exists) return prev.map(e => e.id === updated.id ? updated : e);
              return [updated, ...prev].sort((a, b) => b.sessionNumber - a.sessionNumber);
            });
          } else if (payload.eventType === 'DELETE') {
            setEntries(prev => prev.filter(e => e.id !== payload.old.id));
          }
        });
        
      currentChannel.subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error(`[diary_sync] Status: ${status}. Reconectando em 5s...`);
          reconnectTimer = setTimeout(connect, 5000);
        }
      });
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (currentChannel) supabase.removeChannel(currentChannel);
    };
  }, [fetchEntries, sessionLoading, supabase]);

  const add = useCallback(async (entry: DiaryEntry) => {
    try {
      const campaignId = await getCampaignId();
      const row = {
        id: entry.id,
        campaign_id: campaignId,
        session_number: entry.sessionNumber,
        session_title: entry.sessionTitle,
        title: entry.sessionTitle || `Sessão ${entry.sessionNumber}`,
        author_id: entry.authorId,
        author_name: entry.authorName,
        content: entry.content,
        image_url: entry.imageUrl,
        likes: entry.likes,
        comments: entry.comments,
      };
      const { error } = await supabase.from('diary_entries').insert(row);
      if (error) throw new Error(error?.message || JSON.stringify(error));
      setEntries(prev => [entry, ...prev].sort((a, b) => b.sessionNumber - a.sessionNumber));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao salvar diário: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('diary_entries').delete().eq('id', id);
      if (error) throw new Error(error?.message || JSON.stringify(error));
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao deletar: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  const update = useCallback(async (entry: DiaryEntry) => {
    try {
      const row = {
        session_number: entry.sessionNumber,
        session_title: entry.sessionTitle,
        title: entry.sessionTitle || `Sessão ${entry.sessionNumber}`,
        content: entry.content,
        image_url: entry.imageUrl,
        likes: entry.likes,
        comments: entry.comments,
      };
      const { error } = await supabase.from('diary_entries').update(row).eq('id', entry.id);
      if (error) throw new Error(error?.message || JSON.stringify(error));
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao atualizar diário: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  return { entries, loading, add, update, remove };
}

// ─────────────────────────────────────────────────────────────
// useMurais
// ─────────────────────────────────────────────────────────────
export function useMurais(activeMuralId?: string | null) {
  const [murais, setMurais] = useState<Mural[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useSystemDialog();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { sessionLoading } = useUserSession();

  const MURAL_FIELDS = 'id, name, background_style, created_at';
  const CARD_FIELDS = 'id, mural_id, type, title, content, image_url, ref_id, position_x, position_y, created_by, created_at';
  const CONN_FIELDS = 'id, mural_id, from_card_id, to_card_id, label, color';

  const fetchMurais = useCallback(async () => {
    try {
      // Se há um mural ativo, busca apenas os dados desse mural para reduzir egress
      const { data: mData, error: mErr } = await supabase.from('murals').select(MURAL_FIELDS);
      if (mErr) throw new Error(mErr?.message || JSON.stringify(mErr));

      const { data: cData, error: cErr } = await supabase.from('mural_cards').select(CARD_FIELDS);
      if (cErr) throw new Error(cErr?.message || JSON.stringify(cErr));

      const { data: lData, error: lErr } = await supabase.from('mural_connections').select(CONN_FIELDS);
      if (lErr) throw new Error(lErr?.message || JSON.stringify(lErr));
      
      const mapped = (mData || []).map((m: any) => {
        const cards = (cData || []).filter((c: any) => c.mural_id === m.id).map((c: any) => ({
          id: c.id,
          muralId: c.mural_id,
          type: c.type,
          title: c.title,
          content: c.content,
          imageUrl: c.image_url,
          refId: c.ref_id,
          position: { x: c.position_x || 0, y: c.position_y || 0 },
          createdBy: c.created_by,
          createdAt: c.created_at || new Date().toISOString()
        }));
        const links = (lData || []).filter((l: any) => l.mural_id === m.id).map((l: any) => ({
          id: l.id,
          muralId: l.mural_id,
          fromCardId: l.from_card_id,
          toCardId: l.to_card_id,
          label: l.label,
          color: l.color,
        }));
        return {
          id: m.id,
          name: m.name,
          backgroundStyle: m.background_style,
          cards,
          connections: links,
          createdAt: m.created_at || new Date().toISOString()
        };
      });
      setMurais(mapped);
    } catch (error) {
      console.error("Erro ao buscar murais:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeMuralId]);

  const muralChannelRef = useRef<any>(null);

  useEffect(() => {
    if (sessionLoading) return;
    
    fetchMurais();

    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: any = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) supabase.removeChannel(currentChannel);

      const channelId = `murals_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let channel = supabase.channel(channelId);

      const handleMuralChange = (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const m = payload.new as any;
          setMurais(prev => {
            const updated = {
              id: m.id, name: m.name, backgroundStyle: m.background_style,
              cards: prev.find(x => x.id === m.id)?.cards || [],
              connections: prev.find(x => x.id === m.id)?.connections || [],
              createdAt: m.created_at || new Date().toISOString()
            };
            const exists = prev.find(x => x.id === m.id);
            return exists ? prev.map(x => x.id === m.id ? updated : x) : [...prev, updated];
          });
        } else if (payload.eventType === 'DELETE') {
          setMurais(prev => prev.filter(m => m.id !== payload.old.id));
        }
      };

      const handleCardChange = (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const c = payload.new as any;
          const newCard = { id: c.id, muralId: c.mural_id, type: c.type, title: c.title, content: c.content, imageUrl: c.image_url, refId: c.ref_id, position: { x: c.position_x || 0, y: c.position_y || 0 }, createdBy: c.created_by, createdAt: c.created_at || new Date().toISOString() };
          setMurais(prev => prev.map(m => m.id === c.mural_id ? { ...m, cards: m.cards.find(x => x.id === c.id) ? m.cards.map(x => x.id === c.id ? newCard : x) : [...m.cards, newCard] } : m));
        } else if (payload.eventType === 'DELETE') {
          setMurais(prev => prev.map(m => ({ ...m, cards: m.cards.filter(x => x.id !== payload.old.id) })));
        }
      };

      const handleConnChange = (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const l = payload.new as any;
          const newLink = { id: l.id, muralId: l.mural_id, fromCardId: l.from_card_id, toCardId: l.to_card_id, label: l.label, color: l.color };
          setMurais(prev => prev.map(m => m.id === l.mural_id ? { ...m, connections: m.connections.find(x => x.id === l.id) ? m.connections.map(x => x.id === l.id ? newLink : x) : [...m.connections, newLink] } : m));
        } else if (payload.eventType === 'DELETE') {
          setMurais(prev => prev.map(m => ({ ...m, connections: m.connections.filter(x => x.id !== payload.old.id) })));
        }
      };

      channel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "murals" }, handleMuralChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "mural_cards" }, handleCardChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "mural_connections" }, handleConnChange);

      currentChannel = channel;
      currentChannel.subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error(`[murals_sync] Status: ${status}. Reconectando em 5s...`);
          reconnectTimer = setTimeout(connect, 5000);
        }
      });

      muralChannelRef.current = currentChannel;
    };

    connect();

    const broadcastHandler = (e: any) => {
      // Avoid refetching. postgres_changes already handles the update.
    };
    window.addEventListener('sync_mural_update', broadcastHandler);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (currentChannel) supabase.removeChannel(currentChannel);
      muralChannelRef.current = null;
      window.removeEventListener('sync_mural_update', broadcastHandler);
    };
  }, [fetchMurais, supabase, sessionLoading, activeMuralId]);

  const save = useCallback(async (mural: Mural) => {
    try {
      const { error: mErr } = await supabase.from('murals').upsert({
        id: mural.id,
        name: mural.name,
        background_style: mural.backgroundStyle || 'grid'
      });
      if (mErr) throw new Error(mErr?.message || JSON.stringify(mErr));

      // Upsert and delete cards
      if (mural.cards && mural.cards.length > 0) {
        const cardsToInsert = mural.cards.map(c => ({
          id: c.id,
          mural_id: mural.id,
          type: c.type,
          title: c.title,
          content: c.content,
          image_url: c.imageUrl || null,
          ref_id: c.refId || null,
          position_x: c.position.x,
          position_y: c.position.y,
          created_by: c.createdBy || null
        }));
        const { error: cardsErr } = await supabase.from('mural_cards').upsert(cardsToInsert);
        if (cardsErr) throw new Error(cardsErr?.message || JSON.stringify(cardsErr));
        const cardIds = mural.cards.map(c => c.id);
        if (cardIds.length > 0) {
          // Fixed empty deletion bug
          await supabase.from('mural_cards').delete().eq('mural_id', mural.id).not('id', 'in', `(${cardIds.join(',')})`);
        }
      } else {
        await supabase.from('mural_cards').delete().eq('mural_id', mural.id);
      }
      
      // Upsert and delete connections
      if (mural.connections && mural.connections.length > 0) {
        const connsToInsert = mural.connections.map(c => ({
          id: c.id,
          mural_id: mural.id,
          from_card_id: c.fromCardId,
          to_card_id: c.toCardId,
          label: c.label,
          color: c.color
        }));
        const { error: connsErr } = await supabase.from('mural_connections').upsert(connsToInsert);
        if (connsErr) throw new Error(connsErr?.message || JSON.stringify(connsErr));
        const connIds = mural.connections.map(c => c.id);
        if (connIds.length > 0) {
          // Fixed empty deletion bug
          await supabase.from('mural_connections').delete().eq('mural_id', mural.id).not('id', 'in', `(${connIds.join(',')})`);
        }
      } else {
        await supabase.from('mural_connections').delete().eq('mural_id', mural.id);
      }

      setMurais(prev => {
        const exists = prev.find(m => m.id === mural.id);
        return exists
          ? prev.map(m => m.id === mural.id ? mural : m)
          : [mural, ...prev];
      });
      
      // Broadcast local realtime update
      window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'mural_update', payload: { muralId: mural.id } } }));
      
    } catch (error: any) {
      console.error("Erro ao salvar mural:", error);
      showAlert({ title: "Erro", message: "Falha ao tentar salvar o mural. " + (error.message || JSON.stringify(error)), type: "danger" });
    }
  }, [showAlert, supabase]);

  const remove = useCallback(async (id: string) => {
    try {
      await supabase.from('mural_connections').delete().eq('mural_id', id);
      await supabase.from('mural_cards').delete().eq('mural_id', id);
      await supabase.from('murals').delete().eq('id', id);
      setMurais(prev => prev.filter(m => m.id !== id));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao deletar: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [showAlert, supabase]);

  return { murais, loading, save, remove };
}
