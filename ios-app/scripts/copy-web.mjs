import { copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(join(here, '..', '..'));
const www = join(here, '..', 'www');

mkdirSync(www, { recursive: true });

const files = [
  'index.html',
  'app.js',
  'manifest.json',
  'IMG_1785.png',
  'IMG_1786.png',
  'IMG_1787.png'
];

for (const f of files) {
  copyFileSync(join(root, f), join(www, f));
}

console.log('Asset web copiati in www/');