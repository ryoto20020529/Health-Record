import Stripe from 'stripe';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY が設定されていません');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

export const PREMIUM_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
