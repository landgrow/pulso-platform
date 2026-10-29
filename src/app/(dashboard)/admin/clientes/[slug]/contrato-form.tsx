"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContrato } from "@/app/actions/clientes";
import {
  createDriveFolder,
  createDriveUploadUrl,
  listDriveFolder,
} from "@/app/actions/documentos-drive";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoneyBlur,
  formatMoneyTyping,
  isMonthlyPrograma,
  parseMoney,
} from "@/lib/financeiro/ledger";
import {
  CONTRATOS_DRIVE_FOLDER,
  PROGRAMA_LABELS,
  type Programa,
} from "@/types/clientes";
import { toast } from "sonner";
import { FileUp, Loader2, Plus, X } from "lucide-react";

const BUCKET = "evidencias";
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.ppt,.pptx";

const schema = z.object({
  programa: z.enum(["bin", "scale", "conselho", "foco"]),
  valor: z
    .string()
    .min(1, "Informe o valor")
    .refine(
      (v) => Number.isFinite(parseMoney(v)) && parseMoney(v) >= 0,
      "Valor inválido",
    ),
  moeda: z.enum(["BRL", "USD", "EUR"]),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  dataFim: z.string().optional(),
  recorrencia: z.enum(["unico", "mensal"]),
});

type FormData = z.infer<typeof schema>;

export function ContratoForm({
  clienteId,
  orgId,
  slug,
}: {
  clienteId: string;
  orgId: string;
  slug: string;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      programa: "bin",
      moeda: "BRL",
      valor: "",
      recorrencia: "unico",
    },
  });

  const programa = watch("programa");
  const valor = watch("valor");

  useEffect(() => {
    setValue("recorrencia", isMonthlyPrograma(programa) ? "mensal" : "unico");
  }, [programa, setValue]);

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      let arquivoPath: string | undefined;
      let arquivoNome: string | undefined;
      if (arquivo) {
        const uploaded = await uploadContratoFile(orgId, arquivo);
        if (!uploaded.ok) {
          toast.error(uploaded.error);
          return;
        }
        arquivoPath = uploaded.path;
        arquivoNome = uploaded.name;
      }

      const result = await createContrato({
        clienteId,
        orgId,
        slug,
        programa: data.programa,
        valor: data.valor,
        moeda: data.moeda,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        recorrencia: data.recorrencia,
        arquivoPath,
        arquivoNome,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const bits = ["Contrato salvo"];
      if (arquivoNome) bits.push("arquivo em Documentos/Contratos");
      bits.push(
        data.recorrencia === "mensal"
          ? "parcelas no Financeiro"
          : "a receber no Financeiro",
      );
      toast.success(bits.join(" · "));
      setArquivo(null);
      reset({
        programa: "bin",
        moeda: "BRL",
        valor: "",
        recorrencia: "unico",
        dataInicio: "",
        dataFim: "",
      });
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
              <option value="BRL">R$</option>
              <option value="USD">US$</option>
              <option value="EUR">€</option>
            </select>
            <Input
              id="valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={valor}
              onChange={(e) =>
                setValue("valor", formatMoneyTyping(e.target.value), {
                  shouldValidate: true,
                })
              }
              onBlur={() => setValue("valor", formatMoneyBlur(valor))}
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recorrencia">No Financeiro</Label>
          <select
            id="recorrencia"
            className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-3 py-1 text-sm shadow-sm"
            {...register("recorrencia")}
            disabled={isLoading}
          >
            <option value="unico">Pagamento único</option>
            <option value="mensal">Recorrente mensal</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="arquivo">Arquivo do contrato</Label>
          {arquivo ? (
            <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-1 px-3 text-sm">
              <FileUp className="h-4 w-4 shrink-0 text-text-2" />
              <span className="min-w-0 truncate">{arquivo.name}</span>
              <button
                type="button"
                className="ml-auto text-text-2 hover:text-text-1"
                onClick={() => setArquivo(null)}
                disabled={isLoading}
                aria-label="Remover arquivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Input
              id="arquivo"
              type="file"
              accept={ACCEPT}
              disabled={isLoading}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          )}
          <p className="text-xs text-text-2">
            Vai para Documentos → Contratos deste cliente.
          </p>
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

async function ensureContratosFolder(orgId: string): Promise<void> {
  const listed = await listDriveFolder({ orgId, folder: "" });
  if (
    listed.success &&
    listed.data.items.some(
      (item) => item.kind === "folder" && item.name === CONTRATOS_DRIVE_FOLDER,
    )
  ) {
    return;
  }
  await createDriveFolder({
    orgId,
    folder: "",
    name: CONTRATOS_DRIVE_FOLDER,
  });
}

async function uploadContratoFile(
  orgId: string,
  file: File,
): Promise<
  { ok: true; path: string; name: string } | { ok: false; error: string }
> {
  await ensureContratosFolder(orgId);
  const prepared = await createDriveUploadUrl({
    orgId,
    folder: CONTRATOS_DRIVE_FOLDER,
    fileName: file.name,
    size: file.size,
  });
  if (!prepared.success) {
    return { ok: false, error: prepared.error };
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (error) {
    return { ok: false, error: "Falha no envio do arquivo. Tente de novo." };
  }
  return { ok: true, path: prepared.data.path, name: prepared.data.name };
}
