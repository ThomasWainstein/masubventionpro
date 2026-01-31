import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { Subsidy } from '@/types';

// How many days before we consider recommendations stale and trigger refresh
const STALE_THRESHOLD_DAYS = 3;

/**
 * Check if a date string is older than X days
 */
function isOlderThanDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date < threshold;
}

/**
 * Cached recommendation with match metadata
 */
export interface CachedRecommendation {
  id: string;
  profile_id: string;
  subsidy_id: string;
  match_score: number;
  ai_score: number | null;
  match_reasons: string[];
  first_matched_at: string;
  dismissed_at: string | null;
  subsidy: Subsidy;
}

/**
 * Recommendation with subsidy data for display
 */
export interface RecommendedSubsidy extends Subsidy {
  matchScore: number;
  matchReasons: string[];
  isNew: boolean; // Matched within last 7 days
  recommendationId: string;
}

interface UseProfileRecommendationsOptions {
  limit?: number;
  onlyNew?: boolean; // Only show subsidies matched in last 7 days
}

interface UseProfileRecommendationsReturn {
  recommendations: RecommendedSubsidy[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  newCount: number; // Count of subsidies matched in last 7 days
  refresh: () => Promise<void>;
  dismiss: (recommendationId: string) => Promise<void>;
  isCalculating: boolean;
  lastRefreshedAt: string | null;
}

/**
 * Hook to read cached recommendations from profile_recommended_subsidies table.
 * Much faster than on-demand calculation - just reads from cache.
 */
export function useProfileRecommendations(
  options: UseProfileRecommendationsOptions = {}
): UseProfileRecommendationsReturn {
  const { limit = 100, onlyNew = false } = options;
  const { profile, refreshProfile } = useProfile();
  const [recommendations, setRecommendations] = useState<CachedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const refreshTriggeredRef = useRef<string | null>(null); // Track which profile we triggered refresh for

  const fetchRecommendations = useCallback(async () => {
    if (!profile) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate date 7 days ago for "new" filter
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // Build query
      let query = supabase
        .from('profile_recommended_subsidies')
        .select(`
          id,
          profile_id,
          subsidy_id,
          match_score,
          ai_score,
          match_reasons,
          first_matched_at,
          dismissed_at,
          subsidy:subsidies (
            id,
            title,
            description,
            agency,
            region,
            deadline,
            amount_min,
            amount_max,
            funding_type,
            categories,
            primary_sector,
            keywords,
            application_url,
            source_url,
            is_active
          )
        `)
        .eq('profile_id', profile.id)
        .is('dismissed_at', null)
        .order('match_score', { ascending: false })
        .limit(limit);

      // Filter for new subsidies only if requested
      if (onlyNew) {
        query = query.gte('first_matched_at', sevenDaysAgoISO);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Filter out expired subsidies and those with null subsidy (deleted)
      // Note: Supabase returns joined data, subsidy might be an object not array
      const today = new Date().toISOString().split('T')[0];
      const validRecommendations: CachedRecommendation[] = (data || [])
        .filter((rec: any) => {
          if (!rec.subsidy) return false;
          const deadline = rec.subsidy.deadline;
          return !deadline || deadline >= today;
        })
        .map((rec: any) => ({
          id: rec.id,
          profile_id: rec.profile_id,
          subsidy_id: rec.subsidy_id,
          match_score: rec.match_score,
          ai_score: rec.ai_score,
          match_reasons: rec.match_reasons || [],
          first_matched_at: rec.first_matched_at,
          dismissed_at: rec.dismissed_at,
          subsidy: rec.subsidy as Subsidy,
        }));

      setRecommendations(validRecommendations);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.message || 'Erreur lors du chargement des recommandations');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, limit, onlyNew]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Auto-trigger refresh if recommendations are stale
  useEffect(() => {
    if (!profile || isCalculating || loading) return;

    // Check if already triggered for this profile
    if (refreshTriggeredRef.current === profile.id) return;

    // Check if recommendations are stale
    const lastRefresh = profile.last_subsidy_refresh_at;
    const isStale = !lastRefresh || isOlderThanDays(lastRefresh, STALE_THRESHOLD_DAYS);

    // Also trigger if we have no recommendations (new profile or first load)
    const noRecommendations = recommendations.length === 0;

    if (isStale || (noRecommendations && !lastRefresh)) {
      console.log('[useProfileRecommendations] Triggering background refresh for stale profile:', {
        profileId: profile.id,
        lastRefresh,
        isStale,
        noRecommendations,
      });

      refreshTriggeredRef.current = profile.id;
      setIsCalculating(true);

      // Trigger edge function in background
      supabase.functions
        .invoke('calculate-profile-recommendations', {
          body: { profile_id: profile.id, mode: 'incremental' },
        })
        .then((res) => {
          if (res.error) {
            console.error('[useProfileRecommendations] Refresh failed:', res.error);
          } else {
            console.log('[useProfileRecommendations] Refresh completed:', res.data);
            // Refresh local data and profile
            fetchRecommendations();
            refreshProfile();
          }
        })
        .catch((err) => {
          console.error('[useProfileRecommendations] Refresh error:', err);
        })
        .finally(() => {
          setIsCalculating(false);
        });
    }
  }, [profile?.id, profile?.last_subsidy_refresh_at, isCalculating, loading, recommendations.length, fetchRecommendations, refreshProfile]);

  // Dismiss a recommendation (soft delete)
  const dismiss = useCallback(async (recommendationId: string) => {
    if (!profile) return;

    try {
      const { error: updateError } = await supabase
        .from('profile_recommended_subsidies')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', recommendationId)
        .eq('profile_id', profile.id);

      if (updateError) throw updateError;

      // Remove from local state
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
    } catch (err: any) {
      console.error('Error dismissing recommendation:', err);
      throw err;
    }
  }, [profile?.id]);

  // Transform to RecommendedSubsidy format for compatibility with existing UI
  const transformedRecommendations = useMemo((): RecommendedSubsidy[] => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return recommendations.map(rec => ({
      ...rec.subsidy,
      matchScore: rec.ai_score || rec.match_score,
      matchReasons: rec.match_reasons || [],
      isNew: new Date(rec.first_matched_at) > sevenDaysAgo,
      recommendationId: rec.id,
    }));
  }, [recommendations]);

  // Count new recommendations
  const newCount = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return recommendations.filter(r => new Date(r.first_matched_at) > sevenDaysAgo).length;
  }, [recommendations]);

  return {
    recommendations: transformedRecommendations,
    loading,
    error,
    totalCount: recommendations.length,
    newCount,
    refresh: fetchRecommendations,
    dismiss,
    isCalculating,
    lastRefreshedAt: profile?.last_subsidy_refresh_at || null,
  };
}

export default useProfileRecommendations;
