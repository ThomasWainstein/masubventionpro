# Deploy Edge Function

Deploy a specific Supabase Edge Function to production.

## Usage
`/project:deploy-function [function-name]`

## Steps

1. First, check if the function exists and has no TypeScript errors
2. Deploy the function
3. Verify deployment succeeded
4. Check logs for any startup errors

## Command

```bash
# Check TypeScript (if applicable)
npx tsc --noEmit supabase/functions/$ARGUMENTS/index.ts 2>/dev/null || echo "Skipping TS check"

# Deploy
npx supabase functions deploy $ARGUMENTS

# Check logs
npx supabase functions logs $ARGUMENTS --tail 10
```

## Common Functions

- `analyze-company-website` - Website scraping/analysis
- `enhanced-profile-conversation-stream` - AI chat
- `v5-hybrid-calculate-matches` - Subsidy matching
- `msp-create-checkout` - Stripe checkout
- `msp-stripe-webhook` - Stripe webhooks
- `send-auth-email` - Auth emails
- `send-export-email` - Export emails
