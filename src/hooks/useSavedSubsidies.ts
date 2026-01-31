import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { SavedSubsidy, MaSubventionProProfile } from '@/types';

interface UseSavedSubsidiesOptions {
  showAllProfiles?: boolean;  // If true, shows saved subsidies from all profiles
}

interface UseSavedSubsidiesReturn {
  savedSubsidies: SavedSubsidy[];
  allProfileSubsidies: SavedSubsidy[];  // All subsidies across all profiles
  loading: boolean;
  error: string | null;
  isSaved: (subsidyId: string) => boolean;
  isSavedForProfile: (subsidyId: string, profileId: string) => boolean;
  getProfilesForSubsidy: (subsidyId: string) => MaSubventionProProfile[];
  saveSubsidy: (subsidyId: string) => Promise<void>;
  unsaveSubsidy: (subsidyId: string) => Promise<void>;
  toggleSave: (subsidyId: string) => Promise<void>;
  updateStatus: (savedId: string, status: SavedSubsidy['status']) => Promise<void>;
  updateNotes: (savedId: string, notes: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSavedSubsidies(options: UseSavedSubsidiesOptions = {}): UseSavedSubsidiesReturn {
  const { showAllProfiles = false } = options;
  const { user } = useAuth();
  const { profile, profiles } = useProfile();
  const [allProfileSubsidies, setAllProfileSubsidies] = useState<SavedSubsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter subsidies based on current profile or show all
  const savedSubsidies = useMemo(() => {
    if (showAllProfiles || !profile) {
      return allProfileSubsidies;
    }
    return allProfileSubsidies.filter(s => s.profile_id === profile.id || s.profile_id === null);
  }, [allProfileSubsidies, profile, showAllProfiles]);

  const fetchSavedSubsidies = useCallback(async () => {
    if (!user) {
      setAllProfileSubsidies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('masubventionpro_saved_subsidies')
        .select(`
          *,
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
            application_url,
            is_active
          ),
          profile:masubventionpro_profiles (
            id,
            company_name,
            siret,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Filter out expired subsidies (deadline in the past)
      const today = new Date().toISOString().split('T')[0];
      const validSubsidies = (data || []).filter((saved) => {
        const deadline = saved.subsidy?.deadline;
        // Keep if no deadline or deadline is today or in the future
        return !deadline || deadline >= today;
      });

      setAllProfileSubsidies(validSubsidies);
    } catch (err: any) {
      console.error('Error fetching saved subsidies:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedSubsidies();
  }, [fetchSavedSubsidies]);

  // Check if subsidy is saved for current profile
  const isSaved = useCallback(
    (subsidyId: string) => {
      return savedSubsidies.some((s) => s.subsidy_id === subsidyId);
    },
    [savedSubsidies]
  );

  // Check if subsidy is saved for a specific profile
  const isSavedForProfile = useCallback(
    (subsidyId: string, profileId: string) => {
      return allProfileSubsidies.some((s) => s.subsidy_id === subsidyId && s.profile_id === profileId);
    },
    [allProfileSubsidies]
  );

  // Get all profiles that have saved a specific subsidy
  const getProfilesForSubsidy = useCallback(
    (subsidyId: string): MaSubventionProProfile[] => {
      const savedForSubsidy = allProfileSubsidies.filter((s) => s.subsidy_id === subsidyId);
      const profileIds = new Set(savedForSubsidy.map((s) => s.profile_id).filter(Boolean));
      return profiles.filter((p) => profileIds.has(p.id));
    },
    [allProfileSubsidies, profiles]
  );

  const saveSubsidy = useCallback(
    async (subsidyId: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        const { data, error: insertError } = await supabase
          .from('masubventionpro_saved_subsidies')
          .insert({
            user_id: user.id,
            profile_id: profile?.id || null,  // Associate with current profile
            subsidy_id: subsidyId,
            status: 'saved',
          })
          .select(`
            *,
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
              application_url,
              is_active
            ),
            profile:masubventionpro_profiles (
              id,
              company_name,
              siret,
              logo_url
            )
          `)
          .single();

        if (insertError) throw insertError;

        setAllProfileSubsidies((prev) => [data, ...prev]);
      } catch (err: any) {
        console.error('Error saving subsidy:', err);
        throw err;
      }
    },
    [user, profile]
  );

  const unsaveSubsidy = useCallback(
    async (subsidyId: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        // Delete only for the current profile (if profile exists)
        let query = supabase
          .from('masubventionpro_saved_subsidies')
          .delete()
          .eq('user_id', user.id)
          .eq('subsidy_id', subsidyId);

        if (profile) {
          query = query.eq('profile_id', profile.id);
        }

        const { error: deleteError } = await query;

        if (deleteError) throw deleteError;

        setAllProfileSubsidies((prev) =>
          prev.filter((s) => !(s.subsidy_id === subsidyId && (profile ? s.profile_id === profile.id : true)))
        );
      } catch (err: any) {
        console.error('Error unsaving subsidy:', err);
        throw err;
      }
    },
    [user, profile]
  );

  const toggleSave = useCallback(
    async (subsidyId: string) => {
      if (isSaved(subsidyId)) {
        await unsaveSubsidy(subsidyId);
      } else {
        await saveSubsidy(subsidyId);
      }
    },
    [isSaved, saveSubsidy, unsaveSubsidy]
  );

  const updateStatus = useCallback(
    async (savedId: string, status: SavedSubsidy['status']) => {
      if (!user) throw new Error('Non authentifie');

      try {
        const { error: updateError } = await supabase
          .from('masubventionpro_saved_subsidies')
          .update({ status })
          .eq('id', savedId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        setAllProfileSubsidies((prev) =>
          prev.map((s) => (s.id === savedId ? { ...s, status } : s))
        );
      } catch (err: any) {
        console.error('Error updating status:', err);
        throw err;
      }
    },
    [user]
  );

  const updateNotes = useCallback(
    async (savedId: string, notes: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        const { error: updateError } = await supabase
          .from('masubventionpro_saved_subsidies')
          .update({ notes })
          .eq('id', savedId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        setAllProfileSubsidies((prev) =>
          prev.map((s) => (s.id === savedId ? { ...s, notes } : s))
        );
      } catch (err: any) {
        console.error('Error updating notes:', err);
        throw err;
      }
    },
    [user]
  );

  return {
    savedSubsidies,
    allProfileSubsidies,
    loading,
    error,
    isSaved,
    isSavedForProfile,
    getProfilesForSubsidy,
    saveSubsidy,
    unsaveSubsidy,
    toggleSave,
    updateStatus,
    updateNotes,
    refresh: fetchSavedSubsidies,
  };
}

export default useSavedSubsidies;
