const fs = require('fs');
const files = [
  'hooks/useGameData.ts',
  'hooks/useMapStorage.ts',
  'app/(app)/usuarios/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/throw\s+(error|mErr|cErr|lErr|cardsErr|connsErr|uploadError|dbError|deleteError|updateError);/g, 'throw new Error($1?.message || JSON.stringify($1));');
  fs.writeFileSync(file, content);
  console.log(`Fixed throws in ${file}`);
});
