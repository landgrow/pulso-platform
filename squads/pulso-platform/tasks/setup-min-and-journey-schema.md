---
task: Setup MIN and Journey Schema
responsavel: "@platform-architect"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Schema base já aplicado (task setup-supabase-schema.md concluída)
  - migrations/0002_min_and_journey.sql (já escrita)
Saida: |
  - Tabelas min_blocos e contratos aplicadas
  - View sinal_qualificacao_fundo disponível
Checklist:
  - "[ ] Aplicar migrations/0002_min_and_journey.sql no projeto Supabase"
  - "[ ] Confirmar os 13 valores do enum min_bloco_nome batem com os 13 blocos do MIN (ver modelo-integrado-de-negocios/min-system/MIN - Modelo Integrado de Negócio.md)"
  - "[ ] Confirmar os 5 tipos de contrato cobrem a jornada real: diagnostico_bin, aceleracao_fase1_receita, aceleracao_fase2_governanca, proposta_continuidade_fee_equity, fundo"
  - "[ ] Testar a view sinal_qualificacao_fundo com um cliente fictício com dado nas 3 fontes (contrato, min_blocos, periodos_dados.inconsistencias)"
  - "[ ] RLS ativado em min_blocos e contratos (mesma política do restante: só service role acessa)"
---

# *setup-min-and-journey-schema

Estende o schema da Fase A (BIN) para cobrir o MIN e a jornada de contrato do cliente, sem criar um sistema separado — mesma base, mesmo `cliente_id`.

## Por que isso não é um projeto novo

O MIN nunca teve software — só metodologia (prompts AGENTE-1/2/3) e execução manual. A tentação seria criar um app novo pro MIN. A decisão registrada foi o oposto: o MIN vive no mesmo `pulso-platform`, porque a Fase 3 do MIN (Consolidação) é o mesmo conteúdo da Fase 2 do contrato de Aceleração — tratar como sistemas separados duplicaria dado que precisa estar junto pra gerar o sinal de qualificação pro Fundo.

## A view sinal_qualificacao_fundo não decide nada

Ela só agrega três fontes (contrato concluído + maturidade dos blocos de governança do MIN + inconsistências críticas em aberto do motor de reconciliação). A decisão de propor fee reduzido + equity continua sendo julgamento pontual da Nayara — a view existe pra essa decisão ser informada, não pra substituí-la.

## Próxima task

Com o schema aplicado: `@min-facilitator *run-fundacao` (primeira fase do MIN, exige BIN concluído do cliente).
