const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'x8dosubs@gmail.com';
  console.log(`Checking state for ${email}...`);

  const { data: players, error: err1 } = await supabase.from('players').select('*');
  if (err1) console.error("Error fetching players:", err1);
  
  const player = players.find(p => p.player_email === email);
  if (player) {
    console.log("Found Player record:", player.id, player.name, player.player_email);
  } else {
    console.log("No Player record found with player_email:", email);
  }

  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*');
  if (err2) console.error("Error fetching profiles:", err2);
  
  console.log("Profiles in DB:");
  profiles.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.display_name}, Role: ${p.role}, PlayerID: ${p.player_id}`);
    if (player && p.player_id === player.id) {
       console.log(`  ^ This profile is linked to the player!`);
    }
  });
}

run();
