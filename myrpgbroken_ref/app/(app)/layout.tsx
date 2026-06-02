import { UserSessionProvider } from "@/contexts/UserSessionContext";
import { AppProvider } from "@/contexts/AppContext";
import AppShell from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserSessionProvider>
      <AppProvider>
        <AppShell>
          {children}
        </AppShell>
      </AppProvider>
    </UserSessionProvider>
  );
}
