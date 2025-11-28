import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, PricingTier } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, userId, email, tier } = body as {
      priceId: string;
      userId: string;
      email: string;
      tier: PricingTier;
    };

    if (!priceId || !userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    
    // Search for existing Stripe customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let stripeCustomerId = existingCustomers.data[0]?.id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          tier,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

