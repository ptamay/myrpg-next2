const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const [k, ...v] = l.split('=');
  if(k && v.length) a[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
  return a;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: campaign, error: cErr } = await supabase.from('campaign').select('*');
  console.log('Campaign:', campaign, cErr);

  const { data: jDays, error: dErr } = await supabase.from('journey_days').select('*');
  console.log('Journey Days:', jDays, dErr);

  const { data: jBlocks, error: bErr } = await supabase.from('journey_blocks').select('*, journey_days(day_number)');
  console.log('Journey Blocks:', jBlocks, bErr);
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles, pErr);
}
run();
