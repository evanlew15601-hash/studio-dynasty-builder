import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const iconDir = path.join(projectRoot, 'src-tauri', 'icons');
const requiredIcons = [
  path.join(iconDir, '32x32.png'),
  path.join(iconDir, '128x128.png'),
  path.join(iconDir, '128x128@2x.png'),
  path.join(iconDir, 'icon.png'),
  path.join(iconDir, 'icon.icns'),
  path.join(iconDir, 'icon.ico'),
];

const sourceIconCandidates = [
  path.join(iconDir, 'icon-alt.png'),
  path.join(iconDir, 'icon.png'),
  path.join(projectRoot, 'app-icon.png'),
];

const sourceIcon = sourceIconCandidates.find((p) => existsSync(p));

if (!sourceIcon) {
  throw new Error(
    `Tauri icon generation failed: no source icon found. Looked for: ${sourceIconCandidates.join(', ')}`
  );
}

const missing = requiredIcons.filter((p) => !existsSync(p));
if (missing.length === 0) {
  process.exit(0);
}

execFileSync(
  process.execPath,
  [
    path.join(projectRoot, 'node_modules', '@tauri-apps', 'cli', 'tauri.js'),
    'icon',
    sourceIcon,
    '--output',
    iconDir,
  ],
  { stdio: 'inherit' }
);
