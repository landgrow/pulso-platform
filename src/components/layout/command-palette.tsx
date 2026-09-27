"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Contact,
  Home,
  LayoutDashboard,
  Radar,
  Settings,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import { getMyPlatformRole } from "@/app/actions/me";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { StaffCapabilityId } from "@/lib/auth/staff-access";
import {
  COMMAND_OPEN_EVENT,
  filterHqNav,
  HQ_NAV,
  NAV_GROUP_LABEL,
  type NavGroup,
} from "@/lib/nav/destinations";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  settings: Settings,
  "building-2": Building2,
  users: Users,
  "clipboard-list": ClipboardList,
  "share-2": Share2,
  contact: Contact,
  home: Home,
  wallet: Wallet,
  radar: Radar,
};

const GROUP_ORDER: NavGroup[] = ["mesa", "trabalho", "carteira", "sistema"];

export function CommandPalette(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [platformRole, setPlatformRole] = useState<
    "platform_admin" | "consultant" | null
  >(null);
  const [capabilities, setCapabilities] = useState<StaffCapabilityId[]>([]);
  const [inClientWorkspace, setInClientWorkspace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getMyPlatformRole();
      if (cancelled) return;
      setPlatformRole(next.role);
      setCapabilities(next.capabilities);
      setInClientWorkspace(next.inClientWorkspace);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    function onOpen(): void {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_OPEN_EVENT, onOpen);
    };
  }, []);

  const visible = filterHqNav(HQ_NAV, {
    capabilities,
    inClientWorkspace,
    onHqRoute: pathname.startsWith("/admin"),
    platformRole,
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Ir para… Dashboard, cliente, dinheiro" />
      <CommandList>
        <CommandEmpty>Nada com esse nome.</CommandEmpty>
        {GROUP_ORDER.map((group) => {
          const items = visible.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={group} heading={NAV_GROUP_LABEL[group]}>
              {items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                return (
                  <CommandItem
                    key={`${group}-${item.href}`}
                    value={`${item.label} ${item.href}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                  >
                    <Icon />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
