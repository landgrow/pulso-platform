# Roteiro de Sistematização — Land Grow

**11/07/2026**

---

## Correção antes de continuar

O caminho que você apontou (`CLAUDE DOCS LAND\min\`) **não é o MIN da Land Grow** — são 5 arquivos de material didático pra um cliente específico (estudo de caso de uma "desenvolvedora de jogos", com lista de leitura de Osterwalder/Christensen). É conteúdo de ensino de um bloco de canvas, não a metodologia MIN.

O MIN de verdade está em `modelo-integrado-de-negocios/`:

- **A metodologia existe e está completa**: 13 blocos em 3 fases — Fundação (proposta de valor, segmentos, atividades-chave, modelo de receita, comportamento do consumidor, jornada do cliente), Operação (canais, recursos estratégicos, estrutura de custos), Consolidação (ecossistema de parceiros, métricas de impacto, **cultura & valores**, **gestão de riscos** — é aqui que governança mora). Definida como 3 prompts de agente (`AGENTE-1-FUNDACAO`, `AGENTE-2-OPERACAO`, `AGENTE-3-CONSOLIDACAO`), no mesmo espírito do ANA/ZEUS/MIRA do BIN.
- **O software não existe.** Houve uma tentativa (rebatizada de "BIC — Business Intelligence Canvas", um app Next.js) que ficou pela metade — o assistente básico funciona, mas exportação, PDF/Excel, autenticação e backup em nuvem estão marcados como "🚧 em desenvolvimento" no próprio README. Hoje, MIN roda manualmente: formulário + sessão gravada (Fireflies/Otter) + relatório em texto e slide.

Isso muda a leitura do seu pedido: BIN e MIN não são "dois produtos que já rodam" no mesmo nível. **BIN roda como produto. MIN roda como metodologia manual, sem sistema.**

---

## O mapa completo, com status real de cada peça

```
GROW START
    │
    ▼
BIN — Diagnóstico 10 setores           🟢 RODANDO (produto)
    │                                    PULSO em construção como motor
    ▼
MIN — Modelo de operação (13 blocos)   🟡 METODOLOGIA EXISTE, SEM SISTEMA
    │                                    3 sessões manuais, 3-6 semanas, sempre com Nayara
    ▼
ACELERAÇÃO 12 MESES
    ├── Meses 1-6: geração de receita   🟡 conteúdo existe (Land Grow Scale), execução manual
    └── Meses 7-12: governança/         🟡 é literalmente a Fase 3 do MIN (Consolidação) —
        processos/escala                   ainda sem sistema
    │
    ▼
empresa "qualificada" ──────────────────  🔴 CRITÉRIO DE QUALIFICAÇÃO NÃO ESTÁ ESCRITO
    │                                       EM LUGAR NENHUM
    ▼
FUNDO DE INVESTIMENTO                    🔴 recebe empresas da Aceleração — mecanismo
                                             de entrada não formalizado

────────────────────────────────────────────────────────────────
RAMAL PARALELO (conecta ao Fundo por outro caminho)

IMERSÃO INVESTIDOR                       🟢 RODANDO — evento presencial de 2 dias,
(2 dias, parceria Border/FIEP/            parceria já estabelecida, dezenas de sessões
meajudacibele)                            cronometradas, formato validado
    │
    ▼
CURADORIA (pós-imersão)                  🟡 modelo existe na cabeça, sem produto formal
    │
    ▼
convite pro FUNDO (6 meses depois)       🔴 mesmo Fundo do ramal principal — os dois
                                             caminhos deveriam convergir, mas hoje são
                                             dois funis desconectados

────────────────────────────────────────────────────────────────
IN-COMPANY (treinamento corporativo)     🟢 RODANDO, paralelo — não alimenta o Fundo,
                                             é linha de receita própria
```

---

## O gargalo real (não é um problema do PULSO, é um problema da empresa)

Repare no padrão: BIN precisa da Nayara revisar. MIN precisa da Nayara facilitar 3 sessões. Aceleração precisa da Nayara acompanhar 12 meses. Imersão precisa da Nayara (ou time dela) presente 2 dias. Curadoria e critério de entrada no Fundo vivem na cabeça dela, não em documento.

**Sistematizar o PULSO sozinho não resolve o problema de escala da Land Grow** — só resolve o gargalo dentro de um produto (BIN). Os outros 4 produtos (MIN, Aceleração, Imersão/Curadoria, Fundo) têm o mesmo gargalo e nenhum sistema ainda.

---

## Priorização — o que sistematizar primeiro, e por quê

### Prioridade 1 — Estender o motor que já está sendo construído (PULSO) pro MIN

Não é trabalho novo do zero: os prompts `AGENTE-1/2/3` do MIN já existem, no mesmo formato dos agentes ANA/ZEUS/MIRA do BIN. A extensão natural é o squad `pulso-platform` também orquestrar o MIN, usando a mesma reconciliação e o mesmo `client-data-schema.json` — porque a Fase 3 do MIN (Consolidação: cultura, riscos, governança) **é exatamente o conteúdo dos meses 7-12 da Aceleração**. Sistematizar isso de uma vez resolve dois produtos ao mesmo tempo (MIN + a segunda metade da Aceleração), não dois esforços separados.

### Prioridade 2 — Um pipeline único de cliente, não um Notion por produto

Hoje, cada produto (BIN, MIN, Aceleração, Fundo) provavelmente vive em conversas e documentos separados. O que transforma "4 produtos" em "1 funil que alimenta o Fundo" é ter a jornada do cliente num lugar só: BIN → MIN → Aceleração → critério de qualificação → Fundo, com status visível em cada etapa. Isso é o mecanismo literal que garante que empresa boa não se perde entre uma etapa e outra por falta de acompanhamento sistemático.

### Prioridade 3 — Não construir software pra Imersão/Curadoria/Fundo agora

Imersão é evento presencial com parceiros institucionais (Border/FIEP) — isso escala contratando mais facilitadores e fechando mais parcerias, não com mais código. Curadoria e Fundo são relação de confiança com investidor, não um dashboard. Construir sistema pra isso agora seria repetir o erro que já foi identificado no PULSO: comprometer engenharia antes de o processo estar provado manualmente. Formalizar o **critério de qualificação pro Fundo** por escrito é o único item dessa frente que vale fazer agora — porque sem isso, os dois ramais (Aceleração e Imersão/Curadoria) não têm como convergir de verdade no mesmo Fundo.

---

## Decisões — respondidas por Nayara em 11/07/2026

1. **Aceleração = 2 contratos distintos**, não um produto contínuo: Fase 1 (6 meses, receita) e Fase 2 (6 meses, governança) são contratados separadamente.
2. **Mecanismo real de qualificação pro Fundo**, em casos excepcionais (ex.: JS Construtora): ao final da Fase 2, a Land Grow propõe continuar o acompanhamento por um fee mensal menor **+ equity do negócio**. A empresa que aceita essa proposta é a que se qualifica pro Fundo. Não é uma régua numérica — é uma proposta pontual, decidida pela Nayara.
3. **PULSO** — decisão registrada na próxima seção.

---

## O caminho recomendado para o PULSO (decisão registrada em 11/07/2026)

Juntando o parecer técnico, a mesa-redonda e o mecanismo real de qualificação pro Fundo (proposta de fee reduzido + equity, não uma régua automática), o caminho é em 4 fases, nessa ordem:

**Fase A — Provar o núcleo (já em andamento, não muda).** Upload + BIN + reconciliação + ANA/ZEUS, sem os 3 conectores externos. Já desenhado no squad `pulso-platform` (`build-sequencial.yaml`, passos 1-5). Bloqueado até o projeto Supabase existir.

**Fase B — Estender o mesmo squad pro MIN, não criar produto separado.** A Fase 3 do MIN (Consolidação: cultura, riscos, governança) é o mesmo conteúdo da Fase 2 do contrato de Aceleração (meses 7-12). Reaproveita os prompts AGENTE-1/2/3 que já existem, no mesmo squad `pulso-platform`, sobre o mesmo `client-data-schema.json`.

**Fase C — Modelar a jornada real do cliente com as 2 fases de contrato.** Cliente tem um estágio (Diagnóstico → Aceleração Fase 1 → Aceleração Fase 2 → proposta de continuidade fee+equity → Fundo). O sistema não decide a proposta de equity — isso é julgamento da Nayara, caso a caso. Mas o motor de reconciliação já construído serve um segundo uso de alto valor aqui: antes de oferecer equity numa empresa, o sinal que embasa essa decisão (reconciliação limpa, sem inconsistência crítica não resolvida + score de governança do MIN + performance financeira real, não a declarada) já existe no sistema. O mesmo motor que diagnostica também reduz o risco de vocês antes de comprar equity.

**Fase D — só depois, os 3 conectores externos (CRM/Instagram/Financeiro).** Como abstração plugável (não 3 integrações hardcoded, conforme a mesa-redonda), e só depois do preço da Inteligência Mensal ser recalculado com o custo real.

### Status de execução (atualizado 11/07/2026, via aiox-master)

- **Fase A**: desenhada (passos 1-5 do workflow), bloqueada até existir projeto Supabase real.
- **Fase B**: **escrita** — migração `supabase/migrations/0002_min_and_journey.sql` (tabelas `min_blocos`, `contratos`), novo agente `min-facilitator` no squad `pulso-platform`, 3 tasks (`run-min-fundacao`, `run-min-operacao`, `run-min-consolidacao`). Bloqueada pela mesma dependência da Fase A (projeto Supabase).
- **Fase C**: **escrita** — view `sinal_qualificacao_fundo` (agrega contrato + governança MIN + inconsistências críticas, não decide nada) e task `build-qualificacao-fundo-signal` no `reconciliation-engineer`.
- **Fase D**: sem mudança, continua por último.

Squad `pulso-platform` revalidado após a extensão — `VALID`, zero erros, zero warnings. Detalhe completo em `squads/pulso-platform/README.md` e `workflows/build-sequencial.yaml`.

---

_Roteiro produzido a partir do que já existe em BIN, MIN, Aceleração, Imersão Investidor e In-company — 11/07/2026._
