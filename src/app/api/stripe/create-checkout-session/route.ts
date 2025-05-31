import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, createStripeCustomer, SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { tier } = await request.json()

    if (!tier || !SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    
    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let customerId = userProfile.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(user.email!, user.user_metadata?.full_name)
      customerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await createCheckoutSession(
      SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS].priceId,
      customerId,
      `${request.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      `${request.nextUrl.origin}/pricing`
    )

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
