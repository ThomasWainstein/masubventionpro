/**
 * v5-hybrid-calculate-matches Edge Function
 *
 * AI-powered subsidy matching using Mistral AI with Pre-scoring Pipeline
 * GDPR-compliant French AI provider
 *
 * 5-PHASE PIPELINE:
 * 1. Profile Analysis - Extract sector, keywords, exclusions
 * 2. Targeted DB Queries - Simple parallel queries (avoid PostgREST 500)
 * 3. Local Pre-Scoring - Filter irrelevant subsidies BEFORE AI
 * 4. AI Fine-Tuning - Mistral refines top candidates
 * 5. Final Ranking - Sector-aware amount boost
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  createMistralCompletionWithRetry,
  buildSubsidyMatchingSystemPrompt,
  estimateTokens,
  type MistralMessage,
} from '../_shared/mistral.ts';
import {
  type ProfileInput,
  type SubsidyCandidate,
  type PreScoreResult,
  analyzeProfile,
  preScoreSubsidies,
  getTitle,
  getDescription,
  getEligibility,
  getSectorAwareAmountBoost,
  getAgencyBoost,
  getCompanySizeCategory,
} from '../_shared/matching.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Feature flag - set to 'false' via env to disable new pipeline
  USE_NEW_PIPELINE: Deno.env.get('V5_NEW_PIPELINE') !== 'false',

  // Timeouts
  OPERATION_TIMEOUT_MS: 25000, // 25s max for AI call (leave buffer)
  DB_TIMEOUT_MS: 5000,

  // Limits
  DB_QUERY_LIMIT: 100,       // Per query
  PRE_SCORE_MIN: 10,         // Minimum pre-score to keep
  PRE_SCORED_LIMIT: 30,      // Max candidates for AI (reduced from 100 to optimize token usage)
  FALLBACK_LIMIT: 200,       // Fallback query limit

  // Columns to select (only what we need)
  SUBSIDY_COLUMNS: 'id, title, description, agency, region, categories, primary_sector, keywords, funding_type, amount_min, amount_max, deadline, eligibility_criteria, legal_entities, is_universal_sector',
};

// ============================================================================
// TYPES
// ============================================================================

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
  pipeline_stats?: {
    candidates_fetched: number;
    pre_scored_count: number;
    ai_evaluated: boolean;
    fallback_reason?: string;  // Set when AI is skipped (rate_limited, timeout, error)
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Timeout wrapper - rejects if operation takes too long
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Merge and deduplicate subsidies from multiple queries
 */
function mergeAndDedupe(arrays: (SubsidyCandidate[] | null)[]): SubsidyCandidate[] {
  const seen = new Set<string>();
  const result: SubsidyCandidate[] = [];

  for (const arr of arrays) {
    if (!arr) continue;
    for (const item of arr) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
  }

  return result;
}

/**
 * Convert pre-score result to fallback match (no AI)
 */
function toFallbackMatch(result: PreScoreResult, analyzedProfile: ReturnType<typeof analyzeProfile>): SubsidyMatch {
  const score = Math.max(0, Math.min(100, result.preScore));

  // Add sector-aware amount boost
  const amountBoost = getSectorAwareAmountBoost(result.subsidy, analyzedProfile);
  const agencyBoost = getAgencyBoost(result.subsidy.agency);
  const finalScore = Math.min(100, score + amountBoost + agencyBoost);

  // Success probability based on pre-score (conservative)
  const successProbability = finalScore >= 70 ? 40 : finalScore >= 50 ? 25 : 15;

  return {
    subsidy_id: result.subsidy.id,
    match_score: finalScore,
    success_probability: successProbability,
    match_reasons: result.preReasons,
    matching_criteria: result.preReasons.map(r => r.split(':')[0]),
    missing_criteria: ['Évaluation AI non disponible'],
  };
}

/**
 * Build profile context string for AI prompt
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
    if (wi.digital?.score) lines.push(`Score digital: ${wi.digital.score}/100`);
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();
  let pipelineStats = {
    candidates_fetched: 0,
    pre_scored_count: 0,
    ai_evaluated: false,
  };

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

    // ========================================================================
    // PHASE 1: PROFILE ANALYSIS
    // ========================================================================
    console.log('[V5] Phase 1: Analyzing profile...');
    const analyzedProfile = analyzeProfile(profile);
    const companySize = getCompanySizeCategory(profile.employees);

    console.log(`[V5] Profile: sector=${analyzedProfile.sector}, size=${companySize}, region=${analyzedProfile.region}`);
    console.log(`[V5] Search terms: ${analyzedProfile.searchTerms.slice(0, 5).join(', ')}`);
    console.log(`[V5] Exclusions: ${analyzedProfile.exclusionKeywords.join(', ')}`);

    // ========================================================================
    // PHASE 2: TARGETED DATABASE QUERIES
    // ========================================================================
    console.log('[V5] Phase 2: Fetching candidates...');

    let candidates: SubsidyCandidate[] = [];

    try {
      // Query A: Region-matched (simple, no complex OR)
      const regionQuery = supabase
        .from('subsidies')
        .select(CONFIG.SUBSIDY_COLUMNS)
        .eq('is_active', true)
        .eq('is_business_relevant', true)
        .or(profile.region
          ? `region.cs.{"${profile.region}"},region.cs.{"National"},region.is.null`
          : 'region.cs.{"National"},region.is.null')
        .limit(CONFIG.DB_QUERY_LIMIT);

      // Query B: Sector-matched (only where primary_sector exists)
      const sectorQuery = analyzedProfile.sector
        ? supabase
            .from('subsidies')
            .select(CONFIG.SUBSIDY_COLUMNS)
            .eq('is_active', true)
            .eq('is_business_relevant', true)
            .ilike('primary_sector', `%${analyzedProfile.sector}%`)
            .limit(60)
        : Promise.resolve({ data: null, error: null });

      // Query C: High-value national programs (fallback)
      const nationalQuery = supabase
        .from('subsidies')
        .select(CONFIG.SUBSIDY_COLUMNS)
        .eq('is_active', true)
        .eq('is_business_relevant', true)
        .contains('region', ['National'])
        .gte('amount_max', 50000)
        .order('amount_max', { ascending: false })
        .limit(50);

      // Execute in parallel - each query is simple, avoids 500 errors
      const [regionResult, sectorResult, nationalResult] = await Promise.all([
        regionQuery,
        sectorQuery,
        nationalQuery,
      ]);

      if (regionResult.error) console.error('[V5] Region query error:', regionResult.error);
      if (sectorResult.error) console.error('[V5] Sector query error:', sectorResult.error);
      if (nationalResult.error) console.error('[V5] National query error:', nationalResult.error);

      candidates = mergeAndDedupe([
        regionResult.data as SubsidyCandidate[] | null,
        sectorResult.data as SubsidyCandidate[] | null,
        nationalResult.data as SubsidyCandidate[] | null,
      ]);

      console.log(`[V5] Fetched ${candidates.length} unique candidates`);
    } catch (dbError) {
      // Fallback: simple query if parallel queries fail
      console.error('[V5] Phase 2 failed, using fallback query:', dbError);

      const { data } = await supabase
        .from('subsidies')
        .select(CONFIG.SUBSIDY_COLUMNS)
        .eq('is_active', true)
        .eq('is_business_relevant', true)
        .limit(CONFIG.FALLBACK_LIMIT);

      candidates = (data as SubsidyCandidate[]) || [];
    }

    pipelineStats.candidates_fetched = candidates.length;

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          processing_time_ms: Date.now() - startTime,
          tokens_used: { input: 0, output: 0 },
          pipeline_stats: pipelineStats,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // PHASE 3: LOCAL PRE-SCORING
    // ========================================================================
    console.log('[V5] Phase 3: Pre-scoring candidates...');

    const preScored = preScoreSubsidies(candidates, analyzedProfile, {
      minScore: CONFIG.PRE_SCORE_MIN,
      maxResults: CONFIG.PRE_SCORED_LIMIT,
      includeUncertain: true,
    });

    pipelineStats.pre_scored_count = preScored.length;
    console.log(`[V5] Pre-scored: ${preScored.length} candidates (filtered from ${candidates.length})`);

    // Log top 5 for debugging
    for (const ps of preScored.slice(0, 5)) {
      console.log(`[V5]   ${ps.preScore}pts: ${getTitle(ps.subsidy).substring(0, 50)}... [${ps.preReasons.join(', ')}]`);
    }

    // ========================================================================
    // PHASE 4: AI FINE-TUNING
    // ========================================================================
    console.log('[V5] Phase 4: AI evaluation...');

    let matches: SubsidyMatch[] = [];

    try {
      // Build COMPACT subsidies context for AI to minimize token usage
      // Using short keys: i=index, t=title, s=sector, r=region, p=pre_score, rs=reasons
      const subsidiesContext = preScored.map((ps, i) => {
        const s = ps.subsidy;
        return {
          i,                                                    // index
          id: s.id,
          t: getTitle(s).substring(0, 60),                     // title (compact)
          s: s.primary_sector?.substring(0, 20) || null,       // sector
          r: s.region?.[0]?.substring(0, 15) || 'National',    // first region only
          a: s.amount_max ? `${Math.round(s.amount_max / 1000)}k€` : null,  // amount
          p: ps.preScore,                                       // pre_score
          rs: ps.preReasons.slice(0, 2),                       // top 2 reasons only
        };
      });

      const profileContext = buildProfileContext(profile);
      const systemPrompt = buildSubsidyMatchingSystemPrompt();

      // Compact prompt to reduce tokens
      const userPrompt = `Évalue l'éligibilité de cette entreprise aux ${subsidiesContext.length} subventions PRÉ-QUALIFIÉES.

ENTREPRISE:
${profileContext}
Taille: ${companySize}

SUBVENTIONS (format compact: i=index, t=titre, s=secteur, r=région, a=montant, p=pre_score, rs=raisons):
${JSON.stringify(subsidiesContext)}

RÈGLES:
- Partir du p (pre_score) et AJUSTER de +/- 25pts max
- AUGMENTER si secteur/taille/région correspondent bien
- DIMINUER si critères restrictifs (taille, CA, zone géographique)

RETOURNE les ${limit} meilleures en JSON:
{"matches":[{"i":0,"adj":5,"score":85,"reasons":["R1","R2"],"ok":["critère"],"missing":["à vérifier"]}]}

STRICT: JSON uniquement, score=p+adj (0-100), varier les scores`;

      const messages: MistralMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Call Mistral with retry and timeout
      const aiResponse = await withTimeout(
        createMistralCompletionWithRetry(mistralApiKey, {
          messages,
          temperature: 0.2,
          max_tokens: 8192,
        }, 3),
        CONFIG.OPERATION_TIMEOUT_MS,
        'AI evaluation'
      );

      pipelineStats.ai_evaluated = true;

      const aiContent = aiResponse.choices[0]?.message?.content || '{"matches": []}';

      // Parse AI response (supports both compact and full format)
      let aiMatches: { matches: Array<{
        i?: number;              // compact: index
        subsidy_index?: number;  // full: index
        adj?: number;            // compact: adjustment
        ai_adjustment?: number;  // full: adjustment
        score?: number;          // compact: score
        match_score?: number;    // full: score
        reasons?: string[];      // compact: reasons
        match_reasons?: string[];// full: reasons
        ok?: string[];           // compact: matching_criteria
        matching_criteria?: string[];
        missing?: string[];      // compact: missing_criteria
        missing_criteria?: string[];
      }> };

      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiMatches = JSON.parse(jsonMatch[0]);
        } else {
          aiMatches = { matches: [] };
        }
      } catch {
        console.error('[V5] Failed to parse AI response:', aiContent.substring(0, 200));
        aiMatches = { matches: [] };
      }

      // ========================================================================
      // PHASE 5: FINAL RANKING WITH SECTOR-AWARE BOOSTS
      // ========================================================================
      console.log('[V5] Phase 5: Final ranking...');

      matches = aiMatches.matches
        .filter(m => {
          const idx = m.i ?? m.subsidy_index ?? -1;
          return idx >= 0 && idx < preScored.length;
        })
        .map(m => {
          const idx = m.i ?? m.subsidy_index ?? 0;
          const preScoreResult = preScored[idx];
          const subsidy = preScoreResult.subsidy;

          // Start with AI score (supports both compact and full format)
          const rawScore = m.score ?? m.match_score ?? preScoreResult.preScore;
          let matchScore = Math.min(100, Math.max(0, rawScore));

          // Apply sector-aware boosts
          const amountBoost = getSectorAwareAmountBoost(subsidy, analyzedProfile);
          const agencyBoost = getAgencyBoost(subsidy.agency);
          matchScore = Math.min(100, matchScore + amountBoost + agencyBoost);

          // Success probability (conservative)
          const successProbability = matchScore >= 90 ? 70 :
                                     matchScore >= 70 ? 50 :
                                     matchScore >= 50 ? 30 : 15;

          // Combine reasons (supports both compact and full format)
          const aiReasons = m.reasons ?? m.match_reasons ?? [];
          const boostReasons = [...aiReasons];
          if (amountBoost > 0) {
            boostReasons.push(`Montant élevé (+${amountBoost}pts)`);
          }
          if (agencyBoost >= 4) {
            boostReasons.push(`Programme stratégique (+${agencyBoost}pts)`);
          }

          return {
            subsidy_id: subsidy.id,
            match_score: matchScore,
            success_probability: successProbability,
            match_reasons: boostReasons,
            matching_criteria: m.ok ?? m.matching_criteria ?? [],
            missing_criteria: m.missing ?? m.missing_criteria ?? [],
          };
        })
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);

      // Log token usage
      const inputTokens = aiResponse.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt);
      const outputTokens = aiResponse.usage?.completion_tokens || estimateTokens(aiContent);

      console.log(`[V5] AI tokens: ${inputTokens} in / ${outputTokens} out`);

      // Store compliance event
      try {
        await supabase.from('compliance_events').insert({
          event_type: 'subsidy_recommendation_generated',
          function_name: 'v5-hybrid-calculate-matches',
          user_id: profile.id,
          profile_id: profile.id,
          input_snapshot: {
            profile_summary: {
              company_name: profile.company_name,
              sector: analyzedProfile.sector,
              region: profile.region,
              employees: profile.employees,
            },
            subsidies_analyzed: candidates.length,
            pre_scored_count: preScored.length,
          },
          ai_output: {
            matches_count: matches.length,
            top_match_score: matches[0]?.match_score || 0,
            processing_time_ms: Date.now() - startTime,
            pipeline_version: 'v5.1-prescored',
          },
          model_provider: 'mistral',
          model_version: 'mistral-small-latest',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });
      } catch (logError) {
        console.error('[V5] Failed to log compliance event:', logError);
      }

      const response: MatchResponse = {
        matches,
        processing_time_ms: Date.now() - startTime,
        tokens_used: { input: inputTokens, output: outputTokens },
        pipeline_stats: pipelineStats,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      // AI failed - return pre-scored results as fallback
      console.error('[V5] AI evaluation failed, returning pre-scores:', aiError);

      matches = preScored
        .slice(0, limit)
        .map(ps => toFallbackMatch(ps, analyzedProfile));

      // Log fallback event
      try {
        await supabase.from('compliance_events').insert({
          event_type: 'subsidy_recommendation_generated',
          function_name: 'v5-hybrid-calculate-matches',
          user_id: profile.id,
          profile_id: profile.id,
          input_snapshot: {
            profile_summary: {
              company_name: profile.company_name,
              sector: analyzedProfile.sector,
              region: profile.region,
            },
            subsidies_analyzed: candidates.length,
            pre_scored_count: preScored.length,
            fallback_reason: (aiError as Error).message,
          },
          ai_output: {
            matches_count: matches.length,
            top_match_score: matches[0]?.match_score || 0,
            processing_time_ms: Date.now() - startTime,
            pipeline_version: 'v5.1-fallback',
          },
          model_provider: 'mistral',
          model_version: 'mistral-small-latest',
          input_tokens: 0,
          output_tokens: 0,
          system_status: 'degraded',
          error_message: (aiError as Error).message,
        });
      } catch (logError) {
        console.error('[V5] Failed to log fallback event:', logError);
      }

      // Determine fallback reason from error message
      const errorMsg = (aiError as Error).message || 'unknown';
      const fallbackReason = errorMsg.includes('429') || errorMsg.includes('rate')
        ? 'rate_limited'
        : errorMsg.includes('timeout')
          ? 'timeout'
          : 'ai_error';

      const response: MatchResponse = {
        matches,
        processing_time_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
        pipeline_stats: {
          ...pipelineStats,
          ai_evaluated: false,
          fallback_reason: fallbackReason,
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[V5] Match calculation error:', error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Internal server error',
        processing_time_ms: Date.now() - startTime,
        pipeline_stats: pipelineStats,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
