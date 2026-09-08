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

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar — visível em desktop */}
        <Sidebar />

        {/* Mobile drawer (Sheet) */}
        <MobileSidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header user={user} />

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
