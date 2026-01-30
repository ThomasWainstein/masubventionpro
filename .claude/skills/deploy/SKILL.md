---
name: deploy
description: Deploy changes to production. Use when asked to deploy, push to production, release, or ship code.
allowed-tools: Read, Bash, Glob, Grep
---

# Deploy Changes

Use this skill when deploying code to production.

## Pre-Deployment Checklist

Before ANY deployment:

- [ ] `npm run build` passes with no errors
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] No uncommitted changes that shouldn't be deployed
- [ ] Edge functions deployed if modified

## Deploy to Production

```bash
# 1. Build check
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Commit changes
git add .
git commit -m "feat: description of changes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 4. Push to master (triggers Vercel deployment)
git push origin master

# 5. Verify deployment
# Check Vercel dashboard for deployment status
```

## Edge Function Deployment

```bash
# Deploy a specific function
npx supabase functions deploy [function-name]

# Check function logs
npx supabase functions logs [function-name]

# List all functions
npx supabase functions list
```

## Rollback

If something breaks:

**Via Vercel Dashboard:**
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

**Via Git:**
```bash
git revert HEAD
git push origin master
```

## Common Edge Functions in This Project

- `analyze-company-website` - Website intelligence scraping
- `enhanced-profile-conversation-stream` - AI chat with profile context
- `v5-hybrid-calculate-matches` - Subsidy matching algorithm
- `msp-create-checkout` - Stripe checkout session
- `msp-stripe-webhook` - Stripe webhook handler
- `msp-billing-portal` - Stripe billing portal
- `send-auth-email` - Authentication emails
- `send-export-email` - Export/report emails
