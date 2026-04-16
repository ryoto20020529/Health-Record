import { NextRequest, NextResponse } from 'next/server';
import { createHmac, createHash } from 'crypto';
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

// 文字列から決定論的UUIDを生成（Postgres uuid型に対応）
function deterministicUUID(input: string): string {
  const h = createHash('sha256').update(input).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '4' + h.slice(13, 16),
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join('-');
}

// 数値に変換（Shortcutから文字列で来ることがある）
function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSONの解析に失敗しました' }, { status: 400 });
    }

    const rawDate = body.date;
    const date = typeof rawDate === 'string' ? rawDate.slice(0, 10) : '';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date は YYYY-MM-DD 形式で指定してください' }, { status: 400 });
    }

    const steps = toNum(body.steps);
    const activeCalories = toNum(body.activeCalories);
    const workouts = Array.isArray(body.workouts) ? body.workouts : [];

    const supabase = createAdminClient();
    const synced: string[] = [];
    const errors: string[] = [];

    // 歩数・アクティブカロリーを exercise_records に保存
    if (steps > 0 || activeCalories > 0) {
      const stepsKcal = activeCalories > 0 ? Math.round(activeCalories) : Math.round(steps * 0.04);
      const stepsMin = Math.max(1, Math.round(steps / 100));
      const recordId = deterministicUUID(`steps_${userId}_${date}`);

      const { error } = await supabase
        .from('exercise_records')
        .upsert({
          id: recordId,
          user_id: userId,
          date,
          name: steps > 0
            ? `[Health] 歩行 ${Math.round(steps).toLocaleString()}歩`
            : '[Health] アクティブカロリー',
          duration: stepsMin,
          calories_burned: stepsKcal,
          created_at: new Date().toISOString(),
        });

      if (!error) {
        synced.push(`歩行 ${Math.round(steps).toLocaleString()}歩 / ${stepsKcal}kcal`);
      } else {
        console.error('[health-sync] steps error:', error);
        errors.push(`steps: ${error.message}`);
      }
    }

    // ワークアウトを exercise_records に保存
    for (const w of workouts) {
      const wName = String(w.name ?? 'ワークアウト');
      const wCal = toNum(w.calories);
      const wDur = toNum(w.duration);
      const recordId = deterministicUUID(`wo_${userId}_${date}_${wName}`);

      const { error } = await supabase
        .from('exercise_records')
        .upsert({
          id: recordId,
          user_id: userId,
          date,
          name: `[Health] ${wName}`,
          duration: Math.max(1, Math.round(wDur)),
          calories_burned: Math.round(wCal),
          created_at: new Date().toISOString(),
        });

      if (!error) synced.push(`${wName} ${Math.round(wCal)}kcal`);
      else {
        console.error('[health-sync] workout error:', error);
        errors.push(`${wName}: ${error.message}`);
      }
    }

    console.log(`[health-sync] user=${userId.slice(0, 8)} date=${date} synced:`, synced, errors.length ? 'errors:' : '', errors);
    return NextResponse.json({ success: true, date, synced, errors: errors.length ? errors : undefined });
  } catch (error) {
    console.error('[health-sync] unexpected error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
