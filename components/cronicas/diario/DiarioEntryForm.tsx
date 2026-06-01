"use client";
import { useState } from "react";
import { DiaryEntry } from "@/types/cronicas";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import CropModal from "@/components/modals/CropModal";

import { useDiario } from "@/hooks/useGameData";

interface DiarioEntryFormProps {
  defaultAuthorId: string;
  defaultAuthorName: string;
  initialEntry?: DiaryEntry;
  onSubmit: (entry: DiaryEntry) => void;
  onCancel: () => void;
}

export default function DiarioEntryForm({ defaultAuthorId, defaultAuthorName, initialEntry, onSubmit, onCancel }: DiarioEntryFormProps) {
  const { entries } = useDiario();
  const maxSession = entries.length > 0 ? Math.max(...entries.map(e => e.sessionNumber)) : 0;
  const sessionOptions = Array.from({ length: maxSession + 1 }, (_, i) => i + 1).reverse();
  
  const [sessionNumber, setSessionNumber] = useState<number | "">(initialEntry ? initialEntry.sessionNumber : (sessionOptions[0] || 1));
  const [sessionTitle, setSessionTitle] = useState(initialEntry ? initialEntry.sessionTitle : "");
  const [content, setContent] = useState(initialEntry ? initialEntry.content : "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialEntry ? initialEntry.imageUrl : undefined);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const { showAlert } = useSystemDialog();

  const handleSubmit = async () => {
    if (!sessionNumber || !content.trim()) {
      await showAlert("Preencha o número da sessão e o conteúdo.");
      return;
    }

    const entry: DiaryEntry = {
      id: initialEntry ? initialEntry.id : crypto.randomUUID(),
      sessionNumber: Number(sessionNumber),
      sessionTitle: sessionTitle.trim(),
      content: content.trim(),
      imageUrl,
      authorId: initialEntry ? initialEntry.authorId : defaultAuthorId,
      authorName: initialEntry ? initialEntry.authorName : defaultAuthorName,
      createdAt: initialEntry ? initialEntry.createdAt : new Date().toISOString(),
      likes: initialEntry ? initialEntry.likes : [],
      comments: initialEntry ? initialEntry.comments : []
    };

    onSubmit(entry);
  };

  return (
    <div className="diario-form">
      <div className="diario-form-row">
        <div>
          <label className="narrative-label">Nº DA SESSÃO</label>
          <select 
            className="journey-input modern-input" 
            style={{ width: "100%", marginTop: "4px" }}
            value={sessionNumber}
            onChange={e => setSessionNumber(Number(e.target.value))}
          >
            {sessionOptions.map(num => (
              <option key={num} value={num}>Sessão {num}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="narrative-label">TÍTULO (OPCIONAL)</label>
          <input 
            type="text" 
            className="journey-input modern-input" 
            style={{ width: "100%", marginTop: "4px" }}
            value={sessionTitle}
            onChange={e => setSessionTitle(e.target.value)}
            placeholder="Ex: A Fuga do Templo"
          />
        </div>
      </div>
      
      <div>
        <label className="narrative-label">CONTEÚDO</label>
        <textarea 
          className="form-textarea" 
          rows={4}
          style={{ width: "100%", marginTop: "4px" }}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="O que aconteceu?"
        />
      </div>

      <div>
        <label className="diario-image-upload-label">
          <span>📷 Anexar Imagem</span>
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </label>
        {imageUrl && (
          <div style={{ marginTop: "8px", position: "relative", display: "inline-block" }}>
            <img src={imageUrl} alt="Preview" className="diario-image-preview" />
            <button 
              className="ghost-delete-btn" 
              style={{ position: "absolute", top: -8, right: -8, background: "var(--danger)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", padding: 0, opacity: 1 }}
              onClick={() => setImageUrl(undefined)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="diario-form-actions">
        <button className="btn secondary-btn small-btn" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn primary-btn small-btn" onClick={handleSubmit}>
          Publicar
        </button>
      </div>

      <CropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={cropImageSrc}
        aspectRatio={1.5}
        onCrop={(base64) => setImageUrl(base64)}
      />
    </div>
  );
}
