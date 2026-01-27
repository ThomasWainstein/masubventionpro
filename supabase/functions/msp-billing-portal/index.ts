/**
 * MaSubventionPro Billing Portal
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to:
 * - Upgrade or downgrade their plan
 * - Update payment method
 * - View billing history
 * - Cancel subscription
 *
 * @module msp-billing-portal
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get("MSP_STRIPE_SECRET_KEY")
    if (!stripeSecretKey) {
      throw new Error("MSP_STRIPE_SECRET_KEY not configured")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing")
    }

    // Get authorization header
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      throw new Error("No authorization header")
    }

    // Initialize Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (userError || !user) {
      throw new Error("Not authenticated")
    }

    const { returnUrl } = await req.json()
    const baseUrl = Deno.env.get("MSP_APP_URL") || "https://masubventionpro.com"
    const finalReturnUrl = returnUrl || `${baseUrl}/app/settings`

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    // Get customer ID for user
    const { data: customer } = await supabase
      .from("masubventionpro_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!customer?.stripe_customer_id) {
      // No Stripe customer yet - redirect to checkout
      const baseUrl = Deno.env.get("MSP_APP_URL") || "https://masubventionpro.com"
      return new Response(
        JSON.stringify({
          redirect: "checkout",
          url: `${baseUrl}/onboarding?step=payment`,
          message: "Aucun abonnement actif. Redirection vers le paiement.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    // Create billing portal session with MaSubventionPro configuration
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: finalReturnUrl,
      // Use MaSubventionPro-specific billing portal configuration
      configuration: "bpc_1SuBwKGHk83RfX3MUIATOabv",
    })

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Billing portal error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
