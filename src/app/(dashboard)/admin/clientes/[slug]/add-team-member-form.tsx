"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTeamMember } from "@/app/actions/clientes";
import { TEAM_ROLE_LABELS } from "@/types/clientes";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["client_member", "client_viewer"]),
});

type FormData = z.infer<typeof schema>;

export function AddTeamMemberForm({ orgId }: { orgId: string }): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "client_member" },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await addTeamMember({ orgId, ...data });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Convite enviado para ${data.email}`);
      reset({ role: "client_member" });
      router.refresh();
    } catch {
      toast.error("Erro ao adicionar acesso. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="team-name">Nome</Label>
          <Input
            id="team-name"
            type="text"
            placeholder="Nome da pessoa"
            {...register("name")}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-error">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-email">Email</Label>
          <Input
            id="team-email"
            type="email"
            placeholder="email@empresa.com"
            autoComplete="off"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-role">Papel</Label>
          <select
            id="team-role"
            className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-3 py-1 text-sm shadow-sm"
            {...register("role")}
            disabled={isLoading}
          >
            <option value="client_member">
              {TEAM_ROLE_LABELS.client_member}
            </option>
            <option value="client_viewer">
              {TEAM_ROLE_LABELS.client_viewer}
            </option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Adicionar ao time
      </Button>
    </form>
  );
}
