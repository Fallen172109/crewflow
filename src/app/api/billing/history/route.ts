import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// GET /api/billing/history - Get billing history for user
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
    const limit = parseInt(searchParams.get('limit') || '10')

    // Verify user can access this billing history
    if (userId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only access your own billing history' }, { status: 403 })
      }
    }

    // Get user's Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!userProfile.stripe_customer_id) {
      return NextResponse.json({ 
        history: [],
        message: 'No billing history available'
      })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: userProfile.stripe_customer_id,
      limit: limit,
      expand: ['data.subscription', 'data.payment_intent']
    })

    // Transform Stripe invoices to our format
    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      amount: invoice.total / 100, // Convert from cents
      status: invoice.status === 'paid' ? 'paid' : 
              invoice.status === 'open' ? 'pending' : 'failed',
      description: invoice.description || 
                  `${userProfile.subscription_tier || 'Subscription'} - ${new Date(invoice.created * 1000).toLocaleDateString()}`,
      invoiceUrl: invoice.hosted_invoice_url,
      currency: invoice.currency.toUpperCase(),
      subscriptionId: invoice.subscription as string,
      paymentStatus: invoice.payment_intent ? 
        (invoice.payment_intent as any).status : null
    }))

    // Also fetch payment history from our database if we store it
    const { data: localPayments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!paymentsError && localPayments) {
      // Merge with Stripe data, avoiding duplicates
      const localHistory = localPayments
        .filter(payment => !billingHistory.find(invoice => invoice.id === payment.stripe_invoice_id))
        .map(payment => ({
          id: payment.id,
          date: new Date(payment.created_at),
          amount: payment.amount,
          status: payment.status,
          description: payment.description,
          invoiceUrl: payment.invoice_url,
          currency: payment.currency || 'USD',
          subscriptionId: payment.subscription_id,
          paymentStatus: payment.payment_status
        }))

      billingHistory.push(...localHistory)
    }

    // Sort by date (newest first)
    billingHistory.sort((a, b) => b.date.getTime() - a.date.getTime())

    // Calculate summary statistics
    const totalPaid = billingHistory
      .filter(item => item.status === 'paid')
      .reduce((sum, item) => sum + item.amount, 0)

    const pendingAmount = billingHistory
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0)

    return NextResponse.json({
      history: billingHistory.slice(0, limit),
      summary: {
        totalPaid,
        pendingAmount,
        totalInvoices: billingHistory.length,
        currency: billingHistory[0]?.currency || 'USD'
      }
    })

  } catch (error) {
    console.error('Error in GET /api/billing/history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/billing/history - Create manual billing record (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      amount,
      description,
      status = 'paid',
      currency = 'USD',
      invoiceUrl,
      subscriptionId,
      stripeInvoiceId
    } = body

    if (!userId || !amount || !description) {
      return NextResponse.json({ 
        error: 'userId, amount, and description are required' 
      }, { status: 400 })
    }

    // Insert payment record
    const { data: payment, error } = await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        amount,
        description,
        status,
        currency,
        invoice_url: invoiceUrl,
        subscription_id: subscriptionId,
        stripe_invoice_id: stripeInvoiceId,
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment record:', error)
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      payment: {
        id: payment.id,
        date: new Date(payment.created_at),
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        invoiceUrl: payment.invoice_url,
        currency: payment.currency
      }
    })

  } catch (error) {
    console.error('Error in POST /api/billing/history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/billing/history/[id] - Update billing record (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { paymentId, status, description, invoiceUrl } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }

    if (status) updateData.status = status
    if (description) updateData.description = description
    if (invoiceUrl) updateData.invoice_url = invoiceUrl

    const { error } = await supabase
      .from('payment_history')
      .update(updateData)
      .eq('id', paymentId)

    if (error) {
      console.error('Error updating payment record:', error)
      return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Payment record updated successfully' })

  } catch (error) {
    console.error('Error in PUT /api/billing/history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/billing/history/[id] - Delete billing record (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('payment_history')
      .delete()
      .eq('id', paymentId)

    if (error) {
      console.error('Error deleting payment record:', error)
      return NextResponse.json({ error: 'Failed to delete payment record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Payment record deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/billing/history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
