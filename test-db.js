const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/);
  const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="?([^"\r\n]+)"?/);

  const supabaseUrl = urlMatch ? urlMatch[1] : null;
  const supabaseKey = keyMatch ? keyMatch[1] : null;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('sua-url-aqui')) {
    console.error('❌ Chaves do Supabase inválidas ou não preenchidas no .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function testConnection() {
    console.log('Testando conexão com o Supabase...');
    const { data, error } = await supabase.from('campaign').select('id, name').limit(1);
    
    if (error) {
      console.error('❌ Falha ao conectar no banco:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Conexão bem-sucedida! Banco de dados acessível.');
    console.log('📦 Dados retornados (Campanha):', data);
  }

  testConnection();
} catch (err) {
  console.error('Erro ao ler .env.local:', err.message);
  process.exit(1);
}
