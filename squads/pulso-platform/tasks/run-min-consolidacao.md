---
task: Run MIN Consolidação
responsavel: "@min-facilitator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Fases Fundação e Operação concluídas (9 blocos em min_blocos)
  - Prompt de referência: modelo-integrado-de-negocios/AGENTE-3-CONSOLIDACAO.md
Saida: |
  - 4 registros em min_blocos (fase='consolidacao'): ecossistema_de_parceiros, metricas_de_impacto, cultura_e_valores, gestao_de_riscos
Checklist:
  - "[ ] Confirmar Fundação e Operação concluídas antes de iniciar"
  - "[ ] Implementar a extração estruturada dos 4 blocos a partir do prompt AGENTE-3-CONSOLIDACAO.md"
  - "[ ] Tratar cultura_e_valores e gestao_de_riscos com rigor de evidência (não é autoavaliação livre — cruzar com o que já foi encontrado no motor de reconciliação do cliente, se houver)"
  - "[ ] Testar com o mesmo cliente piloto usado nas fases anteriores"
---

# *run-consolidacao

Terceira e última fase do MIN. Esta é a fase que mais importa fora do MIN em si: **é o mesmo conteúdo da Fase 2 do contrato de Aceleração** (meses 7-12, foco em governança). Os blocos `cultura_e_valores` e `gestao_de_riscos` alimentam diretamente a view `sinal_qualificacao_fundo`.

## Por que esta fase pede mais rigor que as outras

Fundação e Operação são principalmente descritivas (o que a empresa é e como opera). Consolidação começa a ter peso decisório — o resultado daqui pode embasar uma proposta de equity da Land Grow na empresa do cliente. Autoavaliação genérica não serve; cruzar com evidência real (inclusive as inconsistências que o motor de reconciliação já encontrou pro mesmo cliente) é obrigatório.

## Próxima task

Com Consolidação registrada: `@reconciliation-engineer *build-qualificacao-fundo-signal`.
