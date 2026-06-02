"use client";
import { useState, useEffect } from "react";
import { MuralCard, MuralCardType } from "@/types/cronicas";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";

interface MuralCardFormProps {
  initialData?: MuralCard | null;
  onSave: (cardData: Partial<MuralCard>) => void;
  onCancel: () => void;
}

export default function MuralCardForm({ initialData, onSave, onCancel }: MuralCardFormProps) {
  const { dadosGlobais, jornadaPorDia } = useAppContext();
  const { session } = useUserSession();
  const { showAlert } = useSystemDialog();

  // Coletar anotações pessoais do jogador atual
  const personalNotes: any[] = [];
  if (session?.playerId) {
    Object.keys(jornadaPorDia || {}).forEach((dayStr) => {
      const day = Number(dayStr);
      const blocos = jornadaPorDia[day]?.blocos || [];
      blocos.forEach((bloco: any, bIdx: number) => {
        const pSessions = bloco.playerSessions || {};
        const pSession = pSessions[session.id];
        if (pSession && pSession.notes && pSession.notes.length > 0) {
          pSession.notes.forEach((note: any) => {
            personalNotes.push({
              ...note,
              day,
              blocoIdx: bIdx
            });
          });
        }
      });
    });
    personalNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  const [type, setType] = useState<MuralCardType>(initialData?.type || "nota");
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [refId, setRefId] = useState(initialData?.refId || "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialData?.imageUrl);

  // Se mudar o tipo para npc ou jogador, tentar setar o primeiro da lista correspondente
  useEffect(() => {
    if (type === 'npc') {
      const exists = dadosGlobais.npcs?.some((n: any) => n.id === refId);
      if (!exists && dadosGlobais.npcs?.length > 0) {
        const firstNpc = dadosGlobais.npcs[0];
        setRefId(firstNpc.id);
        const isPlayerName = dadosGlobais.players?.some((p: any) => p.name === title);
        if (!title.trim() || isPlayerName) {
          setTitle(firstNpc.name);
        }
      }
    } else if (type === 'jogador') {
      const exists = dadosGlobais.players?.some((p: any) => p.id === refId);
      if (!exists && dadosGlobais.players?.length > 0) {
        const firstPlayer = dadosGlobais.players[0];
        setRefId(firstPlayer.id);
        const isNpcName = dadosGlobais.npcs?.some((n: any) => n.name === title);
        if (!title.trim() || isNpcName) {
          setTitle(firstPlayer.name);
        }
      }
    } else if (type !== 'anotacao') {
      // Para outros tipos (nota, teoria, etc), limpa o refId
      setRefId("");
    }
  }, [type, refId, dadosGlobais.npcs, dadosGlobais.players, title]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim() && type !== 'anotacao') {
      await showAlert("O título é obrigatório.");
      return;
    }
    
    if (type === 'anotacao' && !refId) {
      await showAlert("Selecione uma anotação para importar.");
      return;
    }
    
    onSave({
      type,
      title: title.trim(),
      content: content.trim(),
      refId: (type === 'npc' || type === 'jogador' || type === 'anotacao') ? refId : undefined,
      imageUrl: (type === 'artefato' || type === 'retrato' || type === 'anotacao') ? imageUrl : undefined,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div 
        className="modal-overlay" 
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} 
        onClick={onCancel} 
      />
      
      <div className="glass-panel" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "450px", padding: "1.5rem", background: "#0b0b0f" }}>
        <h3 className="section-title" style={{ marginBottom: "1.5rem" }}>
          {initialData ? "Editar Card" : "Novo Card"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="narrative-label">TIPO</label>
            <select 
              className="journey-input modern-input" 
              style={{ width: "100%", marginTop: "4px" }}
              value={type}
              onChange={(e) => setType(e.target.value as MuralCardType)}
            >
              <option value="nota">Nota (Post-it)</option>
              <option value="npc">NPC (Referência)</option>
              <option value="jogador">Jogador</option>
              <option value="artefato">Artefato</option>
              <option value="teoria">Teoria</option>
              <option value="retrato">Retrato (Sem ficha)</option>
              <option value="anotacao">Minhas Anotações</option>
            </select>
          </div>

          {type === 'npc' && (
            <div>
              <label className="narrative-label">SELECIONE O NPC</label>
              <select 
                className="journey-input modern-input" 
                style={{ width: "100%", marginTop: "4px" }}
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  const n = dadosGlobais.npcs.find((x: any) => x.id === e.target.value);
                  if (n && (!title || dadosGlobais.npcs.some((x: any) => x.name === title))) setTitle(n.name);
                }}
              >
                {dadosGlobais.npcs?.map((n: any) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'jogador' && (
            <div>
              <label className="narrative-label">SELECIONE O JOGADOR</label>
              <select 
                className="journey-input modern-input" 
                style={{ width: "100%", marginTop: "4px" }}
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  const p = dadosGlobais.players.find((x: any) => x.id === e.target.value);
                  if (p && (!title || dadosGlobais.players.some((x: any) => x.name === title))) setTitle(p.name);
                }}
              >
                {dadosGlobais.players?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'anotacao' && (
            <div>
              <label className="narrative-label">SELECIONE A ANOTAÇÃO DA SESSÃO</label>
              <select 
                className="journey-input modern-input" 
                style={{ width: "100%", marginTop: "4px" }}
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  const n = personalNotes.find((x: any) => String(x.id) === String(e.target.value));
                  if (n) {
                    setTitle(n.title || `Anotação (Dia ${n.day})`);
                    setContent(n.desc || "");
                  }
                }}
              >
                <option value="">-- Selecione uma anotação --</option>
                {personalNotes?.map((n: any) => (
                  <option key={n.id} value={String(n.id)}>{n.title || `Sem título (Dia ${n.day})`}</option>
                ))}
              </select>
            </div>
          )}

          {type !== 'anotacao' && (
            <div>
              <label className="narrative-label">TÍTULO</label>
            <input 
              type="text" 
              className="journey-input modern-input" 
              style={{ width: "100%", marginTop: "4px" }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Suspeito principal"
            />
          </div>
          )}

          {type !== 'anotacao' && (
          <div>
            <label className="narrative-label">CONTEÚDO {type === 'npc' || type === 'jogador' || type === 'retrato' ? '(OPCIONAL)' : ''}</label>
            <textarea 
              className="form-textarea" 
              rows={3}
              style={{ width: "100%", marginTop: "4px" }}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Anotações sobre este card..."
            />
          </div>
          )}

          {(type === 'artefato' || type === 'retrato' || type === 'anotacao') && (
            <div>
              <label className="diario-image-upload-label" style={{ marginBottom: "8px" }}>
                <span>📷 Imagem do {type === 'artefato' ? 'Artefato' : (type === 'anotacao' ? 'Anexo' : 'Retrato')}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              </label>
              {imageUrl && (
                <div>
                  <img src={imageUrl} alt="Preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-subtle)" }} />
                  <button className="ghost-delete-btn" onClick={() => setImageUrl(undefined)} style={{ marginLeft: "8px", verticalAlign: "top" }}>Remover</button>
                </div>
              )}
            </div>
          )}

        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button className="btn secondary-btn small-btn" onClick={onCancel}>Cancelar</button>
          <button className="btn primary-btn small-btn" onClick={handleSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
