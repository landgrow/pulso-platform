"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { getOrCreateCurrentPeriod } from "@/app/actions/periods";
import { Button } from "@/components/ui/button";

interface AbrirPeriodoAtualButtonProps {
  slug: string;
}

export function AbrirPeriodoAtualButton({
  slug,
}: AbrirPeriodoAtualButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await getOrCreateCurrentPeriod();
    setLoading(false);
    if (!result.success) {
      toast.error("Erro ao abrir período", { description: result.error });
      return;
    }
    router.push(`/clientes/${slug}/periodo/${result.data.periodId}`);
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      <PlusCircle className="mr-1 size-4" />
      {loading ? "Abrindo…" : "Abrir coleta deste mês"}
    </Button>
  );
}
