"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import BackgroundEffects from "@/components/layout/BackgroundEffects";
import LoginScreen from "@/components/LoginScreen";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, loading]);

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
      <LoginScreen />
    </>
  );
}
