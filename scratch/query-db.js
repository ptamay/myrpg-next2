const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/);
  const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="?([^"\r\n]+)"?/);

  const supabaseUrl = urlMatch ? urlMatch[1] : null;
  const supabaseKey = keyMatch ? keyMatch[1] : null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function queryAll() {
    console.log('--- CAMPAIGN ---');
    const { data: campaign } = await supabase.from('campaign').select('*');
    console.log(campaign);

    console.log('--- PROFILES ---');
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log(profiles);

    console.log('--- PLAYERS ---');
    const { data: players } = await supabase.from('players').select('id, name, player_name');
    console.log(players);
  }

  queryAll();
} catch (err) {
  console.error(err);
}
