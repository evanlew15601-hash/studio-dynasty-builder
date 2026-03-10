// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

fs.mkdirSync('sbom', { recursive: true });

execFileSync(
  npx,
  [
    '--yes',
    '@cyclonedx/cyclonedx-npm@2.0.0',
    '--package-lock-only',
    '--omit',
    'dev',
    '--output-format',
    'JSON',
    '--output-file',
    'sbom/sbom.cdx.json',
  ],
  { stdio: 'inherit' }
);
