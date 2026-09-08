"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createClientAccount,
  type CreateClientAccountResult,
} from "@/app/actions/admin";
import { TEAM_ROLE_LABELS } from "@/types/clientes";
import { toast } from "sonner";
import { Loader2, MailCheck, Plus, Trash2, UserPlus } from "lucide-react";

const memberSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["client_member", "client_viewer"]),
});

const schema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  organizationName: z
    .string()
    .min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  additionalMembers: z.array(memberSchema),
});

type FormData = z.infer<typeof schema>;

type CreatedAccount = Extract<CreateClientAccountResult, { success: true }>;

export function CreateClientAccountForm(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { additionalMembers: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalMembers",
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await createClientAccount(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreated(result);
      reset({ additionalMembers: [] });
      if (result.warnings.length > 0) {
        toast.warning(
          `Dono convidado, mas houve problema com: ${result.warnings.join("; ")}`,
        );
      } else {
        toast.success(`Convite(s) enviado(s)`);
      }
    } catch {
      toast.error("Erro ao criar acesso. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Criar acesso de cliente</CardTitle>
          </div>
          <CardDescription>
            Cria a organização e o vínculo de proprietário (client_owner), e
            envia um email de convite pra cada pessoa definir a própria senha.
            Ninguém na Land Grow vê ou gera senha nenhuma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do dono</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nome de quem vai acessar"
                  {...register("name")}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-error">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email do dono</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@empresa.com"
                  autoComplete="off"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-error">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Nome da empresa</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Nome da empresa cliente"
                {...register("organizationName")}
                disabled={isLoading}
              />
              {errors.organizationName && (
                <p className="text-sm text-error">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            {fields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-sm font-medium">
                  Outros usuários dessa empresa
                </p>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2"
                  >
                    <Input
                      type="text"
                      placeholder="Nome"
                      {...register(`additionalMembers.${index}.name`)}
                      disabled={isLoading}
                    />
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      autoComplete="off"
                      {...register(`additionalMembers.${index}.email`)}
                      disabled={isLoading}
                    />
                    <select
                      className="flex h-9 rounded-md border border-border bg-surface-1 px-2 text-sm shadow-sm"
                      {...register(`additionalMembers.${index}.role`)}
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
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ name: "", email: "", role: "client_member" })
              }
              disabled={isLoading}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar usuário
            </Button>

            <div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar acesso
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {created && (
        <Card className="border-success/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-success" />
              <CardTitle className="text-lg">Convite(s) enviado(s)</CardTitle>
            </div>
            <CardDescription>
              O dono ({created.email}) e qualquer outro usuário adicionado vão
              receber um email com um link pra definir a própria senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-text-2">Organização: {created.slug}</p>
            {created.warnings.length > 0 && (
              <div className="text-xs text-warning space-y-1">
                {created.warnings.map((w) => (
                  <p key={w}>⚠ {w}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
