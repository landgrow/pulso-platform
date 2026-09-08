---
task: Bridge Frontend to Backend
responsavel: "@platform-architect"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Endpoints Vercel scaffolded (task scaffold-vercel-api.md concluída)
  - Frontend SPA existente lendo data/*.json estático (index.html/app.js/store.js/views)
Saida: |
  - Novo endpoint /api/client-data?cliente={id}&periodo={mes-ano} — lê periodos_dados no Supabase (service role), devolve o mesmo formato de client-data-schema.json
  - store.js trocado: carrega dado via fetch no endpoint novo, não mais via import de arquivo local
Checklist:
  - "[ ] Implementar /api/client-data — recebe cliente_id + periodo, consulta periodos_dados.data, retorna JSON no formato do schema (sem transformação — o contrato já é o mesmo)"
  - "[ ] Trocar em store.js a leitura de data/*.json por fetch('/api/client-data?...')"
  - "[ ] NÃO expor Supabase direto do navegador (sem policy de RLS de authenticated ainda) — o navegador só fala com a Vercel Function, que fala com Supabase usando a service role key no servidor"
  - "[ ] Confirmar que views/painel.js, coleta.js, chat.js, checkin.js continuam funcionando sem mudança (o contrato de dados não muda, só a origem)"
  - "[ ] Testar com 1 cliente piloto real: dado alterado no Supabase aparece no painel sem precisar editar arquivo local"
---

# *bridge-frontend-to-backend

Gap identificado por revisão de arquitetura (11/07/2026): o shell SPA existe e funciona, mas hoje é decorativo — lê `data/*.json` estático, nunca fala com o Supabase. Sem esta task, todo o resto (reconciliação, MIN, sinal de qualificação) roda no banco mas nunca aparece pro usuário de verdade.

## Por que a chave de serviço nunca vai pro navegador

O Supabase tem RLS ativado sem nenhuma policy de `anon`/`authenticated` ainda (decisão deliberada — ver `setup-supabase-schema.md`). Isso significa: se o front-end tentasse falar direto com o Supabase usando a chave pública, não veria nada (RLS bloqueia por padrão) — e se alguém "resolvesse" isso usando a service role key no navegador, exporia acesso total ao banco pra qualquer visitante. A Vercel Function é a fronteira de confiança: ela usa a service role no servidor, o navegador só fala com ela.

## Por que isso é parte da Fase A, não uma fase nova

Sem esta ponte, a Fase A nunca está "provada" de verdade — só prova que o banco funciona, não que o cliente piloto vê o resultado. Faz parte do `milestone_mvp_provado`.

## Próxima task

Depois de aplicado: validar a Fase A inteira de ponta a ponta com 1 cliente piloto (upload real → reconciliação → painel mostrando dado do Supabase, não mais arquivo local).
