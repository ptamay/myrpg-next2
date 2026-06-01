"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { getAllMapsFromDB, saveMapToDB, deleteMapFromDB } from "@/hooks/useMapStorage";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function MapsView() {
  const { dadosGlobais, setDadosGlobais } = useApp();
  const { showConfirm } = useSystemDialog();
  const { isGM } = useUserSession();
  const { loading: authLoading } = useAuth();
  const [mapsLoaded, setMapsLoaded] = useState<{id: string, name: string, data: string}[]>([]);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    
    loadMaps();

    const supabase = getSupabaseClient();
    let reconnectTimer: NodeJS.Timeout;
    let currentChannel: any = null;
    let isMounted = true;

    const connect = () => {
      if (currentChannel) supabase.removeChannel(currentChannel);

      const channelId = `maps_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      currentChannel = supabase.channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "maps" }, () => {
          loadMaps();
        });

      currentChannel.subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error(`[maps_sync] Status: ${status}. Reconectando em 5s...`);
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
  }, [authLoading]);

  const loadMaps = async () => {
    try {
      const maps = await getAllMapsFromDB();
      setMapsLoaded(maps);
    } catch (e) {
      console.error("Failed to load maps", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let mapsAdded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Compressão via canvas (max 5MB e redimensionamento se necessário)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const img = new window.Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 2500; // Limite razoável para mapas de RPG
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round(height * MAX_SIZE / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round(width * MAX_SIZE / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          
          const id = crypto.randomUUID();
          await saveMapToDB(id, file.name, compressedDataUrl);
          mapsAdded++;
          
          if (mapsAdded === files.length) {
            loadMaps();
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (mapsLoaded.length === 0) return;
    const currentMap = mapsLoaded[currentMapIndex];
    if (await showConfirm({ title: "Excluir Mapa", message: `Tem certeza que deseja excluir o mapa ${currentMap.name}?`, type: "danger" })) {
      await deleteMapFromDB(currentMap.id);
      setCurrentMapIndex(0);
      loadMaps();
    }
  };

  return (
    <div className="maps-view-container" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: 0 }}>
      <header className="npc-header glass-panel">
        <div className="npc-header-info">
          <h1 className="view-title">Mapas e Níveis</h1>
          <p className="view-subtitle">{isGM ? "Faça o upload e gerencie os mapas da sua campanha." : "Explore os cenários da campanha."}</p>
        </div>
        {isGM && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input type="file" accept="image/*" multiple className="hidden" id="input-map-upload" onChange={handleFileUpload} />
            <label htmlFor="input-map-upload" className="btn primary-btn" style={{ cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Adicionar Mapas</span>
            </label>
          </div>
        )}
      </header>

      <div className="maps-carousel-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", height: "calc(100vh - 150px)", maxHeight: "100%", overflow: "hidden", position: "relative" }}>
        <div className="maps-indicators glass-panel custom-scrollbar" style={{ display: "flex", gap: "0.5rem", padding: "0.75rem", overflowX: "auto", flexShrink: 0, minHeight: "60px" }}>
          {mapsLoaded.map((map, idx) => (
            <div 
              key={map.id} 
              className={`map-indicator ${idx === currentMapIndex ? 'active' : ''}`}
              title={map.name}
              onClick={() => setCurrentMapIndex(idx)}
              style={{
                width: "40px", height: "40px", borderRadius: "6px", cursor: "pointer", 
                border: idx === currentMapIndex ? "2px solid var(--accent-primary)" : "2px solid transparent",
                opacity: idx === currentMapIndex ? 1 : 0.6, transition: "all 0.2s", overflow: "hidden"
              }}
            >
              <img src={map.data} alt={map.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>

        <div className="maps-carousel-container glass-panel" style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1rem" }}>
          <button 
            className="btn secondary-btn icon-only" 
            onClick={() => setCurrentMapIndex(prev => Math.max(0, prev - 1))}
            style={{ position: "absolute", left: "1rem", zIndex: 10, borderRadius: "50%", width: "40px", height: "40px", display: mapsLoaded.length > 1 ? "flex" : "none" }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {mapsLoaded.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                </svg>
                <p>Nenhum mapa adicionado. Faça upload para começar.</p>
              </div>
            ) : (
              <img src={mapsLoaded[currentMapIndex]?.data} alt="Mapa" loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} />
            )}
          </div>

          <button 
            className="btn secondary-btn icon-only" 
            onClick={() => setCurrentMapIndex(prev => Math.min(mapsLoaded.length - 1, prev + 1))}
            style={{ position: "absolute", right: "1rem", zIndex: 10, borderRadius: "50%", width: "40px", height: "40px", display: mapsLoaded.length > 1 ? "flex" : "none" }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {isGM && mapsLoaded.length > 0 && (
            <button 
              className="btn danger-btn icon-only" 
              onClick={handleDelete}
              style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }} 
              title="Excluir Mapa"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
