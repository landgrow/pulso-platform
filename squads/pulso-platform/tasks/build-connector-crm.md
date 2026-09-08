---
task: Build CRM Connector
responsavel: "@ingestion-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Confirmação de quais CRMs os clientes piloto usam de fato (decisão pendente #5 do PRD, seção 14)
  - Credenciais de API dos 2 CRMs priorizados
Saida: |
  - 2 integrações nativas funcionais (OAuth ou API key, conforme o provedor)
  - Fallback via upload de CSV para CRMs fora da lista priorizada
  - /api/ingest/crm/sync popula kpis.clientes_ativos e perfil.carteira
Checklist:
  - "[ ] Confirmar com Nayara quais 2 CRMs entram primeiro (Pipedrive/RD Station CRM/HubSpot/Ploomes/Agendor são candidatos)"
  - "[ ] Implementar integração nativa do CRM #1"
  - "[ ] Implementar integração nativa do CRM #2"
  - "[ ] Implementar fallback: upload de export CSV normalizado pro mesmo contrato de dados"
  - "[ ] Testar com dado real de pelo menos 1 cliente piloto"
---

# *build-connector-crm

**Decisão em aberto antes de começar:** qual CRM cada cliente piloto usa (Jefferson/RS Company/Lígia/Ontec). Não constrói integração nativa às cegas — confirma isso primeiro, senão o trabalho não tem quem valide.

## Por que só 2 nativos + fallback

Não existe CRM único de mercado brasileiro de PME. Cobrir N provedores de uma vez não é o uso do tempo de um dev sênior — 2 integrações nativas cobrindo a base real, mais um fallback universal (CSV) pros demais, entrega 80% do valor com 20% do esforço.
