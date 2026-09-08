---
task: Run MIN Operação
responsavel: "@min-facilitator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Fase Fundação concluída (6 blocos em min_blocos)
  - Prompt de referência: modelo-integrado-de-negocios/AGENTE-2-OPERACAO.md
Saida: |
  - 3 registros em min_blocos (fase='operacao'): canais_de_engajamento, recursos_estrategicos, estrutura_de_custos
Checklist:
  - "[ ] Confirmar os 6 blocos da Fundação estão presentes e com maturidade atribuída antes de iniciar"
  - "[ ] Implementar a extração estruturada dos 3 blocos a partir do prompt AGENTE-2-OPERACAO.md"
  - "[ ] Testar com o mesmo cliente piloto usado na Fundação"
---

# *run-operacao

Segunda fase do MIN. Depende da Fundação — canais, recursos e estrutura de custo só fazem sentido em cima de proposta de valor e segmento já definidos.

## Próxima task

Com a Operação registrada: `@min-facilitator *run-consolidacao`.
