import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(full)));
    } else {
      out.push(full);
    }
  }

  return out;
}

function stripComments(source: string): string {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock.replace(/\/\/.*$/gm, '');
}

describe('engine determinism guardrails', () => {
  it('does not use Math.random() anywhere in src/game/** (except core/rng.ts)', async () => {
    const root = process.cwd();
    const gameDir = path.join(root, 'src', 'game');

    const files = (await listFilesRecursive(gameDir)).filter((f) =>
      f.endsWith('.ts') || f.endsWith('.tsx')
    );

    const allowed = new Set<string>([
      path.join(gameDir, 'core', 'rng.ts'),
    ]);

    const offenders: string[] = [];

    for (const file of files) {
      if (allowed.has(file)) continue;

      const raw = await readFile(file, 'utf8');
      const text = stripComments(raw);

      if (/\bMath\.random\s*\(/.test(text)) {
        offenders.push(path.relative(root, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
