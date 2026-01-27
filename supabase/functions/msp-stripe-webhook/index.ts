/**
 * MaSubventionPro Stripe Webhook Handler
 *
 * Listens to Stripe events and synchronizes payment data to Supabase database.
 *
 * Events handled:
 * - checkout.session.completed → Create subscription or one-time payment record
 * - customer.subscription.updated → Update subscription status (upgrades/downgrades)
 * - customer.subscription.deleted → Mark subscription as canceled
 * - invoice.payment_failed → Update subscription to past_due
 *
 * @module msp-stripe-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get("stripe-signature")
    const webhookSecret = Deno.env.get("MSP_STRIPE_WEBHOOK_SECRET")
    const stripeSecretKey = Deno.env.get("MSP_STRIPE_SECRET_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!signature) {
      throw new Error("Missing Stripe webhook signature")
    }

    if (!webhookSecret || !stripeSecretKey) {
      console.error("Stripe configuration missing:", {
        hasWebhookSecret: !!webhookSecret,
        hasStripeKey: !!stripeSecretKey,
      })
      throw new Error("Stripe configuration incomplete")
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing")
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    console.log(`[MSP Webhook] Event received: ${event.type}`)

    // Process event based on type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabase, stripe)
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription, supabase, stripe)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, supabase)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabase)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, supabase)
        break
      }

      default:
        console.log(`[MSP Webhook] Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("[MSP Webhook] Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe
) {
  console.log("[MSP Webhook] Processing checkout:", session.id)

  const metadata = session.metadata || {}
  const planType = metadata.planType || "business"
  const userId = metadata.userId

  // Get user by email if userId not in metadata
  let targetUserId = userId
  if (!targetUserId && session.customer_email) {
    const { data: userData } = await supabase.auth.admin.listUsers()
    const user = userData?.users.find((u: any) => u.email === session.customer_email)
    targetUserId = user?.id
  }

  if (!targetUserId) {
    console.error("[MSP Webhook] No user found for checkout:", session.customer_email)
    return
  }

  // Upsert customer record
  await supabase.from("masubventionpro_customers").upsert(
    {
      user_id: targetUserId,
      stripe_customer_id: session.customer as string,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (session.mode === "subscription") {
    // Subscription payment (Business or Premium)
    let subscription: Stripe.Subscription | null = null

    if (session.subscription) {
      subscription = typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription as Stripe.Subscription
    }

    if (subscription) {
      const priceId = subscription.items.data[0]?.price.id
      const addonCompanies = parseInt(metadata.addonCompanies || "0", 10)

      await supabase.from("masubventionpro_subscriptions").insert({
        user_id: targetUserId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan_type: planType,
        status: subscription.status,
        is_one_time: false,
        addon_companies: addonCompanies,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })

      console.log("[MSP Webhook] Subscription created:", subscription.id, "Plan:", planType)
    }
  } else {
    // One-time payment (Découverte - 30 days access)
    const accessExpiresAt = new Date()
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30)

    // Create subscription record for one-time payment
    await supabase.from("masubventionpro_subscriptions").insert({
      user_id: targetUserId,
      stripe_customer_id: session.customer as string,
      plan_type: "decouverte",
      status: "active",
      is_one_time: true,
      access_expires_at: accessExpiresAt.toISOString(),
    })

    // Also record the payment
    await supabase.from("masubventionpro_payments").insert({
      user_id: targetUserId,
      stripe_checkout_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: session.amount_total || 4900, // 49 EUR in cents
      currency: session.currency || "eur",
      status: "succeeded",
      plan_type: "decouverte",
      access_starts_at: new Date().toISOString(),
      access_expires_at: accessExpiresAt.toISOString(),
    })

    console.log("[MSP Webhook] Découverte payment recorded, access until:", accessExpiresAt)
  }

  // Update user metadata with selected plan
  await supabase.auth.admin.updateUserById(targetUserId, {
    user_metadata: { selected_plan: planType },
  })
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe: Stripe
) {
  console.log("[MSP Webhook] Subscription created:", subscription.id)

  // Check if already exists (race condition with checkout.session.completed)
  const { data: existingSub } = await supabase
    .from("masubventionpro_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (existingSub) {
    console.log("[MSP Webhook] Subscription already exists, skipping:", subscription.id)
    return
  }

  // Get customer to find user
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  if (!customer || customer.deleted) return

  const customerEmail = (customer as Stripe.Customer).email
  if (!customerEmail) return

  // Find user
  const { data: userData } = await supabase.auth.admin.listUsers()
  const user = userData?.users.find((u: any) => u.email === customerEmail)

  if (!user) {
    console.error("[MSP Webhook] User not found for:", customerEmail.substring(0, 3) + "***")
    return
  }

  // Determine plan type from price
  const priceId = subscription.items.data[0]?.price.id
  const planType = determinePlanType(priceId)

  await supabase.from("masubventionpro_subscriptions").insert({
    user_id: user.id,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_type: planType,
    status: subscription.status,
    is_one_time: false,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  })

  console.log("[MSP Webhook] Subscription inserted:", subscription.id)
}

/**
 * Handle customer.subscription.updated event
 * This handles upgrades, downgrades, and status changes
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  console.log("[MSP Webhook] Subscription updated:", subscription.id, "Status:", subscription.status)

  const priceId = subscription.items.data[0]?.price.id
  const planType = determinePlanType(priceId)

  // Clear payment failure data if subscription is now active
  const clearPaymentFailure = subscription.status === "active"

  const updateData: any = {
    status: subscription.status,
    stripe_price_id: priceId,
    plan_type: planType,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (subscription.cancel_at) {
    updateData.cancel_at = new Date(subscription.cancel_at * 1000).toISOString()
  }

  if (subscription.canceled_at) {
    updateData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString()
  }

  if (clearPaymentFailure) {
    updateData.payment_failed_at = null
    updateData.payment_failure_notified = false
  }

  await supabase
    .from("masubventionpro_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id)

  // Also update user metadata if plan changed
  const { data: subData } = await supabase
    .from("masubventionpro_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (subData?.user_id) {
    await supabase.auth.admin.updateUserById(subData.user_id, {
      user_metadata: { selected_plan: planType },
    })
  }

  console.log("[MSP Webhook] Subscription updated to plan:", planType)
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  console.log("[MSP Webhook] Subscription deleted:", subscription.id)

  await supabase
    .from("masubventionpro_subscriptions")
    .update({
      status: "canceled",
      ended_at: new Date().toISOString(),
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)

  console.log("[MSP Webhook] Subscription marked as canceled")
}

/**
 * Handle invoice.payment_failed event
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  console.log("[MSP Webhook] Payment failed for invoice:", invoice.id)

  if (!invoice.subscription) return

  // Get current subscription state
  const { data: existingSub } = await supabase
    .from("masubventionpro_subscriptions")
    .select("payment_failed_at")
    .eq("stripe_subscription_id", invoice.subscription as string)
    .single()

  const isFirstFailure = !existingSub?.payment_failed_at

  await supabase
    .from("masubventionpro_subscriptions")
    .update({
      status: "past_due",
      payment_failed_at: isFirstFailure
        ? new Date().toISOString()
        : existingSub.payment_failed_at,
      payment_failure_notified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", invoice.subscription as string)

  console.log("[MSP Webhook] Subscription marked as past_due")
}

/**
 * Determine plan type from Stripe price ID
 */
function determinePlanType(priceId: string | undefined): string {
  if (!priceId) return "business"

  const decouverte = Deno.env.get("MSP_PRICE_DECOUVERTE")
  const business = Deno.env.get("MSP_PRICE_BUSINESS")
  const premium = Deno.env.get("MSP_PRICE_PREMIUM")

  if (priceId === decouverte) return "decouverte"
  if (priceId === business) return "business"
  if (priceId === premium) return "premium"

  // Fallback to business
  return "business"
}
