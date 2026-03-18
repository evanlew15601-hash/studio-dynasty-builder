import { describe, expect, it } from 'vitest';
import { computeFilmContentRating } from '@/utils/contentRating';

describe('contentRating', () => {
  it('maps low content to G/PG', () => {
    expect(computeFilmContentRating({ violence: 0, nudity: 0, language: 0, substance: 0 }).label).toBe('G');
    expect(computeFilmContentRating({ violence: 2, nudity: 0, language: 0, substance: 0 }).label).toBe('PG');
  });

  it('maps high content to R/NC-17', () => {
    expect(computeFilmContentRating({ violence: 8, nudity: 0, language: 5, substance: 3 }).label).toBe('R');
    expect(computeFilmContentRating({ violence: 10, nudity: 10, language: 10, substance: 10 }).label).toBe('NC-17');
  });
});
