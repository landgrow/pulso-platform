# Parecer Técnico Externo — PULSO

**De:** Ivo Marchetti — 30 anos em Business Intelligence (BI corporativo on-premise → onda self-service → analytics nativo de IA; passagem por 3 startups de dado, uma delas unicórnio)
**Data:** 11/07/2026
**Assunto:** Avaliação crítica da arquitetura, do produto e da tese de negócio do PULSO

---

## Veredito rápido

Vocês têm um insight genuinamente bom (o motor de reconciliação) dentro de um processo que está se comportando como se já tivesse product-market fit — sem nenhum cliente pagante ainda ter tocado o sistema. O escopo dobrou de tamanho numa conversa, sem nenhum sinal de cliente exigindo isso. Isso não é ambição, é risco não administrado. A boa notícia: nada disso é fatal, e uma das decisões que eu mais questionaria no timing (ir pra Supabase relacional) sem querer destravou o maior ativo estratégico que vocês ainda não perceberam que têm.

---

## Scorecard

| Dimensão                     | Nota                            | Por quê                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diferenciação de produto     | 8/10                            | Motor de reconciliação (declarado × real) é um insight que nenhum concorrente pesquisado tem. Risco está na execução/tom, não na ideia.                                                                                   |
| Prontidão técnica            | 3/10                            | Zero backend real no ar até hoje. Primeiro preview já revelou um bug que impedia qualquer navegação — ou seja, ninguém, nem cliente piloto, nem vocês, tinha rodado isso de ponta a ponta.                                |
| Disciplina de sequenciamento | 4/10                            | O MVP tinha uma decisão sensata de faseamento (adiar integrações). Foi revertida numa única conversa, sem nenhum dado de cliente sustentando a reversão.                                                                  |
| Modelo de negócio / pricing  | 4/10                            | Preço (R$1.800–2.800/mês) foi fixado quando o custo de infra era ~R$0. O custo mudou de ordem de grandeza (Supabase + Vercel + Pluggy/Belvo por CPF/CNPJ) e o preço não foi revisitado.                                   |
| Segurança e conformidade     | 3/10                            | O desenho de criptografia de token está certo. Mas o projeto ainda não tem controle de versão, não tem teste automatizado, e já assumiu o compromisso de tocar dado bancário via Open Finance. Essa ordem está invertida. |
| Potencial de moat de dado    | 9/10 potencial · 0/10 executado | Ver seção "O insight que importa" abaixo — é o ponto mais valioso deste parecer.                                                                                                                                          |

---

## O que está genuinely forte (não deprecio trabalho bom)

1. **O motor de reconciliação é uma tese de produto real.** Cruzar autoavaliação contra evidência é o tipo de coisa que separa "dashboard" de "inteligência". Nenhuma das referências que vocês pesquisaram (Power BI, Tableau, Julius AI, Looker) faz isso. Se a execução for boa, isso é defensável.
2. **O schema já carrega os campos certos para o que vocês ainda não sabem que vão precisar** — `setor`, `porte`, `faturamento_mensal_faixa` estão em `cliente` desde o início. Isso não foi desenhado pensando em benchmarking, mas é exatamente o que benchmarking exige. Sorte de arquiteto, mas é uma boa sorte.
3. **A decisão de ir pra Supabase relacional**, mesmo questionável no timing (ver riscos abaixo), tem um efeito colateral que ninguém no time percebeu ainda: dado em `jsonb` relacional é infinitamente mais fácil de agregar entre clientes do que os arquivos `.json` soltos por cliente que existiam antes. Vocês trocaram de arquitetura pela razão errada e ganharam, de graça, a fundação certa pra razão certa.
4. **A marca Land Grow e a expertise da Nayara são o ativo real**, mais do que qualquer linha de código. Isso é raro — a maioria das startups de BI que eu vi em 30 anos tem tecnologia sem confiança de mercado. Vocês têm o oposto: confiança de mercado construída, tecnologia ainda por provar.

---

## Os riscos críticos, em ordem de prioridade

### 1. Escopo dobrou de tamanho sem nenhum sinal de cliente

O MVP original adiava CRM/Financeiro/Instagram pra Fase 3 — decisão correta, escrita e justificada. Numa única conversa, isso foi revertido pra "entra tudo agora". Pergunta que ninguém fez: **algum cliente piloto pediu sincronização automática de CRM?** Ou foi suposição de que eles vão querer? Startups não morrem por falta de features. Morrem por construir features que ninguém pediu enquanto o núcleo do produto (reconciliação + coaching) ainda nem foi testado com gente de verdade.

### 2. Zero validação antes de comprometer arquitetura

Vocês pivotaram de SPA estática pra Vercel+Supabase, com custo operacional novo e complexidade de OAuth/LGPD, **antes de qualquer cliente ter usado a versão mais simples**. O teste certo é o inverso: prove que a reconciliação com dado só de upload já gera valor suficiente pra alguém pagar R$1.800/mês. Se provar, automatizar ingestão é trivial depois. Se não provar, vocês economizaram meses construindo integração que ninguém ia usar mesmo.

### 3. Preço não foi recalculado depois que o custo mudou de ordem de grandeza

R$1.800–2.800/mês foi fixado no mundo de "infra ~R$0". Agora tem Supabase, Vercel, Claude API rodando reconciliação, e Pluggy/Belvo cobrando por CPF/CNPJ consultado. Ninguém rodou a conta nova. Isso precisa acontecer antes do primeiro cliente pagante entrar, não depois.

### 4. Compliance está atrás do apetite de dado que o produto já assumiu

Vocês decidiram tocar dado bancário (Open Finance) antes de ter git, antes de ter teste automatizado, antes de ter uma revisão de segurança. Dado bancário de terceiro é a categoria de dado mais regulada que existe no Brasil fora de saúde. A ordem certa é: infraestrutura de auditoria e segurança primeiro, apetite de dado sensível depois — não o contrário.

### 5. Tensão não resolvida: "tirar a Nayara do gargalo" vs. "Nayara revisa tudo"

O PRD diz as duas coisas ao mesmo tempo: a meta é reduzir o tempo da Nayara por cliente de 8-12h pra <2h, **e** todo relatório/OKR gerado por IA passa por revisão da Nayara antes de ir pro cliente. Isso é matematicamente incompatível em escala — em 15 ou 50 clientes, "revisar tudo" volta a ser o gargalo que o produto promete resolver. Alguém precisa decidir, com critério explícito, o que pode sair sem revisão humana e o que não pode. Isso ainda não existe.

### 6. Processo de construção pesado antes de qualquer valor entregue

Boa parte do esforço recente foi ceremonial: squad com 3 agentes nomeados, 8 arquivos de task, workflow YAML — antes de um único cliente ter visto o produto funcionando. Estrutura ajuda quando o time cresce. Com 1-2 pessoas construindo um MVP, o risco é gastar mais tempo documentando o processo de construir do que construindo. O próprio produto de vocês defende o oposto disso pro cliente final: parem de gerar relatório bonito, comecem a gerar decisão.

---

## O insight que importa mais que qualquer um dos riscos acima

Nenhum concorrente pesquisado (Power BI, Tableau, Looker, Julius AI, 4kst) resolve isto: **um único cliente nunca sabe se o número dele é bom ou ruim, só sabe qual é o número.** Margem de 18% é boa ou ruim pra uma construtora de Campo Grande com 15-30 funcionários? Ninguém no mercado brasileiro de PME responde isso com dado real, porque ninguém tem uma base de PMEs comparáveis instrumentada da mesma forma.

O PULSO, com 30-50-100 clientes rodando no mesmo schema (`setor`, `porte`, `faturamento_mensal_faixa`, os mesmos KPIs), pode responder: **"empresas do seu setor e porte têm margem X — a sua é Y."** Isso não é dashboard. Isso é o tipo de dado que ninguém mais tem porque ninguém mais tem a base de clientes instrumentada da mesma forma. É a diferença entre vender "seu espelho" (que qualquer BI faz) e vender "o mapa de onde você está no seu mercado" (que exige ser o agregador).

Esse é o motor de um moat que composta: mais cliente → benchmark melhor → produto mais valioso → mais cliente. É a arquitetura de rede que separa uma ferramenta de um efeito de rede — que é o tipo de coisa que justifica múltiplo de unicórnio em vez de múltiplo de agência de consultoria com SaaS acoplado.

**Duas coisas isso exige, e nenhuma das duas está no plano hoje:**

1. **Consentimento explícito de uso agregado e anônimo** no onboarding — desde o primeiro cliente, mesmo que a feature de benchmark só exista daqui a 12 meses. É muito mais fácil pedir esse consentimento no dia 1 do que voltar em 50 clientes pra pedir depois.
2. **Massa crítica por segmento** antes do benchmark ser estatisticamente honesto — com 3 clientes construtoras, "a média do seu setor" é só a média de 3 empresas. Isso precisa ser comunicado com integridade, não inflado.

---

## Recomendação desta semana

1. **Congela os 3 conectores de API** (CRM, Instagram, Financeiro) até que o loop upload → formulário BIN → reconciliação → COMPASS tenha sido testado de ponta a ponta com pelo menos 1 cliente piloto real.
2. **Recalcula o preço** da Inteligência Mensal considerando o custo real da arquitetura nova, antes de vender pra qualquer piloto nesse formato.
3. **Coloca git no projeto agora** — antes de qualquer dado financeiro real (mesmo de upload) tocar o sistema. Não é opcional a partir do momento em que existe dado sensível de cliente.
4. **Adiciona o consentimento de uso agregado/anônimo** no formulário de onboarding desde já, mesmo que o benchmark em si venha depois — é o único item desta lista com custo zero hoje e valor composto no futuro.
5. **Resolve a tensão do item 5** por escrito: define, em uma frase, o que sai sem revisão da Nayara e o que não sai. Sem isso, "tirar a Nayara do gargalo" continua sendo uma meta de slide, não uma decisão de produto.

---

_Parecer produzido a pedido de Nayara Cordeiro, fundadora da Land Grow, como avaliação externa crítica do PULSO em 11/07/2026._
