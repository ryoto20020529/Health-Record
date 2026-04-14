import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';

// userId + service role key から HMAC トークンを生成
// → DB にトークンを保存しなくても検証できる
function generateToken(userId: string, secret: string): string {
  const hash = createHmac('sha256', secret).update(userId).digest('hex').slice(0, 24);
  const encodedId = Buffer.from(userId).toString('base64url');
  return `${encodedId}.${hash}`;
}

// GET: ログイン中ユーザーの同期トークンと設定URLを返す
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local に追加してサーバーを再起動してください。' },
      { status: 503 }
    );
  }

  const token = generateToken(user.id, secret);
  return NextResponse.json({ token, userId: user.id });
}

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const jwt = authHeader?.replace('Bearer ', '').trim();
  if (!jwt) return null;
  const supabase = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user;
}
