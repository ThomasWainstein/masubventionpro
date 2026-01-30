# New Edge Function Checklist

## Before Creating

- [ ] Determine function name (use kebab-case: `my-function-name`)
- [ ] Decide auth pattern (verify_jwt true/false)
- [ ] Check if similar function exists in `supabase/functions/`

## Creation Steps

- [ ] Create folder: `supabase/functions/[name]/`
- [ ] Create `index.ts` with proper template
- [ ] Add CORS handling for preflight requests
- [ ] Use environment variables for secrets

## Configuration

- [ ] Add to `supabase/config.toml`:
```toml
[functions.[name]]
verify_jwt = true  # or false for public/webhook endpoints
```

## Documentation

- [ ] Add entry to `supabase/functions/README.md`
- [ ] Document request/response format
- [ ] Document any required environment variables

## Deployment

- [ ] Deploy: `npx supabase functions deploy [name]`
- [ ] Verify in Supabase dashboard
- [ ] Test with curl or from frontend

## Testing

- [ ] Test happy path
- [ ] Test error cases
- [ ] Test CORS (from browser)
- [ ] Check logs: `npx supabase functions logs [name]`
