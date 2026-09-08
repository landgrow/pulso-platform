---
task: Run MIN Fundação
responsavel: "@min-facilitator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - BIN concluído do cliente (pré-requisito obrigatório)
  - Formulário por bloco + sessão gravada (Fireflies/Otter), conforme o processo atual do MIN
  - Prompt de referência: modelo-integrado-de-negocios/AGENTE-1-FUNDACAO.md
Saida: |
  - 6 registros em min_blocos (fase='fundacao'): proposta_de_valor, segmentos_de_clientes, atividades_chave, modelo_de_receita, comportamento_do_consumidor, jornada_do_cliente
  - Cada bloco com conteudo (texto + canvas) e maturidade atribuída
Checklist:
  - "[ ] Confirmar BIN do cliente está concluído antes de iniciar (bloqueio, não sugestão)"
  - "[ ] Implementar a extração estruturada dos 6 blocos a partir do prompt AGENTE-1-FUNDACAO.md"
  - "[ ] Cada bloco recebe maturidade (inexistente/rascunho/funcional/otimizado) — nunca fica sem classificação"
  - "[ ] Testar com 1 cliente piloto que já tenha BIN completo"
---

# *run-fundacao

Primeira das 3 fases do MIN. Sem BIN concluído, não inicia — o MIN parte do diagnóstico, não o substitui.

## O que muda em relação ao processo manual atual

Hoje isso é 1 sessão gravada + relatório em texto e slide, sempre com a Nayara facilitando. Esta task não elimina a sessão (o valor de descoberta continua sendo humano) — estrutura o _output_ da sessão no mesmo formato que o resto do sistema usa, pra virar dado consultável em vez de documento solto.

## Próxima task

Com a Fundação registrada: `@min-facilitator *run-operacao`.
