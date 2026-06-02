"use client";
import { useUserSession } from "@/contexts/UserSessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const { session, isGM } = useUserSession();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const isAdmin = session?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const allTabs = [
    {
      id: "view-dashboard",
      path: "/dashboard",
      title: "Painel da Sessão",
      label: "Sessão",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      id: "view-cronicas",
      path: "/cronicas",
      title: "Crônicas",
      label: "Crônicas",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      id: "view-npcs",
      path: "/npcs",
      title: "Gerenciador de NPCs",
      label: "NPCs",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      id: "view-players",
      path: "/jogadores",
      title: "Personagens da Campanha",
      label: "Jogadores",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    {
      id: "view-food",
      path: "/alimentos",
      title: "Gestão de Alimentos",
      label: "Alimentos",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.4 9.5a4 4 0 0 0-5.5 0l-3 3a4 4 0 0 0 0 5.5l.3.3a3 3 0 0 0 4.1 0l3-3a3 3 0 0 0 0-4.1z" />
          <path d="M11.2 13.8l-4.7 4.7" />
          <path d="M8.5 21a2 2 0 1 1-3-3" />
          <path d="M5.5 18a2 2 0 1 1-3-3" />
        </svg>
      )
    },
    {
      id: "view-maps",
      path: "/mapas",
      title: "Galeria de Mapas",
      label: "Mapas",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
          <line x1="8" y1="2" x2="8" y2="18"></line>
          <line x1="16" y1="6" x2="16" y2="22"></line>
        </svg>
      )
    },
    {
      id: "view-settings",
      path: "/ajustes",
      title: "Configurações e Backup",
      label: "Ajustes",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    {
      id: "view-users",
      path: "/usuarios",
      title: "Gerenciamento de Usuários",
      label: "Usuários",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      adminOnly: true
    }
  ];

  const tabs = allTabs.filter(t => {
    if (t.id === "view-settings") return isGM;
    if (t.adminOnly) return isAdmin;
    return true;
  });

  // Initials for avatar fallback
  const getInitials = () => {
    if (session?.name) return session.name.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <nav className="sidebar glass-panel">
      <div className="sidebar-logo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2v22"></path><path d="M9.5 2v22"></path><path d="M2 14.5h22"></path><path d="M2 9.5h22"></path><circle cx="12" cy="12" r="7"></circle>
        </svg>
      </div>
      <ul className="sidebar-nav">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          return (
            <li key={tab.id}>
              <button
                className={`nav-tab ${isActive ? "active" : ""}`}
                onClick={() => router.push(tab.path)}
                title={tab.title}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        {session && (
          <div 
            className="nav-tab" 
            style={{ 
              cursor: "default", 
              background: "hsla(0, 0%, 100%, 0.05)",
              borderColor: "var(--border-subtle)"
            }}
            title={session.name || "Usuário"}
          >
            {session.avatarUrl ? (
              <img 
                src={session.avatarUrl} 
                alt="Avatar" 
                style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} 
              />
            ) : (
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--accent-primary)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "0.85rem"
              }}>
                {getInitials()}
              </div>
            )}
            <span style={{ 
              fontSize: "0.55rem", 
              whiteSpace: "nowrap", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              maxWidth: "50px" 
            }}>
              {session.role === 'gm' ? 'MESTRE' : 'JOGADOR'}
            </span>
          </div>
        )}
        <button
          className="nav-tab logout-btn"
          onClick={async () => {
             try {
               await fetch('/auth/signout', { method: 'POST' });
               await logout(); // Also clear client state
             } catch (err) {
               console.error("Sidebar logout fallback:", err);
             } finally {
               window.location.href = "/login";
             }
          }}
          title="Sair do Sistema"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}
