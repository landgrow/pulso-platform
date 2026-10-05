# BIN integrado ao PULSO

**Data:** 01/09/2026
**Status:** ✅ Estrutura completa — expansão total entregue (115 perguntas + 6 condicionais + 13 textareas)

---

## O que foi feito

O **Diagnóstico BIN (10 setores)** foi migrado do Fluent Forms (WordPress externo) para dentro da plataforma PULSO, eliminando a dependência de plugins externos. A migração inclui o formulário principal de Diagnóstico, o Direcionamento (lead scoring) e o BIN Start (qualificação comercial).

### Substituições

| Antes (Fluent Forms)                              | Agora (PULSO nativo)                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 10 formulários separados em `bin.landgrow.com.br` | 3 views nativas: `#/bin-start` (entrada), `#/direcionamento` (lead scoring) e `#/diagnostico` (10 setores) |
| `calc_value` em cada opção                        | Campo `calc` em cada opção                                                                                 |
| Lógica condicional no WordPress                   | JavaScript nativo no PULSO (campo `condicao` na pergunta)                                                  |
| Resultados em planilha exportada                  | localStorage + JSON exportável                                                                             |
| Licença Pro (R$ ~90/ano)                          | Zero custo, totalmente nativo                                                                              |
| 63 perguntas estáticas                            | 115 perguntas (incluindo textareas e condicionais dinâmicas)                                               |

---

## Como acessar

1. Abra o PULSO
2. Clique em **"Diagnóstico BIN"** na sidebar
3. Preencha o formulário conversacional:
   - **Etapa 0:** Identificação da empresa
   - **Etapas 1-10:** Um setor por vez (10 setores)
   - **Etapa 11:** Resultado consolidado
4. Opcional: clique em **"Exportar Respostas (JSON)"** para baixar os dados

---

## Estrutura técnica

### Arquivos criados

```
PULSO/
├── views/
│   └── diagnostico.js          # View completa do BIN
├── data/
│   └── bin-schema.json         # Schema JSON para validação
└── BIN-INTEGRADO.md            # Este documento
```

### Arquivos modificados

```
PULSO/
├── index.html                  # Adicionado link "Diagnóstico BIN" na sidebar + script
├── store.js                    # Métodos saveDiagnosticoData() e loadDiagnosticoData()
└── styles.css                  # Tokens de tema (--primary, --success, etc) + classes .progress-bar
```

---

## Como funciona o scoring

Cada pergunta tem 3-4 opções, e cada opção tem um valor `calc` (pontuação):

```js
{
    id: 'op_1',
    tipo: 'radio',
    titulo: 'Como são definidos os processos de trabalho na empresa?',
    opcoes: [
        { label: 'Tudo é definido formalmente', value: 80, calc: 20 },
        { label: 'Existe algum padrão, mas não documentado', value: 60, calc: 15 },
        { label: 'Cada um faz do seu jeito', value: 20, calc: 5 },
    ]
}
```

**Cálculo do score do setor:**

```
score_setor = (soma_dos_calc / max_possível) * 100
```

Onde `max_possível = total_perguntas * 20` (calc máximo por pergunta).

**Cálculo do score total:**

```
score_total = média_dos_10_scores
```

### Faixas de saúde

| Score  | Status    | Cor      |
| ------ | --------- | -------- |
| 80-100 | Excelente | Verde    |
| 60-79  | Bom       | Roxo     |
| 40-59  | Regular   | Amarelo  |
| 20-39  | Crítico   | Vermelho |
| 0-19   | Crítico   | Vermelho |

---

## Setores cobertos

1. ⚙️ **Operacional** — 6 perguntas (4 radio + 2 textarea)
2. 👥 **RH** — 3 perguntas
3. 💰 **Financeiro** — 16 perguntas (14 radio + 2 textarea, 2 condicionais)
4. 📣 **Marketing** — 11 perguntas
5. 📋 **Administrativo** — 13 perguntas (12 radio + 1 textarea)
6. 🎯 **Estratégico** — 20 perguntas (12 radio + 6 textarea + 2 condicionais)
7. 📈 **Vendas** — 14 perguntas (12 radio + 2 textarea)
8. 💡 **Inovação** — 9 perguntas
9. ⚖️ **Jurídico** — 9 perguntas
10. 🚀 **Liderança** — 14 perguntas

**Total: 115 perguntas** (radio scoring + textareas informacionais)

---

## Próximos passos

### Fase 1 (implementado) ✅

- [x] View de diagnóstico com 10 setores
- [x] Scoring automático
- [x] Persistência no localStorage
- [x] Exportação JSON
- [x] Tela de resultado com score total e ranking de setores

### Fase 2 (implementado) ✅

- [x] **Expandir para 115 perguntas** (vs 63 original do Fluent Forms)
- [x] **Lógica condicional** (campo `condicao: { pergunta, valor }` nas perguntas — aparece só quando a resposta da pergunta pai corresponde)
- [x] **Textareas informacionais** (campos `tipo: 'textarea'` para perguntas abertas do Horizon — sem scoring, alimentam os agentes)
- [x] **BIN Start** (view `#/bin-start` — 10 perguntas de qualificação comercial + perfilamento)
- [x] **Direcionamento** (view `#/direcionamento` — lead scoring com perfil quente/morno/frio)

### Fase 3 (a fazer)

- [ ] **Pipeline de 5 agentes** (Horizon, Compass, Radar, Route Planner) rodando dentro do PULSO
- [ ] **Integração com Claude API** para gerar os 4 entregáveis automaticamente
- [ ] **Salvamento no Supabase** (substituir localStorage por banco real)
- [ ] **Histórico de diagnósticos** (comparar evoluções entre períodos)
- [ ] **Geração de PDF** com RADAR visual

### Fase 3 (futuro)

- [ ] **Visualizações gráficas** (radar chart com os 10 setores)
- [ ] **Comparação com benchmark** do setor
- [ ] **Versão cliente vs versão consultora** (cliente vê só o resultado, consultora vê tudo)

---

## Como customizar as perguntas

Para adicionar/modificar perguntas de um setor, edite `views/diagnostico.js`:

```js
this.questions = {
  operacional: [
    {
      id: "op_1",
      tipo: "radio",
      titulo: "Sua pergunta aqui?",
      obrigatorio: true,
      opcoes: [
        { label: "Resposta A (melhor)", value: 80, calc: 20 },
        { label: "Resposta B (média)", value: 50, calc: 12 },
        { label: "Resposta C (pior)", value: 20, calc: 5 },
      ],
    },
    // ... mais perguntas
  ],
  // ... outros setores
};
```

### Adicionando lógica condicional

Para mostrar uma pergunta só se outra teve determinada resposta, edite o método `renderSetor()`:

```js
renderSetor(sectorId) {
    // Exemplo: mostrar pergunta extra se resposta anterior for "X"
    const showExtra = this.responses[sectorId]?.op_1?.value === 80;

    // ... lógica condicional aqui
}
```

---

## Backup do Fluent Forms

O backup completo dos 10 formulários originais (com todas as 63 perguntas) está em:

```
CLAUDE DOCS LAND/
└── BIN/
    ├── PERGUNTAS/
    │   └── fluentform-export-forms-1-31-08-2026*.json
    └── BACKUP-FORMULARIOS-BIN.md
```

Quando a Fase 2 for implementada, esses arquivos serão a fonte de verdade para popular `views/diagnostico.js` com o questionário completo.

---

## Diferença em relação ao Fluent Forms

| Recurso                       | Fluent Forms          | PULSO BIN                     |
| ----------------------------- | --------------------- | ----------------------------- |
| **Custo**                     | R$ ~90/ano (Pro)      | R$ 0                          |
| **Hospedagem**                | WordPress separado    | Dentro do PULSO               |
| **Manutenção**                | Atualizar plugin + WP | Nenhuma                       |
| **Condicionais**              | Sim (Pro)             | Sim (JS nativo)               |
| **Scoring**                   | Sim (Pro)             | Sim (cálculo JS)              |
| **Visual**                    | Conversacional bonito | Conversacional nativo         |
| **Integração com agentes**    | Não                   | Sim (pipeline PULSO)          |
| **Histórico de diagnósticos** | Não                   | Sim (localStorage + Supabase) |
| **Comparação entre clientes** | Não                   | Sim (mesmo schema)            |

---

**Mantido por:** Equipe Land Grow
**Última atualização:** 01/09/2026
