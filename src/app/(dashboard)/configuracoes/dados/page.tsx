import { Download, FileJson, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportMyData } from "@/app/actions/data-export";
import { getSession } from "@/lib/supabase/get-session";

export default async function DadosPage(): Promise<JSX.Element> {
  const session = await getSession();
  const result = await exportMyData();

  const userName =
    session?.user.user_metadata?.full_name ??
    session?.user.email?.split("@")[0] ??
    "Usuário";

  // Serializa o JSON em string para exibir preview
  const jsonPreview = result.success
    ? JSON.stringify(result.data, null, 2)
    : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Meus dados</h1>
        <p className="text-text-2">
          Exportar, visualizar e gerenciar seus dados pessoais na plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Seus direitos (LGPD)</CardTitle>
          </div>
          <CardDescription>
            Como titular de dados, você tem direito a acessar, corrigir,
            exportar e solicitar a eliminação dos seus dados pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-2">
          <p>
            A Land Grow trata seus dados pessoais conforme a Lei Geral de
            Proteção de Dados (LGPD). Você pode:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Exportar todos os seus dados em formato JSON (botão abaixo)</li>
            <li>Solicitar correção de dados incorretos</li>
            <li>Solicitar a eliminação dos seus dados (anonimização)</li>
            <li>Revogar consentimentos a qualquer momento</li>
          </ul>
          <p>
            Para solicitações que não estão disponíveis via autoatendimento,
            escreva para{" "}
            <a
              href="mailto:privacidade@landgrow.com.br"
              className="text-primary hover:underline"
            >
              privacidade@landgrow.com.br
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle>Exportar meus dados</CardTitle>
          </div>
          <CardDescription>
            Faça download de um arquivo JSON com todos os seus dados pessoais
            armazenados na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success && result.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">{result.data.user.email}</Badge>
                <span className="text-xs text-text-2">
                  {result.data.organizations.length} organização(ões)
                  vinculada(s)
                </span>
              </div>

              <details className="border border-border rounded-lg overflow-hidden">
                <summary className="cursor-pointer px-4 py-3 bg-surface-1 hover:bg-surface-2 text-sm font-medium flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Preview do JSON ({jsonPreview?.length ?? 0} caracteres)
                </summary>
                <pre className="p-4 bg-surface-1 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {jsonPreview}
                </pre>
              </details>

              <form action="/api/data-export" method="POST" target="_blank">
                <Button type="submit">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar JSON completo
                </Button>
              </form>

              <p className="text-xs text-text-2">
                O arquivo gerado contém: dados de perfil, organizações
                vinculadas e metadados da conta. Para baixar o histórico de
                auditoria detalhado, entre em contato com o administrador.
              </p>
            </div>
          ) : (
            <p className="text-sm text-error">
              {result.error ?? "Erro ao carregar dados."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle>Informações de consentimento</CardTitle>
          </div>
          <CardDescription>
            Versão da Política de Privacidade e Termos de Uso que você aceitou.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-2">Política de Privacidade aceita</span>
            <Badge variant="outline">v1.0 — 05/09/2026</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-2">Termos de Uso aceitos</span>
            <Badge variant="outline">v1.0 — 05/09/2026</Badge>
          </div>
          <p className="text-xs text-text-2 pt-2">
            Olá, {userName}. Suas preferências de consentimento são registradas
            junto ao seu perfil e podem ser consultadas a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
