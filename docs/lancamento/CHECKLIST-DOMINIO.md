# Checklist para colocar o domínio no ar

Ordem importa: faça de cima para baixo. Marque conforme conclui.
`SEU-DOMINIO` = o endereço final (ex.: `app.landgrow.com.br`).

## 0. Antes de tudo — bloqueadores

- [ ] **Supabase → Authentication → Sign In / Providers → desligar "Allow new users to sign up".**
      Hoje o cadastro está aberto: qualquer pessoa cria conta chamando a API ou entrando com Google.
      Convites feitos pela equipe continuam funcionando.
- [ ] Rodar `docs/lancamento/verificacao-banco.sql` (só leitura) e conferir os blocos 1, 2, 3 e 6.
- [x] CNPJ real preenchido nas páginas de Privacidade e Termos. E-mail de contato único: `contato@landgrow.com.br` (confirmar que recebe).
- [ ] `git push origin main` (publica todos os commits desta revisão).

> **Atenção com migrações:** o banco de produção já tem as migrações 0001–0033 aplicadas. Não rode 0001–0003 de novo
> (a 0003 sobrescreve `log_audit` com a versão antiga). A única segura para repetir é a `0034_seguranca_e_auditoria.sql` (idempotente).

## 1. Vercel

- [ ] Projeto → Settings → Domains → adicionar `SEU-DOMINIO` e criar o DNS que a Vercel mostrar.
- [ ] Environment Variables (Production). Depois de mexer, **fazer novo deploy** (as `NEXT_PUBLIC_*` entram no build):

| Variável                                                     | Valor                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                                        | `https://SEU-DOMINIO` (sem barra no fim)                           |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | já existem                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | já existe                                                          |
| `CRON_SECRET`                                                | segredo longo, sem espaços (gere no seu computador)                |
| `RESEND_API_KEY`                                             | chave do Resend (e-mails de aviso)                                 |
| `NOTIFY_FROM_EMAIL`                                          | remetente do domínio verificado, ex.: `PULSO <avisos@SEU-DOMINIO>` |
| `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET`      | só se for usar a pasta do Drive                                    |
| `ANTHROPIC_API_KEY`                                          | só quando a Central IA entrar                                      |

- [ ] **Nunca** colocar `DEV_AUTO_LOGIN_EMAIL` / `DEV_AUTO_LOGIN_PASSWORD` na Vercel (são só do seu computador).

## 2. Supabase

- [ ] Authentication → URL Configuration: **Site URL** = `https://SEU-DOMINIO`.
- [ ] Redirect URLs: adicionar `https://SEU-DOMINIO/**` (pode manter a antiga até validar).
- [ ] Authentication → Emails: os modelos usam o endereço do Site URL; mande um convite de teste e abra o link em outro navegador.
- [ ] Authentication → SMTP: configurar o Resend como SMTP próprio (o envio padrão do Supabase é limitado a poucos e-mails por hora).
- [ ] Storage → Settings: **Global file size limit = 200 MB** (o PULSO aceita 200 MB; o plano gratuito trava em 50 MB).
- [ ] Project Settings → Database → Backups: confirmar plano com backup diário (ideal: PITR).
- [ ] Opcional: rodar a migração `db/migrations/0024_staff_due_feed.sql` (feed de prazos da equipe; o app já funciona sem ela).

## 3. Google Cloud (login com Google e Drive)

- [ ] OAuth → URIs de redirecionamento autorizados: `https://SEU-DOMINIO/api/integrations/google/callback` e o callback do Supabase (`https://<projeto>.supabase.co/auth/v1/callback`).
- [ ] Origens JavaScript autorizadas: `https://SEU-DOMINIO`.
- [ ] Trocar o `GOOGLE_DRIVE_CLIENT_SECRET` (a linha antiga foi exposta no chat) e atualizar na Vercel.

## 4. Resend (e-mails)

- [ ] Domains → adicionar `SEU-DOMINIO` e criar os registros DNS (SPF, DKIM, DMARC).
- [ ] Esperar "Verified" antes de ligar `NOTIFY_FROM_EMAIL`.

## 5. Teste de fumaça depois do deploy (5 minutos)

1. Abrir `https://SEU-DOMINIO` → vai para o login; HTTPS com cadeado.
2. Entrar como admin → Painel carrega, menu completo.
3. Entrar como cliente → vê só a própria empresa; `/admin/...` não abre.
4. Atividades: criar tarefa com "+ Nova tarefa", escolher responsável, anexar arquivo, excluir.
5. Documentos: criar pasta, subir arquivo grande (> 50 MB), baixar, renomear, excluir.
6. "Esqueci a senha": o e-mail chega e o link funciona em outro navegador.
7. Botão Voltar do navegador entre Atividades → Documentos → Voltar.
8. Tema claro: números verdes legíveis.
9. Vercel → Crons: rodar `/api/cron/notifications` manualmente e ver resposta 200.
