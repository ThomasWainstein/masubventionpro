# MaSubventionPro Coding Rules

> Domain-specific rules for working with the MaSubventionPro codebase.
> These rules prevent common errors and ensure consistency.

## French Language Requirements

### All User-Facing Text Must Be in French

```typescript
// ❌ WRONG
toast.success('Profile saved successfully');

// ✅ CORRECT
toast.success('Profil enregistré avec succès');
```

### Common French Phrases

| Concept | French |
|---------|--------|
| Save | Enregistrer |
| Cancel | Annuler |
| Delete | Supprimer |
| Loading | Chargement |
| Error | Erreur |
| Success | Succès |
| Profile | Profil |
| Subsidy | Subvention |
| Company | Entreprise |
| Search | Rechercher |

---

## Supabase Query Rules

### Handle Multilingual Title Fields

Some tables have `title` as TEXT or JSONB (multilingual):

```typescript
// ❌ WRONG - assumes title is always string
const title = subsidy.title;

// ✅ CORRECT - handle both cases
import { getSubsidyTitle } from '@/lib/subsidyUtils';
const title = getSubsidyTitle(subsidy);

// Or inline:
const title = typeof subsidy.title === 'object'
  ? subsidy.title?.fr || subsidy.title?.en
  : subsidy.title;
```

### Use Proper Error Handling

```typescript
// ❌ WRONG - silent failures
const { data } = await supabase.from('subsidies').select('*');

// ✅ CORRECT - check for errors
const { data, error } = await supabase.from('subsidies').select('*');
if (error) {
  console.error('Failed to fetch subsidies:', error);
  throw error;
}
```

---

## Edge Function Rules

### 1. CORS is Required for All Responses

```typescript
// ❌ WRONG - browser will block
return new Response(JSON.stringify(data));

// ✅ CORRECT
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### 2. Handle OPTIONS First

```typescript
Deno.serve(async (req) => {
  // ✅ This MUST be first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rest of handler...
});
```

### 3. Use Environment Variables

```typescript
// ❌ WRONG - hardcoded secrets
const apiKey = 'sk-xxxxx';

// ✅ CORRECT
const apiKey = Deno.env.get('OPENAI_API_KEY');
```

---

## React Component Rules

### Use shadcn/ui Components

This project uses shadcn/ui. Always use existing components:

```typescript
// ❌ WRONG - custom button
<button className="bg-blue-500 text-white px-4 py-2">Click</button>

// ✅ CORRECT - shadcn Button
import { Button } from '@/components/ui/button';
<Button>Click</Button>
```

### Form Handling with React Hook Form

```typescript
// ✅ CORRECT pattern
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2, 'Nom trop court'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

---

## Anti-Hallucination Rules

When generating content about subsidies:

1. **NEVER invent subsidy names** - Use only data from database
2. **NEVER fabricate amounts** - Reference actual subsidy data
3. **Say "Information non disponible"** rather than guess
4. **Always cite data source** when showing statistics

---

## Key Tables Quick Reference

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `subsidies` | All subsidies | `title`, `description`, `regions`, `sectors` |
| `applicant_profiles` | User company profiles | `profile_data`, `user_id` |
| `profile_subsidy_matches` | Pre-calculated matches | `match_score`, `profile_id`, `subsidy_id` |
| `organizations` | Funding organizations | `name`, `logo_url` |
| `user_saved_subsidies` | Bookmarked subsidies | `user_id`, `subsidy_id` |
| `user_subscription_status` | Stripe subscriptions | `subscription_tier`, `user_id` |

---

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/         # shadcn/ui primitives
│   └── ...         # Feature components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── pages/          # Page components (React Router)
├── contexts/       # React contexts
└── integrations/   # External service integrations
    └── supabase/   # Supabase client & types

supabase/
├── functions/      # Edge Functions
├── migrations/     # SQL migrations
└── config.toml     # Supabase configuration
```
