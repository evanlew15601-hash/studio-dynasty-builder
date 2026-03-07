import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const normalizeLicense = (value) => {
  if (!value) return 'UNKNOWN';

  const s = String(value)
    .replace(/\*/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return s
    .replace(/\bApache\s+2\.0\b/gi, 'Apache-2.0')
    .replace(/\bThe\s+Unlicense\b/gi, 'Unlicense');
};

const stdout = execFileSync(
  npx,
  ['--yes', 'license-checker-rseidelsohn@4.4.2', '--production', '--json'],
  { encoding: 'utf8' }
);
const packages = JSON.parse(stdout);

const rows = Object.entries(packages)
  .map(([name, info]) => {
    const licensesRaw = info?.licenses;
    const licenses = Array.isArray(licensesRaw) ? licensesRaw : [licensesRaw];
    const license = licenses.map(normalizeLicense).filter(Boolean).join(', ');

    const repo = info?.repository || info?.url || '';
    return { name, license, repo };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  '# Third-party notices',
  '',
  'This application bundles open source software. The list below is generated from the npm dependency tree.',
  '',
  'To regenerate after dependency changes:',
  '',
  '```sh',
  'npm run licenses:generate',
  '```',
  '',
  '## Packages',
  '',
];

for (const row of rows) {
  const suffix = row.repo ? ` — ${row.repo}` : '';
  lines.push(`- ${row.name} — ${row.license}${suffix}`);
}

lines.push('');

fs.mkdirSync('src/content', { recursive: true });
fs.writeFileSync('src/content/THIRD_PARTY_NOTICES.md', lines.join('\n'), 'utf8');
