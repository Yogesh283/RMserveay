#!/usr/bin/env bash
# Run on LIVE server: cd /home/rmsurveyai/htdocs/rmsurveyai.com && bash scripts/test-nowpayments-live.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Project: $ROOT"
echo "==> Outbound public IP (whitelist this in NOWPayments → Settings → Payments → IP addresses):"
curl -sS --max-time 20 https://ifconfig.me/ip || curl -sS --max-time 20 https://api.ipify.org
echo ""

echo "==> NOWPayments .env (password hidden):"
grep -E '^NOWPAYMENTS_' .env 2>/dev/null | grep -v PASSWORD || echo "(no NOWPAYMENTS_ lines in .env)"

if grep -q '^NOWPAYMENTS_PAYOUT_PASSWORD=' .env 2>/dev/null; then
  echo "NOWPAYMENTS_PAYOUT_PASSWORD=***set***"
fi

echo ""
echo "==> Config + payout auth test:"
php artisan config:clear
php artisan nowpayments:payout-check

echo ""
echo "==> IPN URL (set in NOWPayments dashboard):"
php artisan tinker --execute="echo url('/api/payments/nowpayments/ipn');" 2>/dev/null || echo "https://rmsurveyai.com/api/payments/nowpayments/ipn"
