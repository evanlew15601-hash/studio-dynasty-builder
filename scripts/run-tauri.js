import { spawnSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const tauriCli = path.resolve(__dirname, '../node_modules/@tauri-apps/cli/tauri.js');
const args = process.argv.slice(2);

function runNodeTauri() {
  return spawnSync(process.execPath, [tauriCli, ...args], { stdio: 'inherit' });
}

function runBashTauri() {
  const home = process.env.HOME || '';
  const cargoEnv = home ? path.join(home, '.cargo', 'env') : '';
  const quotedTauriCli = JSON.stringify(tauriCli);
  const quotedArgs = args.map(JSON.stringify).join(' ');
  const bashCommand = cargoEnv
    ? `if [ -f ${JSON.stringify(cargoEnv)} ]; then . ${JSON.stringify(cargoEnv)}; fi; exec ${JSON.stringify(process.execPath)} ${quotedTauriCli} ${quotedArgs}`
    : `exec ${JSON.stringify(process.execPath)} ${quotedTauriCli} ${quotedArgs}`;

  return spawnSync('bash', ['-lc', bashCommand], { stdio: 'inherit' });
}

const result = process.platform === 'win32' ? runNodeTauri() : runBashTauri();
process.exit(result.status ?? 1);
