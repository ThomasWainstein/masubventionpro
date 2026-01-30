---
name: new-edge-function
description: Create a new Supabase Edge Function. Use when asked to add, create, or build a new edge function, serverless function, or API endpoint.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Create New Edge Function

Use this skill when creating a new Supabase Edge Function.

## Before You Start

1. Read the [checklist](checklist.md) for required steps
2. Determine the correct auth pattern (see below)

## Auth Patterns

| Pattern | verify_jwt | Use Case | Example |
|---------|-----------|----------|---------|
| Supabase Auth | `true` | User must be logged in | get-user-profile |
| Internal/AI | `false` + custom auth | AI endpoints | enhanced-profile-conversation-stream |
| Public | `false` | Open endpoints | health-check |
| Webhook | `false` + signature verify | External webhooks | msp-stripe-webhook |

## Required Steps

1. Create `supabase/functions/[name]/index.ts`
2. Add to `supabase/config.toml` with correct `verify_jwt`
3. Update `supabase/functions/README.md`
4. Deploy with `npx supabase functions deploy [name]`
5. Test the endpoint

## Code Template

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Your logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

## Common Mistakes to Avoid

- **DON'T** forget CORS headers on error responses
- **DON'T** hardcode API keys - use `Deno.env.get()`
- **DON'T** forget to handle OPTIONS preflight requests
- **DON'T** forget to update config.toml and README
