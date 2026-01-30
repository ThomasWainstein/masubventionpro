import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Subsidy } from '@/types';

/**
 * Hook to fetch subsidies that are accessible to everyone
 *
 * Strategy:
 * 1. Primary: Fetch subsidies marked as is_universal_sector = true (verified universal)
 * 2. Fallback: If few/no universal subsidies, fetch popular business subsidies
 *
 * Criteria for "universally accessible" subsidies:
 * - Active (is_active = true)
 * - Business relevant (is_business_relevant = true)
 * - Valid deadline (not expired or no deadline)
 * - is_universal_sector = true (no sector/entity restrictions)
 * - Sorted by amount (highest first)
 *
 * Note: After data cleanup (Jan 2026), only ~1 truly universal subsidy remains.
 * The fallback fetches popular national business subsidies when universal ones are scarce.
 */

// Columns to fetch for display
const SUBSIDY_COLUMNS = `
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
  application_url,
  logo_url,
  is_active,
  eligibility_criteria
`;

interface UseUniversalSubsidiesReturn {
  nationalSubsidies: Subsidy[];
  regionalSubsidies: Subsidy[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUniversalSubsidies(limit: number = 6): UseUniversalSubsidiesReturn {
  const [nationalSubsidies, setNationalSubsidies] = useState<Subsidy[]>([]);
  const [regionalSubsidies, setRegionalSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubsidies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // ========================================
      // STEP 1: Try to fetch truly universal subsidies
      // ========================================

      // Fetch national universal subsidies
      const { data: nationalUniversal, error: nationalError } = await supabase
        .from('subsidies')
        .select(SUBSIDY_COLUMNS)
        .eq('is_active', true)
        .eq('is_universal_sector', true)
        .eq('is_business_relevant', true)
        .or(`deadline.is.null,deadline.gte.${today}`)
        .contains('region', ['National'])
        .order('amount_max', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (nationalError) {
        console.error('Error fetching national universal subsidies:', nationalError);
      }

      // Fetch regional universal subsidies
      const { data: regionalUniversal, error: regionalError } = await supabase
        .from('subsidies')
        .select(SUBSIDY_COLUMNS)
        .eq('is_active', true)
        .eq('is_universal_sector', true)
        .eq('is_business_relevant', true)
        .or(`deadline.is.null,deadline.gte.${today}`)
        .not('region', 'cs', '{"National"}')
        .order('amount_max', { ascending: false, nullsFirst: false })
        .limit(limit * 3);

      if (regionalError) {
        console.error('Error fetching regional universal subsidies:', regionalError);
      }

      let nationalResults = nationalUniversal || [];
      let regionalResults = regionalUniversal || [];

      // ========================================
      // STEP 2: Fallback to popular business subsidies if needed
      // ========================================

      const needsNationalFallback = nationalResults.length < limit;
      const needsRegionalFallback = regionalResults.length < limit;

      if (needsNationalFallback) {
        // Fallback: Fetch popular national business subsidies (high amounts, well-known agencies)
        const { data: nationalFallback } = await supabase
          .from('subsidies')
          .select(SUBSIDY_COLUMNS)
          .eq('is_active', true)
          .eq('is_business_relevant', true)
          .or(`deadline.is.null,deadline.gte.${today}`)
          .contains('region', ['National'])
          .in('agency', ['Bpifrance', 'Direction Générale des Finances Publiques (DGFiP)', 'ADEME', 'France Active'])
          .order('amount_max', { ascending: false, nullsFirst: false })
          .limit(limit - nationalResults.length);

        if (nationalFallback) {
          // Merge and deduplicate by ID
          const existingIds = new Set(nationalResults.map(s => s.id));
          const newSubsidies = nationalFallback.filter(s => !existingIds.has(s.id));
          nationalResults = [...nationalResults, ...newSubsidies].slice(0, limit);
        }
      }

      if (needsRegionalFallback) {
        // Fallback: Fetch diverse regional business subsidies
        const { data: regionalFallback } = await supabase
          .from('subsidies')
          .select(SUBSIDY_COLUMNS)
          .eq('is_active', true)
          .eq('is_business_relevant', true)
          .or(`deadline.is.null,deadline.gte.${today}`)
          .not('region', 'cs', '{"National"}')
          .order('amount_max', { ascending: false, nullsFirst: false })
          .limit((limit - regionalResults.length) * 3);

        if (regionalFallback) {
          const existingIds = new Set(regionalResults.map(s => s.id));
          const newSubsidies = regionalFallback.filter(s => !existingIds.has(s.id));
          regionalResults = [...regionalResults, ...newSubsidies];
        }
      }

      // ========================================
      // STEP 3: Ensure regional diversity
      // ========================================

      const seenRegions = new Set<string>();
      const diverseRegional = regionalResults.filter((subsidy: Subsidy) => {
        if (!subsidy.region || subsidy.region.length === 0) return false;
        const firstRegion = subsidy.region[0];
        if (seenRegions.has(firstRegion)) return false;
        seenRegions.add(firstRegion);
        return true;
      }).slice(0, limit);

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('=== UNIVERSAL SUBSIDIES ===');
        console.log('National universal:', nationalUniversal?.length || 0);
        console.log('National total (with fallback):', nationalResults.length);
        console.log('Regional universal:', regionalUniversal?.length || 0);
        console.log('Regional total (with fallback, before diversity):', regionalResults.length);
        console.log('Regional final (after diversity filter):', diverseRegional.length);
        console.log('Unique regions:', Array.from(seenRegions));
      }

      setNationalSubsidies(nationalResults as Subsidy[]);
      setRegionalSubsidies(diverseRegional as Subsidy[]);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des subventions';
      console.error('Error in useUniversalSubsidies:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSubsidies();
  }, [fetchSubsidies]);

  return {
    nationalSubsidies,
    regionalSubsidies,
    loading,
    error,
    refetch: fetchSubsidies,
  };
}

export default useUniversalSubsidies;
