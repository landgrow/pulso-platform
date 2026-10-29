# PULSO — Melhorias identificadas (29/10/2026)

> **Status 29/10:** feitos 1, 3, 4, 5, 8, 9 e 10. O 2 (dados de teste) fica com a Nayara, pela tela. Pendentes: 6 (medição de uso) e 7 (BIN mais leve).
> Correção: o item de movimento reduzido saiu da lista, porque já existe uma regra global em `globals.css`.

Revisão em produção (pulso.landgrow.com.br, conta admin, telas: Painel, Atividades, Documentos, Reuniões, BIN, Dashboard HQ) + leitura do código.
Lentes: design-critique (Nielsen H1–H10, leis de UX), acessibilidade (WCAG 2.2 AA), UX writing, desempenho, medição de produto.

Severidade: 3 = atrapalha de verdade · 2 = menor · 1 = cosmético. Esforço: P (horas) · M (1 dia) · G (mais).

---

## Fazer antes de abrir para clientes

| #   | O que                                                                                                                                                                                                                                                                                                                                                                          | Princípio                                   | Sev. | Esf. |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---- | ---- |
| 1   | **Todas as abas têm o mesmo título** ("PULSO — Plataforma de Inteligência de Negócios"). 54 de 57 páginas não definem título. Com duas abas abertas, ou segurando o botão Voltar, não dá para saber qual tela é qual. **Fazer:** modelo `"%s · PULSO"` no layout e título por página ("Atividades · Land Grow · PULSO").                                                       | H1 visibilidade, H6 reconhecer              | 3    | P    |
| 2   | **Dados de teste no espaço `land-grow-3`**: tarefas "tcstc", "asd", "up", "down", "left", "right", "faturar dois milhões"; pastas "fianceiro" e "teste"; reunião "teste". Se esse espaço for usado para demonstração, apagar pela própria tela.                                                                                                                                | Credibilidade (efeito estética-usabilidade) | 3    | P    |
| 3   | **Jargão na tela do cliente.** "Business Insights Navigator", "Modelo Integrado de Negócios", "recorte" (26 ocorrências), "Competência no recorte aberto, não caixa de banco". A regra da Land Grow é falar a língua do gestor. **Fazer:** manter BIN/MIN como nome, com uma legenda do que é: "Diagnóstico da empresa" e "Modelo de negócio". Trocar "recorte" por "período". | H2 mundo real                               | 3    | P    |
| 4   | **Menu e título não batem.** O menu diz "Atividades", a tela diz "Plano de Ação" e o Painel diz "Abrir Atividades". A tela de Atividades também não tem título principal (h1). **Fazer:** escolher um nome só e usar nos três lugares.                                                                                                                                         | H4 consistência                             | 2    | P    |
| 5   | **Texto secundário com contraste baixo.** O token `--text-3` (#6B7699) fica entre 3,95:1 e 4,27:1 sobre o fundo escuro em 11 a 14px, abaixo do mínimo de 4,5:1. Afeta legendas dos indicadores, "Empresa" no menu, abas inativas (Quadro/Tabela) e "vs set". **Fazer:** clarear o token só no tema escuro (ex.: #7D88AB) e conferir no claro. É uma linha em `globals.css`.    | WCAG 1.4.3                                  | 2    | P    |

## Logo depois

| #   | O que                                                                                                                                                                                                                                                                                                                                                                                           | Princípio             | Sev. | Esf. |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---- | ---- |
| 6   | **Nenhuma medição de uso.** Hoje não dá para saber se o cliente entra, se começa o BIN, em que setor desiste ou se usa Documentos. **Fazer:** ligar o Vercel Web Analytics (páginas) e registrar 6 eventos de produto sem dado pessoal: login, bin_setor_enviado, bin_diagnostico_enviado, documento_enviado, tarefa_criada, reuniao_criada. Ver o mais usado e o abandonado por cliente no HQ. | Decidir com evidência | 2    | M    |
| 7   | **A página do BIN pesa 791 KB de HTML** porque carrega os 3 questionários (serviços, varejo, indústria). **Fazer:** mandar só o pacote do segmento do cliente e buscar outro só se ele trocar de segmento. Deve cair para cerca de 1/3, o que faz diferença no 4G.                                                                                                                              | Doherty (<400ms)      | 2    | M    |
| 8   | **Textos do Dashboard HQ:** "1 eventos na fila" (falta o singular); "receita ativa em BRL" (o R$ já diz); o quadro "Casa — 2 · 11 mapas · equipe" não se explica. **Fazer:** singular/plural, tirar "em BRL" e renomear "Casa" para o que ele conta.                                                                                                                                            | H2, UX writing        | 1    | P    |
| 9   | **Sem atalho "Pular para o conteúdo".** Quem navega pelo teclado passa por cerca de 15 itens do menu em toda tela. **Fazer:** um link escondido que aparece no foco, apontando para `<main>`.                                                                                                                                                                                                   | WCAG 2.4.1            | 2    | P    |
| 10  | **Botão "Recolher menu" com alvo menor que 24px.**                                                                                                                                                                                                                                                                                                                                              | WCAG 2.5.8, Fitts     | 1    | P    |

## Já conhecido (infra e segurança, sem mudança de tela)

- **Vercel Pro**: necessário para uso comercial e para o cron de 15 em 15 minutos do lembrete de reunião (hoje roda 1x por dia). Ao assinar, trocar `vercel.json` para `*/15 * * * *`.
- **Supabase Pro**: backup diário e o limite de 200 MB por arquivo em Documentos.
- **Limite de tentativas em memória** (login e chat): vale por instância. Com tráfego maior, mover para o banco ou para o Upstash.
- **zod 3 → 4**: há um alerta _high_ do `npm audit` que só sai com a troca de versão principal. Precisa de uma tarde de ajustes nos schemas.
- **Conferir no Vercel** se `NOTIFY_FROM_EMAIL` está ativa (Configurações → Operação deve mostrar "pronto").
- **Trocar o segredo do Google Drive** (ou apagar a integração, se não for usar).
- **Testar com uma conta de cliente de verdade** (convite → senha → BIN → Documentos), no celular. O menu móvel existe, mas não deu para testar nesta rodada.

## O que está bom (manter)

- Hierarquia clara no Painel do cliente: o BIN e o MIN aparecem primeiro, com progresso, e as tarefas atrasadas ficam em vermelho com a data.
- Documentos funciona como um drive de verdade, com pastas, busca e envio, e a ação principal ("Enviar arquivos") está destacada.
- Ações destrutivas usam diálogo próprio (`confirm-dialog`), não o `confirm()` do navegador.
- Nenhum botão sem nome acessível nem campo sem rótulo nas telas testadas, e `lang="pt-BR"` está correto.
- O método do BIN não chega ao navegador (verificado em produção).
