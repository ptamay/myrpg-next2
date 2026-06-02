const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xkvmxhiysdxqqgddzhlr.supabase.co';
const supabaseKey = 'sb_publishable_3iAdJMST6PGjpUq2JpZ0bw_BtXh9h-y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Connection Error:', error.message);
  } else {
    console.log('Connection OK. Retrieved data:', data);
  }
}

testConnection();
