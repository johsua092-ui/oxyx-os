const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchFiles(fullPath, pattern);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (pattern.test(content)) {
          console.log(`Found pattern in: ${fullPath}`);
        }
      }
    }
  }
}

console.log('Searching for createUserWithEmailAndPassword...');
searchFiles(path.resolve(__dirname, '../src'), /createUserWithEmailAndPassword/);

console.log('Searching for signInWithEmailAndPassword...');
searchFiles(path.resolve(__dirname, '../src'), /signInWithEmailAndPassword/);
