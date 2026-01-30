# Edge Functions Reference

> Quick reference for all Supabase Edge Functions in MaSubventionPro.

## Function Inventory

| Function | Purpose | Auth | Notes |
|----------|---------|------|-------|
| `analyze-company-website` | Scrape & analyze company website | Service Role | AI-powered analysis |
| `enhanced-profile-conversation-stream` | AI chat with profile context | Service Role | Streaming response |
| `v5-hybrid-calculate-matches` | Calculate subsidy matches | Service Role | V5 matching algorithm |
| `msp-create-checkout` | Create Stripe checkout session | JWT | Requires authenticated user |
| `msp-stripe-webhook` | Handle Stripe webhooks | Webhook signature | No JWT |
| `msp-billing-portal` | Stripe billing portal URL | JWT | Requires authenticated user |
| `msp-create-upgrade` | Handle subscription upgrades | JWT | Requires authenticated user |
| `send-auth-email` | Send authentication emails | Service Role | Resend integration |
| `send-export-email` | Send export/report emails | Service Role | Resend integration |
| `create-checkout-session` | Legacy checkout (deprecated?) | JWT | Check if still used |
| `verify-checkout-session` | Verify Stripe session | JWT | Check if still used |

## Common Patterns

### CORS Headers
All functions should include CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
```

### Error Response Pattern
```typescript
return new Response(JSON.stringify({
  error: error.message,
  code: 'ERROR_CODE'
}), {
  status: 500,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### Supabase Client Setup
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
```

## Deployment Commands

```bash
# Deploy single function
npx supabase functions deploy [function-name]

# Deploy all functions
npx supabase functions deploy

# View logs
npx supabase functions logs [function-name]

# List functions
npx supabase functions list
```

## Environment Variables

Required secrets (set via Supabase dashboard or CLI):
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided
- `STRIPE_SECRET_KEY` - For payment functions
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `RESEND_API_KEY` - For email functions
- `OPENAI_API_KEY` - For AI functions
- `DEEPSEEK_API` - For DeepSeek AI (if used)
