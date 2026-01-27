# MaSubventionPro Supabase Edge Functions

AI-powered functions using Mistral AI (GDPR-compliant French provider).

## Functions

| Function | Description |
|----------|-------------|
| `v5-hybrid-calculate-matches` | AI subsidy matching based on profile |
| `enhanced-profile-conversation-stream` | Streaming chat assistant |
| `analyze-company-website` | Website intelligence extraction |
| `msp-send-email` | Transactional emails via Resend |
| `send-export-email` | Transmit subsidies via email with PDF attachment |

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
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
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

### msp-send-email

Send transactional emails via Resend (noreply@masubventionpro.com).

**Welcome email:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/msp-send-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "to": "user@example.com",
    "userName": "John"
  }'
```

**Subsidy match notification:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/msp-send-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subsidy_match",
    "to": "user@example.com",
    "userName": "John",
    "subsidyCount": 5
  }'
```

**Custom email:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/msp-send-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "to": "user@example.com",
    "subject": "Your custom subject",
    "html": "<h1>Hello</h1><p>Your message here</p>"
  }'
```

### send-export-email

Transmit subsidies to a recipient via email with PDF attachment (noreply@masubventionpro.com).

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-export-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "recipient@example.com",
    "recipientName": "Jean Dupont",
    "ccEmails": ["copy@example.com"],
    "subject": "3 aides identifiees pour votre entreprise",
    "body": "Bonjour,\n\nVoici les aides que j'\''ai identifiees...",
    "pdfBase64": "<base64-encoded-pdf>",
    "pdfFilename": "rapport_aides.pdf",
    "source": "masubventionpro"
  }'
```

**Parameters:**
- `recipientEmail` (required): Recipient email address
- `recipientName` (optional): Recipient name for greeting
- `ccEmails` (optional): Array of CC email addresses
- `subject` (required): Email subject line
- `body` (required): Email body (supports markdown **bold** and *italic*)
- `pdfBase64` (optional): Base64-encoded PDF attachment
- `pdfFilename` (optional): Filename for PDF attachment
- `source` (optional): `masubventionpro` or `subvention360` for branding

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
