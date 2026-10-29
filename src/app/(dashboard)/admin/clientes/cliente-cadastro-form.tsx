"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTeamMember, updateClientCadastro } from "@/app/actions/clientes";
import { TEAM_ROLE_LABELS, type TeamMember } from "@/types/clientes";

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 || z.string().email().safeParse(value).success,
    "Email inválido",
  );

const extraPersonSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["client_member", "client_viewer"]),
});

const schema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Nome do cliente deve ter no mínimo 2 caracteres"),
  ownerName: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      "Nome deve ter no mínimo 2 caracteres",
    ),
  email: optionalEmail,
  extraPeople: z.array(extraPersonSchema),
});

type FormData = z.infer<typeof schema>;

export function ClienteCadastroForm({
  orgId,
  organizationName,
  ownerName,
  ownerEmail,
  hasOwnerAccess,
  members = [],
  onSaved,
}: {
  orgId: string;
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  hasOwnerAccess: boolean;
  members?: TeamMember[];
  onSaved?: () => void;
}): JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName,
      ownerName,
      email: ownerEmail,
      extraPeople: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "extraPeople",
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await updateClientCadastro({
        orgId,
        organizationName: data.organizationName,
        ownerName: data.ownerName,
        email: data.email,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const inviteErrors: string[] = [];
      for (const person of data.extraPeople) {
        const invited = await addTeamMember({ orgId, ...person });
        if (!invited.success) {
          inviteErrors.push(`${person.email}: ${invited.error}`);
        }
      }

      if (inviteErrors.length > 0) {
        toast.warning("Cadastro salvo, mas nem todo convite saiu", {
          description: inviteErrors.join(" · "),
        });
      } else {
        toast.success(
          data.extraPeople.length > 0
            ? "Cadastro salvo e convites enviados"
            : "Cadastro atualizado",
        );
      }
      router.refresh();
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar o cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`cliente-${orgId}`}>Nome do cliente</Label>
        <Input
          id={`cliente-${orgId}`}
          placeholder="Nome de como a empresa entra na carteira"
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

      {members.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Quem já entra neste cliente</p>
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <p className="truncate">{member.email}</p>
                <p className="text-xs text-text-2">
                  {TEAM_ROLE_LABELS[member.role]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Outras pessoas da equipe</p>
          <p className="text-xs text-text-2">
            Sócio, financeiro, comercial — cada um recebe o convite de acesso.
          </p>
        </div>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <div className="space-y-1">
              <Input
                placeholder="Nome"
                {...register(`extraPeople.${index}.name`)}
                disabled={isLoading}
              />
              {errors.extraPeople?.[index]?.name ? (
                <p className="text-xs text-error">
                  {errors.extraPeople[index]?.name?.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="email@empresa.com"
                autoComplete="off"
                {...register(`extraPeople.${index}.email`)}
                disabled={isLoading}
              />
              {errors.extraPeople?.[index]?.email ? (
                <p className="text-xs text-error">
                  {errors.extraPeople[index]?.email?.message}
                </p>
              ) : null}
            </div>
            <select
              className="flex h-9 rounded-md border border-border bg-surface-1 px-2 text-sm"
              {...register(`extraPeople.${index}.role`)}
              disabled={isLoading}
            >
              <option value="client_member">
                {TEAM_ROLE_LABELS.client_member}
              </option>
              <option value="client_viewer">
                {TEAM_ROLE_LABELS.client_viewer}
              </option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(index)}
              disabled={isLoading}
              aria-label="Remover pessoa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", email: "", role: "client_member" })}
          disabled={isLoading}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar pessoa
        </Button>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar cadastro
      </Button>
    </form>
  );
}
