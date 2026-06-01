const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/useAppContext/g, 'useApp')
    .replace(/createClient/g, 'getSupabaseClient')
    .replace(/authError/g, 'error')
    .replace(/@\/types\/session/g, '@/types/index')
    .replace(/@\/types\/cronicas/g, '@/types/index');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated', filePath);
  }
}

['components', 'hooks', 'contexts'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walk(dir, processFile);
  }
});
