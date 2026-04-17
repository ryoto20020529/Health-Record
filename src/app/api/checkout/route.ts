import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PREMIUM_PRICE_ID } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  // Bearer JWT 認証
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let admin;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!PREMIUM_PRICE_ID) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID が設定されていません' }, { status: 500 });
  }

  let stripe;
  try { stripe = getStripe(); } catch {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const origin = req.headers.get('origin') ?? 'https://health-record-fawn.vercel.app';

  // 既存の Stripe Customer ID を取得（または新規作成）
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // subscriptions レコードを upsert
    await admin.from('subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      status: 'inactive',
      plan: 'free',
    }, { onConflict: 'user_id' });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/settings?premium=success`,
    cancel_url:  `${origin}/settings?premium=cancel`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    locale: 'ja',
  });

  return NextResponse.json({ url: session.url });
}
