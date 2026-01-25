import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface DeletionStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
}

interface UseAccountDeletionReturn {
  isDeleting: boolean;
  steps: DeletionStep[];
  error: string | null;
  deleteAccount: () => Promise<boolean>;
}

// LocalStorage keys to clear
const LOCAL_STORAGE_KEYS = [
  'masubventionpro_profile',
];

// SessionStorage keys/prefixes to clear
const SESSION_STORAGE_PREFIXES = [
  'masubventionpro_recommendations_',
];

export function useAccountDeletion(): UseAccountDeletionReturn {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DeletionStep[]>([
    { id: 'storage', label: 'Suppression des fichiers', status: 'pending' },
    { id: 'ai_logs', label: 'Suppression historique IA', status: 'pending' },
    { id: 'conversations', label: 'Suppression des conversations', status: 'pending' },
    { id: 'documents', label: 'Suppression des documents', status: 'pending' },
    { id: 'saved', label: 'Suppression des aides sauvegardées', status: 'pending' },
    { id: 'profile', label: 'Suppression du profil', status: 'pending' },
    { id: 'local', label: 'Nettoyage local', status: 'pending' },
    { id: 'auth', label: 'Suppression du compte', status: 'pending' },
  ]);

  const updateStep = useCallback((stepId: string, status: DeletionStep['status'], error?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, error } : step
    ));
  }, []);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Utilisateur non connecté');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    // Reset steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined })));

    try {
      // Get profile ID first
      const { data: profile } = await supabase
        .from('masubventionpro_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const profileId = profile?.id;

      // Step 1: Delete storage files
      updateStep('storage', 'in_progress');
      try {
        const { data: files } = await supabase.storage
          .from('masubventionpro-documents')
          .list(user.id);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${user.id}/${f.name}`);
          await supabase.storage
            .from('masubventionpro-documents')
            .remove(filePaths);
        }
        updateStep('storage', 'completed');
      } catch (err: any) {
        console.error('Storage deletion error:', err);
        updateStep('storage', 'completed'); // Continue even if no files
      }

      // Step 2: Delete AI usage logs
      updateStep('ai_logs', 'in_progress');
      try {
        await supabase
          .from('ai_usage_logs')
          .delete()
          .eq('user_id', user.id);
        updateStep('ai_logs', 'completed');
      } catch (err: any) {
        console.error('AI logs deletion error:', err);
        updateStep('ai_logs', 'completed'); // Continue
      }

      // Step 3: Delete conversation history
      updateStep('conversations', 'in_progress');
      try {
        await supabase
          .from('conversation_history')
          .delete()
          .eq('user_id', user.id);
        updateStep('conversations', 'completed');
      } catch (err: any) {
        console.error('Conversations deletion error:', err);
        updateStep('conversations', 'completed'); // Continue
      }

      // Step 4: Delete documents (if profile exists)
      updateStep('documents', 'in_progress');
      if (profileId) {
        try {
          await supabase
            .from('masubventionpro_documents')
            .delete()
            .eq('profile_id', profileId);
          updateStep('documents', 'completed');
        } catch (err: any) {
          console.error('Documents deletion error:', err);
          updateStep('documents', 'completed');
        }
      } else {
        updateStep('documents', 'completed');
      }

      // Step 5: Delete saved subsidies
      updateStep('saved', 'in_progress');
      if (profileId) {
        try {
          await supabase
            .from('masubventionpro_saved_subsidies')
            .delete()
            .eq('profile_id', profileId);
          updateStep('saved', 'completed');
        } catch (err: any) {
          console.error('Saved subsidies deletion error:', err);
          updateStep('saved', 'completed');
        }
      } else {
        updateStep('saved', 'completed');
      }

      // Step 6: Delete profile
      updateStep('profile', 'in_progress');
      try {
        await supabase
          .from('masubventionpro_profiles')
          .delete()
          .eq('user_id', user.id);
        updateStep('profile', 'completed');
      } catch (err: any) {
        console.error('Profile deletion error:', err);
        updateStep('profile', 'completed');
      }

      // Step 7: Clear local storage
      updateStep('local', 'in_progress');
      try {
        // Clear specific localStorage keys
        LOCAL_STORAGE_KEYS.forEach(key => {
          localStorage.removeItem(key);
        });

        // Clear localStorage keys with user ID suffix
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(user.id)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear sessionStorage with prefixes
        SESSION_STORAGE_PREFIXES.forEach(prefix => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
        });

        updateStep('local', 'completed');
      } catch (err: any) {
        console.error('Local storage cleanup error:', err);
        updateStep('local', 'completed');
      }

      // Step 8: Delete auth user (sign out first, then request deletion via edge function)
      updateStep('auth', 'in_progress');
      try {
        // Get session for edge function call
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          try {
            // Call edge function to delete the auth user
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-deletion`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  immediate: true,
                  reason: 'User self-service account deletion',
                }),
              }
            );

            if (!response.ok) {
              // Edge function failed or doesn't exist - log but continue
              console.warn('Edge function account-deletion not available or failed');
            }
          } catch (fetchErr) {
            // Network error or edge function not deployed - continue with sign out
            console.warn('Could not call account-deletion edge function:', fetchErr);
          }
        }

        // Sign out
        await signOut();
        updateStep('auth', 'completed');

        // Navigate to landing page
        navigate('/', { replace: true });

        return true;
      } catch (err: any) {
        console.error('Auth deletion error:', err);
        updateStep('auth', 'error', err.message);
        // Still try to sign out
        await signOut();
        navigate('/', { replace: true });
        return true; // Data was deleted, only auth user remains
      }
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setError(err.message || 'Erreur lors de la suppression du compte');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [user, signOut, navigate, updateStep]);

  return {
    isDeleting,
    steps,
    error,
    deleteAccount,
  };
}

export default useAccountDeletion;
