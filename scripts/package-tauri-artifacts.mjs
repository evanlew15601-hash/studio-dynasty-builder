// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const usage = () => {
  console.log(`Usage: node scripts/package-tauri-artifacts.mjs [options]

Options:
  --skip-build     Skip running npm run tauri:build
  --dry-run        Print what would be done without copying/building
  --out <dir>      Output directory (default: release-artifacts)
  --help           Show this help
`);
};

const args = process.argv.slice(2);
const opts = {
  skipBuild: false,
  dryRun: false,
  outDir: 'release-artifacts',
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--skip-build') {
    opts.skipBuild = true;
  } else if (a === '--dry-run') {
    opts.dryRun = true;
  } else if (a === '--out') {
    const v = args[++i];
    if (!v) {
      console.error('Missing value for --out');
      process.exit(1);
    }
    opts.outDir = v;
  } else if (a === '--help' || a === '-h') {
    usage();
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${a}`);
    usage();
    process.exit(1);
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

const platform = (() => {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'mac';
  return 'linux';
})();

const outRoot = path.resolve(opts.outDir, version, platform);

const ensureDir = (p) => {
  if (opts.dryRun) return;
  fs.mkdirSync(p, { recursive: true });
};

const copyFile = (src, dest) => {
  if (opts.dryRun) {
    console.log(`copy ${src} -> ${dest}`);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
};

const copyDir = (srcDir, destDir) => {
  if (opts.dryRun) {
    console.log(`copyDir ${srcDir} -> ${destDir}`);
    return;
  }

  ensureDir(destDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  }
};

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.join(dir, d.name));
};

const pickSingle = (files, label) => {
  if (!files.length) {
    throw new Error(`No ${label} found.`);
  }
  if (files.length > 1) {
    console.warn(`Multiple ${label} found; using: ${path.basename(files[0])}`);
  }
  return files[0];
};

const run = (cmd, cmdArgs, cmdOpts = {}) => {
  if (opts.dryRun) {
    console.log(`run ${cmd} ${cmdArgs.join(' ')}`);
    return;
  }
  execFileSync(cmd, cmdArgs, { stdio: 'inherit', ...cmdOpts });
};

if (!opts.skipBuild) {
  run(npm, ['run', 'tauri:build']);
}

if (opts.dryRun) {
  console.log(`Would package ${platform} artifacts for ${version} -> ${outRoot}`);
  process.exit(0);
}

ensureDir(outRoot);

let sha = '';
if (!opts.dryRun) {
  try {
    sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    sha = '';
  }
}

if (!opts.dryRun) {
  const info = [
    `version: ${version}`,
    `platform: ${platform}`,
    sha ? `commit: ${sha}` : null,
    `built_at: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  fs.writeFileSync(path.join(outRoot, 'BUILD_INFO.txt'), `${info}\n`, 'utf8');
}

if (platform === 'windows') {
  const targetRelease = path.join('src-tauri', 'target', 'release');

  const portableDir = path.join(outRoot, `studio-magnate-windows-portable-${version}`);
  ensureDir(portableDir);

  const exePath = fs.existsSync(path.join(targetRelease, 'studio-magnate.exe'))
    ? path.join(targetRelease, 'studio-magnate.exe')
    : pickSingle(
        listFiles(targetRelease).filter((p) => p.toLowerCase().endsWith('.exe')),
        'release .exe'
      );

  copyFile(exePath, path.join(portableDir, path.basename(exePath)));

  for (const dll of listFiles(targetRelease).filter((p) => p.toLowerCase().endsWith('.dll'))) {
    copyFile(dll, path.join(portableDir, path.basename(dll)));
  }

  const resourcesDir = path.join(targetRelease, 'resources');
  if (fs.existsSync(resourcesDir)) {
    copyDir(resourcesDir, path.join(portableDir, 'resources'));
  }

  const zipPath = path.join(outRoot, `studio-magnate-windows-portable-${version}.zip`);

  if (!opts.dryRun) {
    try {
      const zipCmd = 'powershell.exe';
      const cmd = `Compress-Archive -Path '${portableDir}\\*' -DestinationPath '${zipPath}' -Force`;
      execFileSync(zipCmd, ['-NoProfile', '-Command', cmd], { stdio: 'inherit' });
    } catch {
      console.warn(`Could not create zip (portable folder still available): ${portableDir}`);
    }
  }

  const nsisDir = path.join(targetRelease, 'bundle', 'nsis');
  const msiDir = path.join(targetRelease, 'bundle', 'msi');

  if (fs.existsSync(nsisDir)) {
    const nsis = pickSingle(
      listFiles(nsisDir).filter((p) => p.toLowerCase().endsWith('.exe')),
      'NSIS installer'
    );
    copyFile(nsis, path.join(outRoot, `studio-magnate-windows-nsis-${version}.exe`));
  }

  if (fs.existsSync(msiDir)) {
    const msi = pickSingle(
      listFiles(msiDir).filter((p) => p.toLowerCase().endsWith('.msi')),
      'MSI installer'
    );
    copyFile(msi, path.join(outRoot, `studio-magnate-windows-msi-${version}.msi`));
  }
}

if (platform === 'linux') {
  const appImageDir = path.join('src-tauri', 'target', 'release', 'bundle', 'appimage');
  const appImages = listFiles(appImageDir).filter((p) => p.toLowerCase().endsWith('.appimage'));
  const appImage = pickSingle(appImages, 'AppImage');
  copyFile(appImage, path.join(outRoot, `studio-magnate-linux-${version}.AppImage`));
}

if (platform === 'mac') {
  const dmgDir = path.join('src-tauri', 'target', 'release', 'bundle', 'dmg');
  const dmgs = listFiles(dmgDir).filter((p) => p.toLowerCase().endsWith('.dmg'));
  if (dmgs.length) {
    const dmg = pickSingle(dmgs, 'DMG');
    copyFile(dmg, path.join(outRoot, `studio-magnate-mac-${version}.dmg`));
  } else {
    const macosDir = path.join('src-tauri', 'target', 'release', 'bundle', 'macos');
    const apps = fs.existsSync(macosDir)
      ? fs
          .readdirSync(macosDir, { withFileTypes: true })
          .filter((d) => d.isDirectory() && d.name.toLowerCase().endsWith('.app'))
          .map((d) => path.join(macosDir, d.name))
      : [];

    const app = pickSingle(apps, '.app bundle');
    const outAppDir = path.join(outRoot, path.basename(app));
    copyDir(app, outAppDir);

    const zipPath = path.join(outRoot, `studio-magnate-macos-${version}.zip`);
    if (!opts.dryRun) {
      try {
        execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zipPath], {
          stdio: 'inherit',
        });
      } catch {
        console.warn(`Could not create zip (app folder still available): ${outAppDir}`);
      }
    }
  }
}

console.log(`Packaged artifacts: ${outRoot}`);
