# pulso-platform

Squad de construção do PULSO — ingestão multi-fonte, motor de reconciliação e backend Vercel+Supabase.

Substitui o squad antigo `pulso-build` (apagado em 11/07/2026 por gerar dashboard estático via template mustache, sem backend — arquitetura abandonada).

## Documentos de referência (fora do squad, na raiz de PULSO/)

- `PRD-PLATAFORMA-BI-LAND-GROW.md` — visão de produto, ICP, roadmap, modelo de negócio
- `ARQUITETURA-SISTEMA.md` — shell SPA (frontend), ainda válido
- `MOTOR-INGESTAO-RECONCILIACAO.md` — desenho técnico completo das Camadas 1-3 (Fase A)
- `ROTEIRO-SISTEMATIZACAO-LAND-GROW.md` — por que o MIN e a jornada de contrato (Fases B e C) vivem neste mesmo squad, não em produto separado
- `AVALIACAO-ESPECIALISTA-BI.md` e `DEBATE-PAINEL-ESTRATEGICO.md` — crítica externa que embasou a ordem de construção (não construir os 3 conectores antes de provar o núcleo)

## Instalação

```
./squads/pulso-platform/
```

## Agentes

| Agente                             | Dono de                                                             | Comandos                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **platform-architect** (Atlas)     | Schema Supabase + Vercel Functions                                  | `*setup-schema`, `*scaffold-api`, `*setup-min-and-journey-schema`, `*bridge-frontend-to-backend`     |
| **ingestion-engineer** (Rio)       | Camada 1 — upload + conectores                                      | `*build-upload`, `*build-connector-instagram`, `*build-connector-crm`, `*build-connector-financeiro` |
| **reconciliation-engineer** (Vera) | Camada 3 — motor de reconciliação + sinal de qualificação pro Fundo | `*build-engine`, `*wire-agents`, `*build-qualificacao-fundo-signal`                                  |
| **min-facilitator** (Bruma)        | MIN — os 13 blocos em 3 fases                                       | `*run-fundacao`, `*run-operacao`, `*run-consolidacao`                                                |

## Ordem de build

Ver `workflows/build-sequencial.yaml`. Resumo:

- **Fase A** (passos 1-5 + 14): schema → API scaffold → upload → motor de reconciliação → integração com ANA/ZEUS → ponte frontend-backend (sem isso, o painel nunca mostra dado real, só estático). Bloqueada até existir um projeto Supabase real.
- **Fase B** (passos 9-12): schema do MIN + jornada de contrato → as 3 fases do MIN (Fundação, Operação, Consolidação). A Fase 3 do MIN é o mesmo conteúdo da Fase 2 do contrato de Aceleração (governança).
- **Fase C** (passo 13): sinal de qualificação pro Fundo — cruza contrato + governança do MIN + reconciliação. Não decide, só informa a proposta pontual de fee reduzido + equity.
- **Fase D** (passos 6-8): conectores externos (Instagram → CRM → Financeiro), propositalmente por último — só depois do núcleo provado e do preço recalculado.

Ver `milestone_mvp_provado` (Fase A) e `milestone_jornada_completa` (Fases B+C) no workflow para os marcos de entrega.

## Configuração

Este squad estende a configuração core do AIOX.

## Validar

```
@squad-creator *validate-squad pulso-platform
```

## License

UNLICENSED
