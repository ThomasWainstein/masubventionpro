/**
 * calculate-profile-recommendations Edge Function
 *
 * Calculates and stores subsidy recommendations for a profile.
 * Called on profile creation and by cron job for periodic refresh.
 *
 * MODES:
 * - full: Calculate all matching subsidies (profile creation)
 * - incremental: Only check new subsidies since last refresh (cron)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  type ProfileInput,
  type SubsidyCandidate,
  analyzeProfile,
  preScoreSubsidies,
} from '../_shared/matching.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  DB_TIMEOUT_MS: 10000,
  MIN_MATCH_SCORE: 25,        // Minimum score to store
  BATCH_INSERT_SIZE: 50,      // Insert in batches
  SUBSIDY_COLUMNS: 'id, title, description, agency, region, categories, primary_sector, keywords, funding_type, amount_min, amount_max, deadline, eligibility_criteria, legal_entities, is_universal_sector',
};

// ============================================================================
// TYPES
// ============================================================================

interface RecommendationResult {
  profile_id: string;
  total_matches: number;
  new_matches: number;
  processing_time_ms: number;
  mode: 'full' | 'incremental';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();

  try {
    // Get configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Parse request
    const body = await req.json();
    const {
      profile_id,
      mode = 'full',  // 'full' for new profiles, 'incremental' for cron
    } = body as {
      profile_id: string;
      mode?: 'full' | 'incremental';
    };

    if (!profile_id) {
      throw new Error('profile_id is required');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Recs] Starting ${mode} calculation for profile ${profile_id}`);

    // ========================================================================
    // STEP 1: FETCH PROFILE
    // ========================================================================
    const { data: profileData, error: profileError } = await supabase
      .from('masubventionpro_profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profileData) {
      throw new Error(`Profile not found: ${profileError?.message || 'Unknown'}`);
    }

    // Map to ProfileInput format
    const profile: ProfileInput = {
      id: profileData.id,
      company_name: profileData.company_name,
      siret: profileData.siret,
      siren: profileData.siren,
      naf_code: profileData.naf_code,
      naf_label: profileData.naf_label,
      sector: profileData.sector,
      sub_sector: profileData.sub_sector,
      region: profileData.region,
      department: profileData.department,
      city: profileData.city,
      postal_code: profileData.postal_code,
      employees: profileData.employees,
      annual_turnover: profileData.annual_turnover,
      year_created: profileData.year_created,
      legal_form: profileData.legal_form,
      company_category: profileData.company_category,
      project_types: profileData.project_types,
      certifications: profileData.certifications,
      description: profileData.description,
      website_url: profileData.website_url,
      website_intelligence: profileData.website_intelligence,
      is_association: profileData.is_association,
      association_type: profileData.association_type,
      association_purpose: profileData.association_purpose,
    };

    console.log(`[Recs] Profile: ${profile.company_name}, sector=${profile.sector}, region=${profile.region}`);

    // Analyze profile for matching
    const analyzedProfile = analyzeProfile(profile);

    // ========================================================================
    // STEP 2: FETCH SUBSIDIES
    // ========================================================================
    const today = new Date().toISOString().split('T')[0];

    let subsidyQuery = supabase
      .from('subsidies')
      .select(CONFIG.SUBSIDY_COLUMNS)
      .eq('is_active', true)
      .eq('is_business_relevant', true)
      .or(`deadline.is.null,deadline.gte.${today}`);

    // For incremental mode, only get new subsidies
    if (mode === 'incremental' && profileData.last_subsidy_refresh_at) {
      subsidyQuery = subsidyQuery.gte('created_at', profileData.last_subsidy_refresh_at);
      console.log(`[Recs] Incremental: checking subsidies since ${profileData.last_subsidy_refresh_at}`);
    }

    const { data: subsidies, error: subsidyError } = await subsidyQuery;

    if (subsidyError) {
      throw new Error(`Failed to fetch subsidies: ${subsidyError.message}`);
    }

    const candidates = (subsidies || []) as SubsidyCandidate[];
    console.log(`[Recs] Found ${candidates.length} subsidies to evaluate`);

    if (candidates.length === 0) {
      // Update refresh timestamp even if no new subsidies
      await supabase
        .from('masubventionpro_profiles')
        .update({ last_subsidy_refresh_at: new Date().toISOString() })
        .eq('id', profile_id);

      return new Response(JSON.stringify({
        profile_id,
        total_matches: 0,
        new_matches: 0,
        processing_time_ms: Date.now() - startTime,
        mode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // STEP 3: SCORE SUBSIDIES
    // ========================================================================
    console.log('[Recs] Scoring subsidies...');

    const preScored = preScoreSubsidies(candidates, analyzedProfile, {
      minScore: CONFIG.MIN_MATCH_SCORE,
      maxResults: 1000, // Store more for long-term cache
      includeUncertain: false,
    });

    console.log(`[Recs] ${preScored.length} subsidies passed threshold (score >= ${CONFIG.MIN_MATCH_SCORE})`);

    // ========================================================================
    // STEP 4: STORE RECOMMENDATIONS
    // ========================================================================
    console.log('[Recs] Storing recommendations...');

    let newMatches = 0;

    // Prepare records for insertion
    const records = preScored.map(ps => ({
      profile_id,
      subsidy_id: ps.subsidy.id,
      match_score: Math.min(100, Math.max(0, ps.preScore)),
      match_reasons: ps.preReasons,
      first_matched_at: new Date().toISOString(),
    }));

    // Insert in batches with ON CONFLICT DO NOTHING
    for (let i = 0; i < records.length; i += CONFIG.BATCH_INSERT_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_INSERT_SIZE);

      const { data: insertedData, error: insertError } = await supabase
        .from('profile_recommended_subsidies')
        .upsert(batch, {
          onConflict: 'profile_id,subsidy_id',
          ignoreDuplicates: true, // Don't update existing (preserves first_matched_at)
        })
        .select('id');

      if (insertError) {
        console.error(`[Recs] Insert batch error:`, insertError);
      } else {
        newMatches += insertedData?.length || 0;
      }
    }

    // ========================================================================
    // STEP 5: UPDATE PROFILE METADATA
    // ========================================================================
    const { error: updateError } = await supabase
      .from('masubventionpro_profiles')
      .update({
        last_subsidy_refresh_at: new Date().toISOString(),
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('[Recs] Failed to update profile refresh timestamp:', updateError);
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('profile_recommended_subsidies')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile_id)
      .is('dismissed_at', null);

    const result: RecommendationResult = {
      profile_id,
      total_matches: totalCount || 0,
      new_matches: newMatches,
      processing_time_ms: Date.now() - startTime,
      mode,
    };

    console.log(`[Recs] Done! ${result.total_matches} total, ${result.new_matches} new in ${result.processing_time_ms}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Recs] Error:', error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Internal server error',
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
