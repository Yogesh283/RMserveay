#!/usr/bin/env bash
#
# RM Survey — single-command production deploy (Linux server).
# Run from project root as the hosting user (not root) — e.g.
#   cd /home/rmsurveyai/htdocs/rmsurveyai.com && bash scripts/deploy-live.sh
#
# Optional env:
#   GIT_BRANCH=main (default)
#   COMPOSER_IGNORE_PLATFORM_REQS=1  — if PHP on server is older than lockfile
#   SKIP_NPM=1          — skip npm ci + build (PHP-only hotfix)
#   SKIP_MIGRATE=1      — skip php artisan migrate
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GIT_BRANCH="${GIT_BRANCH:-main}"

echo "==> Deploy root: $ROOT"
echo "==> Branch: $GIT_BRANCH"

rm -f public/hot

# Merge-safe: avoid 'would be overwritten' on public/storage during pull
if [[ -e public/storage ]]; then
  rm -rf public/storage
fi

git fetch --all --prune
git checkout "$GIT_BRANCH"
git pull --ff-only "origin" "$GIT_BRANCH"

composer_cmd=(composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev)
if [[ "${COMPOSER_IGNORE_PLATFORM_REQS:-0}" == "1" ]]; then
  composer_cmd+=(--ignore-platform-reqs)
fi
"${composer_cmd[@]}"

if [[ "${SKIP_NPM:-0}" != "1" ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm not found. Install Node or set SKIP_NPM=1." >&2
    exit 1
  fi
  npm ci
  npm run build
fi

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  php artisan migrate --force
fi

php artisan optimize:clear
php artisan config:cache
php artisan route:clear

rm -rf public/storage
php artisan storage:link

echo "==> Deploy finished OK."
