#!/usr/bin/env bash
# COS v2 subagent 정의를 ~/.claude/agents/ 에 심링크.
#
# Coordinator CLI 의 cwd 가 agent workspace (빈 디렉토리)이므로
# repo 의 .claude/agents/cos-*.md 를 직접 발견할 수 없다.
# user-level ~/.claude/agents/ 는 모든 Claude Code 세션에서 auto-discover 되므로
# 여기에 symlink 를 걸어서 discoverable 하게 만든다.
#
# Usage:
#   ./scripts/install-cos-subagents.sh          # install/update
#   ./scripts/install-cos-subagents.sh --remove # uninstall
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/.claude/agents"
DEST_DIR="$HOME/.claude/agents"

if [ ! -d "$SRC_DIR" ]; then
  echo "✗ source missing: $SRC_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

if [ "${1:-}" = "--remove" ]; then
  echo "=== COS subagent symlinks 제거 ==="
  removed=0
  for src in "$SRC_DIR"/cos-*.md; do
    [ -e "$src" ] || continue
    name="$(basename "$src")"
    dest="$DEST_DIR/$name"
    if [ -L "$dest" ]; then
      rm "$dest"
      echo "  - $dest"
      removed=$((removed+1))
    fi
  done
  echo "  → removed: $removed"
  exit 0
fi

echo "=== COS subagent symlinks 설치 ==="
installed=0
skipped=0
for src in "$SRC_DIR"/cos-*.md; do
  [ -e "$src" ] || continue
  name="$(basename "$src")"
  dest="$DEST_DIR/$name"

  if [ -L "$dest" ]; then
    current="$(readlink "$dest")"
    if [ "$current" = "$src" ]; then
      echo "  ↺ $name (이미 심링크)"
      skipped=$((skipped+1))
      continue
    fi
    echo "  ⚠ $name (다른 곳 심링크 → 덮어씀)"
    rm "$dest"
  elif [ -f "$dest" ]; then
    echo "  ⚠ $name (실파일 존재 → 백업 후 덮어씀)"
    mv "$dest" "$dest.backup.$(date +%s)"
  fi

  ln -s "$src" "$dest"
  echo "  + $name → $src"
  installed=$((installed+1))
done

echo
echo "  → installed: $installed, skipped: $skipped"
echo "  Claude Code 의 다음 세션부터 cos-* subagent 가 Task tool 로 spawn 가능."
echo "  Coordinator CLI 재시작 필요: POST /api/companies/:cid/agents/:aid/cli/restart"
