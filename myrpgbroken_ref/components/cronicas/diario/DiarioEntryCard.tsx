import { useState } from "react";
import { DiaryEntry } from "@/types/cronicas";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import DiarioEntryForm from "./DiarioEntryForm";
import Modal from "@/components/ui/Modal";

export default function DiarioEntryCard({ 
  entry, 
  canDelete, 
  onDelete,
  onUpdate,
  currentUserId,
  currentUserName
}: { 
  entry: DiaryEntry; 
  canDelete: boolean; 
  onDelete: (id: string) => void;
  onUpdate: (entry: DiaryEntry) => void;
  currentUserId: string;
  currentUserName: string;
}) {
  const { dadosGlobais } = useAppContext();
  const { showConfirm } = useSystemDialog();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const player = dadosGlobais.players?.find(p => p.id === entry.authorId);
  const avatar = player?.image;

  const hasLiked = entry.likes?.includes(currentUserId);
  const displayName = entry.authorId === 'gm' ? 'Mestre' : (player ? player.name : entry.authorName);

  // Calcula tempo atrás de forma simples
  const getTempoAtras = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return `Ontem`;
    return `${days}d`;
  };

  const handleLike = () => {
    const likes = entry.likes || [];
    const newLikes = hasLiked 
      ? likes.filter(id => id !== currentUserId)
      : [...likes, currentUserId];
    onUpdate({ ...entry, likes: newLikes });
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: crypto.randomUUID(),
      authorId: currentUserId,
      authorName: currentUserName,
      content: newComment.trim(),
      createdAt: new Date().toISOString()
    };
    const comments = entry.comments || [];
    onUpdate({ ...entry, comments: [...comments, comment] });
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: string) => {
    if (await showConfirm({ title: "Excluir Comentário", message: "Deseja deletar este comentário?", type: "danger" })) {
      const comments = entry.comments || [];
      onUpdate({ ...entry, comments: comments.filter(c => c.id !== commentId) });
    }
  };

  if (isEditing) {
    return (
      <div className="timeline-item">
        <div className="timeline-avatar-wrapper">
          {avatar ? <img src={avatar} alt={displayName} /> : <div className="diario-avatar-placeholder">{(displayName || "?").charAt(0).toUpperCase()}</div>}
        </div>
        <div className="timeline-card" style={{ padding: "0.5rem" }}>
          <DiarioEntryForm
            defaultAuthorId={entry.authorId}
            defaultAuthorName={entry.authorName}
            initialEntry={entry}
            onSubmit={(updatedEntry) => {
              onUpdate(updatedEntry);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-item">
      <div className="timeline-avatar-wrapper">
        {avatar ? (
          <img src={avatar} alt={displayName} />
        ) : (
          <div className="diario-avatar-placeholder">
            {(displayName || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="timeline-card">
        {/* Bloco de Preview Clicável */}
        <div className="timeline-post-block" onClick={() => setShowDetailModal(true)}>
          <div className="timeline-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="timeline-author">{displayName}</span>
              <span className="timeline-meta">{getTempoAtras(entry.createdAt)}</span>
            </div>
            {canDelete && (
              <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                <button 
                  className="timeline-action" 
                  style={{ padding: "0.2rem 0.5rem" }}
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                >
                  ⋮
                </button>
                {showMenu && (
                  <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "0.25rem", zIndex: 10, display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "100px", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
                    <button 
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem", padding: "0.5rem 0.75rem", cursor: "pointer", display: "block", width: "100%", transition: "color 0.2s", borderRadius: "var(--radius-sm)" }} 
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                    >
                      Editar
                    </button>
                    <button 
                      style={{ background: "none", border: "none", color: "var(--danger)", textAlign: "left", fontSize: "0.85rem", padding: "0.5rem 0.75rem", cursor: "pointer", display: "block", width: "100%", transition: "opacity 0.2s", borderRadius: "var(--radius-sm)" }} 
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (await showConfirm({ title: "Excluir Registro", message: "Deseja deletar este registro?", type: "danger" })) {
                          onDelete(entry.id);
                        }
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {entry.sessionTitle && (
            <div className="timeline-title">Sessão {entry.sessionNumber}: {entry.sessionTitle}</div>
          )}

          <div className="timeline-content-preview">
            {entry.content}
          </div>

          {entry.imageUrl && (
            <img src={entry.imageUrl} alt="Anexo" className="timeline-image-preview" />
          )}
        </div>

        {/* Rodapé de Ações - Fora do bloco clicável */}
        <div className="timeline-footer">
          <button 
            className="timeline-action" 
            style={{ color: hasLiked ? "var(--accent-primary)" : "var(--text-muted)" }}
            onClick={handleLike}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span style={{ fontSize: "0.8rem" }}>{(entry.likes?.length || 0) > 0 ? entry.likes.length : ''}</span>
          </button>
          <button className="timeline-action" onClick={() => setShowDetailModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span style={{ fontSize: "0.8rem" }}>{(entry.comments?.length || 0) > 0 ? entry.comments?.length : ''}</span>
          </button>
        </div>
      </div>

      {/* Modal Detalhado da Entrada */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} id={`diary-detail-${entry.id}`}>
        <div className="modal-content glass-panel" style={{ maxWidth: "700px", width: "90%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <header className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <div className="modal-title-group">
              <span className="modal-subtitle">Postagem do Diário</span>
              <h2 className="modal-title">{entry.sessionTitle ? `Sessão ${entry.sessionNumber}: ${entry.sessionTitle}` : "Detalhes da Entrada"}</h2>
            </div>
            <button 
              className="timeline-action" 
              style={{ fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }} 
              onClick={() => setShowDetailModal(false)}
            >
              ×
            </button>
          </header>

          <div className="modal-body scrollable-area" style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
            {/* Cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div className="timeline-avatar-wrapper" style={{ margin: 0 }}>
                {avatar ? (
                  <img src={avatar} alt={displayName} style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
                ) : (
                  <div className="diario-avatar-placeholder" style={{ width: "40px", height: "40px", fontSize: "1rem" }}>
                    {(displayName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="timeline-author" style={{ fontSize: "1rem" }}>{displayName}</span>
                <span className="timeline-meta" style={{ fontSize: "0.75rem" }}>{getTempoAtras(entry.createdAt)}</span>
              </div>
            </div>

            {/* Conteúdo Completo */}
            <div className="timeline-content" style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {entry.content}
            </div>

            {/* Imagem em tamanho normal */}
            {entry.imageUrl && (
              <img src={entry.imageUrl} alt="Anexo Detalhado" className="timeline-image-detail" />
            )}

            {/* Ações e Comentários dentro do Modal */}
            <div style={{ borderTop: "1px dashed var(--border-subtle)", paddingTop: "1rem", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <button 
                  className="timeline-action" 
                  style={{ color: hasLiked ? "var(--accent-primary)" : "var(--text-muted)", fontSize: "0.9rem" }}
                  onClick={handleLike}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.25rem" }}>
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                  <span>{hasLiked ? 'Curtido' : 'Curtir'} ({entry.likes?.length || 0})</span>
                </button>
                <div className="timeline-action" style={{ cursor: "default" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.25rem" }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Comentários ({(entry.comments || []).length})</span>
                </div>
              </div>

              {/* Lista de Comentários */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {(entry.comments || []).length > 0 ? (
                  entry.comments?.map(c => {
                    const isCommentAuthor = c.authorId === currentUserId;
                    const canDeleteComment = isCommentAuthor || currentUserId === "gm";
                    return (
                      <div key={c.id} style={{ background: "hsla(0,0%,100%,0.02)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>{c.authorId === 'gm' ? 'Mestre' : c.authorName}</span>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{getTempoAtras(c.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{c.content}</div>
                        </div>
                        {canDeleteComment && (
                          <button 
                            className="timeline-action" 
                            style={{ color: "var(--danger)", padding: "0.2rem", fontSize: "0.8rem" }}
                            onClick={() => handleDeleteComment(c.id)}
                            title="Excluir comentário"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Nenhum comentário ainda.</p>
                )}
              </div>

              {/* Novo Comentário */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  type="text" 
                  className="journey-input modern-input" 
                  style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem" }}
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
                />
                <button 
                  className="btn primary-btn" 
                  style={{ padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
