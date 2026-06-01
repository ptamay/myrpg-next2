import React from 'react';

interface MuralToolbarProps {
  onAddCard: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  connectingMode: boolean;
  onToggleConnect: () => void;
  onExportImage?: () => void;
  currentBackground?: string;
  onChangeBackground?: (bg: string) => void;
  onRecenter?: () => void;
}

export default function MuralToolbar({
  onAddCard,
  zoom,
  onZoomIn,
  onZoomOut,
  connectingMode,
  onToggleConnect,
  onExportImage,
  currentBackground = 'grid',
  onChangeBackground,
  onRecenter
}: MuralToolbarProps) {
  const backgrounds = ['grid', 'dark-paper', 'wood'];
  const bgNames: Record<string, string> = { 
    'grid': 'Malha', 
    'dark-paper': 'Papel Escuro', 
    'wood': 'Madeira'
  };

  return (
    <div className="mural-toolbar">
      <button className="nav-btn" onClick={onAddCard} title="Adicionar Card">
        📌
      </button>
      <button 
        className="nav-btn" 
        onClick={onToggleConnect} 
        title="Modo Conexão"
        style={{ borderColor: connectingMode ? "var(--accent-primary)" : "transparent", borderWidth: connectingMode ? 2 : 0, borderStyle: "solid" }}
      >
        🔗
      </button>

      {onChangeBackground && (
        <button 
          className="nav-btn" 
          onClick={() => {
            const nextIdx = (backgrounds.indexOf(currentBackground) + 1) % backgrounds.length;
            onChangeBackground(backgrounds[nextIdx]);
          }} 
          title={`Fundo: ${bgNames[currentBackground]}`}
        >
          🎨
        </button>
      )}
      
      <div style={{ width: "60%", height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />
      
      {onRecenter && (
        <button className="nav-btn" onClick={onRecenter} title="Centralizar Mural (0,0)">
          🎯
        </button>
      )}

      <button className="nav-btn" onClick={onZoomIn} title="Zoom In">
        +
      </button>
      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", width: "100%" }}>
        {Math.round(zoom * 100)}%
      </span>
      <button className="nav-btn" onClick={onZoomOut} title="Zoom Out">
        −
      </button>

      {onExportImage && (
        <>
          <div style={{ width: "60%", height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />
          <button className="nav-btn" onClick={onExportImage} title="Exportar como Imagem">
            📷
          </button>
        </>
      )}
    </div>
  );
}
