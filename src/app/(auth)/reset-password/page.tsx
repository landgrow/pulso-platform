"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { consumeAuthRedirect } from "@/lib/auth/consume-auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Deve conter pelo menos 1 letra maiúscula")
      .regex(/[0-9]/, "Deve conter pelo menos 1 número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function passwordErrorMessage(message: string): string {
  const msg = message.toLowerCase();
  if (
    msg.includes("auth session missing") ||
    msg.includes("not authenticated")
  ) {
    return "Sua sessão de convite não foi encontrada. Abra o link do email de novo — ele vale uma vez só.";
  }
  if (msg.includes("expired") || msg.includes("invalid")) {
    return "Este link expirou ou já foi usado. Peça um novo acesso.";
  }
  return message;
}

export default function ResetPasswordPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { ok } = await consumeAuthRedirect();
      if (cancelled) return;
      if (!ok) {
        setInvalidToken(true);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) {
        const message = passwordErrorMessage(error.message);
        if (
          error.message.toLowerCase().includes("expired") ||
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("auth session missing")
        ) {
          setInvalidToken(true);
          return;
        }
        toast.error(message);
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      toast.error("Erro ao definir senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready && !invalidToken && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-text-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Validando seu convite...</p>
        </div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-error">Link expirado</CardTitle>
            <CardDescription>
              Este link de convite ou recuperação expirou ou já foi utilizado.
              Peça um novo acesso para criar sua senha.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-2 flex-col sm:flex-row">
            <Button asChild>
              <Link href="/forgot-password">Solicitar novo link</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Voltar ao login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Senha definida!</CardTitle>
            <CardDescription>
              Sua senha foi salva. Redirecionando para o login...
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/login">Ir para login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-brand-lime flex items-center justify-center">
              <span className="text-brand-lime-foreground font-bold text-sm">
                LG
              </span>
            </div>
            <span className="text-xl font-semibold text-text-1">PULSO</span>
          </div>
          <CardTitle className="text-2xl">Definir senha</CardTitle>
          <CardDescription>
            Crie uma senha para acessar o PULSO. Use no mínimo 8 caracteres, com
            1 maiúscula e 1 número.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-error">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
            <p className="text-sm text-text-2 text-center">
              <Link href="/login" className="text-primary hover:underline">
                Voltar para login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
