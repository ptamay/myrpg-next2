"use client";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { MuralCard as MuralCardType } from "@/types/cronicas";
import { useApp } from "@/contexts/AppContext";

interface MuralCardProps {
  card: MuralCardType;
  zoom: number;
  pan: { x: number; y: number };
  isConnecting: boolean;
  canEdit: boolean;
  onCardClick: (resolvedData?: any) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function MuralCard({ card, zoom, pan, isConnecting, canEdit, onCardClick, onEdit, onDelete }: MuralCardProps) {
  const { dadosGlobais, jornadaPorDia, setActiveData, setModals } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !canEdit,
  });

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'nota': return 'var(--text-muted)';
      case 'npc': return 'var(--warning)';
      case 'jogador': return 'var(--accent-primary)';
      case 'artefato': return 'hsl(300, 60%, 60%)';
      case 'teoria': return 'var(--danger)';
      case 'retrato': return 'var(--accent-primary)';
      case 'anotacao': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const npc = card.type === 'npc' && card.refId ? dadosGlobais.npcs.find((n: any) => n.id === card.refId) : null;
  const player = card.type === 'jogador' && card.refId ? dadosGlobais.players.find((p: any) => p.id === card.refId) : null;
  const isDead = !!(npc?.isDead || player?.isDead);

  // Calcula a posição atualizada com o transform do drag ativo
  const x = card.position.x * zoom + pan.x + (transform?.x || 0);
  const y = card.position.y * zoom + pan.y + (transform?.y || 0);

  let liveTitle = card.title;
  let liveContent = card.content;
  let noteType = 'padrao';

  if (card.type === 'anotacao' && card.refId) {
    let found = false;
    Object.keys(jornadaPorDia || {}).forEach((dayStr) => {
      if (found) return;
      const day = Number(dayStr);
      const blocos = jornadaPorDia[day]?.blocos || [];
      blocos.forEach((bloco: any) => {
        if (found) return;
        Object.values(bloco.playerSessions || {}).forEach((pSession: any) => {
          if (found) return;
          const note = pSession.notes?.find((n: any) => String(n.id) === String(card.refId));
          if (note) {
            liveTitle = note.title || `Anotação (Dia ${day})`;
            liveContent = note.desc || "";
            noteType = note.type || 'padrao';
            found = true;
          }
        });
      });
    });
  }

  let noteBg = "transparent";
  let noteBorder = getBorderColor(card.type);
  let noteAccent = "var(--text-muted)";
  let noteIcon = "";
  let rotation = 0;

  let noteTextColor = "rgba(255,255,255,0.85)";

  if (card.type === 'anotacao' || card.type === 'nota') {
    rotation = 0;

    if (card.type === 'nota') {
      noteBg = "linear-gradient(135deg, #fef08a 0%, #fcd34d 100%)";
      noteBorder = "#eab308";
      noteAccent = "#92400e";
      noteIcon = "📝";
      noteTextColor = "#334155";
    } else if (card.type === 'anotacao') {
      switch(noteType) {
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
        case 'padrao':
        default:
          noteBg = "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)";
          noteBorder = "rgba(251, 191, 36, 0.4)";
          noteAccent = "#fcd34d";
          noteIcon = "📌";
          break;
      }
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        transform: `translate3d(${x}px, ${y}px, 0) scale(${zoom})`,
        transformOrigin: '0 0',
        zIndex: isDragging ? 1000 : 1,
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        // Allow the dnd-kit pointer down listener to work, but if we don't drag and just click, we trigger click
        listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onCardClick({ liveTitle, liveContent, noteType, imageUrl: card.imageUrl || npc?.image || player?.image });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={(card.type === 'anotacao' || card.type === 'nota') ? "" : "glass-panel"}
        style={{
          minWidth: 160,
          maxWidth: 200,
          background: (card.type === 'anotacao' || card.type === 'nota') ? noteBg : undefined,
          border: (card.type === 'anotacao' || card.type === 'nota') ? `1px solid ${noteBorder}` : undefined,
          borderLeft: (card.type === 'anotacao' || card.type === 'nota') ? undefined : `4px solid ${getBorderColor(card.type)}`,
          borderTop: (card.type === 'anotacao' || card.type === 'nota') ? `4px solid ${noteBorder}` : undefined,
          borderRadius: (card.type === 'anotacao' || card.type === 'nota') ? "2px 8px 8px 8px" : "8px",
          padding: "1rem",
          cursor: canEdit ? "grab" : "default",
          boxShadow: isConnecting ? "0 0 0 2px var(--accent-primary)" : ((card.type === 'anotacao' || card.type === 'nota') ? (isHovered ? "0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" : "0 6px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)") : "none"),
          animation: isConnecting ? "dayPulse 1.5s infinite" : "none",
          opacity: isDragging ? 0.8 : (isDead ? 0.6 : 1),
          filter: isDead ? "grayscale(100%)" : "none",
          transform: (card.type === 'anotacao' || card.type === 'nota') && !isHovered ? "none" : ((card.type === 'anotacao' || card.type === 'nota') && isHovered ? "translateY(-6px) scale(1.03)" : "none"),
          transition: "filter 0.3s, opacity 0.3s, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s",
          position: "relative",
          backdropFilter: (card.type === 'anotacao' || card.type === 'nota') ? (card.type === 'nota' ? "none" : "blur(4px)") : undefined,
          zIndex: isHovered ? 10 : 1,
        }}
      >
        {card.type === 'anotacao' && (
          <div style={{
            position: "absolute",
            top: "-8px",
            left: "50%",
            marginLeft: "-20px",
            width: "40px",
            height: "14px",
            background: "rgba(255, 255, 255, 0.15)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 0 2px rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(2px)",
            transformOrigin: "center",
            transform: "none",
            borderRadius: "1px"
          }}></div>
        )}

        {isDead && isHovered && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3.5rem",
            zIndex: 5,
            pointerEvents: "none",
          }}>
            💀
          </div>
        )}

        {(card.type === 'anotacao' || card.type === 'nota') ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
              <h5 style={{ margin: 0, fontSize: "0.95rem", color: noteAccent, fontWeight: 800, lineHeight: 1.3 }}>
                {liveTitle}
              </h5>
              <span style={{ fontSize: "1.1rem", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{noteIcon}</span>
            </div>
            
            {card.imageUrl && (
              <div style={{ marginBottom: "8px", borderRadius: "8px", overflow: "hidden", border: `1px solid ${noteBorder}` }}>
                <img src={card.imageUrl} alt={card.title} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}

            <div style={{ 
              fontSize: "0.9rem", 
              color: noteTextColor, 
              lineHeight: 1.5, 
              fontFamily: "'Indie Flower', 'Caveat', 'Comic Sans MS', cursive, sans-serif",
              letterSpacing: "0.02em",
              borderTop: `1px solid ${noteBorder}`,
              paddingTop: "0.5rem",
              marginTop: "0.25rem",
              whiteSpace: "pre-wrap",
              maxHeight: "250px", 
              overflow: "hidden", 
              maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", 
              WebkitMaskImage: "-webkit-linear-gradient(top, black 80%, transparent 100%)"
            }}>
              {liveContent || <span style={{opacity: 0.5, fontStyle: "italic"}}>Nenhum conteúdo</span>}
            </div>

            <div style={{ marginTop: 8, fontSize: "0.6rem", color: noteAccent, opacity: 0.5, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", textAlign: "right" }}>
              DE {card.createdBy?.toUpperCase()}
            </div>
          </>
        ) : (
          <>
            <div className="narrative-label" style={{ marginBottom: 4 }}>
              {card.type.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              {liveTitle}
            </div>
            
            {(card.imageUrl || (npc && npc.image) || (player && player.image)) && (
              <div style={{ marginBottom: "8px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                <img src={card.imageUrl || npc?.image || player?.image} alt={card.title} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}

            {liveContent && (
              <div className="narrative-text" style={{ maxHeight: "250px", overflow: "hidden", maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "-webkit-linear-gradient(top, black 80%, transparent 100%)", whiteSpace: "pre-wrap", fontSize: "0.85rem", lineHeight: 1.5 }}>
                {liveContent}
              </div>
            )}

            {(npc || player) && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  className="ghost-delete-btn" 
                  style={{ fontSize: "0.75rem", padding: "4px 8px", opacity: 1, color: "var(--accent-primary)", background: "rgba(204, 51, 255, 0.1)", borderRadius: "4px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveData(npc || player);
                    setModals((prev: any) => ({ ...prev, summaryCard: true }));
                  }}
                >
                  Ver Ficha
                </button>
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "right", borderTop: "1px solid var(--border-subtle)", paddingTop: 4 }}>
              Criado por: {card.createdBy === 'gm' ? 'Mestre' : card.createdBy}
            </div>
          </>
        )}

        {isHovered && canEdit && (
          <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: "4px", padding: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.5)", zIndex: 10 }}>
            <button className="ghost-delete-btn" style={{ opacity: 1, padding: "4px" }} onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>✏️</button>
            <button className="ghost-delete-btn" style={{ opacity: 1, padding: "4px", color: "var(--danger)" }} onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );
}
