/**
 * cron-refresh-recommendations Edge Function
 *
 * Called by pg_cron to refresh recommendations for profiles.
 * Supports partitioning to distribute load across multiple days.
 *
 * PARTITIONING:
 * - Pass `partition` (0-6) to only process profiles assigned to that partition
 * - Profiles are assigned based on their UUID's first hex character
 * - This allows running different partitions on different days
 *
 * SCHEDULE EXAMPLE (distribute across weekdays):
 * - Monday:    partition=1
 * - Tuesday:   partition=2
 * - Wednesday: partition=3
 * - Thursday:  partition=4
 * - Friday:    partition=5
 * - Saturday:  partition=6
 * - Sunday:    partition=0
 *
 * Or use `partition=auto` to automatically select based on current day
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Profiles not refreshed in this many days will be updated
  STALE_THRESHOLD_DAYS: 3,
  // Maximum profiles to process per run (to avoid timeout)
  MAX_PROFILES_PER_RUN: 50,
  // Delay between profile processing (ms) to avoid rate limiting
  DELAY_BETWEEN_PROFILES: 200,
  // Number of partitions (7 = one per day of week)
  TOTAL_PARTITIONS: 7,
};

/**
 * Get partition number for a profile ID (0-6)
 * Uses first hex character of UUID for consistent distribution
 */
function getProfilePartition(profileId: string): number {
  const firstChar = profileId.charAt(0).toLowerCase();
  const hexValue = parseInt(firstChar, 16);
  return hexValue % CONFIG.TOTAL_PARTITIONS;
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

    // Verify cron secret (optional security measure)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[CronRefresh] Unauthorized request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body for partition parameter
    let partition: number | null = null;
    try {
      const body = await req.json();
      if (body.partition === 'auto') {
        // Auto-select partition based on current day of week (0=Sunday, 6=Saturday)
        partition = new Date().getDay();
        console.log(`[CronRefresh] Auto-selected partition ${partition} for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][partition]}`);
      } else if (typeof body.partition === 'number' && body.partition >= 0 && body.partition < CONFIG.TOTAL_PARTITIONS) {
        partition = body.partition;
      }
    } catch {
      // No body or invalid JSON - process all profiles (no partition filter)
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CronRefresh] Starting batch refresh${partition !== null ? ` (partition ${partition}/${CONFIG.TOTAL_PARTITIONS})` : ' (all profiles)'}...`);

    // ========================================================================
    // STEP 1: FIND STALE PROFILES
    // ========================================================================
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - CONFIG.STALE_THRESHOLD_DAYS);
    const staleDateStr = staleDate.toISOString();

    const { data: allProfiles, error: profileError } = await supabase
      .from('masubventionpro_profiles')
      .select('id, company_name, last_subsidy_refresh_at')
      .or(`last_subsidy_refresh_at.is.null,last_subsidy_refresh_at.lt.${staleDateStr}`)
      .order('last_subsidy_refresh_at', { ascending: true, nullsFirst: true });

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    // Filter by partition if specified
    let profiles = allProfiles || [];
    if (partition !== null) {
      profiles = profiles.filter(p => getProfilePartition(p.id) === partition);
      console.log(`[CronRefresh] Partition ${partition}: ${profiles.length} of ${allProfiles?.length || 0} profiles`);
    }

    // Apply limit after partition filtering
    profiles = profiles.slice(0, CONFIG.MAX_PROFILES_PER_RUN);

    console.log(`[CronRefresh] Processing ${profiles.length} profiles${partition !== null ? ` (partition ${partition})` : ''}`);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No profiles need refresh',
        profiles_processed: 0,
        partition: partition !== null ? partition : 'all',
        processing_time_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // STEP 2: REFRESH EACH PROFILE
    // ========================================================================
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const profile of profiles) {
      try {
        console.log(`[CronRefresh] Processing ${profile.company_name} (${profile.id})`);

        // Call the recommendation calculation function
        const { data, error } = await supabase.functions.invoke(
          'calculate-profile-recommendations',
          {
            body: { profile_id: profile.id, mode: 'incremental' },
          }
        );

        if (error) {
          console.error(`[CronRefresh] Error for ${profile.id}:`, error);
          results.failed++;
          results.errors.push(`${profile.id}: ${error.message}`);
        } else {
          console.log(`[CronRefresh] Success for ${profile.id}:`, data);
          results.success++;
        }

        // Small delay to avoid overwhelming the system
        if (CONFIG.DELAY_BETWEEN_PROFILES > 0) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_PROFILES));
        }
      } catch (err) {
        console.error(`[CronRefresh] Exception for ${profile.id}:`, err);
        results.failed++;
        results.errors.push(`${profile.id}: ${(err as Error).message}`);
      }
    }

    // ========================================================================
    // STEP 3: CLEANUP EXPIRED RECOMMENDATIONS
    // ========================================================================
    console.log('[CronRefresh] Running cleanup...');

    const { error: cleanupError } = await supabase.rpc('cleanup_expired_recommendations');

    if (cleanupError) {
      console.error('[CronRefresh] Cleanup error:', cleanupError);
      results.errors.push(`cleanup: ${cleanupError.message}`);
    } else {
      console.log('[CronRefresh] Cleanup completed');
    }

    // ========================================================================
    // RETURN RESULTS
    // ========================================================================
    const response = {
      success: true,
      profiles_processed: profiles.length,
      partition: partition !== null ? partition : 'all',
      total_partitions: CONFIG.TOTAL_PARTITIONS,
      results,
      processing_time_ms: Date.now() - startTime,
    };

    console.log('[CronRefresh] Done:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CronRefresh] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
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
