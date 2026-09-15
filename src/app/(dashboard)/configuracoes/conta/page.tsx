import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession } from "@/lib/supabase/get-session";
import { ChangePasswordForm, DisplayNameForm } from "./account-forms";

export default async function ContaPage(): Promise<JSX.Element> {
  const session = await getSession();
  const email = session?.user.email ?? "";
  const fullName =
    (session?.user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conta</h1>
        <p className="text-text-2">
          Como seu nome aparece na equipe e como você entra no PULSO.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            O e-mail é o login. Para trocá-lo, fale com a administradora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled autoComplete="email" />
          </div>
          <DisplayNameForm initialName={fullName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senha</CardTitle>
          <CardDescription>
            Se você entra só com Google e nunca definiu senha, use Esqueceu a
            senha na tela de login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
