"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContrato } from "@/app/actions/clientes";
import { PROGRAMA_LABELS, type Programa } from "@/types/clientes";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

const schema = z.object({
  programa: z.enum(["bin", "scale", "conselho", "foco"]),
  valor: z.coerce.number().min(0, "Valor não pode ser negativo"),
  moeda: z.enum(["BRL", "USD", "EUR"]),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  dataFim: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ContratoForm({
  clienteId,
}: {
  clienteId: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { moeda: "BRL" },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await createContrato({ clienteId, ...data });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Contrato registrado e a receber criado no Financeiro");
      reset({ moeda: "BRL" });
      router.refresh();
    } catch {
      toast.error("Erro ao registrar contrato. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="programa">Programa</Label>
          <select
            id="programa"
            className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-3 py-1 text-sm shadow-sm"
            {...register("programa")}
            disabled={isLoading}
          >
            {(Object.keys(PROGRAMA_LABELS) as Programa[]).map((p) => (
              <option key={p} value={p}>
                {PROGRAMA_LABELS[p]}
              </option>
            ))}
          </select>
          {errors.programa && (
            <p className="text-sm text-error">{errors.programa.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor</Label>
          <div className="flex gap-2">
            <select
              className="h-9 rounded-md border border-border bg-surface-1 px-2 text-sm shadow-sm"
              {...register("moeda")}
              disabled={isLoading}
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register("valor")}
              disabled={isLoading}
            />
          </div>
          {errors.valor && (
            <p className="text-sm text-error">{errors.valor.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Início</Label>
          <Input
            id="dataInicio"
            type="date"
            {...register("dataInicio")}
            disabled={isLoading}
          />
          {errors.dataInicio && (
            <p className="text-sm text-error">{errors.dataInicio.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFim">Fim (opcional)</Label>
          <Input
            id="dataFim"
            type="date"
            {...register("dataFim")}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Registrar contrato
      </Button>
    </form>
  );
}
