"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DiaryEntry, Mural } from "@/types/cronicas";
import { createClient } from "@/lib/supabase/client";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Diário ───────────────────────────────────────────────
export function useDiario() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useSystemDialog();
  const supabase = useMemo(() => createClient(), []);
  const { loading: authLoading } = useAuth();

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('diary_entries').select('*').order('created_at', { ascending: false });
      if (error) throw error;
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
    if (authLoading) return;
    
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
  }, [fetchEntries, authLoading, supabase]);

  const add = useCallback(async (entry: DiaryEntry) => {
    try {
      const { data: campaign } = await supabase.from('campaign').select('id').limit(1).maybeSingle();
      const row = {
        id: entry.id,
        campaign_id: campaign?.id,
        session_number: entry.sessionNumber,
        session_title: entry.sessionTitle,
        author_id: entry.authorId,
        author_name: entry.authorName,
        content: entry.content,
        image_url: entry.imageUrl,
        likes: entry.likes,
        comments: entry.comments,
      };
      const { error } = await supabase.from('diary_entries').insert(row);
      if (error) throw error;
      setEntries(prev => [entry, ...prev]);
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao salvar diário: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('diary_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao deletar: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  const update = useCallback(async (entry: DiaryEntry) => {
    try {
      const row = {
        session_number: entry.sessionNumber,
        session_title: entry.sessionTitle,
        content: entry.content,
        image_url: entry.imageUrl,
        likes: entry.likes,
        comments: entry.comments,
      };
      const { error } = await supabase.from('diary_entries').update(row).eq('id', entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao atualizar diário: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [supabase, showAlert]);

  return { entries, loading, add, update, remove };
}

// ── Murais ───────────────────────────────────────────────
export function useMurais() {
  const [murais, setMurais] = useState<Mural[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useSystemDialog();
  const supabase = useMemo(() => createClient(), []);
  const { loading: authLoading } = useAuth();

  const fetchMurais = useCallback(async () => {
    try {
      const { data: mData, error: mErr } = await supabase.from('murals').select('*');
      if (mErr) throw mErr;
      const { data: cData, error: cErr } = await supabase.from('mural_cards').select('*');
      if (cErr) throw cErr;
      const { data: lData, error: lErr } = await supabase.from('mural_connections').select('*');
      if (lErr) throw lErr;
      
      const mapped = (mData || []).map(m => {
        const cards = (cData || []).filter(c => c.mural_id === m.id).map(c => ({
          id: c.id,
          muralId: c.mural_id,
          type: c.type,
          title: c.title,
          content: c.content,
          imageUrl: c.image_url,
          refId: c.ref_id,
          position: { x: c.pos_x, y: c.pos_y },
          createdBy: c.created_by,
          createdAt: c.created_at || new Date().toISOString()
        }));
        const links = (lData || []).filter(l => l.mural_id === m.id).map(l => ({
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
    if (authLoading) return;
    
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
  }, [fetchMurais, supabase, authLoading]);

  const save = useCallback(async (mural: Mural) => {
    try {
      const { data: campaign } = await supabase.from('campaign').select('id').limit(1).maybeSingle();
      const cid = campaign?.id;
      
      const { error: mErr } = await supabase.from('murals').upsert({
        id: mural.id,
        campaign_id: cid,
        name: mural.name,
        background_style: mural.backgroundStyle
      });
      if (mErr) throw mErr;

      // Upsert and delete cards
      if (mural.cards && mural.cards.length > 0) {
        const cardsToInsert = mural.cards.map(c => ({
          id: c.id,
          mural_id: mural.id,
          campaign_id: cid,
          type: c.type,
          title: c.title,
          content: c.content,
          image_url: c.imageUrl,
          ref_id: c.refId,
          pos_x: c.position.x,
          pos_y: c.position.y,
          created_by: c.createdBy
        }));
        await supabase.from('mural_cards').upsert(cardsToInsert);
        const cardIds = mural.cards.map(c => c.id);
        if (cardIds.length > 0) {
          // Use proper bracket notation for uuid arrays or strings array in filter
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
          campaign_id: cid,
          from_card_id: c.fromCardId,
          to_card_id: c.toCardId,
          label: c.label,
          color: c.color
        }));
        await supabase.from('mural_connections').upsert(connsToInsert);
        const connIds = mural.connections.map(c => c.id);
        if (connIds.length > 0) {
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
      
      // Envia evento de atualização para outros clientes não estarem engessados esperando postgres_changes que pode dar timeout em cascades
      if (muralChannelRef.current) {
        muralChannelRef.current.send({
          type: 'broadcast',
          event: 'mural_updated',
          payload: { muralId: mural.id }
        });
      }
    } catch (error: any) {
      console.error("Erro ao salvar mural:", error);
      showAlert({ title: "Erro", message: "Falha ao tentar salvar o mural. " + (error.message || JSON.stringify(error)), type: "danger" });
    }
  }, [showAlert]);

  const remove = useCallback(async (id: string) => {
    try {
      await supabase.from('mural_connections').delete().eq('mural_id', id);
      await supabase.from('mural_cards').delete().eq('mural_id', id);
      await supabase.from('murals').delete().eq('id', id);
      setMurais(prev => prev.filter(m => m.id !== id));
    } catch (e: any) { showAlert({ title: "Erro", message: "Erro ao deletar: " + (e.message || JSON.stringify(e)), type: "danger" }); }
  }, [showAlert]);

  return { murais, loading, save, remove };
}
