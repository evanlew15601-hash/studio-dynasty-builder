export function nextNumericId(prefix: string, ids: Iterable<string>): string {
  let max = 0;

  for (const id of ids) {
    if (!id) continue;
    if (!id.startsWith(`${prefix}-`)) continue;

    const tail = id.split('-').pop();
    if (!tail) continue;

    const n = Number.parseInt(tail, 10);
    if (!Number.isFinite(n)) continue;

    if (n > max) max = n;
  }

  return `${prefix}-${max + 1}`;
}
