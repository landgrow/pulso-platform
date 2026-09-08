---
task: Build Qualificação Fundo Signal
responsavel: "@reconciliation-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - View sinal_qualificacao_fundo (task setup-min-and-journey-schema.md concluída)
  - MIN Consolidação concluída (task run-min-consolidacao.md concluída) para pelo menos 1 cliente
Saida: |
  - Superfície (endpoint ou aba no painel) que mostra o sinal de qualificação pro Fundo, por cliente
  - Nenhuma decisão automática — só apresentação do sinal pra Nayara decidir
Checklist:
  - "[ ] Expor a view sinal_qualificacao_fundo de forma legível — não é pra virar score único, é pra mostrar as 4 dimensões separadas (contrato, cultura/valores, gestão de riscos, inconsistências críticas)"
  - "[ ] Deixar explícito na interface que isso é insumo, não decisão — a proposta de fee reduzido + equity continua sendo julgamento pontual da Nayara, caso a caso"
  - "[ ] Testar com 1 cliente que tenha passado pelas 2 fases de contrato + MIN completo (ex.: JS Construtora, quando aplicável)"
  - "[ ] Registrar no schema contratos quando a Nayara efetivamente propõe e quando o cliente aceita/recusa a proposta de continuidade"
---

# *build-qualificacao-fundo-signal

Fecha o loop da Fase C: o motor de reconciliação, construído originalmente pra apontar quando o cliente se engana sobre o próprio negócio no diagnóstico, tem um segundo uso de alto valor aqui — antes da Land Grow considerar equity numa empresa, o mesmo motor mostra se a saúde financeira dela é real ou maquiada.

## Regra de ouro (a mesma da task build-reconciliation-engine.md, aplicada aqui)

Isso não é uma régua automática de aprovação. É a evidência que embasa uma decisão que a Nayara toma caso a caso, em casos excepcionais — exatamente como ela descreveu o mecanismo real hoje (proposta de fee menor + equity ao final da Fase 2, não pra todo cliente). O sistema informa; não decide.

## Onde isso aparece pro usuário interno (Land Grow, não cliente)

Não é uma tela do cliente — é uma visão interna, pra Nayara consultar antes de uma conversa de proposta de continuidade. Linguagem interna é aceitável aqui (diferente do dashboard do cliente, que segue a nomenclatura externa do PRD seção 9).
