#!/usr/bin/env bash
# =============================================================================
# EEL — Production Deploy Script
# =============================================================================
# Executed by GitHub Actions via SSH on the Contabo server.
# Pulls latest code, installs deps, builds, and restarts PM2.
#
# SAFETY: If the build fails, the running app is NOT restarted.
# Previous build is backed up for instant rollback.
#
# Usage (manual):  ssh root@193.187.129.114 "/opt/zap-app/scripts/deploy.sh"
# Usage (auto):    Triggered by .github/workflows/deploy.yml on push to main
# =============================================================================

set -euo pipefail

# --- Constants ---------------------------------------------------------------
APP_DIR="/opt/zap-app"
PM2_APP="zap-eel"
BRANCH="main"
LOG_PREFIX="[deploy]"

# --- Helpers -----------------------------------------------------------------
log()  { echo "$LOG_PREFIX $(date '+%H:%M:%S') $*"; }
fail() { log "❌ FAILED: $*"; exit 1; }

# --- Ensure PATH includes node/npm/pm2 --------------------------------------
export PATH="$PATH:/usr/local/bin:/root/.nvm/versions/node/$(ls /root/.nvm/versions/node/ 2>/dev/null | tail -1)/bin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# --- Verify prerequisites ----------------------------------------------------
log "🚀 Starting deploy..."
log "Server: $(hostname) | Node: $(node -v) | npm: $(npm -v)"

cd "$APP_DIR" || fail "App directory $APP_DIR not found"

CURRENT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log "Current commit: $CURRENT_SHA"

# --- Backup current build ----------------------------------------------------
log "📦 Backing up current build..."
if [ -d ".next" ]; then
  rm -rf .next.bak
  cp -r .next .next.bak
  log "Backup saved to .next.bak"
else
  log "No existing .next directory — skip backup"
fi

# --- Pull latest code --------------------------------------------------------
log "📥 Fetching latest code from origin/$BRANCH..."
git fetch origin "$BRANCH" || fail "git fetch failed"
git reset --hard "origin/$BRANCH" || fail "git reset failed"

NEW_SHA=$(git rev-parse --short HEAD)
log "Updated to commit: $NEW_SHA"

if [ "$CURRENT_SHA" = "$NEW_SHA" ]; then
  log "⚡ Already on latest commit — skipping build"
  exit 0
fi

# --- Install dependencies ----------------------------------------------------
log "📦 Installing dependencies..."
npm ci 2>&1 | tail -5
log "Dependencies installed"

# --- Build -------------------------------------------------------------------
log "🔨 Building application..."
BUILD_START=$(date +%s)

if npm run build 2>&1; then
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))
  log "Build succeeded in ${BUILD_TIME}s"
else
  log "❌ BUILD FAILED — NOT restarting PM2. App continues running on previous build."
  log "To rollback manually: /opt/zap-app/scripts/rollback.sh"
  exit 1
fi

# --- Restart PM2 -------------------------------------------------------------
log "🔄 Restarting PM2 app: $PM2_APP..."
pm2 restart "$PM2_APP" --update-env || fail "pm2 restart failed"

# --- Health check ------------------------------------------------------------
log "⏳ Waiting 5s for app to start..."
sleep 5

if pm2 show "$PM2_APP" | grep -q "online"; then
  log "✅ PM2 status: online"
else
  log "⚠️  PM2 status is NOT online — check 'pm2 logs $PM2_APP'"
fi

if curl -sf --max-time 10 http://localhost:3002 > /dev/null 2>&1; then
  log "✅ Health check passed (localhost:3002 responding)"
else
  log "⚠️  Health check failed — app may still be starting. Check: curl http://localhost:3002"
fi

# --- Summary -----------------------------------------------------------------
log "========================================="
log "Deploy complete!"
log "  Commit:     $NEW_SHA"
log "  Build time: ${BUILD_TIME}s"
log "  PM2 app:    $PM2_APP"
log "  URL:        https://zap.iqui27.app"
log "========================================="
