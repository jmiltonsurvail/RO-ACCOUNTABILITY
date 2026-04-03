#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"
ENV_FILE="${ENV_FILE:-/etc/ro-accountability.env}"
SERVICE_NAME="${SERVICE_NAME:-ro-accountability}"

cd "$ROOT_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "Deploying branch: $BRANCH"
echo "Project root: $ROOT_DIR"

git pull --ff-only origin "$BRANCH"
npm ci
npx prisma migrate deploy
npm run build:ec2
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
