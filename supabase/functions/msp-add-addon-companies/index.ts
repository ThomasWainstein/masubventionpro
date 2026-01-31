/**
 * MaSubventionPro Add Addon Companies
 *
 * Creates a Stripe checkout session for purchasing additional company packs.
 * - Premium: +99€ per pack of 5 additional companies
 * - Business: +99€ per additional company
 *
 * @module msp-add-addon-companies
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

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (userError || !user) {
      throw new Error("Not authenticated")
    }

    const { quantity = 1 } = await req.json()

    if (quantity < 1 || quantity > 10) {
      throw new Error("Quantity must be between 1 and 10")
    }

    // Get current subscription
    const { data: currentSub } = await supabase
      .from("masubventionpro_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!currentSub) {
      throw new Error("No active subscription found")
    }

    const planType = currentSub.plan_type

    // Only Premium and Business plans support addons
    if (planType !== "premium" && planType !== "business") {
      throw new Error("Your plan does not support additional companies. Please upgrade to Business or Premium.")
    }

    // Get addon price based on plan
    let addonPriceId: string | undefined
    let description: string

    if (planType === "premium") {
      addonPriceId = Deno.env.get("MSP_PRICE_PREMIUM_ADDON")
      description = `${quantity} pack${quantity > 1 ? 's' : ''} de 5 sociétés supplémentaires`
    } else {
      addonPriceId = Deno.env.get("MSP_PRICE_BUSINESS_ADDON")
      description = `${quantity} société${quantity > 1 ? 's' : ''} supplémentaire${quantity > 1 ? 's' : ''}`
    }

    if (!addonPriceId) {
      throw new Error("Addon price not configured")
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    // Get or create Stripe customer
    let stripeCustomerId = currentSub.stripe_customer_id

    if (!stripeCustomerId) {
      // Check customers table
      const { data: customer } = await supabase
        .from("masubventionpro_customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single()

      if (customer?.stripe_customer_id) {
        stripeCustomerId = customer.stripe_customer_id
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
            source: "masubventionpro",
          },
        })
        stripeCustomerId = newCustomer.id

        await supabase.from("masubventionpro_customers").upsert(
          {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
          },
          { onConflict: "user_id" }
        )
      }
    }

    const baseUrl = Deno.env.get("MSP_APP_URL") || "https://masubventionpro.com"

    // Calculate new total addon companies
    const currentAddonCompanies = currentSub.addon_companies || 0
    const newAddonCompanies = currentAddonCompanies + quantity

    // Create checkout session for addon purchase
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["sepa_debit", "card"],
      mode: "payment", // One-time payment for addon
      line_items: [
        {
          price: addonPriceId,
          quantity: quantity,
        },
      ],
      success_url: `${baseUrl}/app?addon=success&quantity=${quantity}`,
      cancel_url: `${baseUrl}/app?addon=canceled`,
      metadata: {
        userId: user.id,
        source: "masubventionpro_addon",
        planType: planType,
        addonQuantity: String(quantity),
        currentAddonCompanies: String(currentAddonCompanies),
        newAddonCompanies: String(newAddonCompanies),
        subscriptionId: currentSub.id,
      },
    })

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        description,
        quantity,
        currentAddonCompanies,
        newAddonCompanies,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Add addon companies error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
