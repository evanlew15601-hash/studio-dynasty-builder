import { describe, expect, it } from 'vitest';
import { normalizeUiSkinId } from '@/utils/uiSkins';

describe('uiSkins', () => {
  it('normalizes known ids', () => {
    expect(normalizeUiSkinId('studio')).toBe('studio');
    expect(normalizeUiSkinId('noir')).toBe('noir');
    expect(normalizeUiSkinId('silent-era')).toBe('silent-era');
    expect(normalizeUiSkinId('sci-fi')).toBe('sci-fi');
    expect(normalizeUiSkinId('horror')).toBe('horror');
    expect(normalizeUiSkinId('art-deco')).toBe('art-deco');
    expect(normalizeUiSkinId('retro-synth')).toBe('retro-synth');
  });

  it('falls back to studio for unknown values', () => {
    expect(normalizeUiSkinId('')).toBe('studio');
    expect(normalizeUiSkinId('  nope  ')).toBe('studio');
    expect(normalizeUiSkinId(null)).toBe('studio');
    expect(normalizeUiSkinId(undefined)).toBe('studio');
  });
});
