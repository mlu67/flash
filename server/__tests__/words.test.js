import { describe, it, expect } from 'vitest';
import { loadWords, getCategories, getWordsByCategory } from '../src/words.js';

describe('words', () => {
  it('loads all words from JSON', () => {
    const words = loadWords();
    expect(words.length).toBeGreaterThanOrEqual(280);
    words.forEach(w => {
      expect(w).toHaveProperty('noun');
      expect(w).toHaveProperty('article');
      expect(w).toHaveProperty('category');
      expect(['der', 'die', 'das']).toContain(w.article);
    });
  });

  it('returns all category objects', () => {
    const categories = getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    categories.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('label');
    });
  });

  it('filters words by category', () => {
    const animals = getWordsByCategory('animals');
    expect(animals.length).toBeGreaterThan(0);
    animals.forEach(w => {
      expect(w.category).toBe('animals');
    });
  });

  it('returns all words when category is "all"', () => {
    const all = getWordsByCategory('all');
    const loaded = loadWords();
    expect(all.length).toBe(loaded.length);
  });
});
