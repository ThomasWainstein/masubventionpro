import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SavedSubsidy } from '@/types';

interface UseSavedSubsidiesReturn {
  savedSubsidies: SavedSubsidy[];
  loading: boolean;
  error: string | null;
  isSaved: (subsidyId: string) => boolean;
  saveSubsidy: (subsidyId: string) => Promise<void>;
  unsaveSubsidy: (subsidyId: string) => Promise<void>;
  toggleSave: (subsidyId: string) => Promise<void>;
  updateStatus: (savedId: string, status: SavedSubsidy['status']) => Promise<void>;
  updateNotes: (savedId: string, notes: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSavedSubsidies(): UseSavedSubsidiesReturn {
  const { user } = useAuth();
  const [savedSubsidies, setSavedSubsidies] = useState<SavedSubsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSubsidies = useCallback(async () => {
    if (!user) {
      setSavedSubsidies([]);
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

      setSavedSubsidies(validSubsidies);
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

  const isSaved = useCallback(
    (subsidyId: string) => {
      return savedSubsidies.some((s) => s.subsidy_id === subsidyId);
    },
    [savedSubsidies]
  );

  const saveSubsidy = useCallback(
    async (subsidyId: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        const { data, error: insertError } = await supabase
          .from('masubventionpro_saved_subsidies')
          .insert({
            user_id: user.id,
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
            )
          `)
          .single();

        if (insertError) throw insertError;

        setSavedSubsidies((prev) => [data, ...prev]);
      } catch (err: any) {
        console.error('Error saving subsidy:', err);
        throw err;
      }
    },
    [user]
  );

  const unsaveSubsidy = useCallback(
    async (subsidyId: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        const { error: deleteError } = await supabase
          .from('masubventionpro_saved_subsidies')
          .delete()
          .eq('user_id', user.id)
          .eq('subsidy_id', subsidyId);

        if (deleteError) throw deleteError;

        setSavedSubsidies((prev) => prev.filter((s) => s.subsidy_id !== subsidyId));
      } catch (err: any) {
        console.error('Error unsaving subsidy:', err);
        throw err;
      }
    },
    [user]
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

        setSavedSubsidies((prev) =>
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

        setSavedSubsidies((prev) =>
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
    loading,
    error,
    isSaved,
    saveSubsidy,
    unsaveSubsidy,
    toggleSave,
    updateStatus,
    updateNotes,
    refresh: fetchSavedSubsidies,
  };
}

export default useSavedSubsidies;
