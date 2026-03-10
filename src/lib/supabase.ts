import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // SSR/ビルド時はクライアントを作成しない
  if (typeof window === 'undefined') {
    // サーバーサイドでは仮のクライアントを返す（実際には使われない）
    return createDummyClient();
  }

  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase環境変数が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
    );
  }

  client = createBrowserClient(url, key);
  return client;
}

// ビルド時のダミークライアント（実際には呼ばれない）
function createDummyClient() {
  const noop = () => ({ data: null, error: null });
  const chain = () => ({
    select: chain, from: chain, eq: chain, single: chain,
    order: chain, upsert: chain, delete: chain, insert: chain,
    update: chain, ...noop(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ data: null, error: null }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => chain(),
  } as any;
}
