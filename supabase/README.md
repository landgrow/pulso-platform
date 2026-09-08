# PULSO — Supabase

Schema inicial da persistência do PULSO. Ver `PULSO/MOTOR-INGESTAO-RECONCILIACAO.md` (seção 6) e
`PULSO/squads/pulso-platform/tasks/setup-supabase-schema.md` para o desenho completo.

## Status desta task

| Item do checklist                                      | Status                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Tabelas clientes/periodos_dados/conexoes/evidencias    | ✅ escrito em `migrations/0001_init_schema.sql`                                                  |
| Row Level Security ativado                             | ✅ (sem policies de usuário final ainda — só service role acessa)                                |
| jsonb de periodos_dados aceita documento real sem erro | ✅ validado — `jefferson.json`, `rs-company.json` e `exemplo-cliente.json` passam no schema v3.0 |
| Migração aplicada em projeto Supabase real             | ⏳ **bloqueado — falta o projeto existir**                                                       |
| Env vars documentadas                                  | ✅ ver abaixo                                                                                    |

## O que falta pra destravar (só Nayara pode fazer)

Criar conta/projeto é uma ação de conta — não é algo que eu devo fazer por você. Passos:

1. Criar projeto em [supabase.com](https://supabase.com) (ou me passar um projeto existente)
2. Em Project Settings → API, copiar: `Project URL` e `service_role key` (não a `anon key` — o backend precisa de privilégio total, o frontend nunca vê essa chave)
3. Gerar uma `ENCRYPTION_KEY` própria (32 bytes aleatórios) — usada só pra criptografar `conexoes.token_encrypted`, nunca reaproveitar chave de outro sistema

## Env vars necessárias (Vercel)

```
SUPABASE_URL=https://pcmivlmpdbzpztwcojfs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_do_projeto>
ENCRYPTION_KEY=<32_bytes_hex_64_chars>
CLAUDE_API_KEY=<anthropic_api_key>
```

## Como aplicar a migração

Com o projeto criado e o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ou, sem CLI: colar o conteúdo de `migrations/0001_init_schema.sql` direto no SQL Editor do painel Supabase.

## Próxima task

Com a migração aplicada: `@platform-architect *scaffold-api` (gera os 4 endpoints Vercel Functions).
