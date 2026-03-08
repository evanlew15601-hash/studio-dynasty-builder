import { hashStringToUint32 } from './stablePick';

export function stableFloat01(seed: string): number {
  const n = hashStringToUint32(seed);
  return n / 0x1_0000_0000;
}

export function stableInt(seed: string, min: number, max: number): number {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  const range = b - a + 1;
  if (range <= 1) return a;
  const n = hashStringToUint32(seed);
  return a + (n % range);
}
