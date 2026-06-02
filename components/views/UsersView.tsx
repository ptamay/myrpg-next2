"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'gm' | 'player';
  created_at: string;
}

export default function UsersView() {
  const { profile, sessionLoading, isGM } = useUserSession();
  const { loading: authLoading } = useAuth();
  const userProfile = profile;
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { showConfirm, showAlert } = useSystemDialog();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Estados locais para alterações não salvas
  const [changedRoles, setChangedRoles] = useState<{ [userId: string]: 'gm' | 'player' }>({});
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(new Set());

  const isAdmin = userProfile?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const canManageUsers = isGM || isAdmin;

  useEffect(() => {
    if (authLoading) return;
    
    if (userProfile && !canManageUsers) {
      router.push("/dashboard");
      return;
    }

    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw new Error(error?.message || JSON.stringify(error));
        setProfiles(data || []);
      } catch (error) {
        console.error("Erro ao buscar perfis:", error);
      } finally {
        setLoading(false);
      }
    };

    if (canManageUsers) {
      fetchProfiles();
    } else if (!userProfile) {
      setLoading(false);
    }
  }, [userProfile, canManageUsers, router, supabase, authLoading]);

  const handleRoleChangeLocal = (userId: string, newRole: 'gm' | 'player') => {
    const originalProfile = profiles.find(p => p.id === userId);
    if (!originalProfile) return;

    if (originalProfile.role === newRole) {
      const updated = { ...changedRoles };
      delete updated[userId];
      setChangedRoles(updated);
    } else {
      setChangedRoles(prev => ({ ...prev, [userId]: newRole }));
    }
  };

  const handleDeleteToggleLocal = (userId: string) => {
    setDeletedUserIds(prev => {
      const updated = new Set(prev);
      if (updated.has(userId)) {
        updated.delete(userId);
      } else {
        updated.add(userId);
      }
      return updated;
    });
  };

  const handleDiscardChanges = () => {
    setChangedRoles({});
    setDeletedUserIds(new Set());
  };

  const handleResetPassword = async (user: Profile) => {
    const method = await showConfirm({
      title: "Redefinir Senha",
      message: `Como deseja redefinir a senha de ${user.display_name || user.email}?`,
      confirmText: "Gerar Senha Aleatória",
      cancelText: "Enviar Email de Reset",
    });

    // Se usuário cancelar o modal (retorna null ou undefined)
    if (method === null || method === undefined) return;

    if (method) {
      // Gerar senha aleatória
      const randomPassword = Math.random().toString(36).slice(-8);
      
      try {
        const res = await fetch('/api/admin/reset-password', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: user.id, newPassword: randomPassword })
        });
        
        const data = await res.json();
        if (!res.ok || data.error) {
           await showAlert({ 
             title: "Aviso do Sistema", 
             message: (data.error || "Erro desconhecido") + "\\n\\nVamos enviar um link de redefinição para o email do usuário como alternativa.", 
             type: "warning" 
           });
           await supabase.auth.resetPasswordForEmail(user.email);
           await showAlert({ title: "Email Enviado", message: `Link de redefinição enviado para ${user.email}`, type: "success" });
        } else {
           await showAlert({ 
             title: "Senha Alterada com Sucesso!", 
             message: `A nova senha de ${user.display_name || user.email} é:\\n\\n${randomPassword}\\n\\nCopie e envie ao jogador com segurança.`, 
             type: "success" 
           });
        }
      } catch (err: any) {
        await showAlert({ title: "Erro de Comunicação", message: "Erro ao conectar com a API: " + err.message, type: "danger" });
      }
    } else {
      // Enviar email
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email);
        if (error) throw error;
        await showAlert({ title: "Email Enviado", message: `Link de redefinição enviado com sucesso para ${user.email}.`, type: "success" });
      } catch (err: any) {
        await showAlert({ title: "Erro", message: "Não foi possível enviar o email: " + err.message, type: "danger" });
      }
    }
  };

  const handleSaveChanges = async () => {
    const numDeletes = deletedUserIds.size;
    const numUpdates = Object.keys(changedRoles).length;

    if (numDeletes === 0 && numUpdates === 0) return;

    let confirmMsg = "Deseja salvar as alterações realizadas?";
    if (numDeletes > 0 && numUpdates > 0) {
      confirmMsg = `Deseja aplicar as alterações? ${numDeletes} usuário(s) será(ão) excluído(s) e ${numUpdates} terá(ão) seu papel atualizado.`;
    } else if (numDeletes > 0) {
      confirmMsg = `Deseja excluir ${numDeletes} usuário(s) permanentemente?`;
    } else if (numUpdates > 0) {
      confirmMsg = `Deseja atualizar o papel de ${numUpdates} usuário(s)?`;
    }

    const confirmed = await showConfirm({
      title: "Confirmar Alterações",
      message: confirmMsg,
      type: numDeletes > 0 ? "danger" : "warning",
      confirmText: "Aplicar",
      cancelText: "Cancelar"
    });

    if (!confirmed) return;

    setUpdating("saving-all");
    try {
      if (numDeletes > 0) {
        const { data: deletedData, error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .in('id', Array.from(deletedUserIds))
          .select();

        if (deleteError) throw new Error(deleteError?.message || JSON.stringify(deleteError));
        if (!deletedData || deletedData.length === 0) {
          throw new Error("Nenhum usuário pôde ser excluído. Verifique as políticas de segurança (RLS).");
        }
      }

      for (const [userId, newRole] of Object.entries(changedRoles)) {
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId)
          .select();

        if (updateError) throw new Error(updateError?.message || JSON.stringify(updateError));
        if (!updatedData || updatedData.length === 0) {
          throw new Error("Não foi possível atualizar o papel do usuário.");
        }
      }

      const updatedProfiles = profiles
        .filter(p => !deletedUserIds.has(p.id))
        .map(p => {
          if (p.id in changedRoles) {
            return { ...p, role: changedRoles[p.id] };
          }
          return p;
        });

      setProfiles(updatedProfiles);
      setChangedRoles({});
      setDeletedUserIds(new Set());

      await showAlert({
        title: "Sucesso",
        message: "Alterações aplicadas com sucesso!",
        type: "success"
      });
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      await showAlert({
        title: "Erro ao Salvar",
        message: "Não foi possível salvar as alterações: " + errMsg,
        type: "danger"
      });
    } finally {
      setUpdating(null);
    }
  };

  const hasChanges = Object.keys(changedRoles).length > 0 || deletedUserIds.size > 0;

  if (!userProfile && !authLoading) return null;
  
  if (!canManageUsers) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column" }}>
        <h1 className="view-title" style={{ color: "var(--danger)" }}>Acesso Negado</h1>
        <p className="narrative-text">Apenas o administrador ou mestre do sistema podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "var(--bg-dark)" }}>
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        
        {/* HEADER SECTION */}
        <header style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary)", padding: "10px", borderRadius: "12px" }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h1 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Gestão de Usuários
              </h1>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.5, maxWidth: "600px" }}>
              Administre os jogadores da campanha. Atribua cargos, redefina senhas com segurança ou remova usuários do sistema. Por padrão, todo novo registro é "Jogador".
            </p>
          </div>
          
          <AnimatePresence>
            {hasChanges && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                style={{ display: "flex", gap: "1rem", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}
              >
                <div style={{ display: "flex", flexDirection: "column", marginRight: "8px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--warning)", textTransform: "uppercase" }}>Alterações Pendentes</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Revise antes de salvar</span>
                </div>
                <button 
                  className="btn secondary-btn" 
                  onClick={handleDiscardChanges}
                  disabled={updating !== null}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                >
                  Descartar
                </button>
                <button 
                  className="btn primary-btn" 
                  onClick={handleSaveChanges}
                  disabled={updating !== null}
                  style={{ 
                    background: "var(--accent-primary)", 
                    color: "#fff", 
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                    borderRadius: "8px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {updating ? (
                    <>
                      <div className="pulse-indicator" style={{ width: "8px", height: "8px", background: "#fff" }} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Confirmar Mudanças
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* LIST SECTION */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: "1.5rem" }}>
            <div className="pulse-indicator" style={{ width: "40px", height: "40px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", fontWeight: 600 }}>Carregando dados dos usuários...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "1rem", opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", fontWeight: 600 }}>Nenhum usuário encontrado no sistema.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
            <AnimatePresence>
              {profiles.map(profile => {
                const isDeleted = deletedUserIds.has(profile.id);
                const isMyAccount = userProfile?.id === profile.id;
                const currentRole = changedRoles[profile.id] || profile.role;
                const hasRoleChanged = profile.id in changedRoles;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: isDeleted ? 0.4 : 1, scale: 1 }}
                    key={profile.id}
                    style={{
                      background: "rgba(20, 20, 25, 0.6)",
                      backdropFilter: "blur(12px)",
                      border: isDeleted 
                        ? "1px solid rgba(239, 68, 68, 0.3)" 
                        : hasRoleChanged 
                          ? "1px solid rgba(251, 191, 36, 0.4)" 
                          : "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      position: "relative",
                      transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                      boxShadow: hasRoleChanged ? "0 10px 25px rgba(251, 191, 36, 0.05)" : "0 4px 15px rgba(0,0,0,0.2)"
                    }}
                  >
                    {/* Top Accent Line */}
                    <div style={{ 
                      height: "4px", 
                      width: "100%", 
                      background: isDeleted ? "var(--danger)" : currentRole === 'gm' ? "var(--accent-primary)" : "var(--text-secondary)" 
                    }} />

                    <div style={{ padding: "1.5rem" }}>
                      
                      {/* Avatar & Name */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                        <div style={{ 
                          width: "50px", height: "50px", borderRadius: "14px", 
                          background: currentRole === 'gm' ? "linear-gradient(135deg, var(--accent-primary), #312e81)" : "rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1.2rem", fontWeight: 800, color: "#fff",
                          border: "1px solid rgba(255,255,255,0.1)",
                          boxShadow: currentRole === 'gm' ? "0 4px 10px rgba(99, 102, 241, 0.3)" : "none"
                        }}>
                          {(profile.display_name || profile.email).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {profile.display_name || "Sem Nome"}
                          </h3>
                          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {profile.email}
                          </p>
                        </div>
                        {isMyAccount && (
                          <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "4px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>
                            Você
                          </div>
                        )}
                      </div>

                      {/* Controls Area */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        
                        {/* Role Selector */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                            Nível de Acesso
                          </label>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              disabled={isDeleted || isMyAccount}
                              onClick={() => handleRoleChangeLocal(profile.id, 'player')}
                              style={{ 
                                flex: 1, padding: "8px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: isDeleted || isMyAccount ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                background: currentRole === 'player' ? "rgba(255,255,255,0.1)" : "transparent",
                                color: currentRole === 'player' ? "#fff" : "var(--text-muted)",
                                border: currentRole === 'player' ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.05)"
                              }}
                            >
                              Jogador
                            </button>
                            <button
                              disabled={isDeleted || isMyAccount}
                              onClick={() => handleRoleChangeLocal(profile.id, 'gm')}
                              style={{ 
                                flex: 1, padding: "8px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, cursor: isDeleted || isMyAccount ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                background: currentRole === 'gm' ? "rgba(99, 102, 241, 0.2)" : "transparent",
                                color: currentRole === 'gm' ? "var(--accent-primary)" : "var(--text-muted)",
                                border: currentRole === 'gm' ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid rgba(255,255,255,0.05)"
                              }}
                            >
                              Mestre (GM)
                            </button>
                          </div>
                        </div>

                        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0.5rem 0" }} />

                        {/* Actions */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          
                          <button 
                            className="btn"
                            onClick={() => handleResetPassword(profile)}
                            disabled={isDeleted}
                            style={{ 
                              background: "transparent", 
                              border: "1px solid rgba(255,255,255,0.1)", 
                              color: "var(--text-secondary)", 
                              padding: "6px 12px", 
                              fontSize: "0.8rem", 
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: isDeleted ? "not-allowed" : "pointer",
                              opacity: isDeleted ? 0.5 : 1
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Resetar Senha
                          </button>

                          <button 
                            onClick={() => !isMyAccount && handleDeleteToggleLocal(profile.id)}
                            disabled={isMyAccount}
                            style={{ 
                              background: isDeleted ? "rgba(239, 68, 68, 0.15)" : "transparent", 
                              border: "none", 
                              color: isDeleted ? "#fca5a5" : "var(--text-muted)", 
                              padding: "6px", 
                              borderRadius: "8px",
                              cursor: isMyAccount ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s"
                            }}
                            title={isDeleted ? "Restaurar Usuário" : "Remover Usuário"}
                          >
                            {isDeleted ? (
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            )}
                          </button>

                        </div>

                      </div>

                    </div>
                    
                    {/* Status Overlays */}
                    {isDeleted && (
                      <div style={{ position: "absolute", top: "12px", right: "12px", background: "var(--danger)", color: "#fff", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: "10px", letterSpacing: "0.05em", boxShadow: "0 2px 5px rgba(239,68,68,0.3)" }}>
                        Removido
                      </div>
                    )}
                    {!isDeleted && hasRoleChanged && (
                      <div style={{ position: "absolute", top: "12px", right: "12px", background: "var(--warning)", color: "#000", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: "10px", letterSpacing: "0.05em", boxShadow: "0 2px 5px rgba(251,191,36,0.3)" }}>
                        Modificado
                      </div>
                    )}

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
