"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientCadastro } from "@/app/actions/clientes";

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 || z.string().email().safeParse(value).success,
    "Email inválido",
  );

const schema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  ownerName: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      "Nome deve ter no mínimo 2 caracteres",
    ),
  email: optionalEmail,
});

type FormData = z.infer<typeof schema>;

export function ClienteCadastroForm({
  orgId,
  organizationName,
  ownerName,
  ownerEmail,
  hasOwnerAccess,
  onSaved,
}: {
  orgId: string;
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  hasOwnerAccess: boolean;
  onSaved?: () => void;
}): JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName,
      ownerName,
      email: ownerEmail,
    },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await updateClientCadastro({ orgId, ...data });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cadastro atualizado");
      router.refresh();
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar o cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`empresa-${orgId}`}>Nome da empresa</Label>
        <Input
          id={`empresa-${orgId}`}
          {...register("organizationName")}
          disabled={isLoading}
        />
        {errors.organizationName && (
          <p className="text-sm text-error">
            {errors.organizationName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`dono-${orgId}`}>Nome do dono</Label>
        <Input
          id={`dono-${orgId}`}
          placeholder="Deixe vazio para tirar o nome"
          {...register("ownerName")}
          disabled={isLoading}
        />
        {errors.ownerName && (
          <p className="text-sm text-error">{errors.ownerName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`email-${orgId}`}>Email do dono (opcional)</Label>
        <Input
          id={`email-${orgId}`}
          type="text"
          inputMode="email"
          placeholder="cliente@empresa.com"
          autoComplete="off"
          {...register("email")}
          disabled={isLoading}
        />
        <p className="text-xs text-text-2">
          {hasOwnerAccess
            ? "Apagar o email aqui não remove o acesso. Para trocar, escreva o email novo."
            : "Sem email, só o nome fica no cadastro. Com email, a pessoa recebe o convite."}
        </p>
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar cadastro
      </Button>
    </form>
  );
}
