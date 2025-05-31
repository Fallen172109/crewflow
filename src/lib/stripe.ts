import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Subscription tier configurations
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    agents: 3,
    requestsPerAgent: 500,
    features: [
      '3 AI Agents (Coral, Mariner, Pearl)',
      '500 requests per agent/month',
      'Basic integrations',
      'Email support',
      'Maritime dashboard'
    ]
  },
  professional: {
    name: 'Professional',
    price: 59,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    agents: 6,
    requestsPerAgent: 750,
    features: [
      '6 AI Agents + Social Media Agent',
      '750 requests per agent/month',
      'Advanced integrations',
      'Priority support',
      'Analytics dashboard',
      'API connections'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 89,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    agents: 10,
    requestsPerAgent: 1000,
    features: [
      'All 10 AI Agents',
      '1,000 requests per agent/month',
      'Premium integrations',
      '24/7 priority support',
      'Advanced analytics',
      'Custom workflows',
      'White-label options'
    ]
  }
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

// Create Stripe checkout session
export async function createCheckoutSession(
  priceId: string,
  customerId?: string,
  successUrl?: string,
  cancelUrl?: string
) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: customerId ? {
        address: 'auto',
        name: 'auto',
      } : undefined,
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create Stripe customer
export async function createStripeCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'crewflow'
      }
    })

    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Create customer portal session
export async function createPortalSession(customerId: string, returnUrl?: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    })

    return session
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

// Webhook helpers
export function constructWebhookEvent(body: string, signature: string) {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Error constructing webhook event:', error)
    throw error
  }
}

// Get tier from price ID
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId === priceId) {
      return tier as SubscriptionTier
    }
  }
  return null
}

// Calculate overage charges
export function calculateOverageCharges(usage: number, limit: number): number {
  if (usage <= limit) return 0
  const overage = usage - limit
  return overage * 0.05 // $0.05 per additional request
}
