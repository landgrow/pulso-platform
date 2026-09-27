"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { returnToLandGrowHq } from "@/app/actions/hq";

/** Qualquer rota /admin/* devolve o cookie para a Land Grow. */
export function AdminHqRestore(): null {
  const pathname = usePathname();

  useEffect(() => {
    void returnToLandGrowHq(pathname || "/admin/painel");
  }, [pathname]);

  return null;
}
