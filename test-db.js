import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, user_id, group_id, display_name')
    .limit(5);
  
  console.log('Random group members:', data);
  if (error) console.error(error);
}

test();
