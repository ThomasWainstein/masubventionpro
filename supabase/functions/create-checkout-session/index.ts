import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured")
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    const { email, userId, planType, source, addonPacks = 0 } = await req.json()

    if (!email) {
      throw new Error("Email is required")
    }

    // Define prices based on plan type
    let priceId: string
    let mode: "payment" | "subscription" = "subscription"

    switch (planType) {
      case "decouverte":
        priceId = Deno.env.get("STRIPE_PRICE_DECOUVERTE") || ""
        mode = "payment" // One-time payment for 30 days
        break
      case "business":
        priceId = Deno.env.get("STRIPE_PRICE_BUSINESS") || ""
        break
      case "premium":
        priceId = Deno.env.get("STRIPE_PRICE_PREMIUM") || ""
        break
      case "premium_addon":
        priceId = Deno.env.get("STRIPE_PRICE_PREMIUM_ADDON") || ""
        mode = "payment" // One-time payment for additional companies
        break
      default:
        priceId = Deno.env.get("STRIPE_PRICE_BUSINESS") || "" // Default to Business
    }

    if (!priceId) {
      throw new Error(`Price not configured for plan type: ${planType}`)
    }

    // Determine success and cancel URLs based on source
    const baseUrl = source === "masubventionpro"
      ? Deno.env.get("MASUBVENTIONPRO_URL") || "https://masubventionpro.com"
      : Deno.env.get("SUBVENTION360_URL") || "https://subvention360.com"

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ]

    // Add extra companies if requested
    if (addonPacks > 0) {
      let addonPriceId: string | undefined

      if (planType === "business") {
        // Business: €99 per additional company
        addonPriceId = Deno.env.get("STRIPE_PRICE_BUSINESS_ADDON")
      } else if (planType === "premium") {
        // Premium: €99 per pack of 5 additional companies
        addonPriceId = Deno.env.get("STRIPE_PRICE_PREMIUM_ADDON")
      }

      if (addonPriceId) {
        lineItems.push({ price: addonPriceId, quantity: addonPacks })
      }
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card", "sepa_debit"],
      mode,
      customer_email: email,
      line_items: lineItems,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/onboarding?canceled=true`,
      metadata: {
        userId: userId || "",
        source: source || "masubventionpro",
        planType: planType || "business",
        addonPacks: String(addonPacks),
      },
    }

    // Only add subscription_data for subscription mode
    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          userId: userId || "",
          source: source || "masubventionpro",
          planType: planType || "business",
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Checkout session error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
