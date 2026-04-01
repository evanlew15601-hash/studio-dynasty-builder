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

function hasTopLevelCommaInParenCall(source: string, openParenIndex: number): boolean {
  // openParenIndex points at the '(' of the call.
  let i = openParenIndex + 1;
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;

  while (i < source.length) {
    const ch = source[i];

    if (quote) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i += 1;
      continue;
    }

    if (ch === '(') {
      depth += 1;
      i += 1;
      continue;
    }

    if (ch === ')') {
      if (depth === 0) return false;
      depth -= 1;
      i += 1;
      continue;
    }

    if (ch === ',' && depth === 0) {
      return true;
    }

    i += 1;
  }

  return false;
}

describe('date determinism guardrails', () => {
  it('does not use local-time Date constructors (new Date(year, ...)) in src/**', async () => {
    const root = process.cwd();
    const srcDir = path.join(root, 'src');

    const files = (await listFilesRecursive(srcDir)).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    const offenders: string[] = [];

    for (const file of files) {
      const raw = await readFile(file, 'utf8');
      const text = stripComments(raw);

      const re = /\bnew\s+Date\s*\(/g;
      let match: RegExpExecArray | null;

      while ((match = re.exec(text))) {
        const openParen = match.index + match[0].lastIndexOf('(');
        if (hasTopLevelCommaInParenCall(text, openParen)) {
          offenders.push(path.relative(root, file));
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
