export default function Loading() {
  return (
    <div style={{
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column', 
      gap: '1.5rem',
      background: 'var(--bg-main)'
    }}>
      <div className="pulse-indicator" style={{
        width: '60px', 
        height: '60px', 
        border: '4px solid var(--border-subtle)', 
        borderTopColor: 'var(--accent-primary)', 
        borderRadius: '50%', 
        animation: 'spin 1s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite'
      }}></div>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '1.1rem',
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}>Carregando Sessão...</p>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
}
