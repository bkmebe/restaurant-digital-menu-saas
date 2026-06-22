#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
readonly APP_NAME="restaurant-digital-menu"
readonly VERCEL_PROJECT="${VERCEL_PROJECT:-$APP_NAME}"
readonly SUPABASE_DB="${SUPABASE_DB:-$APP_NAME}"
readonly ROLLBACK_LOG="/var/log/${APP_NAME}/rollback.log"
readonly SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
readonly DATABASE_BACKUP_DIR="${DATABASE_BACKUP_DIR:-./backups}"

# ─── Color helpers ───────────────────────────────────────────────────────────
red()     { printf "\033[31m%s\033[0m\n" "$*"; }
green()   { printf "\033[32m%s\033[0m\n" "$*"; }
yellow()  { printf "\033[33m%s\033[0m\n" "$*"; }
blue()    { printf "\033[34m%s\033[0m\n" "$*"; }

# ─── Logging ──────────────────────────────────────────────────────────────────
log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$ROLLBACK_LOG"
}
log_info()  { log "INFO: $*"; blue "  ℹ️  $*"; }
log_ok()    { log "OK: $*"; green "  ✅ $*"; }
log_err()   { log "ERROR: $*"; red "  ❌ $*"; }
log_warn()  { log "WARN: $*"; yellow "  ⚠️  $*"; }

# ─── Alert ────────────────────────────────────────────────────────────────────
send_alert() {
  local subject="$1"
  local message="$2"

  log_info "Sending alert: $subject"

  # Slack webhook
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    local payload
    payload=$(cat <<EOF
{
  "text": "*[$APP_NAME] $subject*\\n$message"
}
EOF
)
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$payload" \
      "$SLACK_WEBHOOK" 2>/dev/null || log_warn "Failed to send Slack alert"
  fi

  log_ok "Alert sent"
}

# ─── Verify prerequisites ────────────────────────────────────────────────────
check_prerequisites() {
  log_info "Checking prerequisites..."

  command -v vercel &>/dev/null || { log_err "Vercel CLI not found"; exit 1; }
  command -v supabase &>/dev/null || log_warn "Supabase CLI not found — DB rollback will be skipped"
  command -v curl &>/dev/null || { log_err "curl not found"; exit 1; }

  [[ -n "${VERCEL_TOKEN:-}" ]] || { log_err "VERCEL_TOKEN is not set"; exit 1; }
  [[ -n "${VERCEL_PROJECT:-}" ]] || { log_err "VERCEL_PROJECT is not set"; exit 1; }

  log_ok "Prerequisites satisfied"
}

# ─── Rollback Vercel deployment ──────────────────────────────────────────────
rollback_vercel() {
  local target="${1:-production}"
  log_info "Rolling back Vercel deployment for $target..."

  local deploy_list
  deploy_list=$(vercel list --token "$VERCEL_TOKEN" "$VERCEL_PROJECT" 2>/dev/null || true)

  # Get the previous successful deployment ID (skip the current one)
  local previous_deploy
  previous_deploy=$(echo "$deploy_list" | grep -v "$(vercel inspect --token "$VERCEL_TOKEN" "$VERCEL_PROJECT" 2>/dev/null | head -1 | awk '{print $1}')" | grep -E '^[[:space:]]*[a-zA-Z0-9_]+\b' | head -1 | awk '{print $1}' || true)

  if [[ -z "$previous_deploy" ]]; then
    log_err "Could not find a previous deployment to roll back to"
    return 1
  fi

  log_info "Redeploying previous version: $previous_deploy"

  if vercel deploy --token "$VERCEL_TOKEN" --prod "${previous_deploy}" 2>/dev/null; then
    log_ok "Vercel rollback to $previous_deploy completed"
  else
    log_err "Vercel rollback failed"
    return 1
  fi
}

# ─── Rollback Supabase migration ─────────────────────────────────────────────
rollback_supabase() {
  log_info "Rolling back Supabase migration..."

  if ! command -v supabase &>/dev/null; then
    log_warn "Supabase CLI not available — attempting DB restore from backup"
    restore_from_backup
    return $?
  fi

  local last_migration
  last_migration=$(supabase migration list 2>/dev/null | grep '\[.\]' | tail -1 | awk '{print $2}' || true)

  if [[ -z "$last_migration" ]]; then
    log_warn "No migration found to roll back — attempting backup restore instead"
    restore_from_backup
    return $?
  fi

  log_info "Rolling down migration: $last_migration"

  if supabase migration down --db-url "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is not set}" 2>/dev/null; then
    log_ok "Supabase migration $last_migration rolled back"
  else
    log_err "Supabase migration rollback failed"
    restore_from_backup
    return $?
  fi
}

# ─── Restore from backup ─────────────────────────────────────────────────────
restore_from_backup() {
  local latest_backup
  latest_backup=$(ls -t "$DATABASE_BACKUP_DIR"/"$APP_NAME"-*.sql 2>/dev/null | head -1 || true)

  if [[ -z "$latest_backup" ]]; then
    log_err "No database backup found in $DATABASE_BACKUP_DIR"
    return 1
  fi

  log_info "Restoring database from backup: $latest_backup"

  if psql "$SUPABASE_DATABASE_URL" -f "$latest_backup" 2>/dev/null; then
    log_ok "Database restored from $latest_backup"
  else
    log_err "Database restore failed"
    return 1
  fi
}

# ─── Verify stability after rollback ──────────────────────────────────────────
verify_stability() {
  local base_url="${1:-${VERCEL_URL:-https://restaurant-digital-menu.vercel.app}}"
  log_info "Verifying system stability after rollback..."

  local checks=0
  local passed=0

  # Health check
  checks=$((checks + 1))
  if curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${base_url}/api/health" 2>/dev/null | grep -q 200; then
    log_ok "Health endpoint returned 200"
    passed=$((passed + 1))
  else
    log_err "Health endpoint not responding"
  fi

  # Auth check
  checks=$((checks + 1))
  if curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${base_url}/api/auth" 2>/dev/null | grep -q 200; then
    log_ok "Auth endpoint returned 200"
    passed=$((passed + 1))
  else
    log_err "Auth endpoint not responding"
  fi

  # Homepage loads
  checks=$((checks + 1))
  if curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${base_url}/" 2>/dev/null | grep -q 200; then
    log_ok "Homepage returned 200"
    passed=$((passed + 1))
  else
    log_err "Homepage not loading"
  fi

  log_info "Stability checks: $passed/$checks passed"

  if [[ "$passed" -eq "$checks" ]]; then
    log_ok "System is stable after rollback"
    return 0
  else
    log_err "System stability check failed — $((checks - passed)) check(s) failed"
    return 1
  fi
}

# ─── Ensure log directory exists ─────────────────────────────────────────────
setup_environment() {
  mkdir -p "$(dirname "$ROLLBACK_LOG")"
  mkdir -p "$DATABASE_BACKUP_DIR"
  log_info "Rollback environment initialized"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  local rollback_reason="${1:-manual}"
  local stable=false

  setup_environment

  log_info "══════════════════════════════════════════════"
  log_info "  $APP_NAME Rollback"
  log_info "  Reason: $rollback_reason"
  log_info "  Started at: $(date)"
  log_info "══════════════════════════════════════════════"

  send_alert "🚨 Rollback initiated" "Reason: $rollback_reason"

  check_prerequisites

  # Rollback Vercel
  if rollback_vercel "production"; then
    log_ok "Vercel rollback completed"
  else
    log_err "Vercel rollback failed — continuing with DB rollback"
  fi

  # Rollback Supabase
  if rollback_supabase; then
    log_ok "Supabase rollback completed"
  else
    log_warn "Supabase rollback encountered issues"
  fi

  # Verify stability
  if verify_stability; then
    stable=true
    send_alert "✅ Rollback completed successfully" "System is stable after rollback (reason: $rollback_reason)"
  else
    send_alert "🔴 Rollback completed with issues" "System stability check failed after rollback (reason: $rollback_reason). Manual intervention required."
  fi

  log_info "══════════════════════════════════════════════"
  log_info "  Rollback finished at: $(date)"
  log_info "  Status: $($stable && echo 'Stable' || echo 'Unstable')"
  log_info "══════════════════════════════════════════════"

  if [[ "$stable" == false ]]; then
    exit 1
  fi
}

main "$@"
