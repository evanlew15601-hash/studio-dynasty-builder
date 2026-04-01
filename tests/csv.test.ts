import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '@/utils/csv';

describe('csv utils', () => {
  it('roundtrips with quotes and commas', () => {
    const headers = ['id', 'name', 'notes'];
    const csv = toCsv(headers, [
      { id: '1', name: 'Hello, world', notes: 'He said "hi"' },
      { id: '2', name: 'Plain', notes: 'line1\nline2' },
    ]);

    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows).toEqual([
      { id: '1', name: 'Hello, world', notes: 'He said "hi"' },
      { id: '2', name: 'Plain', notes: 'line1\nline2' },
    ]);
  });
});
