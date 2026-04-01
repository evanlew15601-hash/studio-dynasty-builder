import { describe, expect, it } from 'vitest';
import type { Script } from '@/types/game';
import { getNextScriptStage, getScriptStageAdvanceQuote } from '@/utils/scriptProgression';

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-1',
    title: 'Test Script',
    genre: 'drama',
    logline: 'A story.',
    writer: 'Writer',
    pages: 120,
    quality: 50,
    budget: 10_000_000,
    developmentStage: 'concept',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    },
    ...overrides,
  };
}

describe('script progression', () => {
  it('computes next stage in the standard order', () => {
    expect(getNextScriptStage('concept')).toBe('treatment');
    expect(getNextScriptStage('treatment')).toBe('first-draft');
    expect(getNextScriptStage('first-draft')).toBe('polish');
    expect(getNextScriptStage('polish')).toBe('final');
    expect(getNextScriptStage('final')).toBeNull();
  });

  it('quotes a bounded writer fee and quality delta', () => {
    const script = makeScript({ developmentStage: 'treatment', budget: 200_000_000 });
    const quote = getScriptStageAdvanceQuote(script);

    expect(quote?.fromStage).toBe('treatment');
    expect(quote?.toStage).toBe('first-draft');
    expect(quote?.qualityDelta).toBeGreaterThan(0);

    // Fee is clamped to a reasonable band.
    expect(quote?.writerFee).toBeGreaterThanOrEqual(25_000);
    expect(quote?.writerFee).toBeLessThanOrEqual(750_000);
  });
});
