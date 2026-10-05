# Teste manual antes de abrir para clientes

Endereço: `https://pulso.landgrow.com.br`. Marque cada item. Se algo falhar, anote a tela, o que clicou e a mensagem.
Itens marcados **[TESTE]** criam dados: use o nome "TESTE-VARREDURA" e apague no fim.

## A. Entrada e segurança (aba anônima, sem login)

- [ ] `/login` abre com cadeado, sem botão do Google.
- [ ] `/dashboard` sem login → volta para o login.
- [ ] "Esqueceu a senha?" → e-mail chega com link `pulso.landgrow.com.br` → abre a tela de nova senha.
- [ ] Senha errada → mensagem "Email ou senha incorretos".

## B. Como admin (Land Grow)

- [ ] **Dashboard / Painel:** números carregam, sem erro; tarefas atrasadas aparecem; clicar numa tarefa abre o detalhe.
- [ ] **Menu:** recolher o menu mostra os mesmos nomes; expandir volta. Botão **Sair** funciona (e entrar de novo).
- [ ] **Atividades:** trocar de lista; aba Quadro / Tabela / Painel; botão Voltar do navegador devolve a tela anterior.
  - [ ] **[TESTE]** "+ Nova tarefa" abre a tarefa para nomear. Escolher responsável (aparece admin e equipe), prazo, setor.
  - [ ] **[TESTE]** anexar um arquivo, abrir/baixar, remover.
  - [ ] **[TESTE]** na Tabela: marcar 2 tarefas → mover para outra coluna → excluir.
  - [ ] Excluir uma tarefa pelo botão do detalhe (pede confirmação).
- [ ] **Objetivos:** abre sem título duplicado; **[TESTE]** criar objetivo, key result e ação.
- [ ] **Reuniões:** **[TESTE]** criar reunião; gerar tarefas a partir do checklist.
- [ ] **Mapa Mental:** abre, **[TESTE]** criar mapa e coluna; trocar de página e voltar reabre o mesmo mapa.
- [ ] **Financeiro:** carrega; **[TESTE]** lançar uma entrada e apagar.
- [ ] **CRM:** kanbans carregam; criar card de teste.
- [ ] **Organizações:** lista de clientes; abrir um cliente → abas (Visão geral, Usuários, Contratos, BIN, MIN, Documentos, Atividades…).
- [ ] **Equipe:** lista a equipe; (não convide ninguém real).
- [ ] **BIN / MIN:** abrem; o BIN do cliente mostra o setor **Inovação**.
- [ ] **Configurações:** Conta, Aparência (Claro/Sistema), Notificações, Dados, Integrações abrem; botão Sair visível.
- [ ] **Tema claro:** números verdes legíveis no Dashboard e no Painel.

## C. Documentos (drive)

- [ ] Criar pasta com acento (ex.: "Financeiro março").
- [ ] Arrastar um arquivo para a tela; enviar vários; subir um **maior que 50 MB** (só funciona com Supabase Pro).
- [ ] Baixar, renomear (mantém a extensão), excluir arquivo e excluir pasta.
- [ ] Voltar do navegador sobe de pasta.

## D. Como cliente (outra janela anônima, conta de cliente)

- [ ] Vê só a própria empresa; menu: Painel, Atividades, Objetivos, Reuniões, Projeto, BIN, MIN, Métricas, Documentos, Central IA, Ajustes.
- [ ] `/admin/...` e `/clientes/<outra-empresa>` não abrem.
- [ ] Atividades: criar tarefa; responsável lista a equipe Land Grow e os usuários da própria empresa.
- [ ] Documentos: sobe e baixa arquivo; o admin vê o mesmo arquivo na ficha do cliente.
- [ ] BIN: responder uma pergunta salva; o admin vê a resposta.

## E. Limpeza

- [ ] Apagar tudo que se chama "TESTE-VARREDURA" (tarefas, objetivos, reuniões, mapas, pastas, lançamentos).
