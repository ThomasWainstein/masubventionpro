import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';

/**
 * Plan limits for number of companies
 * - Découverte: 1 company
 * - Business: 1 + addon_companies
 * - Premium: 5 + addon_companies (per pack of 5)
 */
export function getPlanCompanyLimit(
  planType: 'decouverte' | 'business' | 'premium' | null,
  addonCompanies: number = 0
): number {
  if (!planType) return 1;

  switch (planType) {
    case 'decouverte':
      return 1;
    case 'business':
      return 1 + addonCompanies;
    case 'premium':
      return 5 + addonCompanies * 5; // Premium adds packs of 5
    default:
      return 1;
  }
}

/**
 * Check if user can add more companies based on plan
 */
export function canAddCompany(
  planType: 'decouverte' | 'business' | 'premium' | null,
  addonCompanies: number,
  currentCount: number
): boolean {
  const limit = getPlanCompanyLimit(planType, addonCompanies);
  return currentCount < limit;
}

/**
 * Get plan display info
 */
export function getPlanDisplayInfo(planType: 'decouverte' | 'business' | 'premium' | null) {
  switch (planType) {
    case 'decouverte':
      return { name: 'Découverte', maxCompanies: 1, canUpgrade: true };
    case 'business':
      return { name: 'Business', maxCompanies: 1, canUpgrade: true, canAddAddon: true };
    case 'premium':
      return { name: 'Premium Groupe', maxCompanies: 5, canUpgrade: false, canAddAddon: true };
    default:
      return { name: 'Aucun abonnement', maxCompanies: 0, canUpgrade: true };
  }
}

interface CompanyProfileSummary {
  id: string;
  company_name: string;
  siret?: string;
  sector?: string;
  region?: string;
  employees?: string;
  legal_form?: string;
  website_intelligence?: any;
  created_at: string;
  updated_at: string;
  // Computed stats (populated separately)
  matchCount?: number;
  savedCount?: number;
}

interface UseCompanyProfilesReturn {
  profiles: CompanyProfileSummary[];
  loading: boolean;
  error: string | null;
  // Plan info
  maxCompanies: number;
  canAddMore: boolean;
  planType: 'decouverte' | 'business' | 'premium' | null;
  // Actions
  refresh: () => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
}

export function useCompanyProfiles(): UseCompanyProfilesReturn {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [profiles, setProfiles] = useState<CompanyProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planType = subscription?.plan_type || null;
  const addonCompanies = subscription?.addon_companies || 0;
  const maxCompanies = getPlanCompanyLimit(planType, addonCompanies);
  const canAddMore = canAddCompany(planType, addonCompanies, profiles.length);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all profiles for this user
      const { data, error: fetchError } = await supabase
        .from('masubventionpro_profiles')
        .select(`
          id,
          company_name,
          siret,
          sector,
          region,
          employees,
          legal_form,
          website_intelligence,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching company profiles:', err);
      setError(err.message || 'Erreur lors du chargement des sociétés');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const deleteProfile = useCallback(async (profileId: string) => {
    if (!user) {
      throw new Error('Non authentifié');
    }

    // Don't allow deleting if it's the last profile
    if (profiles.length <= 1) {
      throw new Error('Vous devez avoir au moins une société');
    }

    const { error: deleteError } = await supabase
      .from('masubventionpro_profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Refresh profiles
    await fetchProfiles();
  }, [user, profiles.length, fetchProfiles]);

  return {
    profiles,
    loading,
    error,
    maxCompanies,
    canAddMore,
    planType,
    refresh: fetchProfiles,
    deleteProfile,
  };
}

export default useCompanyProfiles;
