#!/usr/bin/env bash
# =============================================================================
# EEL — Rollback Script
# =============================================================================
# Instantly restores the previous .next build and restarts PM2.
# No rebuild needed — just swaps the directories.
#
# Usage: ssh root@193.187.129.114 "/opt/zap-app/scripts/rollback.sh"
# =============================================================================

set -euo pipefail

APP_DIR="/opt/zap-app"
PM2_APP="zap-eel"
LOG_PREFIX="[rollback]"

log()  { echo "$LOG_PREFIX $(date '+%H:%M:%S') $*"; }
fail() { log "❌ FAILED: $*"; exit 1; }

# Ensure PATH includes node/pm2
export PATH="$PATH:/usr/local/bin:/root/.nvm/versions/node/$(ls /root/.nvm/versions/node/ 2>/dev/null | tail -1)/bin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$APP_DIR" || fail "App directory $APP_DIR not found"

# --- Check backup exists -----------------------------------------------------
if [ ! -d ".next.bak" ]; then
  fail "No backup found (.next.bak does not exist). Cannot rollback."
fi

# --- Restore backup ----------------------------------------------------------
log "🔄 Restoring previous build..."
rm -rf .next
mv .next.bak .next
log "Build restored from backup"

# --- Restart PM2 -------------------------------------------------------------
log "🔄 Restarting PM2 app: $PM2_APP..."
pm2 restart "$PM2_APP" --update-env || fail "pm2 restart failed"

# --- Health check ------------------------------------------------------------
log "⏳ Waiting 5s for app to start..."
sleep 5

if curl -sf --max-time 10 http://localhost:3002 > /dev/null 2>&1; then
  log "✅ Rollback complete — app is responding on localhost:3002"
else
  log "⚠️  App may still be starting. Check: pm2 logs $PM2_APP"
fi

log "Done. Current git commit: $(git rev-parse --short HEAD)"
