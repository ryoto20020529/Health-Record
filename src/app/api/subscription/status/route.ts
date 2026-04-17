import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let admin;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, plan, current_period_end')
    .eq('user_id', user.id)
    .single();

  const isActive = sub?.status === 'active' || sub?.status === 'trialing';

  return NextResponse.json({
    isPremium: isActive,
    plan: sub?.plan ?? 'free',
    currentPeriodEnd: sub?.current_period_end ?? null,
  });
}
