#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  UpgradeSkip"
echo "  -----------"
echo "  Starting on this computer..."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js is not installed."
  echo "  Install LTS from https://nodejs.org then run this again."
  exit 1
fi

node scripts/launch.mjs
