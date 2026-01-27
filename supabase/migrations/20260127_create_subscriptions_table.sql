-- ============================================================================
-- MaSubventionPro Subscriptions Table
-- ============================================================================
-- Purpose: Track user subscription status synced from Stripe webhooks
-- Date: 2026-01-27
-- ============================================================================

-- Subscriptions table to track active subscriptions
CREATE TABLE IF NOT EXISTS masubventionpro_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,  -- NULL for one-time payments
    stripe_price_id TEXT,
    stripe_product_id TEXT,

    -- Subscription details
    plan_type TEXT NOT NULL CHECK (plan_type IN ('decouverte', 'business', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'canceled', 'past_due', 'unpaid', 'trialing', 'paused', 'incomplete'
    )),

    -- For Découverte (one-time 30-day access)
    is_one_time BOOLEAN DEFAULT false,
    access_expires_at TIMESTAMPTZ,

    -- Subscription period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,

    -- Cancellation
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Additional companies (addons)
    addon_companies INTEGER DEFAULT 0,

    -- Payment failure tracking (for grace period)
    payment_failed_at TIMESTAMPTZ,
    payment_failure_notified BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_active_subscription UNIQUE (user_id, stripe_subscription_id)
);

-- One-time payments table (for Découverte pack)
CREATE TABLE IF NOT EXISTS masubventionpro_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_checkout_id TEXT,
    stripe_payment_intent_id TEXT,

    -- Payment details
    amount INTEGER NOT NULL,  -- Amount in cents
    currency TEXT DEFAULT 'eur',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'succeeded', 'failed', 'refunded'
    )),

    -- Product info
    plan_type TEXT NOT NULL CHECK (plan_type IN ('decouverte', 'business', 'premium')),

    -- Access period for one-time payments
    access_starts_at TIMESTAMPTZ DEFAULT NOW(),
    access_expires_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table to link Stripe customer ID to user
CREATE TABLE IF NOT EXISTS masubventionpro_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_msp_subscriptions_user_id
    ON masubventionpro_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_msp_subscriptions_stripe_customer
    ON masubventionpro_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_msp_subscriptions_status
    ON masubventionpro_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_msp_payments_user_id
    ON masubventionpro_payments(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE masubventionpro_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE masubventionpro_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE masubventionpro_customers ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON masubventionpro_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON masubventionpro_payments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can view their own customer record
CREATE POLICY "Users can view own customer"
    ON masubventionpro_customers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access subscriptions"
    ON masubventionpro_subscriptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access payments"
    ON masubventionpro_payments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access customers"
    ON masubventionpro_customers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Get user's active subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan_type TEXT,
    status TEXT,
    is_one_time BOOLEAN,
    current_period_end TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ,
    addon_companies INTEGER,
    can_access BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.plan_type,
        s.status,
        s.is_one_time,
        s.current_period_end,
        s.access_expires_at,
        s.addon_companies,
        -- Determine if user has access
        CASE
            -- Active subscription
            WHEN s.status = 'active' THEN true
            -- Past due but within grace period (7 days)
            WHEN s.status = 'past_due'
                AND s.current_period_end > NOW() THEN true
            -- One-time payment within access period
            WHEN s.is_one_time
                AND s.access_expires_at > NOW() THEN true
            -- Trialing
            WHEN s.status = 'trialing' THEN true
            ELSE false
        END as can_access
    FROM masubventionpro_subscriptions s
    WHERE s.user_id = p_user_id
    ORDER BY
        CASE WHEN s.status = 'active' THEN 0
             WHEN s.status = 'trialing' THEN 1
             WHEN s.status = 'past_due' THEN 2
             ELSE 3 END,
        s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== MaSubventionPro Subscription Tables Created ===';
    RAISE NOTICE 'Tables: masubventionpro_subscriptions, masubventionpro_payments, masubventionpro_customers';
    RAISE NOTICE 'Function: get_user_subscription(user_id)';
END $$;
