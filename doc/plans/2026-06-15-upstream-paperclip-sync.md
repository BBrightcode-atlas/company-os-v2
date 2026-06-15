# Upstream Paperclip Sync

This fork tracks `paperclipai/paperclip` while keeping BBR-specific plugins in `bbr-plugins/`.

## Scope

- Work from `/Users/bright/Projects/company-os-v2` on `main`.
- `origin` is `BBrightcode-atlas/company-os-v2`.
- `upstream` is `paperclipai/paperclip`.
- Preserve `bbr-plugins/**`.
- Treat Paperclip core as upstream-owned: outside `bbr-plugins/**`, the final tree should match `upstream/master` unless a deliberate fork patch is explicitly requested.

`bbr-plugins/**` is tracked on `origin/main`. It is not present on `origin/master` or the older `feature/sync-upstream-20260603` branches.

## Sync Procedure

```sh
cd /Users/bright/Projects/company-os-v2
git status --short --branch
git fetch upstream master
git fetch origin main
git merge --no-ff upstream/master
```

If conflicts happen in Paperclip core files, resolve them by taking `upstream/master` unless the user explicitly asks to preserve a fork patch:

```sh
git checkout --theirs <conflicted-core-file>
git add <conflicted-core-file>
```

After the merge, enforce the core boundary:

```sh
git diff --name-only upstream/master -- ':!bbr-plugins/**'
git diff --name-only upstream/master -- bbr-plugins
```

The first command must print nothing. The second should list only BBR plugin files.

If non-plugin fork changes remain after a merge, reset only those tracked paths to upstream:

```sh
git diff --name-only upstream/master..HEAD -- ':!bbr-plugins/**' > /tmp/paperclip-core-diff.txt
while IFS= read -r file_path; do
  [ -n "$file_path" ] || continue
  if git cat-file -e "upstream/master:$file_path" 2>/dev/null; then
    git checkout upstream/master -- "$file_path"
  else
    git rm -f -- "$file_path"
  fi
done < /tmp/paperclip-core-diff.txt
```

Do not name the loop variable `path` in zsh; it collides with the shell path array.

## Verification

Confirm upstream is included and core is clean:

```sh
git merge-base --is-ancestor upstream/master HEAD
git diff --name-only upstream/master -- ':!bbr-plugins/**'
git diff --name-only upstream/master -- bbr-plugins | wc -l
```

Run tests:

```sh
GIT_TEST_DEFAULT_INITIAL_BRANCH_NAME=master pnpm test
```

The `GIT_TEST_DEFAULT_INITIAL_BRANCH_NAME=master` environment variable matters because some upstream worktree tests create temporary repositories and expect a `master` ref to exist.

If a full run flakes, rerun the failed suites exactly before calling the sync good. For the 2026-06-15 sync, the targeted retry was:

```sh
GIT_TEST_DEFAULT_INITIAL_BRANCH_NAME=master pnpm --filter @paperclipai/server exec vitest run \
  src/__tests__/workspace-runtime.test.ts \
  src/__tests__/heartbeat-comment-wake-batching.test.ts
```

## Publish

Push directly to `origin/main` when requested:

```sh
git push origin main
```

After push, verify remote state:

```sh
git ls-remote origin refs/heads/main
git rev-parse HEAD
```
