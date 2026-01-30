#!/bin/bash
# Test an Edge Function locally or remotely
#
# Usage:
#   ./test-edge-function.sh [function-name] [local|remote]
#
# Examples:
#   ./test-edge-function.sh analyze-company-website local
#   ./test-edge-function.sh msp-create-checkout remote

FUNCTION_NAME=${1:-"health-check"}
ENV=${2:-"local"}

if [ "$ENV" = "local" ]; then
  BASE_URL="http://localhost:54321/functions/v1"
else
  BASE_URL="https://gvfgvbztagafjykncwto.supabase.co/functions/v1"
fi

echo "Testing: $BASE_URL/$FUNCTION_NAME"
echo "---"

curl -X POST "$BASE_URL/$FUNCTION_NAME" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"test": true}'

echo ""
echo "---"
echo "Done"
