// SPDX-License-Identifier: Apache-2.0
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

function parsePackageKey(key) {
  const s = String(key);

  // license-checker keys look like:
  //   react@18.3.1
  //   @scope/pkg@1.2.3
  const at = s.lastIndexOf('@');
  if (at <= 0) return { name: s, version: '' };
  return { name: s.slice(0, at), version: s.slice(at + 1) };
}

const rows = Object.entries(packages)
  .map(([key, info]) => {
    const { name } = parsePackageKey(key);

    const licensesRaw = info?.licenses;
    const licenses = Array.isArray(licensesRaw) ? licensesRaw : [licensesRaw];
    const license = licenses.map(normalizeLicense).filter(Boolean).join(', ');

    // Avoid GitHub/Repository URLs entirely in the user-facing notices. The npm package
    // page is a stable, non-repo URL that works for both scoped and unscoped packages.
    const npmPath = encodeURIComponent(name).replace(/%2F/g, '/');
    const homepage = `https://www.npmjs.com/package/${npmPath}`;

    return { key, name, license, homepage };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

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
  lines.push(`- ${row.key} — ${row.license} — ${row.homepage}`);
}

lines.push('');

fs.mkdirSync('src/content', { recursive: true });
fs.writeFileSync('src/content/THIRD_PARTY_NOTICES.md', lines.join('\n'), 'utf8');
