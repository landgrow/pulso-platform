---
task: Build Reconciliation Engine
responsavel: "@reconciliation-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Respostas do formulário BIN (12 perguntas do MVP) de um cliente
  - Evidências reais já ingeridas (upload processado pela task build-upload-ingestion.md)
Saida: |
  - Endpoint /api/reconcile funcional
  - Campo inconsistencias populado em periodos_dados.data conforme client-data-schema.json
  - Inconsistências críticas replicadas em alertas
Checklist:
  - [x] Definir o mapa de correspondência pergunta -> métrica -> fonte (mínimo as 4 do MOTOR-INGESTAO-RECONCILIACAO.md seção 4.1)
  - [x] Implementar regra numérica com tolerância configurável por métrica (não um ±10% genérico fixo)
  - [x] Implementar regra categórica (sim/não vs. presença de evidência)
  - [x] Implementar regra semântica via Claude API (texto livre vs. conteúdo do documento)
  - [x] Classificar severidade (critica/moderada/leve) e escrever a regra de decisão
  - [x] Inconsistência crítica gera entrada automática em alertas
  - [ ] Testar com 1 cliente piloto: declarar algo propositalmente errado no formulário e confirmar que o motor pega
---

# *build-engine

Este é o núcleo diferencial do PULSO — nenhuma das ferramentas de BI genéricas pesquisadas (Power BI, Tableau, Looker, Julius AI) cruza autoavaliação contra evidência real. Ver `MOTOR-INGESTAO-RECONCILIACAO.md` seções 4 e 5 para o desenho completo.

## Regra de ouro

Antes de marcar qualquer coisa como "inconsistência", pergunta: **é contradição de verdade, ou só falta o dado pra comparar?** Falta de dado é severidade `leve` (lacuna), não `critica`. Só vira `critica` quando o declarado contradiz o real com impacto direto.

## Teste de aceite mínimo

Rodar com pelo menos 1 cliente piloto real: o gestor declara algo no formulário que é demonstravelmente diferente do documento anexado (ex.: nega inadimplência que aparece no extrato) — o motor precisa detectar isso e classificar como `critica`.

## Próxima task

Com o motor funcionando: `@reconciliation-engineer *wire-agents` (conecta a saída ao ANA/ZEUS).
