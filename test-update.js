import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Logging in... (simulated checking session)');
  // We cannot login without credentials.
  // Instead, let's just fetch the table information using anon key.
  const { data, error } = await supabase.from('group_members').select('*').limit(1);
  console.log('Anon select:', { data, error });
}

test();
