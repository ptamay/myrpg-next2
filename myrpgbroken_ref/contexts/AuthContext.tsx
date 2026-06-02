"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { UserSession } from "@/types/session";

interface AuthContextData {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userProfile: UserSession | null;
  isGM: boolean;
  isPlayer: boolean;
  logout: () => Promise<void>;
  loading: boolean;
  authError?: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchProfile = async (currentUser: User | null) => {
      if (!currentUser) {
        setUserProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase.from('profiles').select('display_name, role, player_id').eq('id', currentUser.id).single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.warn(
              `[AuthContext] Perfil não encontrado no banco de dados para o ID: ${currentUser.id}. ` +
              `Criando sessão de fallback temporária (como GM) para destravar a aplicação.`
            );
            // Fallback para permitir que o sistema funcione provisoriamente
            setUserProfile({
              id: currentUser.id,
              name: currentUser.email ? currentUser.email.split('@')[0] : "Usuário Admin",
              email: currentUser.email || "",
              role: "gm",
              playerId: undefined,
              avatarUrl: "",
              isOnline: true
            });
            } else {
              setAuthError(`DB Error: ${error.code} - ${error.message}`);
              console.error("Erro na query de profiles:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
            }
            return;
          }

        if (data) {
          let avatarUrl = '';
          if (data.player_id) {
            const { data: playerData } = await supabase.from('players').select('image_url').eq('id', data.player_id).single();
            if (playerData && playerData.image_url) {
              avatarUrl = supabase.storage.from('images').getPublicUrl(playerData.image_url).data.publicUrl;
            }
          }
          setUserProfile({
            id: currentUser.id,
            name: data.display_name || 'Jogador',
            email: currentUser.email || '',
            role: data.role as 'gm' | 'player',
            playerId: data.player_id,
            avatarUrl: avatarUrl,
            isOnline: true
          });
        }
      } catch (err: any) {
        setAuthError(`JS Error: ${err.message}`);
        console.error("Erro interno ao buscar perfil:", err);
      }
    };

    let isInitialized = false;

    const initializeAuth = async () => {
      try {
        console.log("[AuthContext] initializeAuth started");
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("[AuthContext] getUser result:", { user, userError });
        console.log("[AuthContext] getSession result:", { session, sessionError });
        
        
        if (userError) setAuthError(`User Error: ${userError.message}`);
        if (sessionError) setAuthError(prev => prev ? prev + ` | Session Error: ${sessionError.message}` : `Session Error: ${sessionError.message}`);
        if (!user) {
          if (!userError) setAuthError(prev => prev || `No User Returned by Supabase`);
        }

        const currentUserObj = user || null;
        setSession(session);
        setUser(currentUserObj);
        setIsAuthenticated(!!currentUserObj);
        await fetchProfile(currentUserObj);
      } catch (error: any) {
        setAuthError(`Init Error: ${error.message}`);
        console.error("Erro ao verificar sessão Supabase:", error);
      } finally {
        if (!isInitialized) {
          isInitialized = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();



    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        setSession(session);
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await fetchProfile(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        // Para TOKEN_REFRESHED, apenas atualizamos o session/user localmente (já feito acima).
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    } finally {
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  };

  // IMPORTANT: Do NOT block rendering with a loading screen here.
  // The Next.js middleware already validates auth server-side.
  // Blocking here causes infinite loading if the Supabase client
  // takes too long to initialize (network issues, cookie parsing, etc.)
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, user, session, logout, loading, authError,
      userProfile, isGM: userProfile?.role === 'gm', isPlayer: userProfile?.role === 'player'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
