#!/bin/bash
set -e

REMOTE="cpanel"
DEPLOY_BRANCH="_cpanel_deploy"
CURRENT_BRANCH=$(git branch --show-current)

echo "==> Building..."
npm run build

echo "==> Creating deploy snapshot..."
git checkout -B "$DEPLOY_BRANCH"

echo "==> Staging all files including .next build output..."
git add -A
git add -f .next/
git commit -m "cpanel deploy: $(date '+%Y-%m-%d %H:%M')" || echo "(no changes to commit)"

echo "==> Pushing to cPanel server..."
git push "$REMOTE" "$DEPLOY_BRANCH:main" --force

echo "==> Returning to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

echo ""
echo "Done. Files are staged at /home/ckbservi/trakovo_devgit on the server."
echo "When ready, SSH in and copy to your live app folder."
