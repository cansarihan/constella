#!/usr/bin/env bash
# Constella — testnet deploy & initialize script.
# Requires: stellar CLI (v23+) and a funded testnet identity.
set -euo pipefail

NETWORK="testnet"
SOURCE="${1:-admin}"            # identity to use (default: admin)
TITLE="${2:-Save the Ocean - Stellar Crowdfund}"
GOAL="${3:-1000000000}"         # goal in stroops (100 XLM)
DURATION_SECS="${4:-31536000}"  # campaign duration (default 1 year)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Funding identity (if needed): $SOURCE"
stellar keys generate "$SOURCE" --network "$NETWORK" --fund 2>/dev/null || true

ADMIN=$(stellar keys address "$SOURCE")
SAC=$(stellar contract id asset --asset native --network "$NETWORK")
DEADLINE=$(( $(date +%s) + DURATION_SECS ))
echo "  admin    = $ADMIN"
echo "  token    = $SAC (native XLM SAC)"
echo "  deadline = $DEADLINE"

echo "▶ Building contract"
stellar contract build >/dev/null

echo "▶ Deploying"
CID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/crowdfunding.wasm \
  --source "$SOURCE" --network "$NETWORK")
echo "  CONTRACT_ID = $CID"

echo "▶ Calling initialize"
stellar contract invoke --id "$CID" --source "$SOURCE" --network "$NETWORK" -- \
  initialize \
  --admin "$ADMIN" \
  --token "$SAC" \
  --title "$TITLE" \
  --goal "$GOAL" \
  --deadline "$DEADLINE"

echo ""
echo "✅ Done. For the frontend:  VITE_CONTRACT_ID=$CID"
echo "   Explorer: https://stellar.expert/explorer/testnet/contract/$CID"
