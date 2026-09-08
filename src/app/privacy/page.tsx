import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Política de Privacidade — PULSO",
  description: "Política de Privacidade da plataforma PULSO — Land Grow",
};

export default function PrivacyPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-lime flex items-center justify-center">
            <span className="text-brand-lime-foreground font-bold text-sm">
              LG
            </span>
          </div>
          <span className="font-semibold">PULSO — Land Grow</span>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-3">Política de Privacidade</h1>
          <p className="text-text-2">
            Última atualização: 05 de setembro de 2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Introdução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              A Land Grow Tecnologia e Serviços Ltda. (&ldquo;Land Grow&rdquo;,
              &ldquo;nós&rdquo;, &ldquo;nosso&rdquo;) opera a plataforma PULSO e
              se compromete a proteger a privacidade dos usuários
              (&ldquo;você&rdquo;, &ldquo;usuário&rdquo;).
            </p>
            <p>
              Esta Política de Privacidade explica como coletamos, usamos,
              armazenamos e protegemos seus dados pessoais, em conformidade com
              a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
              &ldquo;LGPD&rdquo;).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Dados que coletamos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Dados de cadastro:</strong> nome completo, e-mail e
                senha (armazenada com hash). Estes dados são fornecidos por você
                no momento do registro.
              </li>
              <li>
                <strong>Dados da organização:</strong> nome da empresa, plano
                contratado. Fornecidos no momento da criação da organização.
              </li>
              <li>
                <strong>Dados de uso:</strong> páginas acessadas, timestamps de
                acesso, ações realizadas na plataforma. Coletados
                automaticamente para segurança e melhoria do serviço.
              </li>
              <li>
                <strong>Registros de auditoria:</strong> logs de alterações em
                dados sensíveis (criação, edição, exclusão de organizações e
                memberships).
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Finalidades do tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>Utilizamos seus dados pessoais para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fornecer e manter o serviço PULSO;</li>
              <li>Autenticar e proteger sua conta;</li>
              <li>Gerenciar sua organização e membros;</li>
              <li>Cumprir obrigações legais e regulatórias;</li>
              <li>
                Melhorar continuamente a plataforma com base em dados agregados
                e anonimizados.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Compartilhamento de dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com
              terceiros para fins de marketing. Compartilhamos dados apenas nas
              seguintes situações:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Prestadores de serviço:</strong> provedores de
                infraestrutura (hospedagem, banco de dados) que processam dados
                em nosso nome, sob contrato de confidencialidade.
              </li>
              <li>
                <strong>Autoridades:</strong> quando exigido por lei, ordem
                judicial ou solicitação legítima de autoridade competente.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Armazenamento e segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Armazenamos seus dados em servidores seguros com criptografia em
              trânsito (TLS/SSL) e em repouso (AES-256). O acesso é restrito a
              colaboradores autorizados, sob necessidade de conhecer.
            </p>
            <p>
              Mantemos seus dados pelo tempo necessário para cumprir as
              finalidades descritas nesta política, ou pelo prazo mínimo exigido
              por lei. Dados de organizações inativas são retidos por 5 anos
              antes de exclusão definitiva.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Seus direitos (LGPD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Confirmar a existência de tratamento de dados;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimizar, bloquear ou eliminar dados desnecessários;</li>
              <li>Exportar seus dados em formato legível;</li>
              <li>Revogar o consentimento a qualquer momento;</li>
              <li>
                Solicitar a eliminação dos dados tratados com seu consentimento.
              </li>
            </ul>
            <p>
              Para exercer qualquer direito, entre em contato pelo e-mail:{" "}
              <strong>privacidade@landgrow.com.br</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Consentimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Ao criar uma conta no PULSO, você declara ter lido e concordado
              com esta Política de Privacidade e com os Termos de Uso. O
              consentimento é voluntário e pode ser revogado a qualquer tempo.
            </p>
            <p>
              A versão do consentimento aceito é registrada junto ao seu perfil,
              com timestamp.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Alterações nesta política</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Podemos atualizar esta política periodicamente. Alterações
              significativas serão comunicadas por e-mail ou aviso na
              plataforma. A data de &ldquo;última atualização&rdquo; no topo
              indica a versão vigente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              <strong>Land Grow Tecnologia e Serviços Ltda.</strong>
              <br />
              CNPJ: XX.XXX.XXX/0001-XX
              <br />
              E-mail:{" "}
              <a
                href="mailto:privacidade@landgrow.com.br"
                className="text-primary hover:underline"
              >
                privacidade@landgrow.com.br
              </a>
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-text-2 text-center pt-4">
          PULSO — Plataforma de Inteligência de Negócios · Land Grow © 2026
        </p>
      </main>
    </div>
  );
}
