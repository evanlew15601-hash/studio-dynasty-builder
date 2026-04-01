import { describe, expect, it } from 'vitest';
import { StudioGenerator } from '@/data/StudioGenerator';

describe('StudioGenerator (system data)', () => {
  it('sets Heritage Films founded year to 1965', () => {
    const sg = new StudioGenerator();
    const heritage = sg.getAllStudios().find((s) => s.name === 'Heritage Films');

    expect(heritage).toBeTruthy();
    expect(heritage!.founded).toBe(1965);
  });
});
