---
task: Setup Supabase Schema
responsavel: "@platform-architect"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - client-data-schema.json (contrato existente em PULSO/data/, versão 3.0)
  - Projeto Supabase criado (URL + service role key)
Saida: |
  - Migração SQL aplicada (tabelas clientes, periodos_dados, conexoes, evidencias)
  - Cliente Supabase configurado no projeto (env vars documentadas)
Checklist:
  - "[ ] Criar tabela clientes (id, nome, cnpj, setor, porte, created_at)"
  - "[ ] Criar tabela periodos_dados (id, cliente_id FK, mes, ano, data jsonb, UNIQUE(cliente_id, mes, ano))"
  - "[ ] Criar tabela conexoes (id, cliente_id FK, tipo enum[crm|financeiro|instagram], provedor, token_encrypted, status, ultima_sincronizacao)"
  - "[ ] Criar tabela evidencias (id, cliente_id FK, periodo_id FK, fonte, tipo_arquivo, storage_path)"
  - "[ ] Ativar Row Level Security em todas as tabelas"
  - "[ ] Documentar env vars necessárias (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY)"
  - "[ ] Validar que o jsonb de periodos_dados aceita um documento real (jefferson.json) sem erro"
---

# *setup-schema

Cria a fundação de persistência do PULSO no Supabase — a tabela `periodos_dados` guarda o mesmo contrato que hoje vive em `data/*.json`, só que em coluna `jsonb` em vez de arquivo.

## Por que essa ordem

Sem persistência real, nenhum endpoint (OAuth callback, sync, reconciliação) tem onde escrever. Esta é a primeira task do squad — tudo depende dela.

## Decisão de segurança (não negociável)

`conexoes.token_encrypted` nunca guarda o token em texto puro. Usa `pgcrypto` (extensão nativa do Supabase) ou criptografia na camada da Vercel Function antes de gravar — a chave de criptografia (`ENCRYPTION_KEY`) vive em env var da Vercel, nunca no banco.

## Referência de schema

O jsonb de `periodos_dados.data` deve validar contra `PULSO/data/client-data-schema.json` (campos `inconsistencias` e `fontes_conectadas` inclusos, versão 3.0).

## Próxima task

Depois do schema aplicado: `@platform-architect *scaffold-api`
