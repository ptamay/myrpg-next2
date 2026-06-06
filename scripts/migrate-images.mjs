import { createClient } from '@supabase/supabase-js';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

// Load .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadBase64(base64Data, folder) {
  if (!base64Data || !base64Data.startsWith('data:image/')) return base64Data;
  
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Formato base64 inválido');
  }

  const ext = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  const fileName = `${folder}/${Date.now()}_${crypto.randomUUID().split('-')[0]}.${ext}`;

  const { error } = await supabase.storage.from('images').upload(fileName, buffer, {
    contentType: `image/${ext}`,
    upsert: true
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function migratePlayers() {
  console.log('Migrando players...');
  const { data: players, error } = await supabase.from('players').select('id, image_url, transformation');
  if (error) throw error;

  let count = 0;
  for (const player of players) {
    let updated = false;
    let newImageUrl = player.image_url;
    let newTransformation = player.transformation;

    if (newImageUrl && newImageUrl.startsWith('data:image/')) {
      newImageUrl = await uploadBase64(newImageUrl, 'avatars');
      updated = true;
    }

    if (newTransformation && newTransformation.image && newTransformation.image.startsWith('data:image/')) {
      newTransformation.image = await uploadBase64(newTransformation.image, 'avatars');
      updated = true;
    }

    if (updated) {
      const { error: upErr } = await supabase.from('players').update({
        image_url: newImageUrl,
        transformation: newTransformation
      }).eq('id', player.id);
      if (upErr) throw upErr;
      count++;
    }
  }
  console.log(`Players migrados: ${count}`);
}

async function migrateNpcs() {
  console.log('Migrando npcs...');
  const { data: npcs, error } = await supabase.from('npcs').select('id, image_url, transformation');
  if (error) throw error;

  let count = 0;
  for (const npc of npcs) {
    let updated = false;
    let newImageUrl = npc.image_url;
    let newTransformation = npc.transformation;

    if (newImageUrl && newImageUrl.startsWith('data:image/')) {
      newImageUrl = await uploadBase64(newImageUrl, 'avatars');
      updated = true;
    }

    if (newTransformation && newTransformation.image && newTransformation.image.startsWith('data:image/')) {
      newTransformation.image = await uploadBase64(newTransformation.image, 'avatars');
      updated = true;
    }

    if (updated) {
      const { error: upErr } = await supabase.from('npcs').update({
        image_url: newImageUrl,
        transformation: newTransformation
      }).eq('id', npc.id);
      if (upErr) throw upErr;
      count++;
    }
  }
  console.log(`NPCs migrados: ${count}`);
}

async function migrateMurals() {
  console.log('Migrando mural_cards...');
  const { data: cards, error } = await supabase.from('mural_cards').select('id, image_url');
  if (error) throw error;

  let count = 0;
  for (const card of cards) {
    if (card.image_url && card.image_url.startsWith('data:image/')) {
      const newImageUrl = await uploadBase64(card.image_url, 'murals');
      const { error: upErr } = await supabase.from('mural_cards').update({ image_url: newImageUrl }).eq('id', card.id);
      if (upErr) throw upErr;
      count++;
    }
  }
  console.log(`Mural Cards migrados: ${count}`);
}

async function migrateDiary() {
  console.log('Migrando diary_entries...');
  const { data: entries, error } = await supabase.from('diary_entries').select('id, image_url');
  if (error) throw error;

  let count = 0;
  for (const entry of entries) {
    if (entry.image_url && entry.image_url.startsWith('data:image/')) {
      const newImageUrl = await uploadBase64(entry.image_url, 'diary');
      const { error: upErr } = await supabase.from('diary_entries').update({ image_url: newImageUrl }).eq('id', entry.id);
      if (upErr) throw upErr;
      count++;
    }
  }
  console.log(`Diary Entries migrados: ${count}`);
}

async function main() {
  try {
    await migratePlayers();
    await migrateNpcs();
    await migrateMurals();
    await migrateDiary();
    console.log('--- Migração concluída com sucesso! ---');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

main();
