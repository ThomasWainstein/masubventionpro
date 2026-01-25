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
    const stripeSecretKey = Deno.env.get("MSP_STRIPE_SECRET_KEY")
    if (!stripeSecretKey) {
      throw new Error("MSP_STRIPE_SECRET_KEY not configured")
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })

    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error("Session ID is required")
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      return new Response(
        JSON.stringify({
          success: true,
          email: session.customer_email,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          paymentStatus: session.payment_status,
          message: "Payment not completed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }
  } catch (error) {
    console.error("Verify checkout error:", error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
