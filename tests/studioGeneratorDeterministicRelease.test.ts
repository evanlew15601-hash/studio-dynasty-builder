import { describe, expect, it } from 'vitest';
import { StudioGenerator } from '@/data/StudioGenerator';

function getStudioProfileOrThrow(sg: StudioGenerator, name: string) {
  const p = sg.getStudioProfile(name);
  if (!p) throw new Error(`Missing studio profile: ${name}`);
  return p;
}

describe('StudioGenerator deterministic AI releases', () => {
  it('generates identical releases for the same (seed, studio, year) across runs', () => {
    const seed = 1337;
    const year = 2026;

    const aGen = new StudioGenerator();
    const aProfile = getStudioProfileOrThrow(aGen, 'Crimson Peak Entertainment');
    const a = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      const rel = aGen.generateDeterministicStudioRelease(aProfile, week, year, seed);
      return rel ? { id: rel.id, title: rel.title, type: rel.type } : null;
    });

    const bGen = new StudioGenerator();
    const bProfile = getStudioProfileOrThrow(bGen, 'Crimson Peak Entertainment');
    const b = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      const rel = bGen.generateDeterministicStudioRelease(bProfile, week, year, seed);
      return rel ? { id: rel.id, title: rel.title, type: rel.type } : null;
    });

    expect(b).toEqual(a);
  });

  it('does not depend on earlier weeks being generated (resume safety)', () => {
    const seed = 9001;
    const year = 2026;
    const resumeFromWeek = 12;

    const fullGen = new StudioGenerator();
    const fullProfile = getStudioProfileOrThrow(fullGen, 'Golden Horizon Studios');

    const full = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      const rel = fullGen.generateDeterministicStudioRelease(fullProfile, week, year, seed);
      return rel ? { id: rel.id, title: rel.title, type: rel.type } : null;
    });

    const resumedGen = new StudioGenerator();
    const resumedProfile = getStudioProfileOrThrow(resumedGen, 'Golden Horizon Studios');

    const resumedTail = Array.from({ length: 52 - resumeFromWeek }, (_, i) => {
      const week = resumeFromWeek + i + 1;
      const rel = resumedGen.generateDeterministicStudioRelease(resumedProfile, week, year, seed);
      return rel ? { id: rel.id, title: rel.title, type: rel.type } : null;
    });

    const fullTail = full.slice(resumeFromWeek);

    expect(resumedTail).toEqual(fullTail);
  });
});
