---
task: Build Upload Ingestion
responsavel: "@ingestion-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - /api/upload esqueleto (task scaffold-vercel-api.md concluída)
  - Arquivo real de cliente piloto (PDF de DRE, extrato, planilha) para teste
Saida: |
  - Endpoint /api/upload funcional: recebe arquivo, salva no Storage, extrai dados estruturados
  - Dados extraídos gravados em periodos_dados.data (kpis, conforme o tipo de documento)
Checklist:
  - "[ ] Parser de PDF (DRE/balancete/extrato) via Claude API — extrai kpis.faturamento, margem, inadimplencia"
  - "[ ] Parser de Excel/CSV — mesma extração para planilhas"
  - "[ ] Transcrição de áudio via Claude API (já usado no MVP atual, só migra pro backend)"
  - "[ ] Texto livre — grava direto, sem parsing estruturado"
  - "[ ] Cada evidência processada gera registro em evidencias (fonte, tipo_arquivo, storage_path)"
  - "[ ] Testar com arquivo real de 1 cliente piloto (Jefferson ou RS Company) e conferir kpis extraídos batem com o documento"
---

# *build-upload

Migra a ingestão por upload do MVP atual (que já existe conceitualmente no formulário/chat) para o backend real, com persistência em Supabase Storage em vez de anexo solto.

## Por que começa aqui, não pelos conectores de API

Upload não depende de OAuth nem de aprovação de terceiro (Meta App Review, cadastro Pluggy) — é a fonte mais rápida de colocar no ar e a que já tem dado real disponível (documentos dos clientes piloto). Prova o motor de reconciliação (task seguinte) sem esperar integração externa.

## Contrato de saída

Cada parser deve popular os mesmos campos que `client-data-schema.json` já define em `kpis` — não inventa estrutura nova.

## Próxima task

Com upload funcionando: `@reconciliation-engineer *build-engine` (já dá pra cruzar formulário × PDF real).
