#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT

setup_repo() {
  local name="$1" repo="$root/$1" remote="$root/$1.git"
  git init -q --bare "$remote"
  git init -q -b main "$repo"
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name Test
  echo one > "$repo/file"
  git -C "$repo" add file
  git -C "$repo" commit -qm initial
  git -C "$repo" remote add origin "$remote"
  git -C "$repo" push -q -u origin main
  git -C "$remote" symbolic-ref HEAD refs/heads/main
  git -C "$repo" tag v1.0.10
  git -C "$repo" push -q origin v1.0.10
}

for bump in patch minor major; do
  setup_repo "$bump"
  if [[ "$bump" == patch ]]; then
    echo two > "$root/$bump/file"
    git -C "$root/$bump" commit -qam next
  fi
  case "$bump" in
    patch) expected=v1.0.11 ;;
    minor) expected=v1.1.0 ;;
    major) expected=v2.0.0 ;;
  esac
  output="$(cd "$root/$bump" && bash "$script_dir/release.sh" "$bump")"
  test "$output" = "$expected"
  test "$(git -C "$root/$bump.git" rev-parse "refs/tags/$expected")" = "$(git -C "$root/$bump" rev-parse HEAD)"
  test "$(git -C "$root/$bump.git" rev-parse refs/heads/main)" = "$(git -C "$root/$bump" rev-parse HEAD)"
done

setup_repo dirty
echo changed > "$root/dirty/file"
if (cd "$root/dirty" && bash "$script_dir/release.sh") >/dev/null 2>&1; then
  echo 'dirty worktree was released' >&2
  exit 1
fi
test -z "$(git -C "$root/dirty.git" tag -l v1.0.11)"

setup_repo invalid
if (cd "$root/invalid" && bash "$script_dir/release.sh" banana) >/dev/null 2>&1; then
  echo 'invalid bump was released' >&2
  exit 1
fi
test -z "$(git -C "$root/invalid.git" tag -l v1.0.11)"

setup_repo behind
git clone -q "$root/behind.git" "$root/peer"
git -C "$root/peer" config user.email test@example.com
git -C "$root/peer" config user.name Test
echo newer > "$root/peer/file"
git -C "$root/peer" commit -qam newer
git -C "$root/peer" push -q origin HEAD:main
if (cd "$root/behind" && bash "$script_dir/release.sh") >/dev/null 2>&1; then
  echo 'outdated branch was released' >&2
  exit 1
fi
test -z "$(git -C "$root/behind.git" tag -l v1.0.11)"

echo 'release tests passed'
