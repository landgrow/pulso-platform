#!/usr/bin/env bash
# =============================================================================
# apply-migrations.sh — Aplica migrations no Supabase
# =============================================================================
# Uso:
#   ./db/apply-migrations.sh           # aplica todas (0001, 0002, 0003)
#   ./db/apply-migrations.sh --status  # mostra status das migrations
#   ./db/apply-migrations.sh 0002     # aplica apenas 0002
#
# Requer:
#   - SUPABASE_DB_URL ou DATABASE_URL configurado no .env.local
#   - Ou conexão direta ao Supabase via psql
#
# Para conectar ao Supabase via psql:
#   psql "$DATABASE_URL"
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

# Carrega variáveis de ambiente
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source <(grep -E '^[A-Z]' "$ENV_FILE" | sed 's/^/export /')
fi

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Helpers ────────────────────────────────────────────────────────────────

run_migration() {
  local file="$1"
  local name
  name=$(basename "$file" .sql)

  log_info "Aplicando: $name"

  if [[ -z "${DATABASE_URL:-}" ]]; then
    log_warn "DATABASE_URL não definido. Aplique manualmente no Supabase Dashboard."
    log_warn "  SQL: $file"
    return 0
  fi

  # Aplica o SQL
  if PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -f "$file" --quiet 2>/dev/null; then
    log_info "  ✓ $name aplicado com sucesso"
  else
    log_error "  ✗ Falha ao aplicar $name"
    log_error "  Verifique o erro acima e corrija o SQL."
    return 1
  fi
}

show_status() {
  log_info "Status das migrations:"
  echo ""
  for f in "$MIGRATIONS_DIR"/*.sql; do
    local name
    name=$(basename "$f" .sql)
    echo "  - $name"
  done
  echo ""
  log_info "Aplique via:"
  log_info "  1. Supabase Dashboard > SQL Editor > abrir $f"
  log_info "  2. Ou: psql \$DATABASE_URL -f $f"
}

# ─── Main ───────────────────────────────────────────────────────────────────

case "${1:-}" in
  --status)
    show_status
    ;;
  --help|-h)
    echo "Uso: $0 [--status] [migration_number]"
    echo "  --status     mostra migrations pendentes"
    echo "  --help      mostra esta ajuda"
    echo "  0001        aplica apenas a migration especificada"
    echo ""
    echo "Ambiente:"
    echo "  DATABASE_URL   conexão ao banco"
    echo "  PGPASSWORD     senha do banco (se não estiver na URL)"
    ;;
  0001|0002|0003)
    file="$MIGRATIONS_DIR/${1}_$(ls "$MIGRATIONS_DIR" | grep "^${1}_" | head -1)"
    if [[ -f "$file" ]]; then
      run_migration "$file"
    else
      log_error "Migration não encontrada: $file"
      exit 1
    fi
    ;;
  "")
    log_info "Aplicando todas as migrations..."

    if [[ -z "${DATABASE_URL:-}" ]]; then
      log_warn "DATABASE_URL não definido. Mostrando instruções..."
      echo ""
      for f in "$MIGRATIONS_DIR"/*.sql; do
        log_info "  $f"
      done
      echo ""
      log_info "Aplique manualmente no Supabase Dashboard > SQL Editor."
      log_info "Ou configure DATABASE_URL no .env.local."
      exit 0
    fi

    for f in "$MIGRATIONS_DIR"/*.sql; do
      run_migration "$f" || exit 1
    done

    log_info "Todas as migrations aplicadas com sucesso!"
    log_info "Execute db/test-rls.sql para validar as políticas RLS."
    ;;
  *)
    log_error "Argumento desconhecido: $1"
    echo "Use: $0 --help"
    exit 1
    ;;
esac
