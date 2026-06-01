"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
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
      const { data: campaign } = await supabase.from("campaign").select("*").limit(1).maybeSingle();
      if (campaign) {
        setDiaAtualLocal(campaign.current_day);
        setIndiceBlocoAtivoLocal(campaign.active_block_index);
      }
      
      const { data: blocks } = await supabase.from("journey_blocks").select("*, journey_days(day_number)");
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
      const { data } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (data) {
        await supabase.from("campaign").update({ current_day: next }).eq("id", data.id);
        window.dispatchEvent(new CustomEvent('sync_campaign_update'));
        window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'campaign_update', payload: {} } }));
      }
    }
  }, [diaAtual, role, supabase]);

  const setIndiceBlocoAtivo = useCallback(async (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(indiceBlocoAtivo) : val;
    setIndiceBlocoAtivoLocal(next);
    if (role === 'gm') {
      const { data } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (data) {
        await supabase.from("campaign").update({ active_block_index: next }).eq("id", data.id);
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
      const { data: campaign } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (!campaign) return;

      const allDays = new Set([
        ...Object.keys(jornadaPorDia).map(Number),
        ...Object.keys(next).map(Number)
      ]);

      for (const day of Array.from(allDays)) {
        if (jornadaPorDia[day] !== next[day] && next[day]?.blocos) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useUserSession();
  const role = profile?.role;

  const fetchNpcs = useCallback(async () => {
    try {
      const { data } = await supabase.from("npcs").select("*");
      setNpcs((data || []).map(mapDBToNpc));
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar NPCs.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNpcs();
    const handler = () => fetchNpcs();
    window.addEventListener('sync_npc_update', handler);
    return () => window.removeEventListener('sync_npc_update', handler);
  }, [fetchNpcs]);

  const saveNpcs = useCallback(async (val: Npc[] | ((prev: Npc[]) => Npc[])) => {
    if (role !== 'gm') return;
    const next = typeof val === 'function' ? val(npcs) : val;
    setNpcs(next);

    try {
      const { data: campaign } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (!campaign) return;
      
      const changed = next.filter(n => {
        const p = npcs.find(x => x.id === n.id);
        return !p || JSON.stringify(p) !== JSON.stringify(n);
      });
      if (changed.length > 0) {
        const { error } = await supabase.from("npcs").upsert(changed.map(n => mapNpcToDB(n, campaign.id)));
        if (error) throw new Error(error.message || JSON.stringify(error));
      }
      const prevIds = npcs.map(n => n.id);
      const nextIds = new Set(next.map(n => n.id));
      const deletedIds = prevIds.filter(id => !nextIds.has(id));
      if (deletedIds.length > 0) {
        await supabase.from("npcs").delete().in("id", deletedIds);
      }
      window.dispatchEvent(new CustomEvent('sync_npc_update'));
      window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'npc_update', payload: {} } }));
    } catch (err) {
      console.error("Erro ao salvar NPCs", err);
    }
  }, [npcs, role, supabase]);

  return { npcs, setNpcs: saveNpcs, loading, error };
}

// ─────────────────────────────────────────────────────────────
// usePlayers
// ─────────────────────────────────────────────────────────────
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useUserSession();
  const role = profile?.role;
  const playerId = profile?.player_id;

  const fetchPlayers = useCallback(async () => {
    try {
      const { data } = await supabase.from("players").select("*");
      setPlayers((data || []).map(mapDBToPlayer));
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar Jogadores.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPlayers();
    const handler = () => fetchPlayers();
    window.addEventListener('sync_player_update', handler);
    return () => window.removeEventListener('sync_player_update', handler);
  }, [fetchPlayers]);

  const savePlayers = useCallback(async (val: Player[] | ((prev: Player[]) => Player[])) => {
    const next = typeof val === 'function' ? val(players) : val;
    setPlayers(next);

    try {
      const { data: campaign } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (!campaign) return;

      const changed = next.filter(p => {
        const prevP = players.find(x => x.id === p.id);
        return !prevP || JSON.stringify(prevP) !== JSON.stringify(p);
      });

      if (changed.length > 0) {
        const mapped = changed.map(p => mapPlayerToDB(p, campaign.id));
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
        const prevIds = players.map(n => n.id);
        const nextIds = new Set(next.map(n => n.id));
        const deletedIds = prevIds.filter(id => !nextIds.has(id));
        if (deletedIds.length > 0) {
          await supabase.from("players").delete().in("id", deletedIds);
        }
      }
      window.dispatchEvent(new CustomEvent('sync_player_update'));
      window.dispatchEvent(new CustomEvent('send_broadcast', { detail: { type: 'player_update', payload: {} } }));
    } catch (err) {
      console.error("Erro ao salvar Players", err);
    }
  }, [players, role, playerId, supabase]);

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
      const { data } = await supabase.from("supplies").select("*").limit(1).maybeSingle();
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
      const { data: campaign } = await supabase.from("campaign").select("id").limit(1).maybeSingle();
      if (campaign) {
        await supabase.from("supplies").upsert({
          campaign_id: campaign.id,
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
      const { data, error } = await supabase.from('diary_entries').select('*').order('created_at', { ascending: false });
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
        .on("postgres_changes", { event: "*", schema: "public", table: "diary_entries" }, () => {
          fetchEntries();
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
      const { data: campaign } = await supabase.from('campaign').select('id').limit(1).maybeSingle();
      const row = {
        id: entry.id,
        campaign_id: campaign?.id,
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
export function useMurais() {
  const [murais, setMurais] = useState<Mural[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useSystemDialog();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { sessionLoading } = useUserSession();

  const fetchMurais = useCallback(async () => {
    try {
      const { data: mData, error: mErr } = await supabase.from('murals').select('*');
      if (mErr) throw new Error(mErr?.message || JSON.stringify(mErr));
      const { data: cData, error: cErr } = await supabase.from('mural_cards').select('*');
      if (cErr) throw new Error(cErr?.message || JSON.stringify(cErr));
      const { data: lData, error: lErr } = await supabase.from('mural_connections').select('*');
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
  }, [supabase]);

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
      currentChannel = supabase.channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "murals" }, () => { fetchMurais(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "mural_cards" }, () => { fetchMurais(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "mural_connections" }, () => { fetchMurais(); });

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

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (currentChannel) supabase.removeChannel(currentChannel);
      muralChannelRef.current = null;
    };
  }, [fetchMurais, supabase, sessionLoading]);

  const save = useCallback(async (mural: Mural) => {
    try {
      const { data: campaign } = await supabase.from('campaign').select('id').limit(1).maybeSingle();
      const cid = campaign?.id;
      
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
