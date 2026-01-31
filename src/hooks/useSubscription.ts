import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  plan_type: 'decouverte' | 'business' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'paused' | 'incomplete';
  is_one_time: boolean;
  current_period_end: string | null;
  access_expires_at: string | null;
  addon_companies: number;
  can_access: boolean;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  openBillingPortal: () => Promise<void>;
  createUpgrade: (targetPlan: 'business' | 'premium', addonCompanies?: number) => Promise<void>;
  addAddonCompanies: (quantity?: number) => Promise<void>;
}

const PLAN_INFO = {
  decouverte: { name: 'Découverte', price: 49, period: '30 jours' },
  business: { name: 'Business', price: 189, period: '/an' },
  premium: { name: 'Premium Groupe', price: 549, period: '/an' },
};

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the helper function to get subscription
      const { data, error: fetchError } = await supabase
        .rpc('get_user_subscription', { p_user_id: user.id });

      if (fetchError) {
        // Function might not exist yet - fallback to direct query
        console.warn('get_user_subscription not available, using fallback:', fetchError);

        const { data: subData, error: subError } = await supabase
          .from('masubventionpro_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          throw subError;
        }

        if (subData) {
          // Determine if user can access
          let canAccess = false;
          const now = new Date();

          if (subData.status === 'active' || subData.status === 'trialing') {
            canAccess = true;
          } else if (subData.status === 'past_due' && subData.current_period_end) {
            canAccess = new Date(subData.current_period_end) > now;
          }

          if (subData.is_one_time && subData.access_expires_at) {
            canAccess = new Date(subData.access_expires_at) > now;
          }

          setSubscription({
            plan_type: subData.plan_type,
            status: subData.status,
            is_one_time: subData.is_one_time,
            current_period_end: subData.current_period_end,
            access_expires_at: subData.access_expires_at,
            addon_companies: subData.addon_companies || 0,
            can_access: canAccess,
          });
        } else {
          // No subscription - check user metadata for legacy plan
          const legacyPlan = user.user_metadata?.selected_plan;
          if (legacyPlan) {
            setSubscription({
              plan_type: legacyPlan as 'decouverte' | 'business' | 'premium',
              status: 'active',
              is_one_time: legacyPlan === 'decouverte',
              current_period_end: null,
              access_expires_at: null,
              addon_companies: 0,
              can_access: true, // Assume active for legacy
            });
          } else {
            setSubscription(null);
          }
        }
      } else if (data && data.length > 0) {
        const sub = data[0];
        setSubscription({
          plan_type: sub.plan_type,
          status: sub.status,
          is_one_time: sub.is_one_time,
          current_period_end: sub.current_period_end,
          access_expires_at: sub.access_expires_at,
          addon_companies: sub.addon_companies || 0,
          can_access: sub.can_access,
        });
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message || 'Erreur lors du chargement');

      // Fallback to user metadata
      const legacyPlan = user?.user_metadata?.selected_plan;
      if (legacyPlan) {
        setSubscription({
          plan_type: legacyPlan as 'decouverte' | 'business' | 'premium',
          status: 'active',
          is_one_time: legacyPlan === 'decouverte',
          current_period_end: null,
          access_expires_at: null,
          addon_companies: 0,
          can_access: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const openBillingPortal = useCallback(async () => {
    if (!user) {
      throw new Error('Non authentifié');
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('[Billing Portal] Calling:', `${supabaseUrl}/functions/v1/msp-billing-portal`);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/msp-billing-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/app/settings`,
          }),
        }
      );

      console.log('[Billing Portal] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Billing Portal] Error response:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Billing Portal] Result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle redirect to checkout for users without Stripe customer
      if (result.redirect === 'checkout' && result.url) {
        console.log('[Billing Portal] Redirecting to checkout:', result.url);
        window.location.href = result.url;
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Aucune URL de portail reçue');
      }
    } catch (err: any) {
      console.error('Error opening billing portal:', err);
      throw err;
    }
  }, [user]);

  const createUpgrade = useCallback(
    async (targetPlan: 'business' | 'premium', addonCompanies = 0) => {
      if (!user) {
        throw new Error('Non authentifié');
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error('Session expirée');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/msp-create-upgrade`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              targetPlan,
              addonCompanies,
            }),
          }
        );

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.redirect === 'billing_portal') {
          // For downgrades, redirect to billing portal
          await openBillingPortal();
          return;
        }

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err: any) {
        console.error('Error creating upgrade:', err);
        throw err;
      }
    },
    [user, openBillingPortal]
  );

  const addAddonCompanies = useCallback(
    async (quantity = 1) => {
      if (!user) {
        throw new Error('Non authentifié');
      }

      if (!subscription) {
        throw new Error('Aucun abonnement actif');
      }

      if (subscription.plan_type !== 'premium' && subscription.plan_type !== 'business') {
        throw new Error('Votre forfait ne permet pas d\'ajouter des sociétés supplémentaires');
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error('Session expirée');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/msp-add-addon-companies`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ quantity }),
          }
        );

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err: any) {
        console.error('Error adding addon companies:', err);
        throw err;
      }
    },
    [user, subscription]
  );

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
    openBillingPortal,
    createUpgrade,
    addAddonCompanies,
  };
}

export { PLAN_INFO };
export default useSubscription;
