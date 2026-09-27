"use client";

import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function MobileSidebar({ user }: { user: User | null }): JSX.Element {
  const { isMobileOpen, onMobileClose } = useSidebar();

  return (
    <Sheet
      open={isMobileOpen}
      onOpenChange={(open) => !open && onMobileClose()}
    >
      <SheetContent side="left" className="w-64 p-0 lg:hidden">
        <Sidebar variant="full" user={user} />
      </SheetContent>
    </Sheet>
  );
}
