"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listStaffDueCards } from "@/app/actions/ops-feed";
import type { DueCard } from "@/lib/ops/due";

export function useDueFeed(): {
  cards: DueCard[];
  today: string;
  horizonDays: number;
  loading: boolean;
  error: string | null;
  live: boolean;
  refresh: () => Promise<void>;
} {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [today, setToday] = useState("");
  const [horizonDays, setHorizonDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const result = await listStaffDueCards();
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setCards(result.data.cards);
    setToday(result.data.today);
    setHorizonDays(result.data.horizonDays);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("staff-due-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_cards" },
        () => {
          void refresh();
        },
      )
      .subscribe((status: string) => {
        setLive(status === "SUBSCRIBED");
      });

    const onFocus = (): void => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const poll = window.setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return { cards, today, horizonDays, loading, error, live, refresh };
}
