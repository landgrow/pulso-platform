# Custos do PULSO (levantamento de 05/10/2026)

Preços em dólar, conferidos nas páginas oficiais em 05/10/2026 (confira antes de contratar). Reais ≈ câmbio de R$ 5,50 (só referência).

## Resumo

| Cenário                                    | Vercel   | Supabase | Resend  | Claude (API) | Total/mês                  |
| ------------------------------------------ | -------- | -------- | ------- | ------------ | -------------------------- |
| **Teste interno** (sem cliente de verdade) | Hobby $0 | Free $0  | Free $0 | ~$0–2        | **≈ $0–2**                 |
| **Primeiros clientes** (recomendado)       | Pro $20  | Pro $25  | Free $0 | ~$5–20       | **≈ $50–65 (R$ 275–360)**  |
| **10+ clientes ativos**                    | Pro $20  | Pro $25  | Pro $20 | ~$20–60      | **≈ $85–125 (R$ 470–690)** |

Domínio e e-mail `@landgrow.com.br` já são da Hostinger (renovação anual, fora desta conta).

## Supabase (banco, login, arquivos)

|                              | Free                            | Pro                               |
| ---------------------------- | ------------------------------- | --------------------------------- |
| Preço                        | $0                              | a partir de $25/mês               |
| Banco                        | 500 MB                          | 8 GB (depois $0,125/GB)           |
| Arquivos (Documentos)        | 1 GB                            | 100 GB (depois $0,021/GB)         |
| **Tamanho máx. por arquivo** | **50 MB**                       | 500 GB (a gente limita em 200 MB) |
| Transferência                | 5 GB                            | 250 GB                            |
| Usuários ativos/mês          | 50 mil                          | 100 mil                           |
| Pausa por inatividade        | **pausa após 1 semana sem uso** | nunca pausa                       |
| Backup                       | **nenhum**                      | diário, 7 dias (PITR: +$100/mês)  |

**Free serve só para teste.** Não tem prazo de validade, mas: o projeto pausa sozinho (o site sai do ar até alguém reativar),
não tem backup (perder dado de cliente é irreversível) e o drive de Documentos trava em 1 GB e 50 MB por arquivo.
**Vá para o Pro antes de colocar o primeiro cliente real** ou de pedir arquivos grandes.

## Vercel (hospedagem do app)

|               | Hobby                     | Pro                |
| ------------- | ------------------------- | ------------------ |
| Preço         | $0                        | $20/mês por pessoa |
| Uso comercial | **proibido** (só pessoal) | permitido          |

PULSO é produto de empresa com clientes pagantes: **o Hobby viola os termos** e a conta pode ser suspensa. Use Pro (1 pessoa = $20).
O Pro inclui 1 TB de transferência e franquia de execução de funções — o app está longe do limite no começo.

## Resend (e-mails de aviso)

|           | Free                    | Pro                                       |
| --------- | ----------------------- | ----------------------------------------- |
| Preço     | $0                      | $20/mês (50 mil e-mails) ou $35 (100 mil) |
| Limite    | 3.000/mês e **100/dia** | sem limite diário                         |
| Domínios  | 3                       | 10                                        |
| Excedente | —                       | $0,90 por mil                             |

Free basta no começo (resumo diário + avisos de comentário/arquivo). O limite que aperta primeiro é **100 e-mails por dia**:
com ~20 usuários recebendo resumo diário + avisos, vale ir para o Pro. Sem prazo de validade no Free.

## Claude (API da Anthropic) — leitura do BIN

Cobrança por uso, sem mensalidade (pré-pago). Preço por milhão de tokens (entrada / saída):

| Modelo         | Entrada | Saída | Com Batch (−50%) |
| -------------- | ------- | ----- | ---------------- |
| Haiku 4.5      | $1      | $5    | $0,50 / $2,50    |
| **Sonnet 5.5** | $2      | $10   | $1 / $5          |
| Opus 5.5       | $4      | $20   | $2 / $10         |
| Fable 5.1      | $10     | $50   | $5 / $25         |

Leitura de cache: 10% do preço de entrada (5% no Opus 5.5) — ajuda quando o mesmo instrumento/regras se repetem.

### Tamanho do BIN (medido no código)

- 182 perguntas em 11 seções; instrumento inteiro com opções ≈ 70 mil caracteres (≈ 25 mil tokens).
- Para a IA ler **um diagnóstico**, basta enviar enunciado + resposta de cada pergunta: ≈ 15–20 mil tokens, mais as regras do
  método (RADAR/COMPASS/HORIZON/ROUTE) ≈ 5–8 mil. **Estimativa: ~25 mil tokens de entrada e ~10 mil de saída.**
  (Estimativas; o consumo real vem no campo `usage` de cada resposta.)

| O que a IA faz                                               | Sonnet 5.5           | Opus 5.5           |
| ------------------------------------------------------------ | -------------------- | ------------------ |
| RADAR (1 chamada)                                            | ~$0,15 (R$ 0,80)     | ~$0,30 (R$ 1,65)   |
| Pipeline completo (RADAR→COMPASS→HORIZON→ROUTE, ~4 chamadas) | ~$0,50               | ~$1,00             |
| + Conselho (5 conselheiros em paralelo)                      | +$0,30               | +$0,80             |
| **BIN + Conselho completo**                                  | **~$0,80 (R$ 4,50)** | **~$1,80 (R$ 10)** |

Por mês (1 leitura completa por cliente, já que o BIN reinicia todo mês): 10 clientes ≈ **$8 (Sonnet) a $18 (Opus)**.
Com Batch (resultado em até algumas horas, não na hora) cai pela metade. Hoje o app só usa IA no mapa mental
(`claude-opus-5`, ~$0,10 por mapa); a leitura do BIN ainda é feita pelos agentes no Claude Code, não pela API.

## Quando pagar cada um

1. **Antes do 1º cliente real:** Supabase Pro + Vercel Pro (≈ $45/mês).
2. **Quando o resumo diário passar de ~100 e-mails/dia:** Resend Pro (+$20).
3. **Quando a Central IA ler o BIN pelo app:** colocar crédito na API da Anthropic e limite mensal de gasto no Console.

## Fontes

- Supabase: https://supabase.com/pricing.md
- Resend: https://resend.com/pricing.md
- Vercel: https://vercel.com/docs/accounts/plans/hobby
- Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
