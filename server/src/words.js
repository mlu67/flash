import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '..', 'data', 'words.json');

let data = null;

function getData() {
  if (!data) {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  }
  return data;
}

export function loadWords() {
  return getData().words;
}

export function getCategories() {
  return getData().categories;
}

export function getWordsByCategory(category) {
  const words = loadWords();
  if (category === 'all') return words;
  return words.filter(w => w.category === category);
}
