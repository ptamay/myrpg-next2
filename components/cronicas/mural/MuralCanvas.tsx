"use client";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useMurais, useNpcs, usePlayers } from "@/hooks/useGameData";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useApp } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { Mural } from "@/types/cronicas";
import MuralCard from "./MuralCard";
import MuralConnectionLayer from "./MuralConnectionLayer";
import MuralToolbar from "./MuralToolbar";
import MuralCardForm from "./MuralCardForm";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import { getSupabaseClient } from "@/lib/supabase/client";
import { OptimizedImage } from '@/components/ui/OptimizedImage';

const getSlotId = (slotIndex: number, mode: "private" | "players") => {
  const prefix = mode === "private" ? "1" : "2";
  return `00000000-0000-0000-0000-0000000000${prefix}${slotIndex}`;
};

export default function MuralCanvas({ isActive = true }: { isActive?: boolean }) {
  const { isGM, session } = useUserSession();
  const { npcs } = useNpcs();
  const { players } = usePlayers();
  const { showAlert, showConfirm } = useSystemDialog();

  const canEdit = isGM || !!session?.playerId;

  const [viewingMode, setViewingMode] = useState<"private" | "players">(isGM ? "private" : "players");
  
  const [activeMuralId, setActiveMuralId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("mural-active-id");
      if (saved) return saved;
    }
    return null;
  });

  const { murais, loading, save } = useMurais(activeMuralId);

  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("mural-zoom");
      if (saved) return parseFloat(saved);
    }
    return 1;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("mural-pan");
      if (saved) {
        try {
          return JSON.parse(saved) ?? { x: 0, y: 0 };
        } catch {
          return { x: 0, y: 0 };
        }
      }
    }
    return { x: 0, y: 0 };
  });

  // Persiste no sessionStorage
  useEffect(() => {
    if (activeMuralId) sessionStorage.setItem("mural-active-id", activeMuralId);
  }, [activeMuralId]);

  useEffect(() => {
    sessionStorage.setItem("mural-zoom", zoom.toString());
  }, [zoom]);

  useEffect(() => {
    sessionStorage.setItem("mural-pan", JSON.stringify(pan ?? { x: 0, y: 0 }));
  }, [pan]);

  // Se carregar murais e ainda não tivermos um ID ativo, seleciona o primeiro.
  // Também valida se o ID atual ainda existe nos murais carregados.
  useEffect(() => {
    if (murais.length > 0) {
      if (!activeMuralId || !murais.find(m => m.id === activeMuralId)) {
        setActiveMuralId(murais[0].id);
      }
    }
  }, [activeMuralId, murais]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<any>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  // Estado otimista de posições: atualizado instantaneamente no drag, sem aguardar o save
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    
    let intervalId: NodeJS.Timeout;
    const tryFind = () => {
      const el = document.getElementById("mural-header-portal");
      if (el) {
        setPortalTarget(el);
        if (intervalId) clearInterval(intervalId);
      }
    };
    
    tryFind();
    if (!portalTarget) {
      intervalId = setInterval(tryFind, 50);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [portalTarget]);

  const muralRef = useRef<HTMLDivElement>(null);

  const mural = murais.find(m => m.id === activeMuralId) ?? null;

  // Sincroniza localPositions quando o mural muda externamente
  useEffect(() => {
    if (!mural) return;
    setLocalPositions(prev => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const card of mural.cards) {
        // Mantém posição local se já existir (resultado de drag recente)
        next[card.id] = prev[card.id] ?? card.position;
      }
      return next;
    });
  }, [mural]); // Sincroniza ao trocar de mural ou quando mural sofrer updates externos

  // Realtime Broadcast para arrasto suave de cards
  useEffect(() => {
    if (!activeMuralId) return;
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`mural_drag_${activeMuralId}`, {
      config: {
        broadcast: { ack: false }
      }
    });

    channel.on('broadcast', { event: 'card_move' }, (payload: any) => {
      setLocalPositions(prev => ({
        ...prev,
        [payload.payload.cardId]: payload.payload.position
      }));
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMuralId]);

  // Filtragem de cards e conexões para jogadores (ocultando NPCs com isHidden === true)
  // Aplica posições locais (otimistas) aos cards para renderização imediata
  const cardsWithLocalPositions = useMemo(() => {
    if (!mural) return [];
    return mural.cards.map(card => ({
      ...card,
      position: localPositions[card.id] ?? card.position,
    }));
  }, [mural, localPositions]);

  const visibleCards = useMemo(() => {
    if (!mural) return [];
    if (isGM) return cardsWithLocalPositions;

    return cardsWithLocalPositions.filter(card => {
      if (card.type === 'npc' && card.refId) {
        const npc = (npcs || []).find((n: any) => n.id === card.refId);
        if (npc && npc.isHidden) {
          return false;
        }
      }
      return true;
    });
  }, [mural, cardsWithLocalPositions, isGM, npcs]);

  const visibleConnections = useMemo(() => {
    if (!mural) return [];
    if (isGM) return mural.connections;

    const visibleCardIds = new Set(visibleCards.map(c => c.id));
    return mural.connections.filter(conn =>
      visibleCardIds.has(conn.fromCardId) && visibleCardIds.has(conn.toCardId)
    );
  }, [mural, isGM, visibleCards]);

  // Debounce para salvar posições (drag é frequente)
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const debouncedSave = useCallback((updated: Mural) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(updated), 1000);
  }, [save]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!mural || !canEdit) return;
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;

    const cardId = active.id as string;
    const currentPos = localPositions[cardId] ?? mural.cards.find(c => c.id === cardId)?.position ?? { x: 0, y: 0 };
    const newPos = {
      x: currentPos.x + delta.x / zoom,
      y: currentPos.y + delta.y / zoom,
    };

    // Atualiza posição localmente de forma instantânea (sem esperar o save)
    setLocalPositions(prev => ({ ...prev, [cardId]: newPos }));

    // Broadcast para outros jogadores
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`mural_drag_${mural.id}`);
    if (channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'card_move',
        payload: { cardId, position: newPos }
      });
    }

    // Salva em background com debounce
    const updated: Mural = {
      ...mural,
      cards: mural.cards.map(c =>
        c.id === cardId
          ? { ...c, position: newPos }
          : c
      ),
    };
    debouncedSave(updated);
  };

  const handleExportImage = async () => {
    if (!muralRef.current || !mural) return;
    try {
      const exportBgColor = mural.backgroundStyle === 'wood' 
        ? '#2d1a10' 
        : (mural.backgroundStyle === 'dark-paper' ? '#1a1a1a' : '#09090b');
      const dataUrl = await toPng(muralRef.current, { 
        cacheBust: true, 
        backgroundColor: exportBgColor, 
        skipFonts: true, 
        fontEmbedCSS: '' 
      });
      const link = document.createElement('a');
      link.download = `mural-${mural.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      await showAlert({ title: "Erro na Exportação", message: "Erro ao exportar a imagem.", type: "danger" });
    }
  };

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Zoom on wheel scroll centering on mouse pointer, preventing default scroll behavior
  useEffect(() => {
    const canvas = muralRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const canvasMouseX = (mouseX - currentPan.x) / currentZoom;
      const canvasMouseY = (mouseY - currentPan.y) / currentZoom;

      // Adjust zoom factor based on platform (trackpads trigger smaller deltaY than mouse wheels)
      const zoomFactor = Math.abs(e.deltaY) < 50 ? 0.005 : 0.0015;
      const newZoom = Math.min(Math.max(currentZoom - e.deltaY * zoomFactor, 0.4), 2);

      setZoom(newZoom);
      setPan({
        x: Math.min(Math.max(mouseX - canvasMouseX * newZoom, -4000), 4000),
        y: Math.min(Math.max(mouseY - canvasMouseY * newZoom, -4000), 4000),
      });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [loading, activeMuralId, mural]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && e.target === e.currentTarget) {
      setIsPanning(true);
    }
  };

  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPan(prev => ({ 
          x: Math.min(Math.max(prev.x + e.movementX, -4000), 4000), 
          y: Math.min(Math.max(prev.y + e.movementY, -4000), 4000) 
        }));
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // PointerSensor configuration is necessary for dnd-kit to distinguish between click/drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  if (loading) {
    return (
      <div style={{display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem'}}>
        <div className="spinner" style={{width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
        <p style={{color: 'var(--text-secondary)'}}>Carregando investigações...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!mural && !activeMuralId) {
    return (
      <div className="empty-state" style={{ height: "100%", margin: "1.5rem" }}>
        <p>Nenhuma investigação encontrada.</p>
        {(isGM || players?.length > 0) && (
          <button className="btn primary-btn" onClick={() => {
            const novo: Mural = {
              id: getSlotId(1, viewingMode),
              name: "Investigação 1",
              cards: [], connections: [],
              createdAt: new Date().toISOString(),
            };
            save(novo);
            setActiveMuralId(novo.id);
          }}>
            + Iniciar Investigação
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mural-wrapper">
      {/* Toolbar lateral */}
      {canEdit && (
        <MuralToolbar
          onAddCard={() => setShowCardForm(true)}
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(z + 0.1, 2))}
          onZoomOut={() => setZoom(z => Math.max(z - 0.1, 0.4))}
          connectingMode={!!connectingFrom}
          onToggleConnect={() => setConnectingFrom(c => c !== null ? null : "")}
          onExportImage={handleExportImage}
          currentBackground={mural?.backgroundStyle || 'grid'}
          onChangeBackground={(bg) => {
            if (mural) {
              const updated = { ...mural, backgroundStyle: bg as any };
              save(updated);
            }
          }}
          onRecenter={() => setPan({x: 0, y: 0})}
        />
      )}

      {/* Barra de Slots de Investigação (Save States) */}
      {isActive && (() => {
        const slotsMenu = (
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 100, ...(portalTarget ? {} : { position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)" }) }}>
            <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-card)", padding: "0.5rem 2.5rem", borderRadius: "100px", border: "1px solid var(--border-subtle)", backdropFilter: "blur(10px)", alignItems: "center" }}>
              
              {editingName && mural ? (
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => {
                    setEditingName(false);
                    if (tempName.trim() !== "" && tempName !== mural.name) {
                      save({ ...mural, name: tempName });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingName(false);
                      if (tempName.trim() !== "" && tempName !== mural.name) {
                        save({ ...mural, name: tempName });
                      }
                    } else if (e.key === 'Escape') {
                      setEditingName(false);
                    }
                  }}
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: "1px dashed var(--accent-primary)",
                    color: "var(--accent-primary)",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    outline: "none",
                    width: "180px",
                    textAlign: "center",
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)"
                  }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "0.5rem" }}>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase" }}>
                    {mural ? mural.name : "INVESTIGAÇÕES"}
                  </span>
                  {isGM && (
                    <select
                      value={viewingMode}
                      onChange={(e) => {
                        const newMode = e.target.value as "private" | "players";
                        setViewingMode(newMode);
                        setActiveMuralId(getSlotId(1, newMode));
                      }}
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "0.75rem",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="private">Privado (Mestre)</option>
                      <option value="players">Compartilhado (Jogadores)</option>
                    </select>
                  )}
                  {mural && canEdit && (
                    <button 
                      className="ghost-delete-btn" 
                      style={{ padding: "2px", opacity: 0.5 }} 
                      onClick={() => {
                        setTempName(mural.name);
                        setEditingName(true);
                      }}
                      title="Renomear Investigação"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
    
              <div style={{ width: "1px", height: "20px", background: "var(--border-subtle)", margin: "0 0.25rem" }}></div>
    
              {[1, 2, 3, 4, 5, 6].map(slot => {
                const defaultSlotId = getSlotId(slot, viewingMode);
                const actualMural = murais.find(m => m.id === defaultSlotId || m.id === `slot-${slot}` || m.id === `player-slot-${slot}` || m.id === `gm-slot-${slot}`);
                const isSaved = !!actualMural;
                const actualMuralId = actualMural?.id || defaultSlotId;
                const isActive = activeMuralId === actualMuralId;
                const muralName = actualMural?.name || `Investigação ${slot}`;
                
                return (
                  <button
                    key={slot}
                    className={`btn small-btn ${isActive ? 'primary-btn' : (isSaved ? 'secondary-btn' : 'nav-btn')}`}
                    style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
                    onClick={async () => {
                      if (isSaved) {
                        setActiveMuralId(actualMuralId);
                      } else {
                        // Cria um mural novo e vazio no slot
                        const newMural: Mural = {
                          id: actualMuralId,
                          name: `Investigação ${slot}`,
                          cards: [], 
                          connections: [],
                          createdAt: new Date().toISOString(),
                          backgroundStyle: 'grid'
                        };
                        save(newMural);
                        setActiveMuralId(actualMuralId);
                      }
                    }}
                    onContextMenu={async (e) => {
                      e.preventDefault();
                      if (!mural) return;
                      if (await showConfirm({ title: "Sobrescrever Slot", message: `Deseja clonar a investigação atual para o slot ${slot}? (O slot atual permanecerá intacto)`, type: "warning" })) {
                        const idMap = new Map<string, string>();
                        const newCards = mural.cards.map(c => {
                          const newId = crypto.randomUUID();
                          idMap.set(c.id, newId);
                          return { ...c, id: newId, muralId: actualMuralId };
                        });
                        const newConns = mural.connections.map(c => ({
                          ...c,
                          id: crypto.randomUUID(),
                          muralId: actualMuralId,
                          fromCardId: idMap.get(c.fromCardId) || c.fromCardId,
                          toCardId: idMap.get(c.toCardId) || c.toCardId
                        }));
                        
                        const newMural = { ...mural, id: actualMuralId, name: `Investigação ${slot}`, cards: newCards, connections: newConns };
                        save(newMural);
                        setActiveMuralId(actualMuralId);
                      }
                    }}
                    title={isActive ? `${muralName} (Ativo)` : (isSaved ? `Carregar: ${muralName} (Botão direito para Sobrescrever com o atual)` : `Slot Vazio (Clique para salvar)`)}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            <div style={{ 
              fontSize: "0.7rem", 
              color: "var(--text-muted)", 
              background: "rgba(0,0,0,0.6)", 
              padding: "4px 12px", 
              borderRadius: "100px", 
              border: "1px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(5px)",
              letterSpacing: "0.02em",
              pointerEvents: "none",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              ...(portalTarget ? { position: "absolute", top: "100%", marginTop: "4px", whiteSpace: "nowrap" } : {})
            }}>
              💡 Clique para carregar | Clique com o botão direito para salvar/sobrescrever o mural atual no slot
            </div>
          </div>
        );

        return portalTarget ? createPortal(slotsMenu, portalTarget) : slotsMenu;
      })()}

      {/* Canvas */}
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div
          ref={muralRef}
          className="mural-canvas"
          style={{
            backgroundColor: mural?.backgroundStyle === 'wood'
              ? '#2d1a10'
              : (mural?.backgroundStyle === 'dark-paper' ? '#1a1a1a' : '#09090b'),
            backgroundImage: mural?.backgroundStyle === 'wood'
              ? `repeating-linear-gradient(90deg, rgba(15, 8, 4, 0.5) 0px, rgba(15, 8, 4, 0.5) 4px, transparent 4px, transparent ${150 * zoom}px),
                 linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(0, 0, 0, 0.4) 100%)`
              : (mural?.backgroundStyle === 'dark-paper'
                ? `radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px), repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.2) 0, rgba(0, 0, 0, 0.2) 2px, transparent 2px, transparent 8px)`
                : `radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)`),
            backgroundSize: mural?.backgroundStyle === 'grid' || !mural?.backgroundStyle
              ? `${20 * zoom}px ${20 * zoom}px`
              : 'auto',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: connectingFrom ? "crosshair" : (isPanning ? "grabbing" : "grab"),
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { if (connectingFrom === "") setConnectingFrom(null); }}
        >
          {/* SVG de linhas (abaixo dos cards) */}
          <MuralConnectionLayer
            cards={visibleCards}
            connections={visibleConnections}
            zoom={zoom}
            pan={pan}
            canEdit={canEdit}
            onDeleteConnection={(id) => {
              if (!mural) return;
              const updated = { ...mural, connections: mural.connections.filter(c => c.id !== id) };
              save(updated);
            }}
            onUpdateConnectionLabel={(id, label) => {
              if (!mural) return;
              const updated = { ...mural, connections: mural.connections.map(c => c.id === id ? { ...c, label } : c) };
              save(updated);
            }}
          />
          <AnimatePresence key={activeMuralId} mode="popLayout" initial={false}>
            {visibleCards.map(card => {
              const cardCanEdit = isGM || (card.authorId ? card.authorId === session?.playerId : card.createdBy === (players?.find((p: any) => p.id === session?.playerId)?.name || "Jogador"));
              return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                style={{ position: "absolute", left: 0, top: 0 }}
              >
                <MuralCard
                  card={card}
                  zoom={zoom}
                  pan={pan}
                  isConnecting={connectingFrom === card.id}
                  canEdit={cardCanEdit}
                  onCardClick={(resolvedData) => {
                    if (!canEdit || !mural) return;
                    if (connectingFrom === "") {
                      setConnectingFrom(card.id);
                    } else if (connectingFrom && connectingFrom !== card.id) {
                      // Criar conexão
                      const updated: Mural = {
                        ...mural,
                        connections: [...mural.connections, {
                          id: crypto.randomUUID(),
                          muralId: mural.id,
                          fromCardId: connectingFrom,
                          toCardId: card.id,
                        }],
                      };
                      save(updated);
                      setConnectingFrom(null);
                    } else {
                      // Abrir modal de detalhes
                      setDetailCard(resolvedData ? { ...card, ...resolvedData } : card);
                    }
                  }}
                  onEdit={() => setEditingCardId(card.id)}
                  onDelete={async () => {
                    if (!mural) return;
                    if (await showConfirm({ title: "Deletar Card", message: "Deseja deletar este card e todas as suas conexões?", type: "danger" })) {
                      const updated = {
                        ...mural,
                        cards: mural.cards.filter(c => c.id !== card.id),
                        connections: mural.connections.filter(c => c.fromCardId !== card.id && c.toCardId !== card.id)
                      };
                      save(updated);
                    }
                  }}
                />
              </motion.div>
            )})}
          </AnimatePresence>
        </div>
      </DndContext>

      {/* Formulário de Card */}
      {(showCardForm || editingCardId) && (
        <MuralCardForm
          initialData={editingCardId ? mural?.cards.find(c => c.id === editingCardId) : null}
          onSave={(cardData) => {
            if (!mural) return;
            if (editingCardId) {
              const updated = {
                ...mural,
                cards: mural.cards.map(c => c.id === editingCardId ? { ...c, ...cardData } as any : c)
              };
              save(updated);
              setEditingCardId(null);
            } else {
              const newCard = {
                ...cardData,
                id: crypto.randomUUID(),
                muralId: mural.id,
                position: { 
                  // Posição no centro da tela, compensando pan e zoom
                  x: (-pan.x + window.innerWidth / 2) / zoom - 90, 
                  y: (-pan.y + window.innerHeight / 2) / zoom - 50 
                },
                createdBy: isGM ? "gm" : (players?.find((p: any) => p.id === session?.playerId)?.name || "Jogador"),
                authorId: isGM ? "gm" : session?.playerId,
                createdAt: new Date().toISOString()
              } as any;
              const updated = {
                ...mural,
                cards: [...mural.cards, newCard]
              };
              save(updated);
              setShowCardForm(false);
            }
          }}
          onCancel={() => {
            setShowCardForm(false);
            setEditingCardId(null);
          }}
        />
      )}

      {/* Modal de Detalhes do Card */}
      <Modal isOpen={!!detailCard} onClose={() => setDetailCard(null)} id="mural-card-detail">
        {detailCard && (() => {
            const isNote = detailCard.type === 'anotacao' || detailCard.type === 'nota';
            if (isNote) {
              let noteBg = "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)";
              let noteBorder = "rgba(251, 191, 36, 0.4)";
              let noteAccent = "#fcd34d";
              let noteIcon = "📌";
              let noteTextColor = "rgba(255,255,255,0.9)";
              let titleColor = "white";

              if (detailCard.type === 'nota') {
                noteBg = "linear-gradient(135deg, #fef08a 0%, #fcd34d 100%)";
                noteBorder = "#eab308";
                noteAccent = "#92400e";
                noteIcon = "📝";
                noteTextColor = "#334155";
                titleColor = "#1e293b";
              } else {
                switch(detailCard.noteType) {
                  case 'importante':
                    noteBg = "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%)";
                    noteBorder = "rgba(239, 68, 68, 0.4)";
                    noteAccent = "#fca5a5";
                    noteIcon = "❗";
                    break;
                  case 'pista':
                    noteBg = "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 58, 138, 0.05) 100%)";
                    noteBorder = "rgba(59, 130, 246, 0.4)";
                    noteAccent = "#93c5fd";
                    noteIcon = "🔍";
                    break;
                  case 'npc':
                    noteBg = "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(88, 28, 135, 0.05) 100%)";
                    noteBorder = "rgba(168, 85, 247, 0.4)";
                    noteAccent = "#d8b4fe";
                    noteIcon = "👤";
                    break;
                  case 'missao':
                    noteBg = "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(133, 77, 14, 0.05) 100%)";
                    noteBorder = "rgba(234, 179, 8, 0.4)";
                    noteAccent = "#fde047";
                    noteIcon = "⭐";
                    break;
                }
              }

              return (
                <div className="modal-content modal-md post-it-modal" style={{
                  background: noteBg,
                  border: `1px solid ${noteBorder}`,
                  borderTop: `4px solid ${noteBorder}`,
                  borderRadius: "2px 8px 8px 8px",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                  backdropFilter: detailCard.type === 'nota' ? "none" : "blur(10px)",
                  position: "relative",
                  padding: "2rem"
                }}>
                  <div style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    marginLeft: "-40px",
                    width: "80px",
                    height: "20px",
                    background: "rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 0 2px rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "2px"
                  }}></div>

                  <header className="modal-header" style={{ padding: 0, marginBottom: "1.5rem", borderBottom: `1px solid ${noteBorder}`, paddingBottom: "1.5rem" }}>
                    <div className="modal-title-group" style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                      <span style={{ fontSize: "2.5rem", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{noteIcon}</span>
                      <div>
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: noteAccent, opacity: 0.8, letterSpacing: "0.05em" }}>
                          {detailCard.type === 'anotacao' ? `ANOTAÇÃO DE ${detailCard.createdBy?.toUpperCase()}` : 'NOTA (POST-IT)'}
                        </span>
                        <h2 style={{ margin: 0, fontSize: "1.8rem", color: titleColor, fontWeight: 800, lineHeight: 1.2 }}>{detailCard.liveTitle || detailCard.title || 'Sem Título'}</h2>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button className="close-btn" onClick={() => setDetailCard(null)} style={{ color: titleColor, background: "rgba(0,0,0,0.1)", borderRadius: "50%", padding: "4px" }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </header>
                  <div className="modal-body custom-scrollbar" style={{ padding: 0 }}>
                    {detailCard.imageUrl && (
                      <div style={{ padding: "0 2rem 1.5rem 2rem", marginTop: "-1rem" }}>
                        <OptimizedImage src={detailCard.imageUrl} alt={detailCard.liveTitle || detailCard.title} style={{ width: "100%", borderRadius: "8px", border: `1px solid ${noteBorder}` }} />
                      </div>
                    )}
                    {(detailCard.liveContent || detailCard.content) ? (
                      <div style={{ minHeight: "150px", padding: detailCard.imageUrl ? "0 2rem 2rem 2rem" : "0" }}>
                        <p style={{ 
                          margin: 0,
                          fontSize: "1.2rem", 
                          lineHeight: 1.7, 
                          color: noteTextColor, 
                          whiteSpace: "pre-wrap",
                          fontFamily: "'Indie Flower', 'Caveat', 'Comic Sans MS', cursive, sans-serif",
                          letterSpacing: "0.02em"
                        }}>
                          {detailCard.liveContent || detailCard.content}
                        </p>
                      </div>
                    ) : (
                      <div style={{ minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                        <p style={{ fontStyle: "italic", fontSize: "1.1rem" }}>Nenhum conteúdo escrito.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="modal-content glass-panel" style={{ maxWidth: "600px", width: "90%", padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
                  <div>
                    <div className="narrative-label" style={{ marginBottom: "4px" }}>
                      {detailCard.type.toUpperCase()}
                    </div>
                    <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-primary)" }}>{detailCard.liveTitle || detailCard.title}</h2>
                  </div>
                  <button className="timeline-action" onClick={() => setDetailCard(null)} style={{ fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
                </div>
                
                <div className="scrollable-area custom-scrollbar" style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "0.5rem" }}>
                  {detailCard.imageUrl && (
                    <OptimizedImage src={detailCard.imageUrl} alt={detailCard.liveTitle || detailCard.title} style={{ width: "100%", borderRadius: "8px", marginBottom: "1rem", border: "1px solid var(--border-subtle)" }} />
                  )}
                  {(detailCard.liveContent || detailCard.content) ? (
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "1rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                      {detailCard.liveContent || detailCard.content}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sem conteúdo adicional.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
    </div>
  );
}
