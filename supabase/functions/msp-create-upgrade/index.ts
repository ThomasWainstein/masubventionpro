/**
 * MaSubventionPro Plan Upgrade
 *
 * Creates a Stripe checkout session for upgrading plans with proper proration.
 *
 * Upgrade paths:
 * - Découverte → Business: Pay 140€ (189€ - 49€ credit) within 30 days
 * - Découverte → Premium: Pay 500€ (549€ - 49€ credit)
 * - Business → Premium: Pay 360€ (549€ - 189€ credit)
 *
 * @module msp-create-upgrade
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Upgrade pricing in cents (HT)
const UPGRADE_PRICING = {
  decouverte_to_business: {
    amount: 14000, // 140€
    description: "Upgrade Découverte → Business (crédit 49€ appliqué)",
    newPlan: "business",
  },
  decouverte_to_premium: {
    amount: 50000, // 500€
    description: "Upgrade Découverte → Premium Groupe (crédit 49€ appliqué)",
    newPlan: "premium",
  },
  business_to_premium: {
    amount: 36000, // 360€
    description: "Upgrade Business → Premium Groupe (crédit 189€ appliqué)",
    newPlan: "premium",
  },
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

    const { targetPlan, addonCompanies = 0 } = await req.json()

    if (!targetPlan || !["business", "premium"].includes(targetPlan)) {
      throw new Error("Invalid target plan")
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

    const currentPlan = currentSub.plan_type

    // Determine upgrade path
    let upgradeKey: keyof typeof UPGRADE_PRICING | null = null

    if (currentPlan === "decouverte" && targetPlan === "business") {
      // Check if within 30 days of purchase
      const purchaseDate = new Date(currentSub.created_at)
      const daysSincePurchase = Math.floor(
        (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSincePurchase > 30) {
        // After 30 days, no credit - full price
        return createFullPriceCheckout(
          user,
          targetPlan,
          addonCompanies,
          stripeSecretKey,
          supabase
        )
      }

      upgradeKey = "decouverte_to_business"
    } else if (currentPlan === "decouverte" && targetPlan === "premium") {
      upgradeKey = "decouverte_to_premium"
    } else if (currentPlan === "business" && targetPlan === "premium") {
      upgradeKey = "business_to_premium"
    } else if (currentPlan === targetPlan) {
      throw new Error("Vous avez déjà ce plan")
    } else if (
      (currentPlan === "premium" && targetPlan === "business") ||
      (currentPlan === "business" && targetPlan === "decouverte") ||
      (currentPlan === "premium" && targetPlan === "decouverte")
    ) {
      // Downgrade - redirect to billing portal
      return new Response(
        JSON.stringify({
          redirect: "billing_portal",
          message: "Pour rétrograder, veuillez utiliser le portail de facturation",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    if (!upgradeKey) {
      throw new Error("Chemin de mise à niveau non valide")
    }

    const upgrade = UPGRADE_PRICING[upgradeKey]

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    // Get or create Stripe customer
    let stripeCustomerId = currentSub.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          source: "masubventionpro",
        },
      })
      stripeCustomerId = customer.id

      // Save customer ID
      await supabase.from("masubventionpro_customers").upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: "user_id" }
      )
    }

    const baseUrl = Deno.env.get("MSP_APP_URL") || "https://masubventionpro.com"

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: upgrade.description,
          },
          unit_amount: upgrade.amount,
        },
        quantity: 1,
      },
    ]

    // Add addon companies for premium
    if (targetPlan === "premium" && addonCompanies > 0) {
      const addonPriceId = Deno.env.get("MSP_PRICE_PREMIUM_ADDON")
      if (addonPriceId) {
        lineItems.push({
          price: addonPriceId,
          quantity: addonCompanies,
        })
      }
    }

    // Create checkout session for upgrade
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["sepa_debit", "card"],
      mode: "payment", // One-time payment for the upgrade difference
      line_items: lineItems,
      success_url: `${baseUrl}/app/settings?upgrade=success`,
      cancel_url: `${baseUrl}/app/settings?upgrade=canceled`,
      metadata: {
        userId: user.id,
        source: "masubventionpro_upgrade",
        fromPlan: currentPlan,
        toPlan: targetPlan,
        addonCompanies: String(addonCompanies),
        isUpgrade: "true",
      },
    })

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Upgrade error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})

/**
 * Create full price checkout when no credit applies
 */
async function createFullPriceCheckout(
  user: any,
  targetPlan: string,
  addonCompanies: number,
  stripeSecretKey: string,
  supabase: any
): Promise<Response> {
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  })

  let priceId: string | undefined

  if (targetPlan === "business") {
    priceId = Deno.env.get("MSP_PRICE_BUSINESS")
  } else if (targetPlan === "premium") {
    priceId = Deno.env.get("MSP_PRICE_PREMIUM")
  }

  if (!priceId) {
    throw new Error("Price not configured for plan")
  }

  // Get or create customer
  const { data: customer } = await supabase
    .from("masubventionpro_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  let stripeCustomerId = customer?.stripe_customer_id

  if (!stripeCustomerId) {
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

  const baseUrl = Deno.env.get("MSP_APP_URL") || "https://masubventionpro.com"

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ]

  // Add addons
  if (addonCompanies > 0) {
    const addonPriceId = targetPlan === "premium"
      ? Deno.env.get("MSP_PRICE_PREMIUM_ADDON")
      : Deno.env.get("MSP_PRICE_BUSINESS_ADDON")

    if (addonPriceId) {
      lineItems.push({ price: addonPriceId, quantity: addonCompanies })
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["sepa_debit", "card"],
    mode: "subscription",
    line_items: lineItems,
    success_url: `${baseUrl}/app/settings?upgrade=success`,
    cancel_url: `${baseUrl}/app/settings?upgrade=canceled`,
    metadata: {
      userId: user.id,
      source: "masubventionpro",
      planType: targetPlan,
      addonCompanies: String(addonCompanies),
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        source: "masubventionpro",
        planType: targetPlan,
      },
    },
  })

  return new Response(
    JSON.stringify({ url: session.url, sessionId: session.id }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  )
}
