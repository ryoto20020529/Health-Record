import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';

// HMAC トークンからユーザーIDを復元・検証
function validateToken(token: string, secret: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedId, hash] = parts;
  try {
    const userId = Buffer.from(encodedId, 'base64url').toString();
    const expected = createHmac('sha256', secret).update(userId).digest('hex').slice(0, 24);
    if (hash !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}

// iPhone ショートカットから POST される
// Authorization: Bearer <token>
// Body: { date, steps?, activeCalories?, workouts?: [{name, duration, calories}] }
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
      console.error('[health-sync] SUPABASE_SERVICE_ROLE_KEY not set');
      return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authorization ヘッダーが必要です' }, { status: 401 });
    }

    const userId = validateToken(token, secret);
    if (!userId) {
      console.warn('[health-sync] invalid token');
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const body = await request.json();
    const { date, steps, activeCalories, workouts = [] } = body as {
      date: string;
      steps?: number;
      activeCalories?: number;
      workouts?: { name: string; duration: number; calories: number }[];
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date は YYYY-MM-DD 形式で指定してください' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const synced: string[] = [];

    // 歩数・アクティブカロリーを exercise_records に保存
    if ((steps !== undefined && steps > 0) || (activeCalories !== undefined && activeCalories > 0)) {
      const stepsKcal = activeCalories ?? Math.round((steps ?? 0) * 0.04);
      const stepsMin = Math.round((steps ?? 0) / 100); // 歩数から大まかな時間推定
      const { error } = await supabase
        .from('exercise_records')
        .upsert({
          id: `hs_steps_${userId.slice(0, 8)}_${date}`,
          user_id: userId,
          date,
          name: `[Health] 歩行 ${(steps ?? 0).toLocaleString()}歩`,
          duration: stepsMin,
          calories_burned: stepsKcal,
          created_at: new Date().toISOString(),
        });
      if (!error) synced.push(`歩行 ${(steps ?? 0).toLocaleString()}歩 / ${stepsKcal}kcal`);
      else console.error('[health-sync] steps error:', error);
    }

    // ワークアウトを exercise_records に保存
    for (const w of workouts) {
      const { error } = await supabase
        .from('exercise_records')
        .upsert({
          id: `hs_wo_${userId.slice(0, 8)}_${date}_${encodeURIComponent(w.name).slice(0, 10)}`,
          user_id: userId,
          date,
          name: `[Health] ${w.name}`,
          duration: w.duration ?? 0,
          calories_burned: w.calories ?? 0,
          created_at: new Date().toISOString(),
        });
      if (!error) synced.push(`${w.name} ${w.calories}kcal`);
      else console.error('[health-sync] workout error:', error);
    }

    console.log(`[health-sync] user=${userId.slice(0, 8)} date=${date} synced:`, synced);
    return NextResponse.json({ success: true, date, synced });
  } catch (error) {
    console.error('[health-sync] error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
