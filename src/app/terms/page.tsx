import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Termos de Uso — PULSO",
  description: "Termos de Uso da plataforma PULSO — Land Grow",
};

export default function TermsPage(): JSX.Element {
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
          <h1 className="text-4xl font-bold mb-3">Termos de Uso</h1>
          <p className="text-text-2">
            Última atualização: 05 de setembro de 2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Objeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Os presentes Termos de Uso regem a utilização da plataforma PULSO,
              desenvolvida e operada pela Land Grow Tecnologia e Serviços Ltda.
              (&ldquo;Land Grow&rdquo;, &ldquo;nós&rdquo;, &ldquo;nosso&rdquo;),
              doravante denominada &ldquo;Plataforma&rdquo;.
            </p>
            <p>
              A Plataforma PULSO é uma ferramenta de inteligência de negócios
              que oferece funcionalidades de diagnóstico estratégico, gestão de
              tarefas, acompanhamento de programas de aceleração e gestão de
              coleções de dados.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Elegibilidade e cadastro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              O uso da Plataforma é restrito a pessoas físicas mayores de 18
              anos ou, caso menor, com autorização expressa de representante
              legal. Ao criar uma conta, o usuário (&ldquo;você&rdquo;) declara
              que preenche os requisitos de elegibilidade.
            </p>
            <p>
              Você é responsável por manter a confidencialidade de suas
              credenciais de acesso (e-mail e senha) e por todas as atividades
              realizadas sob sua conta.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Plano e pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              A Plataforma oferece um período de trial gratuito. Após o trial, o
              acesso às funcionalidades avançadas requer contratação de um plano
              pago.
            </p>
            <p>
              Ao contratar um plano, você concorda com os valores e condições de
              pagamento vigentes no momento da contratação. O cancelamento pode
              ser solicitado a qualquer momento; o acesso permanece até o final
              do período já pago.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Uso da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>Ao usar a Plataforma, você se compromete a:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Não utilizar a Plataforma para fins ilegais ou não autorizados;
              </li>
              <li>Não violar quaisquer leis aplicáveis em sua jurisdição;</li>
              <li>
                Não copiar, adaptar, modificar, reproduzir, distribuir ou criar
                obras derivadas do conteúdo da Plataforma sem autorização
                prévia;
              </li>
              <li>
                Não utilizar robôs, spiders, scrapers ou outros meios
                automáticos para acessar a Plataforma de forma que sobrecarregue
                os servidores;
              </li>
              <li>
                Não tentar obter acesso não autorizado a contas de outros
                usuários, sistemas ou redes.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Conteúdo do usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Você mantém a propriedade de todo o conteúdo que insere na
              Plataforma (&ldquo;Conteúdo do Usuário&rdquo;). Ao inserir
              Conteúdo do Usuário, você concede à Land Grow uma licença não
              exclusiva, worldwide e isenta de royalties para armazenar, exibir
              e processar esse conteúdo exclusivamente para fornecer o serviço
              contratado.
            </p>
            <p>
              Você declara e garante que possui todos os direitos necessários
              sobre o Conteúdo do Usuário e que este não infringe direitos de
              terceiros.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Isenção de responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              A Plataforma é fornecida &ldquo;como está&rdquo; e &ldquo;conforme
              disponível&rdquo;. A Land Grow não garante que a Plataforma será
              ininterrupta, segura ou livre de erros.
            </p>
            <p>
              As funcionalidades de diagnóstico e inteligência de negócios
              oferecidas pela Plataforma são ferramentas de apoio à decisão e
              não substituem o julgamento profissional. A Land Grow não é
              responsável por decisões de negócio tomadas com base
              exclusivamente nas informações geradas pela Plataforma.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Limitação de responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Na máxima extensão permitida por lei, a Land Grow não será
              responsável por danos indiretos, incidentais, especiais,
              exemplares ou consequenciais, incluindo perda de lucros, dados,
              oportunidades de negócio ou goodwill, decorrentes do uso ou da
              impossibilidade de uso da Plataforma.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Rescisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Você pode rescindir sua conta a qualquer momento através das
              configurações da Plataforma ou contactando-nos por e-mail.
            </p>
            <p>
              A Land Grow pode rescindir ou suspender sua conta imediatamente,
              sem aviso prévio, caso você viole estes Termos ou utilize a
              Plataforma de forma que possa causar dano à Land Grow ou a
              terceiros.
            </p>
            <p>
              Após a rescisão, seus dados pessoais serão tratados conforme a
              Política de Privacidade vigente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Modificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              A Land Grow pode modificar estes Termos a qualquer momento.
              Alterações significativas serão comunicadas por e-mail ou aviso na
              Plataforma. O uso continuado da Plataforma após a notificação
              constitui aceite dos novos termos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Lei aplicável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do
              Brasil. Fica eleita a comarca de Campo Grande, Mato Grosso do Sul,
              como competente para dirimir quaisquer controvérsias decorrentes
              destes Termos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-2">
            <p>
              <strong>Land Grow Tecnologia e Serviços Ltda.</strong>
              <br />
              CNPJ: XX.XXX.XXX/0001-XX
              <br />
              E-mail:{" "}
              <a
                href="mailto:contato@landgrow.com.br"
                className="text-primary hover:underline"
              >
                contato@landgrow.com.br
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
