---
task: Scaffold Vercel API
responsavel: "@platform-architect"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Schema Supabase aplicado (task setup-supabase-schema.md concluída)
  - Chaves de API: Claude API, Supabase service role
Saida: |
  - Projeto Vercel com pasta /api funcional
  - 4 endpoints esqueleto (respondem, ainda sem lógica de negócio completa)
Checklist:
  - "[ ] Inicializar projeto Vercel (vercel.json + estrutura /api)"
  - "[ ] /api/oauth/[provider]/callback — recebe code, troca por token, grava criptografado"
  - "[ ] /api/ingest/[provider]/sync — esqueleto (implementação real fica com ingestion-engineer)"
  - "[ ] /api/reconcile — esqueleto (implementação real fica com reconciliation-engineer)"
  - "[ ] /api/upload — recebe arquivo, salva no Supabase Storage"
  - "[ ] Configurar env vars na Vercel (SUPABASE_*, CLAUDE_API_KEY, ENCRYPTION_KEY)"
  - "[ ] Testar cada endpoint com curl/Postman e confirmar resposta 200"
---

# *scaffold-api

Gera o esqueleto dos 4 endpoints previstos em `MOTOR-INGESTAO-RECONCILIACAO.md` (seção 6). Cada endpoint aqui só precisa responder corretamente à forma (auth, payload, status code) — a lógica de negócio de cada um é responsabilidade do agente dono (ingestion-engineer para sync/upload, reconciliation-engineer para reconcile).

## Endpoints

| Endpoint                         | Dono da lógica                 | Responsabilidade deste scaffold                                                 |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `/api/oauth/[provider]/callback` | platform-architect (esta task) | Completo: troca code→token, criptografa, grava                                  |
| `/api/ingest/[provider]/sync`    | ingestion-engineer             | Só esqueleto — recebe request, valida cliente, retorna 501 até implementado     |
| `/api/reconcile`                 | reconciliation-engineer        | Só esqueleto — mesma lógica                                                     |
| `/api/upload`                    | ingestion-engineer             | Recebe arquivo, salva no Storage — extração fica para build-upload-ingestion.md |

## Próximas tasks

Depois do scaffold: `@ingestion-engineer *build-upload` e, em paralelo, `@reconciliation-engineer *build-engine` (este último pode avançar com dados de upload, não precisa esperar os conectores de API).
