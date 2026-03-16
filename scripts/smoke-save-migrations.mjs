// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

execFileSync(npx, ['vitest', 'run', 'tests/saveMigrations.test.ts'], {
  stdio: 'inherit',
});
