'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import BackgroundEffects from '@/components/layout/BackgroundEffects'

export default function LoginPage() {
  const { signIn, signUp, isAuthenticated, loading } = useAuth()
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
          </form>
        </div>
      </div>
    </>
  )
}
