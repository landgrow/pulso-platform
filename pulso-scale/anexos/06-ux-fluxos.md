# Anexo 06 — UX, jornadas e estados

Sem Figma neste pacote. Contratos de tela para quando a onda existir. Portal: linguagem do gestor. HQ pode ver IDs técnicos no hub.

## J1 — Fundador pergunta (onda 0)

1. Entra em Central IA (portal ou HQ com org selecionada).  
2. Placeholder: “O que está travado nesta semana?” — sem aula `@pulso`.  
3. Enquanto busca: “Buscando nas fontes desta empresa…”.  
4. Resposta curta + lista de fontes (BIN setor, card, reunião). Clique abre a origem.  
5. Vazio: “Isso não está no PULSO ainda.” + o que falta (ex.: “nenhum card com prazo”).  
6. Erro de modelo: “A IA não respondeu. Tente de novo.” Sem trecho inventado.

## J2 — Direção vs gestão no comercial (onda 3)

- **Direção:** 3 números (conversão, silêncio CS, tese da semana) + signals. Sem grade.  
- **Gestão:** funil, tabela de vazamento, temas, link para deal.  
- **Ops:** “Seus 5 próximos” — deal + próxima ação. Sem tese de conselho.

## J3 — Ligar CRM (onda 2)

1. Ajustes → Integrações → “Receber dados”.  
2. Cria conexão, mostra chave **uma vez**, HMAC, URL de ingest, exemplo curl.  
3. Envia evento de teste. Hub mostra `received` → `mapped` ou `failed` com JSON do erro.  
4. Se módulo comercial já tinha kanban nativo: confirm “passar a espelho? cards nativos deixam de ser a fonte”. Default: não migrar sozinho — Nayara/ops confirma.

## J4 — PWA (onda 4)

Instalar pelo browser. Home = fila da altitude. Chat compacto. Sem BIN longo. Offline: última fila cacheada, banner “sem rede”.

## Nav alvo (diferença)

| Hoje | Scale |
| --- | --- |
| Lista fixa HQ vs cliente | Itens somem se módulo off |
| Capability esconde tela HQ | Capability **e** altitude **e** módulo |
| Central IA genérica | Badge “fontes: N” depois da resposta |
| Integrações = avisos | Duas seções: Sair / Entrar |

Não recolocar Recursos/Grafo. Não Financeiro no cliente.

## Estados

| Estado | UI |
| --- | --- |
| Loading retrieve | texto “buscando nas fontes”, não skeleton de lorem |
| Índice vazio | CTA: preencher BIN / ligar webhook |
| pending_index | “Dado chegou, ainda não entra no chat” |
| failed ingest | motivo + reprocessar |
| 401 HMAC | “Assinatura inválida” no hub, não genérico |
| 429 | “Aguarde N s” |
| Teto 80% | banner HQ |
| Teto 100% | áudio pausado; chat texto segue |
| Encerrado | tudo read-only |
| Sem citação (bug) | não publicar parágrafo; fallback recusa |

## Acessibilidade

- Fontes do chat são links, não só cor.  
- Hub de eventos: tabela com caption, foco no Reprocessar.  
- PWA: área de toque ≥ 44px na fila.  
- Não autoplay de áudio de transcrição.

## Copy (portal)

Proibido: RADAR, COMPASS, handoff, “onda 0”, “canonical entity”.  
Permitido: diagnóstico, plano, funil, reunião, documento, “o PULSO leu”.
