import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, getTierFromPriceId } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  try {
    const event = constructWebhookEvent(body, signature)
    const supabase = await createSupabaseServerClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const tier = getTierFromPriceId(priceId)

        if (!tier) {
          console.error('Unknown price ID:', priceId)
          break
        }

        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer:', customerId)
          break
        }

        // Update user subscription
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user subscription:', updateError)
          break
        }

        // Record subscription history
        await supabase
          .from('subscription_history')
          .insert({
            user_id: user.id,
            stripe_subscription_id: subscription.id,
            tier,
            status: subscription.status,
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer:', customerId)
          break
        }

        // Update user subscription to cancelled
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user subscription:', updateError)
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer:', customerId)
          break
        }

        // Update user subscription to past_due
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user subscription:', updateError)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
