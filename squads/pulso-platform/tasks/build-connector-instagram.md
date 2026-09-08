---
task: Build Instagram Connector
responsavel: "@ingestion-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Conta Instagram Business de um cliente piloto
  - App registrado no Meta for Developers
Saida: |
  - OAuth Instagram funcional (via /api/oauth/instagram/callback já scaffolded)
  - /api/ingest/instagram/sync popula kpis de marketing (crescimento, engajamento) em periodos_dados
  - fontes_conectadas.instagram atualizado a cada sync
Checklist:
  - "[ ] Registrar app no Meta for Developers, configurar permissões básicas (sem esperar App Review pra métricas básicas)"
  - "[ ] Implementar fluxo OAuth (login Business -> token de longa duração)"
  - "[ ] Sync: puxar Instagram Insights (seguidores, engajamento, alcance)"
  - "[ ] Normalizar pros campos de marketing do schema"
  - "[ ] Documentar prazo real de App Review para permissões avançadas de audiência (2-4 semanas) — não bloqueia o resto do build"
  - "[ ] Testar com 1 conta real de cliente piloto"
---

# *build-connector-instagram

Primeiro conector de API a construir — é o de menor fricção regulatória dos três (comparado a Open Finance e integração de CRM proprietário).

## Realidade a respeitar

App Review da Meta para permissões avançadas de insight de audiência **não é instantâneo** (2-4 semanas). Não trava o build por isso: sobe com as métricas básicas primeiro (que não exigem review), documenta o que fica pendente até a aprovação chegar.

## Não bloqueia o roadmap

Este conector pode avançar em paralelo com CRM e Financeiro — não há dependência entre eles.
