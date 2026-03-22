import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");

function runTauriIcon({ inputPng, tmpOutDir }) {
  const tauriCli = path.join(rootDir, "node_modules", "@tauri-apps", "cli", "tauri.js");
  if (!fs.existsSync(tauriCli)) {
    throw new Error(
      "Tauri CLI not found. Run `npm ci` before building so @tauri-apps/cli is installed.",
    );
  }

  fs.rmSync(tmpOutDir, { recursive: true, force: true });
  fs.mkdirSync(tmpOutDir, { recursive: true });

  execFileSync(process.execPath, [tauriCli, "icon", "--output", tmpOutDir, inputPng], {
    stdio: "inherit",
  });
}

function main() {
  const inputPng = path.join(rootDir, "src-tauri", "icons", "icon.png");
  const outputIco = path.join(rootDir, "src-tauri", "icons", "icon.ico");
  const outputIcns = path.join(rootDir, "src-tauri", "icons", "icon.icns");

  if (fs.existsSync(outputIco) && fs.existsSync(outputIcns)) {
    return;
  }

  if (!fs.existsSync(inputPng)) {
    throw new Error(`Missing icon source PNG at ${inputPng}`);
  }

  const tmpOutDir = path.join(rootDir, "src-tauri", "target", ".generated-icons");
  runTauriIcon({ inputPng, tmpOutDir });

  const tmpIco = path.join(tmpOutDir, "icon.ico");
  const tmpIcns = path.join(tmpOutDir, "icon.icns");

  if (!fs.existsSync(tmpIco) || !fs.existsSync(tmpIcns)) {
    throw new Error(
      `tauri icon did not generate expected files. Missing: ${
        !fs.existsSync(tmpIco) ? tmpIco : tmpIcns
      }`,
    );
  }

  fs.copyFileSync(tmpIco, outputIco);
  fs.copyFileSync(tmpIcns, outputIcns);
}

main();
