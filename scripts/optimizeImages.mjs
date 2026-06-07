import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      if (file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(process.cwd(), dirPath, "/", file))
      }
    }
  })

  return arrayOfFiles
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = getAllFiles('./components');
let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('<img ') || content.includes('<img\n')) {
    // Skip if it's already using OptimizedImage entirely and no stray <img>
    // Actually, regex to replace <img with <OptimizedImage
    const originalContent = content;
    content = content.replace(/<img\s/g, '<OptimizedImage ');
    
    if (content !== originalContent) {
      if (!content.includes('OptimizedImage')) {
        // Just in case
      }
      
      if (!content.includes('import { OptimizedImage }')) {
        const importMatches = [...content.matchAll(/^import .*;$/gm)];
        if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const insertionPoint = lastImport.index + lastImport[0].length;
          content = content.slice(0, insertionPoint) + "\nimport { OptimizedImage } from '@/components/ui/OptimizedImage';" + content.slice(insertionPoint);
        } else {
          content = "import { OptimizedImage } from '@/components/ui/OptimizedImage';\n" + content;
        }
      }
      modifiedCount++;
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}

console.log(`Modified ${modifiedCount} files.`);
