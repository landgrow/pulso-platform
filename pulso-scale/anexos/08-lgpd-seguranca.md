# Anexo 08 — LGPD e segurança

Complementa a arquitetura atual (RLS 0052, cookies httpOnly, admin client só no server, consent 0004). Scale aumenta superfície: e-mail, transcrição, webhook, embeddings.

## Papéis LGPD

| Papel | Quem |
| --- | --- |
| Controladora perante o cliente da Land Grow | Land Grow, no contrato de consultoria / futuro SaaS |
| Operadora | Supabase, Vercel, Groq/xAI, provedor de embedding, Deepgram (se áudio) |
| Controladora dos dados do CRM do cliente | o **cliente**; PULSO opera sob instrução ao ingestir |

DPA com cada operador **antes** da onda que envia PII para ele. Sem DPA, a flag da onda não liga em org real.

## Base legal (proposta — Q a confirmar com Nayara)

| Tratamento | Base |
| --- | --- |
| Conta e operação do portal | execução de contrato |
| BIN / MIN / boards | execução de contrato |
| Ingest CRM | legítimo interesse / contrato, **com** aviso no hub (“vamos receber deals”) |
| E-mail/transcrição | consentimento ou contrato explícito do cliente empregador; minimizar |
| Modelo de IA (API EUA) | transferência internacional: cláusulas + aviso |

Não treinar modelo próprio com dado de cliente. Inferência via API; retenção no provedor = a mínima do contrato deles.

## Minimização

- Chunk de e-mail: assunto + trecho pertinente, não thread inteira no prompt.  
- Transcrição: o job usa o texto; o chat retrieve limita N trechos.  
- Webhook `payload` cru: acesso técnico HQ, não vai ao modelo inteiro.  
- Máscara de documentos (CPF, cartão) best-effort no chunker; não alegar 100%.

## Retenção (proposta)

| Dado | Retenção | Q |
| --- | --- | --- |
| intelligence_chunks | enquanto a origem existir; tombstone no delete | — |
| integration_events | 90 dias | — |
| transcripts | 180 dias | Q6 |
| signals | 2 anos ou até dismiss+ciclo | — |
| product_events | 1 ano | — |
| audit_log | imutável (já) | — |

Org encerrada: parar ingest; retenção contratual; DSAR ainda atende.

## DSAR

Já há consent/export no espírito do épico 0. Scale **estende**:

- Export: chunks, signals, conversation_records, events da org (sem secret_hash).  
- Delete: tombstone chunks, apagar corpos de e-mail/transcrição, canonical `deleted_at`. Embeddings saem junto (são dado pessoal se o texto era).  
- Prazo: 15 dias úteis alvo interno.

## Ameaças (STRIDE resumido)

| Ameaça | Mitigação P0 |
| --- | --- |
| IDOR org | RLS + authorizeOrg + teste duas orgs |
| IDOR altitude | can_read_altitude + 404 |
| HMAC bypass | timestamp + secret por conexão + teste 401 |
| Chave no JS | nunca |
| Prompt injection | delimitadores atuais + recusa E05 |
| Sala → cliente | source filter |
| Tenant no embedding provider | metadata org_id; não logar conteúdo em suporte |
| DoS ingest | 256 KB, rate limit, teto |
| Replay | timestamp 5 min + idempotency |
| SSRF no webhook de saída | allowlist já deve existir/reforçar na onda 2 |
| Admin client no prompt | proibido |

## Secrets

Rotação no hub. `.env` só chaves de **plataforma** (Groq, Supabase), não a do CRM do cliente.

## Logs

Não logar body de e-mail, transcrição, Bearer, HMAC. `request_id` sim. Erros de mapper: path do campo, não valor.

## CSP / XSS

CSP atual com `script-src 'unsafe-inline'` é dívida conhecida — **não** é desta iniciativa. Chat com markdown: sanitizar; citações são links internos, não HTML do modelo cru.

## Checklist antes de org piloto

- [ ] RLS nas tabelas novas + testes IDOR  
- [ ] DPA do provedor de embedding e de áudio  
- [ ] Hub mostra o que é enviado à IA  
- [ ] DSAR export/delete inclui tecido  
- [ ] Teto de custo ligado  
- [ ] Flag `intel_*` off-switch
