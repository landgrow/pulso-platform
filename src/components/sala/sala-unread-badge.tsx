"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSalaUnreadTotal } from "@/app/actions/sala";
import { createClient } from "@/lib/supabase/client";
import { formatSalaUnreadBadge } from "@/lib/sala/unread";
import { cn } from "@/lib/utils";

const SalaUnreadContext = createContext(0);

export function SalaUnreadProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const unreadRef = useRef(0);
  const onSala = pathname.startsWith("/admin/sala");
  const onSalaRef = useRef(onSala);
  useEffect(() => {
    onSalaRef.current = onSala;
  }, [onSala]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function refresh(announce: boolean): Promise<void> {
      const result = await getSalaUnreadTotal();
      if (cancelled || !result.success) return;
      const next = result.data.unread;
      const previous = unreadRef.current;
      unreadRef.current = next;
      setUnread(next);
      if (announce && next > previous && !onSalaRef.current) {
        toast("Nova mensagem na Sala", {
          description: "Alguém escreveu e você ainda não abriu.",
          action: {
            label: "Abrir",
            onClick: () => router.push("/admin/sala"),
          },
        });
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification("Nova mensagem na Sala", {
            body: "Alguém escreveu e você ainda não abriu.",
            tag: "sala-unread",
          });
        }
      }
    }

    void refresh(false);
    const onRead = (): void => {
      void refresh(false);
    };
    window.addEventListener("pulso:sala-read", onRead);
    const timer = window.setInterval(() => {
      void refresh(true);
    }, 25000);

    const supabase = createClient();
    const channel = supabase
      .channel("hq-sala-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_messages" },
        () => {
          void refresh(true);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("pulso:sala-read", onRead);
      void supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled || !onSala) return;
    void getSalaUnreadTotal().then((result) => {
      if (!result.success) return;
      unreadRef.current = result.data.unread;
      setUnread(result.data.unread);
    });
  }, [enabled, onSala, pathname]);

  return (
    <SalaUnreadContext.Provider value={unread}>
      {children}
    </SalaUnreadContext.Provider>
  );
}

export function SalaUnreadBadge({
  compact,
}: {
  compact?: boolean;
}): JSX.Element | null {
  const unread = useContext(SalaUnreadContext);
  const label = formatSalaUnreadBadge(unread);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-semibold text-primary-foreground",
        compact ? "h-4 text-[9px]" : "h-5 min-w-5 text-[10px]",
      )}
      aria-label={`${unread} mensagens não lidas na Sala`}
    >
      {label}
    </span>
  );
}
