export function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function stablePick<T>(items: T[], seed: string): T | undefined {
  if (!items || items.length === 0) return undefined;
  const idx = hashStringToUint32(seed) % items.length;
  return items[idx];
}
