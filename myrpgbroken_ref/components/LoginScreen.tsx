"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: "Por favor, insira seu email.", type: "danger" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) throw error;
      
      setMessage({ 
        text: "✉️ Verifique seu email — o link de acesso foi enviado!", 
        type: "success" 
      });
      setEmail("");
    } catch (error: any) {
      setMessage({ text: "Erro: " + error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ text: "Erro: " + error.message, type: "danger" });
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "100%",
      padding: "2rem"
    }}>
      <div className="glass-panel" style={{
        maxWidth: "400px",
        width: "100%",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        textAlign: "center"
      }}>
        <h1 className="view-title" style={{ margin: 0, fontSize: "1.5rem", color: "var(--accent-primary)" }}>
          MyRPG Next
        </h1>
        <p className="narrative-text" style={{ margin: 0 }}>
          Acesso ao Sistema
        </p>

        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />

        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="btn" 
          style={{ 
            width: "100%", 
            padding: "1rem", 
            fontSize: "1rem", 
            justifyContent: "center", 
            background: "white", 
            color: "#333", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem",
            border: "1px solid #ccc"
          }}
          disabled={googleLoading || loading}
        >
          {googleLoading ? "Redirecionando..." : (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Entrar com Google
            </>
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.5rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>OU</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {message.text && (
            <div style={{
              padding: "0.75rem",
              borderRadius: "4px",
              background: message.type === "success" ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)",
              color: message.type === "success" ? "var(--success)" : "var(--danger)",
              fontSize: "0.9rem",
              textAlign: "left"
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", textAlign: "left", gap: "0.5rem" }}>
            <label htmlFor="email" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Email de Acesso</label>
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

          <button 
            type="submit"
            className="btn primary-btn" 
            style={{ width: "100%", padding: "1rem", fontSize: "1rem", justifyContent: "center", marginTop: "0.5rem" }}
            disabled={loading || googleLoading}
          >
            {loading ? "Enviando..." : "Enviar link de acesso"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>
        
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
          Sem senhas. Apenas clique no link que enviaremos para o seu email.
        </p>
      </div>
    </div>
  );
}
