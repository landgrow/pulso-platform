# Tech Stack - pulso-platform

## Runtime

- Node.js >= 18.x
- AIOX >= 2.1.0

## Backend

- **Vercel Functions** — endpoints serverless (OAuth callback, sync de fontes, reconciliação, upload)
- **Supabase** — Postgres (jsonb compatível com `client-data-schema.json`), Storage (arquivos enviados), Auth (antecipa portal do cliente)

## Integrações externas

- **Claude API** — análise, geração de texto, transcrição de áudio, reconciliação semântica
- **Meta Graph API** — Instagram Business Insights
- **Pluggy ou Belvo** — Open Finance (a decidir — ver task build-connector-financeiro.md)
- **CRM** — 2 integrações nativas a definir (Pipedrive/RD Station CRM/HubSpot/Ploomes/Agendor são candidatos) + fallback CSV

## Frontend (mantido, fora deste squad)

- HTML/CSS/JavaScript — shell SPA existente (`index.html`, `app.js`, `store.js`, `views/*.js`)

## Development Tools

- ESLint para qualidade de código
- Jest para testes
