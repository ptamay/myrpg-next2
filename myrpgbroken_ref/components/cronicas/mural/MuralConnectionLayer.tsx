"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useDndMonitor } from "@dnd-kit/core";
import { MuralCard, MuralConnection } from "@/types/cronicas";
import { useSystemDialog } from "@/contexts/SystemDialogContext";

interface MuralConnectionLayerProps {
  cards: MuralCard[];
  connections: MuralConnection[];
  zoom: number;
  pan: { x: number; y: number };
  canEdit: boolean;
  onDeleteConnection?: (connId: string) => void;
  onUpdateConnectionLabel?: (connId: string, label: string) => void;
}

function getBezierPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const cx = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${cx} ${from.y}, ${cx} ${to.y}, ${to.x} ${to.y}`;
}

export default function MuralConnectionLayer({ 
  cards, connections, zoom, pan, canEdit, onDeleteConnection, onUpdateConnectionLabel 
}: MuralConnectionLayerProps) {
  const { showConfirm } = useSystemDialog();
  const CARD_WIDTH = 180;
  const CARD_HEIGHT = 100;

  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragDelta, setActiveDragDelta] = useState<{ x: number, y: number } | null>(null);

  useDndMonitor({
    onDragStart(event) {
      setActiveDragId(event.active.id as string);
      setActiveDragDelta({ x: 0, y: 0 });
    },
    onDragMove(event) {
      setActiveDragDelta({ x: event.delta.x, y: event.delta.y });
    },
    onDragEnd() {
      setActiveDragId(null);
      setActiveDragDelta(null);
    },
    onDragCancel() {
      setActiveDragId(null);
      setActiveDragDelta(null);
    }
  });

  useEffect(() => {
    if (editingConnId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingConnId]);

  const paths = useMemo(() => {
    return connections.map(conn => {
      const from = cards.find(c => c.id === conn.fromCardId);
      const to = cards.find(c => c.id === conn.toCardId);
      if (!from || !to) return null;

      const fromIsActive = activeDragId === conn.fromCardId;
      const toIsActive = activeDragId === conn.toCardId;

      const fromCenter = {
        x: from.position.x * zoom + pan.x + (CARD_WIDTH / 2) * zoom + (fromIsActive && activeDragDelta ? activeDragDelta.x : 0),
        y: from.position.y * zoom + pan.y + (CARD_HEIGHT / 2) * zoom + (fromIsActive && activeDragDelta ? activeDragDelta.y : 0),
      };
      const toCenter = {
        x: to.position.x * zoom + pan.x + (CARD_WIDTH / 2) * zoom + (toIsActive && activeDragDelta ? activeDragDelta.x : 0),
        y: to.position.y * zoom + pan.y + (CARD_HEIGHT / 2) * zoom + (toIsActive && activeDragDelta ? activeDragDelta.y : 0),
      };

      const midX = (fromCenter.x + toCenter.x) / 2;
      const midY = (fromCenter.y + toCenter.y) / 2;

      return {
        id: conn.id,
        path: getBezierPath(fromCenter, toCenter),
        label: conn.label,
        midX, midY
      };
    }).filter(Boolean);
  }, [cards, connections, zoom, pan, activeDragId, activeDragDelta]);

  const handleSaveLabel = (id: string) => {
    if (onUpdateConnectionLabel) {
      onUpdateConnectionLabel(id, editLabelValue.trim());
    }
    setEditingConnId(null);
  };

  return (
    <svg 
      style={{ 
        position: "absolute", 
        inset: 0, 
        width: "100%", 
        height: "100%", 
        pointerEvents: "none", 
        zIndex: 0 
      }}
    >
      {paths.map(p => p && (
        <g key={p.id}>
          {/* Linha visível */}
          <path
            d={p.path}
            stroke="var(--accent-primary)"
            strokeOpacity="0.7"
            strokeWidth="2"
            fill="none"
          />
          {/* Linha invisível (hitbox) para clique e hover */}
          <path
            d={p.path}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ pointerEvents: canEdit ? "stroke" : "none", cursor: canEdit ? "pointer" : "default" }}
            onClick={async (e) => {
              e.stopPropagation();
              if (canEdit && onDeleteConnection && await showConfirm({ title: "Excluir Conexão", message: "Deletar conexão?", type: "danger" })) {
                onDeleteConnection(p.id);
              }
            }}
          />
          {/* Label e edição inline */}
          {editingConnId === p.id ? (
            <foreignObject x={p.midX - 60} y={p.midY - 15} width={120} height={30} style={{ pointerEvents: "auto" }}>
              <input
                ref={inputRef}
                type="text"
                className="journey-input"
                style={{ fontSize: "0.75rem", padding: "4px 8px", width: "100%", textAlign: "center", background: "var(--bg-card)" }}
                value={editLabelValue}
                onChange={e => setEditLabelValue(e.target.value)}
                onBlur={() => handleSaveLabel(p.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveLabel(p.id);
                  if (e.key === 'Escape') setEditingConnId(null);
                }}
              />
            </foreignObject>
          ) : (
            <g 
              style={{ pointerEvents: canEdit ? "auto" : "none", cursor: canEdit ? "text" : "default" }}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) {
                  setEditingConnId(p.id);
                  setEditLabelValue(p.label || "");
                }
              }}
            >
              {p.label ? (
                <>
                  <rect x={p.midX - (p.label.length * 3.5) - 10} y={p.midY - 12} width={(p.label.length * 7) + 20} height={24} rx={4} fill="var(--bg-card)" stroke="var(--border-subtle)" />
                  <text x={p.midX} y={p.midY + 4} fontSize="11" fill="var(--text-muted)" textAnchor="middle" fontWeight="bold">
                    {p.label}
                  </text>
                </>
              ) : (
                canEdit && (
                  <>
                    {/* Placeholder clicável se não houver label */}
                    <circle cx={p.midX} cy={p.midY} r="8" fill="var(--bg-card)" stroke="var(--border-subtle)" />
                    <text x={p.midX} y={p.midY + 4} fontSize="12" fill="var(--text-muted)" textAnchor="middle">+</text>
                  </>
                )
              )}
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
