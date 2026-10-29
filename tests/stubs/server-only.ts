// Nos testes (Node puro) o pacote "server-only" lançaria erro ao ser
// importado; aqui ele vira um módulo vazio. O build do Next continua
// barrando a importação desses módulos em telas.
export {};
