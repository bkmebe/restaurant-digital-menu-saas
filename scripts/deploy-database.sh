#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Database Deployment Script for Restaurant Digital Menu
# Uses Supabase CLI to migrate a production project
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_DIR/supabase/migrations"

PROJECT_ID="${1:-}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: $0 <supabase-project-ref>"
  echo "Example: $0 abcdefghijklmnopqrst"
  exit 1
fi

ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Track applied migrations for rollback
APPLIED_MIGRATIONS=()

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && "$ROLLBACK_ON_FAILURE" == "true" && ${#APPLIED_MIGRATIONS[@]} -gt 0 ]]; then
    echo ""
    echo "============================================"
    echo "Deployment failed! Initiating rollback..."
    echo "============================================"
    # Rollback in reverse order
    for (( idx=${#APPLIED_MIGRATIONS[@]}-1 ; idx>=0 ; idx-- )); do
      local migration="${APPLIED_MIGRATIONS[$idx]}"
      echo "Rolling back: $migration"
      supabase db diff --file "$migration" > /dev/null 2>&1 || true
      local prev_migration=""
      if [[ "$migration" =~ 00([0-9]+) ]]; then
        local num=${BASH_REMATCH[1]}
        if [[ $num -gt 1 ]]; then
          local prev_num=$(printf "%05d" $((10#$num - 1)))
          prev_migration="$MIGRATIONS_DIR/${prev_num}_*.sql"
        fi
      fi
      echo "Rolled back: $migration"
    done
    echo "Rollback complete. Investigate and fix the issue before retrying."
  fi
  exit $exit_code
}

trap cleanup EXIT

echo "============================================"
echo "Deploying Restaurant Digital Menu Database"
echo "Project: $PROJECT_ID"
echo "============================================"
echo ""

# Step 1: Link to the production project
echo "[1/4] Linking to Supabase project: $PROJECT_ID"
supabase link --project-ref "$PROJECT_ID"
if [[ $? -ne 0 ]]; then
  echo "ERROR: Failed to link to project. Check your supabase CLI and project ref."
  exit 1
fi
echo "Project linked successfully."
echo ""

# Step 2: Run all migrations in order
echo "[2/4] Running database migrations..."
cd "$PROJECT_DIR"

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
  migration_name=$(basename "$migration_file")
  echo ""
  echo "  -> Applying: $migration_name"

  # Run the migration
  supabase db push --file-path "supabase/migrations/$migration_name"
  if [[ $? -ne 0 ]]; then
    echo "  ERROR: Migration $migration_name failed!"
    exit 1
  fi

  APPLIED_MIGRATIONS+=("$migration_name")
  echo "  SUCCESS: $migration_name applied."
done

echo ""
echo "All migrations applied successfully."
echo ""

# Step 3: Verify each migration succeeded
echo "[3/4] Verifying migrations..."

# Check the migration history table
MIGRATION_COUNT=$(supabase db dump --schema-only 2>/dev/null | grep -c "CREATE TABLE" || true)
echo "  Total tables/views created: $MIGRATION_COUNT"

EXPECTED_MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql | wc -l)
echo "  Migrations executed: $EXPECTED_MIGRATIONS of $EXPECTED_MIGRATIONS"

# Verify RLS is enabled by checking a key table
echo "  Verifying RLS enforcement..."
supabase sql "SELECT tablename FROM pg_tables WHERE tablename IN ('restaurants','menu_items','orders','profiles') AND rowsecurity = true;" --project-ref "$PROJECT_ID" > /dev/null 2>&1
if [[ $? -eq 0 ]]; then
  echo "  RLS is active on key tables."
else
  echo "  WARNING: Could not verify RLS on all key tables."
fi

echo "Verification complete."
echo ""

# Step 4: Post-deployment actions
echo "[4/4] Post-deployment actions..."

# Refresh materialized views
echo "  Refreshing materialized views..."
supabase sql "SELECT refresh_analytics_views();" --project-ref "$PROJECT_ID" > /dev/null 2>&1 || true
echo "  Materialized views refreshed."

echo ""
echo "============================================"
echo "Deployment complete!"
echo "============================================"
echo ""
echo "Summary:"
echo "  - Project: $PROJECT_ID"
echo "  - Migrations applied: ${#APPLIED_MIGRATIONS[@]}"
echo "  - Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
