#!/usr/bin/env bash
# cos2-boot.sh — mac-studio COS v2 health check + auto-repair.
#
# Idempotent. Run any time. Safe to re-run.
# Usage:
#   ./scripts/cos2-boot.sh           # health + repair
#   ./scripts/cos2-boot.sh reboot    # stop everything + boot
#   ./scripts/cos2-boot.sh health    # read-only check, no repair
#   ./scripts/cos2-boot.sh rebuild   # force UI rebuild + server restart

set -uo pipefail

MODE="${1:-boot}"
SERVER_PORT=3100
COMPOSE_DB_USER=cloud_admin
DOCKER_BIN=/Applications/Docker.app/Contents/Resources/bin/docker
DOCKER_APP=/Applications/Docker.app
NEON_CONTAINER=neon-local-compute1-1
PNPM=/opt/homebrew/bin/pnpm
PM2=/opt/homebrew/bin/pm2
LEADER_ROOT="$HOME/.cos-v2/leaders"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIST="$REPO_ROOT/ui/dist"

OK=0
FAIL=0

step() { printf "\n→ %s\n" "$1"; }
ok()   { printf "  ✓ %s\n" "$1"; OK=$((OK+1)); }
fail() { printf "  ✗ %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "  · %s\n" "$1"; }

repair=true
checkonly=false
case "$MODE" in
  health)  checkonly=true; repair=false ;;
  reboot)  ;;
  rebuild) ;;
  boot)    ;;
  *)       echo "Unknown mode: $MODE (boot|reboot|health|rebuild)"; exit 2 ;;
esac

# ── 1. Docker daemon ────────────────────────────────────────────────
step "Docker daemon"
if pgrep -qf "Docker.app/Contents/MacOS/com.docker.backend"; then
  ok "running"
else
  if $repair; then
    info "starting Docker.app"
    open -a "$DOCKER_APP"
    for i in {1..30}; do
      sleep 2
      pgrep -qf "Docker.app/Contents/MacOS/com.docker.backend" && break
    done
    pgrep -qf "Docker.app/Contents/MacOS/com.docker.backend" && ok "started" || fail "Docker did not start"
  else
    fail "not running"
  fi
fi

# Wait until Docker socket accepts commands
if [ -x "$DOCKER_BIN" ]; then
  for i in {1..30}; do
    "$DOCKER_BIN" info >/dev/null 2>&1 && break
    sleep 2
  done
  if "$DOCKER_BIN" info >/dev/null 2>&1; then
    ok "Docker socket ready"
  else
    fail "Docker socket unresponsive"
  fi
fi

# ── 2. Neon compute container ───────────────────────────────────────
step "neon-local compute container"
if "$DOCKER_BIN" ps --format '{{.Names}}' 2>/dev/null | grep -q "^${NEON_CONTAINER}$"; then
  ok "$NEON_CONTAINER up"
else
  if $repair; then
    info "starting $NEON_CONTAINER"
    "$DOCKER_BIN" start "$NEON_CONTAINER" >/dev/null 2>&1 && ok "started" || fail "could not start $NEON_CONTAINER"
  else
    fail "not running"
  fi
fi

# ── 3. DB reachable ─────────────────────────────────────────────────
step "DB reachable"
if "$DOCKER_BIN" exec "$NEON_CONTAINER" sh -c "psql -p 55433 -h 127.0.0.1 -U ${COMPOSE_DB_USER} -d cos -c 'select 1' >/dev/null 2>&1"; then
  ok "psql select 1 OK"
else
  fail "psql select 1 failed"
fi

# ── 4. pm2 daemon ───────────────────────────────────────────────────
step "pm2 daemon"
if "$PM2" ping >/dev/null 2>&1; then
  ok "ping OK"
else
  if $repair; then
    info "resurrecting pm2"
    "$PM2" resurrect >/dev/null 2>&1
    "$PM2" ping >/dev/null 2>&1 && ok "started" || fail "pm2 did not respond"
  else
    fail "not running"
  fi
fi

# ── 5. cos-v2-server pm2 process ────────────────────────────────────
step "cos-v2-server pm2 process"
if "$PM2" jlist 2>/dev/null | grep -q '"name":"cos-v2-server"'; then
  status=$("$PM2" jlist 2>/dev/null | python3 -c "import sys,json; [print(p['pm2_env']['status']) for p in json.load(sys.stdin) if p['name']=='cos-v2-server']")
  if [ "$status" = "online" ]; then
    ok "online"
  else
    if $repair; then
      info "restarting cos-v2-server (status=$status)"
      "$PM2" restart cos-v2-server >/dev/null 2>&1 && ok "restarted" || fail "restart failed"
    else
      fail "status=$status"
    fi
  fi
else
  fail "cos-v2-server not registered in pm2 (resurrect dump may be stale)"
fi

# ── 6. UI dist freshness ────────────────────────────────────────────
step "UI dist freshness"
need_build=false
if [ "$MODE" = "rebuild" ]; then
  need_build=true
  info "rebuild forced"
elif [ ! -f "$UI_DIST/index.html" ]; then
  need_build=true
  info "no dist/index.html"
else
  dist_mtime=$(stat -f %m "$UI_DIST/index.html")
  newest_src=$(find "$REPO_ROOT/ui/src" "$REPO_ROOT/ui/index.html" "$REPO_ROOT/ui/public" -type f -newer "$UI_DIST/index.html" -print -quit 2>/dev/null)
  if [ -n "$newest_src" ]; then
    need_build=true
    info "ui source newer than dist (e.g. $newest_src)"
  fi
fi

if $need_build; then
  if $repair; then
    info "running vite build (skipping tsc)"
    (cd "$REPO_ROOT/ui" && "$PNPM" exec vite build >/tmp/cos2-boot-vite.log 2>&1)
    if [ $? -eq 0 ] && [ -f "$UI_DIST/index.html" ]; then
      ok "rebuilt"
      info "restarting cos-v2-server to flush in-memory index.html cache"
      "$PM2" restart cos-v2-server >/dev/null 2>&1
    else
      fail "vite build failed; see /tmp/cos2-boot-vite.log"
    fi
  else
    fail "dist stale (use 'boot' or 'rebuild' to fix)"
  fi
else
  ok "dist up-to-date"
fi

# ── 7. Port LISTEN ──────────────────────────────────────────────────
step "Port $SERVER_PORT LISTEN"
for i in {1..15}; do
  lsof -nP -iTCP:$SERVER_PORT -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 1
done
if lsof -nP -iTCP:$SERVER_PORT -sTCP:LISTEN >/dev/null 2>&1; then
  ok "$SERVER_PORT bound"
else
  fail "$SERVER_PORT not bound after 15s"
fi

# ── 8. /api/health 200 ──────────────────────────────────────────────
step "/api/health"
health=""
for i in {1..15}; do
  health=$(curl -fsS -m 3 "http://127.0.0.1:$SERVER_PORT/api/health" 2>/dev/null || true)
  [ -n "$health" ] && break
  sleep 1
done
if [ -n "$health" ]; then
  bootstrap=$(echo "$health" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("bootstrapStatus",""))' 2>/dev/null)
  if [ "$bootstrap" = "ready" ]; then
    ok "ready"
  else
    fail "bootstrapStatus=$bootstrap"
  fi
else
  fail "no response after 15s"
fi

# ── 9. Leader workspaces .mcp.json symlinks ─────────────────────────
step "Leader .mcp.json symlinks"
if [ -d "$LEADER_ROOT" ]; then
  fixed=0
  for d in "$LEADER_ROOT"/*/; do
    if [ -f "$d/mcp-bridge.json" ] && [ ! -e "$d/.mcp.json" ]; then
      if $repair; then
        ln -s mcp-bridge.json "$d/.mcp.json"
        fixed=$((fixed+1))
      else
        fail "missing: $d.mcp.json"
      fi
    fi
  done
  if [ "$fixed" -gt 0 ]; then
    ok "created $fixed symlink(s)"
  else
    ok "all leaders linked"
  fi
else
  info "no leader dir yet"
fi

# ── 10. Leader pm2 processes ────────────────────────────────────────
step "Leader pm2 processes"
leader_list=$("$PM2" jlist 2>/dev/null | python3 -c "import sys,json; [print(f\"{p['name']}|{p['pm2_env']['status']}\") for p in json.load(sys.stdin) if p['name'].startswith('cos-default-')]" 2>/dev/null)
if [ -n "$leader_list" ]; then
  bad=0
  while IFS='|' read -r n s; do
    if [ "$s" = "online" ]; then
      ok "$n online"
    else
      bad=$((bad+1))
      if $repair; then
        info "restarting $n (status=$s)"
        "$PM2" restart "$n" >/dev/null 2>&1
      else
        fail "$n status=$s"
      fi
    fi
  done <<< "$leader_list"
  if [ "$bad" -gt 0 ] && $repair; then
    info "restarted $bad leader(s); allow ~30s for ready"
  fi
else
  info "no leaders registered"
fi

# ── Reboot mode: stop everything first, then boot ───────────────────
if [ "$MODE" = "reboot" ]; then
  step "(reboot mode) restarting cos-v2-server + all leaders"
  "$PM2" restart all >/dev/null 2>&1 && ok "pm2 restart all sent" || fail "pm2 restart all failed"
fi

# ── Summary ─────────────────────────────────────────────────────────
printf "\n──── Summary ────\n"
printf "  OK:   %d\n" "$OK"
printf "  FAIL: %d\n" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
