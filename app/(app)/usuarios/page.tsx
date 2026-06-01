"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSystemDialog } from "@/contexts/SystemDialogContext";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'gm' | 'player';
  created_at: string;
}

export default function UsuariosPage() {
  const { profile, sessionLoading } = useUserSession();
  const { loading: authLoading } = useAuth();
  const userProfile = profile; // Alias to avoid breaking other usages below
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

  useEffect(() => {
    if (authLoading) return; // Wait for auth resolution
    
    if (userProfile && !isAdmin) {
      router.push("/dashboard");
      return;
    }

    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error("Erro ao buscar perfis:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchProfiles();
    } else if (!userProfile) {
      setLoading(false); // Make sure loading state resolves if unauthenticated
    }
  }, [userProfile, isAdmin, router, supabase, authLoading]);

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
      // 1. Processar exclusões
      if (numDeletes > 0) {
        const { data: deletedData, error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .in('id', Array.from(deletedUserIds))
          .select();

        if (deleteError) throw deleteError;
        if (!deletedData || deletedData.length === 0) {
          throw new Error("Nenhum usuário pôde ser excluído. Verifique as políticas de segurança (RLS) no Supabase.");
        }
      }

      // 2. Processar atualizações de papéis
      for (const [userId, newRole] of Object.entries(changedRoles)) {
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId)
          .select();

        if (updateError) throw updateError;
        if (!updatedData || updatedData.length === 0) {
          throw new Error("Não foi possível atualizar o papel do usuário. Verifique as políticas de segurança (RLS) no Supabase.");
        }
      }

      // Atualizar lista local de perfis
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
        message: "Não foi possível salvar as alterações. Detalhes: " + errMsg,
        type: "danger"
      });
    } finally {
      setUpdating(null);
    }
  };

  const hasChanges = Object.keys(changedRoles).length > 0 || deletedUserIds.size > 0;

  if (!userProfile && !authLoading) return null;
  
  if (!isAdmin) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column" }}>
        <h1 className="view-title" style={{ color: "var(--danger)" }}>Acesso Negado</h1>
        <p className="narrative-text">Apenas o administrador do sistema pode acessar esta página.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "2rem", overflowY: "auto" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="view-title" style={{ margin: "0 0 0.5rem 0", fontSize: "2rem", color: "var(--accent-primary)" }}>
            Gerenciamento de Usuários
          </h1>
          <p className="view-subtitle" style={{ margin: 0, color: "var(--text-secondary)" }}>
            Altere os privilégios ou remova os usuários cadastrados no sistema.
          </p>
        </div>
        {hasChanges && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button 
              className="btn secondary-btn" 
              onClick={handleDiscardChanges}
              disabled={updating !== null}
            >
              Descartar
            </button>
            <button 
              className="btn primary-btn" 
              onClick={handleSaveChanges}
              disabled={updating !== null}
              style={{ background: "var(--accent-primary)" }}
            >
              {updating ? "Salvando..." : "Confirmar Alterações"}
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <p className="narrative-text">Carregando usuários...</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "12px", background: "rgba(0, 0, 0, 0.4)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>Data de Cadastro</th>
                  <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>Papel (Role)</th>
                  <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(profile => {
                  const isDeleted = deletedUserIds.has(profile.id);
                  const hasRoleChanged = profile.id in changedRoles;
                  const currentRole = hasRoleChanged ? changedRoles[profile.id] : profile.role;
                  const isAdminUser = profile.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

                  return (
                    <tr 
                      key={profile.id} 
                      style={{ 
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        opacity: isDeleted ? 0.4 : 1,
                        transition: "all 0.2s ease",
                        background: isDeleted ? "rgba(231, 76, 60, 0.02)" : hasRoleChanged ? "rgba(52, 152, 219, 0.02)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "1rem", textDecoration: isDeleted ? "line-through" : "none" }}>
                        {profile.display_name || "Sem Nome"}
                      </td>
                      <td style={{ padding: "1rem", textDecoration: isDeleted ? "line-through" : "none" }}>
                        {profile.email}
                      </td>
                      <td style={{ padding: "1rem", textDecoration: isDeleted ? "line-through" : "none" }}>
                        {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          background: isDeleted
                            ? "rgba(231, 76, 60, 0.2)"
                            : currentRole === 'gm' ? "rgba(155, 89, 182, 0.2)" : "rgba(52, 152, 219, 0.2)",
                          color: isDeleted
                            ? "#e74c3c"
                            : currentRole === 'gm' ? "#9b59b6" : "#3498db",
                          border: hasRoleChanged && !isDeleted ? "1px dashed currentColor" : "none",
                          textDecoration: isDeleted ? "line-through" : "none"
                        }}>
                          {isDeleted 
                            ? 'Remover' 
                            : currentRole === 'gm' ? 'Mestre (GM)' : 'Jogador'}
                          {hasRoleChanged && !isDeleted && " *"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", alignItems: "center" }}>
                          {!isDeleted && (
                            <select 
                              className="journey-input"
                              style={{ 
                                padding: "0.5rem", 
                                width: "auto", 
                                minWidth: "120px",
                                borderColor: hasRoleChanged ? "var(--accent-primary)" : "var(--border-subtle)",
                                boxShadow: hasRoleChanged ? "0 0 0 1px var(--accent-primary)" : "none"
                              }}
                              value={currentRole}
                              disabled={updating !== null}
                              onChange={(e) => handleRoleChangeLocal(profile.id, e.target.value as 'gm' | 'player')}
                            >
                              <option value="player">Jogador</option>
                              <option value="gm">Mestre (GM)</option>
                            </select>
                          )}

                          {!isAdminUser && (
                            <button
                              className="btn icon-only"
                              style={{ 
                                padding: "0.5rem", 
                                background: isDeleted ? "rgba(46, 204, 113, 0.15)" : "rgba(231, 76, 60, 0.15)",
                                color: isDeleted ? "#2ecc71" : "#e74c3c",
                                border: "none",
                                cursor: "pointer",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "36px",
                                height: "36px",
                                transition: "all 0.2s ease"
                              }}
                              title={isDeleted ? "Desfazer remoção" : "Remover usuário"}
                              disabled={updating !== null}
                              onClick={() => handleDeleteToggleLocal(profile.id)}
                            >
                              {isDeleted ? (
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="23 4 23 10 17 10"></polyline>
                                  <polyline points="1 20 1 14 7 14"></polyline>
                                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
