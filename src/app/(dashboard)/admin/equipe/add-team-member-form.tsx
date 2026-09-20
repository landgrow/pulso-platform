"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPlatformTeamMember } from "@/app/actions/team";
import { AccessPlacesField } from "@/components/equipe/access-places-field";
import {
  DEFAULT_CONSULTANT_CAPABILITIES,
  type StaffCapabilityId,
} from "@/lib/auth/staff-access";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["platform_admin", "consultant"]),
});

type FormData = z.infer<typeof schema>;

export function AddPlatformTeamMemberForm(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<StaffCapabilityId[]>([
    ...DEFAULT_CONSULTANT_CAPABILITIES,
  ]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "consultant" },
  });

  const role = watch("role");

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await addPlatformTeamMember({
        ...data,
        capabilities: data.role === "consultant" ? places : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.message);
      reset({ role: "consultant" });
      setPlaces([...DEFAULT_CONSULTANT_CAPABILITIES]);
      router.refresh();
    } catch {
      toast.error("Erro ao adicionar à equipe. Tente novamente.");
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
            placeholder="email@landgrow.com.br"
            autoComplete="off"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-role">Tipo de acesso</Label>
          <select
            id="team-role"
            className="flex h-9 w-full rounded-md border border-border bg-surface-1 px-3 py-1 text-sm shadow-sm"
            {...register("role")}
            disabled={isLoading}
          >
            <option value="platform_admin">Admin (todos os lugares)</option>
            <option value="consultant">Consultor (só o que marcar)</option>
          </select>
        </div>
      </div>

      {role === "consultant" ? (
        <AccessPlacesField
          granted={places}
          disabled={isLoading}
          onToggle={(capability, next) => {
            setPlaces((current) =>
              next
                ? [...new Set([...current, capability])]
                : current.filter((id) => id !== capability),
            );
          }}
        />
      ) : (
        <p className="text-sm text-text-2">
          Admin entra em todas as abas. Não precisa marcar lugar a lugar.
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Adicionar à equipe
      </Button>
    </form>
  );
}
