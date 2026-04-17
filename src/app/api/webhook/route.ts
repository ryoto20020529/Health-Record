import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'config error' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  // サブスクリプション取得ヘルパー
  async function syncSubscription(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.supabase_user_id;
    if (!userId) {
      console.warn('[webhook] no supabase_user_id in subscription metadata');
      return;
    }

    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPeriodEnd = (subscription as any).current_period_end as number | undefined;
    const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

    await admin.from('subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan: isActive ? 'premium' : 'free',
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // user_settings の is_premium も同期
    await admin.from('user_settings')
      .update({ is_premium: isActive })
      .eq('user_id', userId);

    console.log(`[webhook] synced user=${userId.slice(0, 8)} status=${subscription.status} premium=${isActive}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await admin.from('subscriptions').update({
            status: 'canceled', plan: 'free', updated_at: new Date().toISOString(),
          }).eq('user_id', userId);
          await admin.from('user_settings').update({ is_premium: false }).eq('user_id', userId);
          console.log(`[webhook] canceled user=${userId.slice(0, 8)}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSub = (invoice as any).subscription;
        const subId: string | undefined = typeof rawSub === 'string' ? rawSub : rawSub?.id;
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }

      default:
        console.log(`[webhook] unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
