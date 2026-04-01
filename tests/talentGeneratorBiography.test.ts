import { afterEach, describe, expect, it, vi } from 'vitest';
import { TalentGenerator } from '@/data/TalentGenerator';

afterEach(() => {
  vi.restoreAllMocks();
});

function withRandomSequence<T>(values: number[], fn: () => T): T {
  let i = 0;
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => values[i++] ?? 0);
  const result = fn();
  spy.mockRestore();
  return result;
}

describe('TalentGenerator biographies (system data)', () => {
  it('generates multiple biography structures (not just one repetitive template)', () => {
    const template: any = {
      careerPath: 'Started in small independent films',
      breakthrough: 'caught attention with a breakout performance in',
      struggles: 'overcame early typecasting concerns',
      specialization: 'known for bringing emotional depth to complex characters',
      currentStatus: 'actively seeking challenging roles',
      personality: 'described by colleagues as deeply committed to craft'
    };

    const talent: any = {
      name: 'Test Person',
      type: 'actor',
      gender: 'Male',
      age: 30,
      experience: 5,
      reputation: 55,
      genres: ['drama']
    };

    const bioA = withRandomSequence([0.1, 0, 0, 0, 0, 0], () => new TalentGenerator().generateBiography(talent, template));
    expect(bioA.startsWith('Started in small independent films,')).toBe(true);

    const bioB = withRandomSequence([0.5, 0, 0, 0, 0, 0], () => new TalentGenerator().generateBiography(talent, template));
    expect(bioB.startsWith('Known for')).toBe(true);

    const bioC = withRandomSequence([0.9, 0, 0, 0, 0, 0, 0], () => new TalentGenerator().generateBiography(talent, template));
    expect(bioC.startsWith('Industry chatter tags')).toBe(true);

    expect(bioA).not.toBe(bioB);
    expect(bioB).not.toBe(bioC);
  });
});
