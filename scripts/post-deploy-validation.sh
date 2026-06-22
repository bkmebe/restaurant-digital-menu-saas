#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
readonly APP_NAME="restaurant-digital-menu"
readonly BASE_URL="${1:-${DEPLOY_URL:-${VERCEL_URL:-https://restaurant-digital-menu.vercel.app}}}"
readonly TIMEOUT=15
readonly LOG_FILE="/tmp/post-deploy-validation-$(date +%s).log"

# ─── State ────────────────────────────────────────────────────────────────────
passed=0
failed=0
warnings=0

# ─── Color helpers ───────────────────────────────────────────────────────────
red()     { printf "\033[31m%s\033[0m\n" "$*"; }
green()   { printf "\033[32m%s\033[0m\n" "$*"; }
yellow()  { printf "\033[33m%s\033[0m\n" "$*"; }
blue()    { printf "\033[34m%s\033[0m\n" "$*"; }

# ─── Logging ──────────────────────────────────────────────────────────────────
log()     { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG_FILE"; }
log_pass(){ passed=$((passed + 1)); log "PASS: $*"; green "  ✅ $*"; }
log_fail(){ failed=$((failed + 1)); log "FAIL: $*"; red "  ❌ $*"; }
log_warn(){ warnings=$((warnings + 1)); log "WARN: $*"; yellow "  ⚠️  $*"; }

# ─── Check HTTP status ────────────────────────────────────────────────────────
check_status() {
  local description="$1"
  local url="$2"
  local expected="${3:-200}"
  local actual

  actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || true)

  if [[ "$actual" == "$expected" ]]; then
    log_pass "$description — returned $actual"
  else
    log_fail "$description — expected $expected, got $actual"
  fi
}

# ─── Check response body contains string ─────────────────────────────────────
check_body_contains() {
  local description="$1"
  local url="$2"
  local expected_content="$3"

  if curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null | grep -qF "$expected_content"; then
    log_pass "$description — body contains expected content"
  else
    log_fail "$description — body missing expected content"
  fi
}

# ─── Check header present and matches pattern ────────────────────────────────
check_header() {
  local description="$1"
  local url="$2"
  local header_name="$3"
  local expected_pattern="$4"
  local header_value

  header_value=$(curl -sI --max-time "$TIMEOUT" "$url" 2>/dev/null | grep -i "^${header_name}:" | sed 's/^[^:]*:\s*//' | tr -d '\r' || true)

  if echo "$header_value" | grep -qE "$expected_pattern"; then
    log_pass "$description — $header_name: $header_value"
  else
    log_fail "$description — $header_name missing or mismatch (expected: ~$expected_pattern, got: '$header_value')"
  fi
}

# ─── Summary ──────────────────────────────────────────────────────────────────
print_summary() {
  local total=$((passed + failed))
  echo ""
  blue "══════════════════════════════════════════════"
  blue "  Validation Summary"
  blue "══════════════════════════════════════════════"
  green "  Passed:  $passed"
  red "   Failed:  $failed"
  yellow "  Warnings: $warnings"
  blue "  Total:   $total"
  blue "  Log:     $LOG_FILE"
  blue "══════════════════════════════════════════════"
  echo ""

  if [[ "$failed" -gt 0 ]]; then
    red "❌ Validation completed with $failed failure(s)"
    return 1
  fi

  if [[ "$warnings" -gt 0 ]]; then
    yellow "⚠️  Validation completed with $warnings warning(s)"
    return 0
  fi

  green "✅ All validations passed!"
  return 0
}

# ─── Validation groups ────────────────────────────────────────────────────────

validate_health_endpoint() {
  blue ""
  blue "📡 Health endpoint"
  log "--- Health endpoint ---"

  check_status "Health endpoint" "${BASE_URL}/api/health" 200
  check_body_contains "Health response content" "${BASE_URL}/api/health" "ok"
}

validate_auth_endpoints() {
  blue ""
  blue "🔐 Auth endpoints"
  log "--- Auth endpoints ---"

  check_status "Auth endpoint (OPTIONS preflight)" "${BASE_URL}/api/auth" 200
}

validate_security_headers() {
  blue ""
  blue "🛡️  Security headers"
  log "--- Security headers ---"

  check_header "CSP header"                "$BASE_URL" "content-security-policy"       "default-src 'self'"
  check_header "X-Content-Type-Options"    "$BASE_URL" "x-content-type-options"        "nosniff"
  check_header "X-Frame-Options"           "$BASE_URL" "x-frame-options"               "DENY"
  check_header "Referrer-Policy"           "$BASE_URL" "referrer-policy"               "strict-origin-when-cross-origin"
  check_header "Strict-Transport-Security" "$BASE_URL" "strict-transport-security"     "max-age=63072000"
  check_header "Permissions-Policy"        "$BASE_URL" "permissions-policy"            "camera=\(\), microphone=\(\), geolocation=\(\)"
}

validate_api_endpoints() {
  blue ""
  blue "🔌 API endpoints"
  log "--- API endpoints ---"

  check_status "Menu items endpoint"  "${BASE_URL}/api/menu/items"  200
  check_status "Orders endpoint"      "${BASE_URL}/api/orders"      200
  check_status "Employees endpoint"   "${BASE_URL}/api/employees"   200
  check_status "Payroll endpoint"     "${BASE_URL}/api/payroll"     200
  check_status "Service requests"     "${BASE_URL}/api/service-requests" 200
  check_status "Payments config"      "${BASE_URL}/api/payments/chapa"  200
  check_status "Analytics revenue"    "${BASE_URL}/api/analytics/revenue" 200
}

validate_pwa_assets() {
  blue ""
  blue "📱 PWA assets"
  log "--- PWA assets ---"

  check_status "Service worker"        "${BASE_URL}/sw.js"                 200
  check_status "Service worker route"  "${BASE_URL}/service-worker.js"    200
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  blue "══════════════════════════════════════════════"
  blue "  $APP_NAME Post-Deployment Validation"
  blue "  Target: $BASE_URL"
  blue "══════════════════════════════════════════════"

  log "=== Post-Deployment Validation started ==="
  log "Target URL: $BASE_URL"

  # Wait for deployment to be ready
  blue "  ⏳ Waiting for deployment to be ready..."
  sleep 5

  validate_health_endpoint
  validate_auth_endpoints
  validate_api_endpoints
  validate_security_headers
  validate_pwa_assets

  echo ""
  print_summary
}

main "$@"
