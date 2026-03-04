import { describe, expect, it } from 'vitest';
import { chooseProviderForGenre, getDefaultProviders } from '@/data/Providers';

describe('chooseProviderForGenre', () => {
  it('prefers the family-focused provider for family content', () => {
    const providers = getDefaultProviders();
    const picked = chooseProviderForGenre('family' as any, providers);
    expect(picked.id).toBe('disney');
  });

  it('prefers the news/doc outlet for documentaries', () => {
    const providers = getDefaultProviders();
    const picked = chooseProviderForGenre('documentary' as any, providers);
    expect(picked.id).toBe('crestnews');
  });

  it('prefers prestige outlets for drama', () => {
    const providers = getDefaultProviders();
    const picked = chooseProviderForGenre('drama' as any, providers);
    expect(picked.id).toBe('hbo');
  });
});
