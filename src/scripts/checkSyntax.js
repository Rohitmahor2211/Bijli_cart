import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sourceRoot = path.join(projectRoot, 'src');

const collectJavaScriptFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectJavaScriptFiles(entryPath);
  return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
});

const files = collectJavaScriptFiles(sourceRoot);
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Backend syntax check passed for ${files.length} JavaScript files.`);
