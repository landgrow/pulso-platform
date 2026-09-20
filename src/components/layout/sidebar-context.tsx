"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "pulso-sidebar-collapsed";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggle: () => void;
  isMobileOpen: boolean;
  openMobile: () => void;
  onMobileClose: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined,
);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({
  children,
}: SidebarProviderProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggle = (): void => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };
  const openMobile = (): void => setIsMobileOpen(true);
  const onMobileClose = (): void => setIsMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggle, isMobileOpen, openMobile, onMobileClose }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
