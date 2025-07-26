import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// POST /api/billing/cancel - Cancel user subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, reason, feedback } = body
    const targetUserId = userId || user.id

    // Verify user can cancel this subscription
    if (targetUserId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only cancel your own subscription' }, { status: 403 })
      }
    }

    // Get user's subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', targetUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!userProfile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    if (userProfile.subscription_status === 'canceled') {
      return NextResponse.json({ error: 'Subscription is already canceled' }, { status: 400 })
    }

    // Cancel subscription in Stripe (at period end)
    const subscription = await stripe.subscriptions.update(
      userProfile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          canceled_by: user.id,
          cancellation_reason: reason || 'user_requested',
          cancellation_feedback: feedback || ''
        }
      }
    )

    // Update user profile in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'canceled',
        subscription_canceled_at: new Date().toISOString(),
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', targetUserId)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      // Don't fail the request if database update fails, Stripe is the source of truth
    }

    // Log cancellation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: targetUserId,
        event_type: 'subscription_canceled',
        stripe_subscription_id: userProfile.stripe_subscription_id,
        metadata: {
          canceled_by: user.id,
          reason: reason || 'user_requested',
          feedback: feedback || '',
          canceled_at_period_end: true,
          period_end: new Date(subscription.current_period_end * 1000).toISOString()
        },
        created_at: new Date().toISOString()
      })

    // Track cancellation analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'subscription_canceled',
        properties: {
          user_id: targetUserId,
          tier: userProfile.subscription_tier,
          reason: reason || 'user_requested',
          has_feedback: !!feedback,
          canceled_at_period_end: true
        }
      })
    }).catch(err => console.error('Analytics tracking failed:', err))

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled successfully',
      details: {
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        periodEnd: new Date(subscription.current_period_end * 1000),
        accessUntil: new Date(subscription.current_period_end * 1000).toLocaleDateString()
      }
    })

  } catch (error) {
    console.error('Error in POST /api/billing/cancel:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Stripe error: ${error.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/billing/cancel - Reactivate canceled subscription
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body
    const targetUserId = userId || user.id

    // Verify user can reactivate this subscription
    if (targetUserId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only reactivate your own subscription' }, { status: 403 })
      }
    }

    // Get user's subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', targetUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!userProfile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    if (userProfile.subscription_status !== 'canceled') {
      return NextResponse.json({ error: 'Subscription is not canceled' }, { status: 400 })
    }

    // Reactivate subscription in Stripe
    const subscription = await stripe.subscriptions.update(
      userProfile.stripe_subscription_id,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivated_by: user.id,
          reactivated_at: new Date().toISOString()
        }
      }
    )

    // Update user profile in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_canceled_at: null,
        subscription_ends_at: null
      })
      .eq('id', targetUserId)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
    }

    // Log reactivation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: targetUserId,
        event_type: 'subscription_reactivated',
        stripe_subscription_id: userProfile.stripe_subscription_id,
        metadata: {
          reactivated_by: user.id,
          reactivated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    // Track reactivation analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'subscription_reactivated',
        properties: {
          user_id: targetUserId,
          tier: userProfile.subscription_tier
        }
      })
    }).catch(err => console.error('Analytics tracking failed:', err))

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      details: {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    })

  } catch (error) {
    console.error('Error in PUT /api/billing/cancel:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Stripe error: ${error.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/billing/cancel - Get cancellation details
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Verify user can access this information
    if (userId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only access your own subscription details' }, { status: 403 })
      }
    }

    // Get user's subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_subscription_id, subscription_status, subscription_canceled_at, subscription_ends_at')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!userProfile.stripe_subscription_id) {
      return NextResponse.json({ 
        canCancel: false,
        reason: 'No active subscription'
      })
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(userProfile.stripe_subscription_id)

    const canCancel = subscription.status === 'active' && !subscription.cancel_at_period_end
    const canReactivate = subscription.status === 'active' && subscription.cancel_at_period_end

    return NextResponse.json({
      canCancel,
      canReactivate,
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      canceledAt: userProfile.subscription_canceled_at ? new Date(userProfile.subscription_canceled_at) : null,
      accessUntil: userProfile.subscription_ends_at ? new Date(userProfile.subscription_ends_at) : null
    })

  } catch (error) {
    console.error('Error in GET /api/billing/cancel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
