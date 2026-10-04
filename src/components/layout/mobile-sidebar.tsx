"use client";

import type { User } from "@supabase/supabase-js";
import type { MeInfo } from "@/app/actions/me";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileSidebar({
  user,
  me,
}: {
  user: User | null;
  me: MeInfo;
}): JSX.Element {
  const { isMobileOpen, onMobileClose } = useSidebar();

  return (
    <Sheet
      open={isMobileOpen}
      onOpenChange={(open) => !open && onMobileClose()}
    >
      <SheetContent side="left" className="w-64 p-0 lg:hidden">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navegação principal do PULSO
        </SheetDescription>
        <Sidebar variant="full" user={user} me={me} />
      </SheetContent>
    </Sheet>
  );
}
