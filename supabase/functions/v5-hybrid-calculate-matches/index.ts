/**
 * v5-hybrid-calculate-matches Edge Function
 *
 * AI-powered subsidy matching using Mistral AI
 * GDPR-compliant French AI provider
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  createMistralCompletion,
  buildSubsidyMatchingSystemPrompt,
  estimateTokens,
  type MistralMessage,
} from '../_shared/mistral.ts';

interface ProfileInput {
  id: string;
  company_name: string;
  siret?: string;
  naf_code?: string;
  naf_label?: string;
  sector?: string;
  sub_sector?: string;
  region?: string;
  department?: string;
  employees?: string;
  annual_turnover?: number;
  year_created?: number;
  legal_form?: string;
  company_category?: string;
  project_types?: string[];
  certifications?: string[];
  description?: string;
  website_intelligence?: Record<string, unknown>;
}

interface SubsidyMatch {
  subsidy_id: string;
  match_score: number;
  success_probability: number;
  match_reasons: string[];
  matching_criteria: string[];
  missing_criteria: string[];
}

interface MatchResponse {
  matches: SubsidyMatch[];
  processing_time_ms: number;
  tokens_used: {
    input: number;
    output: number;
  };
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();

  try {
    // Get API keys from environment
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Parse request body
    const { profile, limit = 20 } = await req.json() as {
      profile: ProfileInput;
      limit?: number;
    };

    if (!profile || !profile.id) {
      throw new Error('Profile is required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch subsidies from database
    const { data: subsidies, error: subsidiesError } = await supabase
      .from('subsidies')
      .select('id, title, description, agency, region, categories, primary_sector, keywords, funding_type, amount_min, amount_max, deadline')
      .eq('is_active', true)
      .limit(100);

    if (subsidiesError) {
      throw new Error(`Failed to fetch subsidies: ${subsidiesError.message}`);
    }

    if (!subsidies || subsidies.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          processing_time_ms: Date.now() - startTime,
          tokens_used: { input: 0, output: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build profile context for AI
    const profileContext = buildProfileContext(profile);

    // Build subsidies context (simplified for token efficiency)
    const subsidiesContext = subsidies.map((s, i) => ({
      index: i,
      id: s.id,
      title: typeof s.title === 'object' ? s.title?.fr || s.title?.en : s.title,
      sector: s.primary_sector,
      region: s.region,
      categories: s.categories,
      funding_type: s.funding_type,
    }));

    // Build AI prompt
    const systemPrompt = buildSubsidyMatchingSystemPrompt();
    const userPrompt = `Analyse ce profil d'entreprise et identifie les subventions les plus pertinentes.

PROFIL DE L'ENTREPRISE:
${profileContext}

SUBVENTIONS DISPONIBLES (format JSON):
${JSON.stringify(subsidiesContext, null, 2)}

INSTRUCTIONS:
1. Analyse la correspondance entre le profil et chaque subvention
2. Retourne un JSON avec les ${limit} meilleures correspondances
3. Pour chaque correspondance, fournis:
   - subsidy_index: l'index de la subvention
   - match_score: score de 0 à 100
   - success_probability: probabilité de succès estimée (0-100)
   - match_reasons: liste des raisons de correspondance
   - matching_criteria: critères remplis
   - missing_criteria: critères manquants ou incertains

FORMAT DE RÉPONSE (JSON uniquement):
{
  "matches": [
    {
      "subsidy_index": 0,
      "match_score": 85,
      "success_probability": 70,
      "match_reasons": ["Secteur correspondant", "Région éligible"],
      "matching_criteria": ["PME", "Région Ile-de-France"],
      "missing_criteria": ["Certification ISO non confirmée"]
    }
  ]
}`;

    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Call Mistral AI
    const aiResponse = await createMistralCompletion(mistralApiKey, {
      messages,
      temperature: 0.2,
      max_tokens: 4096,
    });

    const aiContent = aiResponse.choices[0]?.message?.content || '{"matches": []}';

    // Parse AI response
    let aiMatches: { matches: Array<{
      subsidy_index: number;
      match_score: number;
      success_probability: number;
      match_reasons: string[];
      matching_criteria: string[];
      missing_criteria: string[];
    }> };

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiMatches = JSON.parse(jsonMatch[0]);
      } else {
        aiMatches = { matches: [] };
      }
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      aiMatches = { matches: [] };
    }

    // Map AI matches to subsidy IDs
    const matches: SubsidyMatch[] = aiMatches.matches
      .filter(m => m.subsidy_index >= 0 && m.subsidy_index < subsidies.length)
      .map(m => ({
        subsidy_id: subsidies[m.subsidy_index].id,
        match_score: Math.min(100, Math.max(0, m.match_score)),
        success_probability: Math.min(100, Math.max(0, m.success_probability)),
        match_reasons: m.match_reasons || [],
        matching_criteria: m.matching_criteria || [],
        missing_criteria: m.missing_criteria || [],
      }))
      .slice(0, limit);

    // Log usage
    const inputTokens = aiResponse.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt);
    const outputTokens = aiResponse.usage?.completion_tokens || estimateTokens(aiContent);

    // Store in compliance_events table
    try {
      await supabase.from('compliance_events').insert({
        event_type: 'subsidy_recommendation_generated',
        function_name: 'v5-hybrid-calculate-matches',
        user_id: profile.id, // This should be the actual user_id in production
        profile_id: profile.id,
        input_snapshot: {
          profile_summary: {
            company_name: profile.company_name,
            sector: profile.sector,
            region: profile.region,
            employees: profile.employees,
          },
          subsidies_analyzed: subsidies.length,
        },
        ai_output: {
          matches_count: matches.length,
          top_match_score: matches[0]?.match_score || 0,
          processing_time_ms: Date.now() - startTime,
        },
        model_provider: 'mistral',
        model_version: 'mistral-small-latest',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });
    } catch (logError) {
      console.error('Failed to log compliance event:', logError);
    }

    const response: MatchResponse = {
      matches,
      processing_time_ms: Date.now() - startTime,
      tokens_used: {
        input: inputTokens,
        output: outputTokens,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Match calculation error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Build a structured context string from profile data
 */
function buildProfileContext(profile: ProfileInput): string {
  const lines: string[] = [];

  if (profile.company_name) lines.push(`Nom: ${profile.company_name}`);
  if (profile.naf_code) lines.push(`Code NAF: ${profile.naf_code} (${profile.naf_label || 'N/A'})`);
  if (profile.sector) lines.push(`Secteur: ${profile.sector}`);
  if (profile.sub_sector) lines.push(`Sous-secteur: ${profile.sub_sector}`);
  if (profile.region) lines.push(`Région: ${profile.region}`);
  if (profile.department) lines.push(`Département: ${profile.department}`);
  if (profile.employees) lines.push(`Effectif: ${profile.employees} salariés`);
  if (profile.annual_turnover) lines.push(`CA annuel: ${profile.annual_turnover.toLocaleString('fr-FR')} €`);
  if (profile.year_created) lines.push(`Année de création: ${profile.year_created}`);
  if (profile.legal_form) lines.push(`Forme juridique: ${profile.legal_form}`);
  if (profile.company_category) lines.push(`Catégorie: ${profile.company_category}`);
  if (profile.project_types?.length) lines.push(`Types de projets: ${profile.project_types.join(', ')}`);
  if (profile.certifications?.length) lines.push(`Certifications: ${profile.certifications.join(', ')}`);
  if (profile.description) lines.push(`Description: ${profile.description}`);

  // Add website intelligence if available
  if (profile.website_intelligence) {
    const wi = profile.website_intelligence;
    if (wi.companyDescription) lines.push(`Activité (web): ${wi.companyDescription}`);
    if (wi.innovations?.score) lines.push(`Score innovation: ${wi.innovations.score}/100`);
    if (wi.sustainability?.score) lines.push(`Score RSE: ${wi.sustainability.score}/100`);
    if (wi.export?.score) lines.push(`Score export: ${wi.export.score}/100`);
  }

  return lines.join('\n');
}
