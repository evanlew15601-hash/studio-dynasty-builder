export type CsvRow = Record<string, string>;

function needsQuotes(text: string): boolean {
  return /[",\n\r]/.test(text);
}

function escapeCell(text: string): string {
  const escaped = text.replace(/"/g, '""');
  return needsQuotes(escaped) ? `"${escaped}"` : escaped;
}

export function toCsv(headers: string[], rows: CsvRow[]): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCell(h)).join(','));

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(String(row[h] ?? ''))).join(','));
  }

  return lines.join('\n');
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i <= text.length; i++) {
    const ch = i === text.length ? '\n' : text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = i + 1 <= text.length ? text[i + 1] : '';
        if (next === '"') {
          cell += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }

      cell += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (ch === '\r') {
      continue;
    }

    if (ch === '\n') {
      row.push(cell);
      cell = '';

      if (!(row.length === 1 && row[0] === '' && i === text.length)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    cell += ch;
  }

  return rows;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const parsed = parseCsvRows(text);
  const headers = (parsed[0] || []).map((h) => h.trim()).filter(Boolean);
  if (!headers.length) return { headers: [], rows: [] };

  const rows: CsvRow[] = [];
  for (const rawRow of parsed.slice(1)) {
    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = String(rawRow[i] ?? '').trim();
    }

    const hasAny = Object.values(row).some((v) => v !== '');
    if (hasAny) rows.push(row);
  }

  return { headers, rows };
}
