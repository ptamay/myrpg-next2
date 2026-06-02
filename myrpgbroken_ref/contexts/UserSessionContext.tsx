"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { UserSession } from "@/types/session";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";

interface UserSessionContextData {
  session: UserSession | null;
  isGM: boolean;
  isPlayer: boolean;
}

const UserSessionContext = createContext<UserSessionContextData>({} as UserSessionContextData);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const { userProfile, isGM, isPlayer } = useAuth();
  
  return (
    <UserSessionContext.Provider value={{
      session: userProfile,
      isGM,
      isPlayer,
    }}>
      {children}
    </UserSessionContext.Provider>
  );
}

export const useUserSession = () => useContext(UserSessionContext);
