"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function MobileSidebar(): JSX.Element {
  const { isMobileOpen, onMobileClose } = useSidebar();

  return (
    <Sheet
      open={isMobileOpen}
      onOpenChange={(open) => !open && onMobileClose()}
    >
      <SheetContent side="left" className="w-64 p-0 lg:hidden">
        <Sidebar variant="full" />
      </SheetContent>
    </Sheet>
  );
}
