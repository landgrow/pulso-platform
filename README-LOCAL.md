# PULSO — Ambiente de Desenvolvimento Local

Guia para subir o PULSO com Supabase self-hosted em Docker.

---

## 1. Pré-requisitos

### Instalar Docker Desktop (Windows)

- Download: https://www.docker.com/products/docker-desktop/
- Requer Windows 11 com WSL2
- Durante a instalação, habilite WSL2
- Após instalar, reinicie o computador
- Abra o Docker Desktop e aguarde até o ícone ficar verde (1-2 min)

### Verificar instalação

Abra o PowerShell e execute:

```powershell
docker --version
docker compose version
```

Deve retornar as versões sem erro.

---

## 2. Subir o ambiente

No diretório do PULSO, execute:

```bash
docker compose up -d
```

Aguarde ~2-3 minutos enquanto os containers sobem. Para acompanhar:

```bash
docker compose logs -f
```

(Pressione `Ctrl+C` para sair dos logs — os containers continuam rodando.)

---

## 3. Verificar se está tudo no ar

```bash
docker compose ps
```

Você deve ver 8 containers rodando:

- pulso_postgres
- pulso_gotrue
- pulso_kong
- pulso_storage
- pulso_postgrest
- pulso_studio
- pulso_meta
- pulso_mailpit
- pulso_adminer

---

## 4. Aplicar migrations

```bash
./db/apply-migrations.sh
```

No Windows PowerShell, se der erro de permissão, use:

```powershell
bash db/apply-migrations.sh
```

Ou copie os comandos do script para o PowerShell:

```powershell
docker exec -i pulso_postgres psql -U postgres -d postgres < supabase/migrations/0001_init_schema.sql
docker exec -i pulso_postgres psql -U postgres -d postgres < supabase/migrations/0002_min_and_journey.sql
docker exec -i pulso_postgres psql -U postgres -d postgres < supabase/migrations/0003_collections_engine.sql
docker exec -i pulso_postgres psql -U postgres -d postgres < supabase/db/seed.sql
```

---

## 5. Acessar as interfaces

| Serviço             | URL                               | O que faz                                               |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| **Supabase Studio** | http://localhost:3000             | Interface web do banco (Table Editor, SQL Editor, Auth) |
| **Adminer**         | http://localhost:8081             | Gerenciador SQL leve                                    |
| **Mailpit**         | http://localhost:8025             | E-mails enviados em dev (vistos aqui)                   |
| **API REST**        | http://localhost:8000/rest/v1/    | Endpoints REST do PostgREST                             |
| **API Auth**        | http://localhost:8000/auth/v1/    | Endpoints de Auth                                       |
| **API Storage**     | http://localhost:8000/storage/v1/ | Endpoints de Storage                                    |

Para Adminer, use:

- Sistema: `PostgreSQL`
- Servidor: `postgres`
- Usuário: `postgres`
- Senha: `postgres`
- Base: `postgres`

---

## 6. Configurar o frontend (PULSO)

O frontend (HTML/JS) já está pronto. Ele busca em `/api/collection` (Vercel Function), então para dev local temos 2 opções:

### Opção A — Usar PostgREST direto (mais simples)

O frontend pode apontar para `http://localhost:8000/rest/v1/` em vez de `/api/*`.

Ajustar o `lib/supabase.js` no `api/` para apontar para o Supabase local.

### Opção B — Manter as APIs como proxy

As Vercel Functions em `api/*.js` continuam funcionando. O `lib/supabase.js` aponta para `http://localhost:5432` direto.

**Recomendado para dev local: Opção B** — manter a estrutura atual, mudar apenas a URL.

Edite `lib/supabase.js`:

```js
const url = process.env.SUPABASE_URL || "http://localhost:8000";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key-local";
```

E rode as Vercel Functions localmente:

```bash
npx vercel dev
```

---

## 7. Testar o Kanban

Após tudo rodando:

1. Abra `http://localhost:3000` no navegador
2. Navegue para `http://localhost:3000/#/kanban` (ou clique em "Plano de Ação" na sidebar)
3. Selecione um cliente no topo (JS Construtora tem tarefas de exemplo)
4. Você deve ver o board com colunas e cards

**Testes manuais:**

- Arrastar um card de "A Fazer" para "Em Andamento" (drag & drop)
- Clicar em "+ Nova Tarefa" e criar uma nova
- Clicar em um card para editar

---

## 8. Comandos úteis

```bash
# Ver logs
docker compose logs -f postgres      # só Postgres
docker compose logs -f                # todos

# Reiniciar tudo
docker compose restart

# Parar tudo (sem perder dados)
docker compose down

# Apagar tudo (INCLUINDO os dados do banco)
docker compose down -v
```

---

## 9. Quando os créditos AWS chegarem

A única coisa que muda é o endpoint do banco. O Supabase self-hosted roda localmente, mas quando você migrar para AWS:

1. Provisionar RDS PostgreSQL na AWS
2. Aplicar as mesmas migrations (em ordem)
3. Apontar `lib/supabase.js` para o endpoint do RDS
4. As APIs em `api/*.js` continuam funcionando

Nenhuma alteração de código no frontend.

---

## 10. Troubleshooting

### Porta 5432 já está em uso

Você provavelmente já tem Postgres rodando no Windows. Pare o serviço:

```powershell
# Verificar
netstat -ano | findstr :5432

# Parar Postgres do Windows (se for instalado como serviço)
Stop-Service postgresql-x64-XX
```

### Containers não sobem

```bash
docker compose down
docker system prune
docker compose up -d
```

### Migration falha

Verifique os logs:

```bash
docker compose logs postgres
```

### Kanban não carrega

Abra o DevTools do navegador (F12), aba Console. Veja o erro.
Geralmente é:

- Backend não está rodando (verifique se `npx vercel dev` está rodando)
- URL do Supabase errada em `lib/supabase.js`

---

## 11. Próximos passos

1. Testar Kanban localmente
2. Construir Table View
3. Construir Admin Panel
4. Quando AWS aprovar: migrar para RDS
