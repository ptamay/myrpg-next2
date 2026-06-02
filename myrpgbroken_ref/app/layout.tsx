import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { SystemDialogProvider } from "@/contexts/SystemDialogContext";
import { Inter } from "next/font/google";
import GlobalScripts from "@/components/GlobalScripts";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/dashboard.css";
import "./styles/players-npcs.css";
import "./styles/modals.css";
import "./styles/blocks.css";
import "./styles/quests-weather.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "RPG Tempo - Gerenciador do Mestre",
  description: "Gerenciador de campanhas de RPG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
      </head>
      <body>
        <AuthProvider>
          <SystemDialogProvider>
            {children}
          </SystemDialogProvider>
        </AuthProvider>
        <GlobalScripts />
      </body>
    </html>
  );
}
