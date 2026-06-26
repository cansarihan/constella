#!/usr/bin/env bash
# StellarFund — testnet deploy & initialize betiği.
# Gereksinim: stellar CLI (v23+), funded testnet kimliği.
set -euo pipefail

NETWORK="testnet"
SOURCE="${1:-admin}"            # kullanılacak kimlik (varsayılan: admin)
TITLE="${2:-Save the Ocean - Stellar Crowdfund}"
GOAL="${3:-1000000000}"         # stroop cinsinden hedef (100 XLM)
DURATION_SECS="${4:-31536000}"  # kampanya süresi (varsayılan 1 yıl)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Kimlik fonlanıyor (yoksa): $SOURCE"
stellar keys generate "$SOURCE" --network "$NETWORK" --fund 2>/dev/null || true

ADMIN=$(stellar keys address "$SOURCE")
SAC=$(stellar contract id asset --asset native --network "$NETWORK")
DEADLINE=$(( $(date +%s) + DURATION_SECS ))
echo "  admin    = $ADMIN"
echo "  token    = $SAC (native XLM SAC)"
echo "  deadline = $DEADLINE"

echo "▶ Kontrat derleniyor"
stellar contract build >/dev/null

echo "▶ Deploy ediliyor"
CID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/crowdfunding.wasm \
  --source "$SOURCE" --network "$NETWORK")
echo "  CONTRACT_ID = $CID"

echo "▶ initialize çağrılıyor"
stellar contract invoke --id "$CID" --source "$SOURCE" --network "$NETWORK" -- \
  initialize \
  --admin "$ADMIN" \
  --token "$SAC" \
  --title "$TITLE" \
  --goal "$GOAL" \
  --deadline "$DEADLINE"

echo ""
echo "✅ Tamam. Frontend için:  VITE_CONTRACT_ID=$CID"
echo "   Explorer: https://stellar.expert/explorer/testnet/contract/$CID"
