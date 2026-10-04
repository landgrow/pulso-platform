/**
 * Layout de grupo para rotas autenticadas.
 *
 * Envolvido por: Header + Sidebar + Área de conteúdo.
 * Todas as páginas dentro de (dashboard)/ exigem autenticação.
 *
 * A verificação de auth é feita via middleware, mas buscamos os dados
 * do usuário aqui (Server Component) para passar ao Header.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/get-session";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Header } from "@/components/layout/header";
import { ClientWorkspaceBanner } from "@/components/layout/client-workspace-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { MainCanvas } from "@/components/layout/main-canvas";
import { getMyPlatformRole } from "@/app/actions/me";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  // Papel/org do usuário uma vez no servidor, repassado pro menu, busca e
  // banner — antes cada um buscava sozinho no navegador a cada navegação.
  const me = await getMyPlatformRole();

  return (
    <SidebarProvider>
      <CommandPalette me={me} />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar — visível em desktop */}
        <Sidebar user={user} me={me} />

        {/* Mobile drawer (Sheet) */}
        <MobileSidebar user={user} me={me} />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <ClientWorkspaceBanner me={me} />

          <MainCanvas>{children}</MainCanvas>
        </div>
      </div>
    </SidebarProvider>
  );
}
