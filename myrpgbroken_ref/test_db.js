const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  const key = parts[0];
  const val = parts.slice(1);
  if (key && val) acc[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=*', {
  headers: {
    'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
}).then(r => r.json()).then(d => {
  console.log('Profiles:', d);
  console.log('paulotamay@gmail.com:', d.find(p => p.email === 'paulotamay@gmail.com'));
}).catch(console.error);
