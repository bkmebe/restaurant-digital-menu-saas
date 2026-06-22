#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
readonly APP_NAME="restaurant-digital-menu"
readonly VERCEL_PROJECT="${VERCEL_PROJECT:-$APP_NAME}"
readonly STAGING_URL="${STAGING_URL:-}"
readonly PRODUCTION_BRANCH="main"
readonly SMOKE_TEST_TIMEOUT=120

# ─── Color helpers ───────────────────────────────────────────────────────────
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

# ─── Prerequisites ────────────────────────────────────────────────────────────
check_prerequisites() {
  blue "🔍 Checking prerequisites..."
  command -v node &>/dev/null || { red "❌ Node.js is required"; exit 1; }
  command -v vercel &>/dev/null || { red "❌ Vercel CLI is required (npm i -g vercel)"; exit 1; }
  command -v curl &>/dev/null || { red "❌ curl is required"; exit 1; }

  [[ "$(node --version)" =~ ^v22\. ]] || { red "❌ Node.js 22.x required, found $(node --version)"; exit 1; }

  blue "✅ Prerequisites satisfied"
}

# ─── Run tests ────────────────────────────────────────────────────────────────
run_tests() {
  blue "🧪 Running test suite..."

  if npm run test:unit; then
    green "✅ Unit tests passed"
  else
    red "❌ Unit tests failed"
    exit 1
  fi

  if npm run test:integration; then
    green "✅ Integration tests passed"
  else
    red "❌ Integration tests failed"
    exit 1
  fi

  if npm run lint; then
    green "✅ Linting passed"
  else
    red "❌ Linting failed"
    exit 1
  fi

  green "🎉 All tests passed"
}

# ─── Build application ────────────────────────────────────────────────────────
build_app() {
  blue "🔨 Building application..."
  if npm run build; then
    green "✅ Build successful"
  else
    red "❌ Build failed"
    exit 1
  fi
}

# ─── Deploy to Vercel (staging/preview) ──────────────────────────────────────
deploy_staging() {
  local deploy_url
  blue "🚀 Deploying to Vercel (preview)..."
  deploy_url=$(vercel deploy --preview --yes --token "${VERCEL_TOKEN:?VERCEL_TOKEN is not set}" 2>&1 | tee /dev/stderr | grep -oE 'https://[^ ]+' | head -1)

  if [[ -z "$deploy_url" ]]; then
    red "❌ Failed to extract deployment URL"
    exit 1
  fi

  echo "$deploy_url" > /tmp/vercel-deploy-url
  green "✅ Preview deployment ready at: $deploy_url"
  STAGING_URL="$deploy_url"
}

# ─── Smoke tests ─────────────────────────────────────────────────────────────
run_smoke_tests() {
  local url="${1:-$STAGING_URL}"
  [[ -n "$url" ]] || { red "❌ No URL provided for smoke tests"; exit 1; }

  blue "🌡️  Running smoke tests against $url..."

  local endpoints=(
    "/"
    "/api/health"
    "/api/auth"
  )

  for endpoint in "${endpoints[@]}"; do
    local full_url="${url}${endpoint}"
    blue "  Checking $full_url ..."
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$full_url" || true)

    if [[ "$status" =~ ^[23][0-9]{2}$ ]]; then
      green "  ✅ $endpoint returned $status"
    else
      red "  ❌ $endpoint returned $status (expected 2xx/3xx)"
      exit 1
    fi
  done

  green "✅ Smoke tests passed"
}

# ─── Confirm production promotion ────────────────────────────────────────────
confirm_promotion() {
  local url="${1:-$STAGING_URL}"
  blue "──────────────────────────────────────────────"
  blue "  Preview URL: $url"
  blue "  Project:     $VERCEL_PROJECT"
  blue "  Branch:      $PRODUCTION_BRANCH"
  blue "──────────────────────────────────────────────"
  echo ""
  read -r -p "❓ Promote this deployment to production? (yes/no): " confirmation

  if [[ "$confirmation" != "yes" ]]; then
    blue "⏹  Deployment promotion cancelled."
    exit 0
  fi
}

# ─── Promote to production ───────────────────────────────────────────────────
promote_production() {
  blue "🚀 Promoting to production..."

  if vercel promote --yes --token "${VERCEL_TOKEN:?}" "${VERCEL_PROJECT}"; then
    green "✅ Production deployment complete"
  else
    red "❌ Production promotion failed"
    exit 1
  fi
}

# ─── Post-deployment verification ────────────────────────────────────────────
post_deploy_verify() {
  blue "🔍 Running post-deployment validation..."
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$script_dir/post-deploy-validation.sh" ]]; then
    bash "$script_dir/post-deploy-validation.sh"
  else
    blue "⚠️  Post-deployment validation script not found, skipping"
  fi
}

# ─── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  rm -f /tmp/vercel-deploy-url
  blue "🧹 Cleanup complete"
}
trap cleanup EXIT

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  blue "══════════════════════════════════════════════"
  blue "  $APP_NAME Production Deployment"
  blue "══════════════════════════════════════════════"
  echo ""

  check_prerequisites
  run_tests
  build_app
  deploy_staging
  run_smoke_tests "$STAGING_URL"
  confirm_promotion "$STAGING_URL"
  promote_production
  post_deploy_verify

  green "══════════════════════════════════════════════"
  green "  ✅ Deployment complete!"
  green "══════════════════════════════════════════════"
}

main "$@"
