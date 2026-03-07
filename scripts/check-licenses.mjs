import { execFileSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const allowedExact = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MIT OR X11',
  'OFL-1.1',
  'Unlicense',
  'WTFPL',
  'X11',
  'Zlib',
]);

const normalize = (value) => {
  if (!value) return '';

  const s = String(value)
    .replace(/\*/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Common non-SPDX spellings in npm metadata.
  return s
    .replace(/\bApache\s+2\.0\b/gi, 'Apache-2.0')
    .replace(/\bThe\s+Unlicense\b/gi, 'Unlicense');
};

const isAllowed = (licenseExpression) => {
  const normalized = normalize(licenseExpression);
  if (!normalized) return false;

  if (allowedExact.has(normalized)) return true;

  // Split SPDX-like expressions into parts and allow if every part is allowed.
  // Examples: "MIT OR Apache-2.0", "Apache-2.0 AND MIT", "MIT/X11"
  const normalizedExpression = normalized.replace(/\s*\/\s*/g, ' OR ');

  const parts = normalizedExpression
    .split(/\s+(?:OR|AND)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.every((p) => allowedExact.has(p));
  }

  return false;
};

const stdout = execFileSync(
  npx,
  ['--yes', 'license-checker-rseidelsohn@4.4.2', '--production', '--json'],
  { encoding: 'utf8' }
);
const packages = JSON.parse(stdout);

const violations = [];

for (const [pkg, info] of Object.entries(packages)) {
  const licensesRaw = info?.licenses;
  const licenses = Array.isArray(licensesRaw) ? licensesRaw : [licensesRaw];

  for (const lic of licenses) {
    if (!isAllowed(lic)) {
      violations.push({ pkg, license: lic ?? 'UNKNOWN' });
    }
  }
}

if (violations.length) {
  violations.sort((a, b) => a.pkg.localeCompare(b.pkg));

  console.error('Disallowed or unknown licenses found:');
  for (const v of violations) {
    console.error(`- ${v.pkg}: ${v.license}`);
  }

  console.error('\nIf this is expected, update scripts/check-licenses.mjs allowlist.');
  process.exit(1);
}

console.log('License check passed.');
