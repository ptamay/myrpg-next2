const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/);
  const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="?([^"\r\n]+)"?/);

  const supabaseUrl = urlMatch ? urlMatch[1] : null;
  const supabaseKey = keyMatch ? keyMatch[1] : null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function run() {
    const { data: camp } = await supabase.from('campaign').select('id').limit(1).single();
    if (!camp) return console.log('No campaign');
    
    console.log('Testing NPC upsert...');
    // test the exact mapper
    const { error } = await supabase.from('npcs').upsert({
      id: '00000000-0000-0000-0000-000000000001',
      campaign_id: camp.id,
      name: 'Test NPC',
      title: 'Tester',
      hp_max: 10
    });
    
    console.log('Error:', error);
  }

  run();
} catch (e) {
  console.log(e);
}
