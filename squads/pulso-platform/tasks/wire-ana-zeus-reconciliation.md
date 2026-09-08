---
task: Wire ANA/ZEUS to Reconciliation Output
responsavel: "@reconciliation-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Motor de reconciliação funcional (task build-reconciliation-engine.md concluída)
  - Definições atuais dos agentes ANA (land-grow-ana) e ZEUS (land-grow-zeus)
Saida: |
  - ANA recebe inconsistencias como insumo adicional ao gerar o RADAR (score de maturidade)
  - ZEUS usa inconsistências críticas como insumo direto na síntese do COMPASS/HORIZON
Checklist:
  - "[ ] Mapear onde ANA hoje só lê o formulário — adicionar leitura de inconsistencias no mesmo passo"
  - "[ ] Score de maturidade por área passa a ser rebaixado quando há inconsistência crítica não resolvida na área"
  - "[ ] ZEUS nomeia explicitamente as inconsistências críticas na síntese (não esconde, não suaviza — regra Land Grow)"
  - "[ ] Testar ponta a ponta: formulário com inconsistência proposital -> RADAR reflete score mais baixo -> COMPASS nomeia o ponto cego"
---

# *wire-agents

Fecha o loop: sem essa task, o motor de reconciliação produz dado que ninguém usa. O valor só existe quando ANA e ZEUS tratam `inconsistencias` como sinal de primeira classe, não como campo decorativo do JSON.

## Regra Land Grow que se aplica aqui

CLAUDE.md do projeto já define: "Nunca suaviza problemas graves — inclui com profissionalismo, mas inclui." Uma inconsistência crítica é, por definição, o tipo de achado que esse princípio protege — o motor não serve pra nada se o COMPASS não nomear o que ele encontrou.

## Próximo passo do squad

Com upload + reconciliação + wiring funcionando ponta a ponta, o loop central do produto está provado. Os conectores de API (Instagram/CRM/Financeiro) entram depois, para ampliar a fonte de evidência — não são bloqueio para validar o conceito com os clientes piloto.
