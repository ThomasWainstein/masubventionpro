import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'masubventionpro_last_viewed_subsidies';

// Get the default "last viewed" date (7 days ago for new users)
function getDefaultLastViewed(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

export function useNewSubsidies() {
  const { user } = useAuth();
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastViewed, setLastViewed] = useState<string | null>(null);

  // Load last viewed timestamp from localStorage
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    const timestamp = stored || getDefaultLastViewed();
    setLastViewed(timestamp);
  }, [user]);

  // Fetch count of new subsidies
  useEffect(() => {
    async function fetchNewCount() {
      if (!lastViewed) return;

      setLoading(true);
      try {
        // Filter out expired subsidies (deadline in the past)
        // Use two separate queries to avoid PostgREST 500 error with complex or() filter
        const today = new Date().toISOString().split('T')[0];
        const [nullDeadlineResult, futureDeadlineResult] = await Promise.all([
          // Count new subsidies with no deadline
          supabase
            .from('subsidies')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .gt('created_at', lastViewed)
            .is('deadline', null),
          // Count new subsidies with future deadline
          supabase
            .from('subsidies')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .gt('created_at', lastViewed)
            .gte('deadline', today)
        ]);

        if (nullDeadlineResult.error) {
          console.error('Error fetching new subsidies count (null deadline):', nullDeadlineResult.error);
          return;
        }
        if (futureDeadlineResult.error) {
          console.error('Error fetching new subsidies count (future deadline):', futureDeadlineResult.error);
          return;
        }

        const totalCount = (nullDeadlineResult.count || 0) + (futureDeadlineResult.count || 0);
        setNewCount(totalCount);
      } catch (err) {
        console.error('Error fetching new subsidies:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNewCount();
  }, [lastViewed]);

  // Mark subsidies as viewed (update timestamp)
  const markAsViewed = useCallback(() => {
    if (!user) return;

    const now = new Date().toISOString();
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, now);
    setLastViewed(now);
    setNewCount(0);
  }, [user]);

  return {
    newCount,
    loading,
    lastViewed,
    markAsViewed,
    hasNew: newCount > 0,
  };
}

export default useNewSubsidies;
