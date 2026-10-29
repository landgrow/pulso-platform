# Anexo 05 — Matriz de permissões (altitude × módulo × papel)

Dois eixos. Capability HQ (tela) ≠ altitude (dado). Os dois precisam passar.

## A. Papel × org (já existe)

| | Org própria | Outra org cliente | Org interna HQ | Plataforma |
| --- | --- | --- | --- | --- |
| client_* | sim | não | não | não |
| consultant | se assigned | se assigned | se capability | não admin global |
| platform_admin | sim | sim | sim | sim |

`client_viewer`: read. Encerrado: read.

## B. Altitude × tipo de dado

| Dado | operacional | gestao | direcao | drill_ops |
| --- | --- | --- | --- | --- |
| Fila de cards / deals da pessoa | R/W próprios* | R stats + R lista | — | R lista |
| Funil agregado, tempo de etapa | — | R | R síntese | R |
| Signal comercial | ação (ops) | tese + fontes | só tese | tese+fontes |
| BIN respostas por pergunta | se módulo e papel | R | R portões/síntese | R completo |
| MIN blocos | conforme módulo | R | R síntese | R |
| Documento / evidência | R se módulo | R | R metadado; corpo se drill | R |
| Reunião resumo | R da vez | R | R | R |
| Transcrição completa | — | R | — | R |
| E-mail corpo | — | R | — | R |
| E-mail metadado (assunto, data) | R deal ligado | R | R | R |
| Sala HQ | só staff | só staff | só staff | só staff |
| Financeiro HQ | capability financeiro | — cliente | — cliente | HQ |
| Audit log | — | — | — | admin |

\* W limitado a `canWrite` (não viewer) e modo `nativo`. Espelho: W no CRM externo, não no PULSO.

## C. Chat retrieve

O retrieve pede chunks com `altitude_min` ≤ altitude do usuário **e** módulo ligado **e** `can_access_org`.

| Surface | Pode Sala | Pode carteira | Pode caixa Land Grow |
| --- | --- | --- | --- |
| admin | sim se capability sala | orgs atribuídas | não no prompt de cliente |
| client | nunca | nunca | nunca |

## D. Capability HQ × módulo Scale

Capabilities atuais continuam controlando **entrada na tela HQ**. Scale acrescenta: mesmo com `crm` capability, se a org cliente está em `espelho`, a HQ edita via ingest, não duplica kanban do cliente.

BIN capability ≠ altitude direção. Consultor com BIN vê o instrumento; o **fundador** só vê síntese se for `direcao`.

## E. Testes obrigatórios (IDOR)

1. Dois orgs, mesmo usuário membro de A: 0 chunks de B.  
2. `direcao` sem drill: 0 rows `board_cards` via API.  
3. `surface=client` + pergunta “o que falaram na Sala”: recusa, sem chunk.  
4. Chave de org A em path org B: 403 `org_mismatch`.  
5. Viewer POST ingest: 403 (só connection key de sistema).  
6. Encerrado: ingest 403 `org_closed`.

## F. Defaults até Q3/Q4

| Papel | Altitude default proposta | Nota |
| --- | --- | --- |
| client_owner | `gestao` | Q4 pode mudar para `direcao` |
| client_member | `operacional` | |
| client_viewer | `operacional` + read | |
| consultant na org | `gestao` | drill_ops manual |
| platform_admin | `gestao` + drill disponível | audit |
