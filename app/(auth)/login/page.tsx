'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import BackgroundEffects from '@/components/layout/BackgroundEffects'

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [loading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (isRegistering) {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message || 'Erro ao criar conta.')
        setSubmitting(false)
      } else {
        setError('Conta criada! Faça login para continuar.')
        setIsRegistering(false)
        setSubmitting(false)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError('Email ou senha incorretos.')
        setSubmitting(false)
      }
    }
  }

  if (loading || isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
        <div className="pulse-indicator" style={{ marginBottom: '1rem', width: '24px', height: '24px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Verificando autenticação...</p>
      </div>
    );
  }

  return (
    <>
      <BackgroundEffects weatherEffect="clear" />
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100%",
        padding: "2rem"
      }}>
        <div className="glass-panel" style={{
          maxWidth: "400px",
          width: "100%",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          textAlign: "center",
          zIndex: 10
        }}>
          <h1 className="view-title" style={{ margin: 0, fontSize: "2rem", color: "var(--accent-primary)", fontWeight: 800 }}>
            MyRPG Next
          </h1>
          <p className="narrative-text" style={{ margin: 0, color: "var(--text-secondary)" }}>
            Acesso ao Sistema
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              onClick={() => setIsRegistering(false)}
              className="btn"
              style={{
                background: "transparent",
                border: "none",
                color: !isRegistering ? "var(--accent-primary)" : "var(--text-muted)",
                fontWeight: !isRegistering ? "bold" : "normal",
                cursor: "pointer",
                padding: "0.5rem"
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className="btn"
              style={{
                background: "transparent",
                border: "none",
                color: isRegistering ? "var(--accent-primary)" : "var(--text-muted)",
                fontWeight: isRegistering ? "bold" : "normal",
                cursor: "pointer",
                padding: "0.5rem"
              }}
            >
              Cadastrar
            </button>
          </div>

          <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{
                padding: "0.75rem",
                borderRadius: "4px",
                background: "rgba(231, 76, 60, 0.2)",
                color: "var(--danger)",
                fontSize: "0.9rem",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", gap: "0.5rem" }}>
              <label htmlFor="email" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="journey-input"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", gap: "0.5rem" }}>
              <label htmlFor="password" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="journey-input"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit"
              className="btn primary-btn" 
              style={{ width: "100%", padding: "1rem", fontSize: "1rem", justifyContent: "center", marginTop: "1rem" }}
              disabled={submitting}
            >
              {submitting ? (isRegistering ? "Criando..." : "Entrando...") : (isRegistering ? "Criar Conta" : "Entrar")}
            </button>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.5rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ou</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            </div>
            
            <button
              type="button"
              className="btn secondary-btn"
              onClick={async () => {
                setSubmitting(true);
                const { error } = await signInWithGoogle();
                if (error) {
                  setError('Erro ao fazer login com o Google.');
                  setSubmitting(false);
                }
              }}
              style={{ width: "100%", padding: "1rem", fontSize: "1rem", justifyContent: "center", display: "flex", alignItems: "center", gap: "10px", background: "#fff", color: "#333", border: "1px solid #ddd" }}
              disabled={submitting}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
