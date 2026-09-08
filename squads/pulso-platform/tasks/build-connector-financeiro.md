---
task: Build Open Finance Connector
responsavel: "@ingestion-engineer"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - Conta ativa em Pluggy ou Belvo (decidir qual agregador — orçamento pendente #6 do PRD, seção 14)
  - Consentimento LGPD/Open Finance do cliente piloto
Saida: |
  - Fluxo de consentimento funcional (cliente autoriza, token fica com o agregador)
  - /api/ingest/financeiro/sync popula kpis.faturamento, margem, inadimplencia, capital_giro
  - Custo por CPF/CNPJ consultado documentado e refletido na precificação
Checklist:
  - "[ ] Decidir Pluggy vs. Belvo (comparar custo por consulta e cobertura de bancos)"
  - "[ ] Implementar fluxo de consentimento do cliente (tela + termos LGPD)"
  - "[ ] Implementar sync de extrato/DRE via API do agregador"
  - "[ ] Normalizar pros kpis financeiros do schema"
  - "[ ] Documentar contrato de processamento de dados (DPA) exigido pelo PRD seção 13 (risco LGPD)"
  - "[ ] Atualizar precificação da Inteligência Mensal com o custo real por cliente"
---

# *build-connector-financeiro

O mais sensível dos três conectores — dado bancário é a categoria de dado mais regulada que o PULSO vai tocar.

## Não pula a parte de LGPD

O PRD já listava isso como risco (seção 13): "LGPD — dados sensíveis financeiros... Contrato de processamento de dados desde o início. Não armazenar dados bancários brutos." Esta task não está completa sem o DPA documentado, mesmo que o código funcione.

## Constrói por último dos três conectores

Não porque é menos importante — é o que tem mais superfície de risco regulatório e custo direto por consulta. Faz sentido validar o conceito (upload + reconciliação + Instagram/CRM) com os clientes piloto antes de assumir esse custo e essa responsabilidade.
