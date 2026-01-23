# MaSubventionPro Supabase Edge Functions

AI-powered functions using Mistral AI (GDPR-compliant French provider).

## Functions

| Function | Description |
|----------|-------------|
| `v5-hybrid-calculate-matches` | AI subsidy matching based on profile |
| `enhanced-profile-conversation-stream` | Streaming chat assistant |
| `analyze-company-website` | Website intelligence extraction |

## Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Mistral API key from [console.mistral.ai](https://console.mistral.ai)
3. Supabase project linked

## Setup

### 1. Link your Supabase project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set secrets

```bash
supabase secrets set MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. Deploy functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy v5-hybrid-calculate-matches
supabase functions deploy enhanced-profile-conversation-stream
supabase functions deploy analyze-company-website
```

## Local Development

### Start local Supabase

```bash
supabase start
```

### Run function locally

```bash
supabase functions serve --env-file .env.local
```

Create `.env.local` with:

```
MISTRAL_API_KEY=your_mistral_api_key
```

## API Usage

### v5-hybrid-calculate-matches

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/v5-hybrid-calculate-matches' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "id": "profile-uuid",
      "company_name": "Example Corp",
      "sector": "tech",
      "region": "Ile-de-France",
      "employees": "11-50"
    },
    "limit": 10
  }'
```

### enhanced-profile-conversation-stream

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/enhanced-profile-conversation-stream' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "profile_id": "profile-uuid",
    "message": "Quelles aides pour l'\''innovation?",
    "profile": {
      "company_name": "Example Corp",
      "sector": "tech"
    },
    "conversation_history": []
  }'
```

### analyze-company-website

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/analyze-company-website' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "profile_id": "profile-uuid",
    "website_url": "https://example.com"
  }'
```

## Compliance

All functions log to `compliance_events` table for EU AI Act Article 12/19 compliance.

Logged data includes:
- Event type and timestamp
- Token usage (input/output)
- Model provider and version
- Processing time
- Anonymized input/output summaries

## Pricing (Mistral Small)

| Type | Price per 1M tokens |
|------|---------------------|
| Input | $0.10 |
| Output | $0.30 |

Estimated costs per operation:
- Subsidy matching: ~$0.001 per request
- Chat message: ~$0.0005 per message
- Website analysis: ~$0.002 per analysis
