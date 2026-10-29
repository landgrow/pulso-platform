# Anexo 03 — API v1 e webhooks

Contract-first. Implementar só na onda 2 (health pode nascer na 0). Breaking change → `/api/v2`. JSON, UTF-8, timestamps ISO-8601 com offset.

Base: `https://{host}/api/v1`

## Autenticação

**Inbound (sistema cliente → PULSO)**

- Header `Authorization: Bearer pc_live_…` (chave da conexão; prefixo `pc_live_` / `pc_test_`).
- Header `X-Pulso-Signature: sha256={hex}` — HMAC-SHA256 do raw body com o secret da conexão.
- Header `Idempotency-Key: {uuid}` recomendado; obrigatório se o provedor não manda `id`.
- Header `X-Pulso-Timestamp` (unix) — rejeitar se |now - ts| > 5 min (replay).

**Leitura humana (app/PWA):** sessão cookie httpOnly já usada; **não** expor a chave pc_live_ no browser.

## Códigos de erro

Nunca `200` com `{ error }`. Corpo:

```json
{
  "error": {
    "code": "invalid_signature",
    "message": "Assinatura HMAC inválida.",
    "request_id": "req_…"
  }
}
```

| HTTP | code (exemplos) |
| --- | --- |
| 401 | `invalid_signature`, `invalid_api_key`, `timestamp_expired` |
| 403 | `org_mismatch`, `module_disabled`, `altitude_forbidden`, `org_closed` |
| 404 | `connection_not_found`, `entity_not_found` |
| 409 | `idempotency_conflict` (mesmo key, body diferente) |
| 413 | `payload_too_large` |
| 422 | `unmapped_type`, `validation_failed` |
| 429 | `rate_limited` + `Retry-After` |
| 503 | `ingest_paused` (teto) |

## Endpoints

### `GET /health`

Sem auth. `{ "ok": true, "version": "v1" }`. Liveness, não checa banco pesado.

### `POST /webhooks/{connectionId}/ingest`

Body máximo 256 KB.

```json
{
  "id": "evt_prov_123",
  "occurred_at": "2026-10-28T12:00:00-03:00",
  "type": "deal.updated",
  "entity": {
    "external_id": "pipedrive:99",
    "name": "Obra X",
    "stage": "proposta",
    "amount": 12000,
    "currency": "BRL",
    "owner_external_id": "pipedrive-user:1"
  }
}
```

Resposta **202** (async map+index) ou **200** se o mapper for síncrono e rápido:

```json
{
  "accepted": true,
  "event_id": "uuid-interno",
  "canonical_id": "uuid-ou-null-se-async",
  "duplicate": false
}
```

Replay com mesmo `id` ou Idempotency-Key: `duplicate: true`, mesmo `canonical_id`.

### `POST /orgs/{orgId}/events`

Igual ao ingest, para clientes que não querem path por connection (a connection vem da API key). `orgId` da URL tem que bater com a key.

### `GET /orgs/{orgId}/entities`

Sessão. Query: `type`, `updated_since`, cursor. Resposta **já projetada** pela altitude. Direção não recebe campos `owner_name`, `description` operacional, etc.

### `GET /orgs/{orgId}/entities/{id}`

404 se a altitude não pode o cru (não 200 mascarado restante — evita vazar existência de card confidencial). Exceção: entidades com `label` público de gestão podem 200 com payload reduzido. Decisão na implementação da onda 1: **preferir 404** para ops-only.

### `GET /orgs/{orgId}/signals`

Filtro `kind`, `since`. Só signals com `altitude_min` ≤ usuário.

### `POST /orgs/{orgId}/signals/{id}/dismiss`

Gestão+.

## Eventos canônicos (type)

| type | Módulo | Entity |
| --- | --- | --- |
| `deal.created` `deal.updated` `deal.deleted` | comercial | Deal |
| `task.created` `task.updated` `task.completed` | operacao | Task |
| `meeting.upserted` | conversa | Meeting |
| `document.upserted` | conhecimento | Document |
| `person.upserted` | pessoas | Person |

Tipos desconhecidos: 422 `unmapped_type` **ou** `ignored` se `settings.accept_unknown=true` (default false).

## Webhook de saída (já existe)

Não misturar com inbox. Automations atuais continuam. Quando o tecido existir, payload de saída pode incluir `canonical_id` — change opt-in, não quebrar consumidores.

## Rate limit (proposta)

100 req/min por conexão; burst 20. 429 com `Retry-After`. HQ pode subir no `settings`.

## Versionamento

Header `Pulso-API-Version: 2026-10-28` opcional na v1. Campo novo = compatível. Renomear/remover = v2.

## OpenAPI

Na onda 2, gerar `pulso-scale/openapi-v1.yaml` no mesmo PR e publicar rota `/api/v1/openapi.json` autenticada HQ. Este anexo é o contrato até lá.
