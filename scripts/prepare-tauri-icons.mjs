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

function isValidIcns(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const header = fs.readFileSync(filePath).subarray(0, 4).toString("utf8");
  return header === "icns";
}

function isValidIco(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const header = fs.readFileSync(filePath).subarray(0, 4);
  return header.length === 4 && header[0] === 0 && header[1] === 0 && header[2] === 1 && header[3] === 0;
}

function main() {
  const iconsDir = path.join(rootDir, "src-tauri", "icons");

  const sourcePng = path.join(iconsDir, "icon.png");
  if (!fs.existsSync(sourcePng)) {
    throw new Error(`Missing icon source PNG at ${sourcePng}`);
  }

  const expectedPngOutputs = ["32x32.png", "128x128.png", "128x128@2x.png"];
  const expectedIco = "icon.ico";
  const expectedIcns = "icon.icns";

  const haveValidIco = isValidIco(path.join(iconsDir, expectedIco));
  const haveValidIcns = isValidIcns(path.join(iconsDir, expectedIcns));
  const haveAllPngs = expectedPngOutputs.every((name) => fs.existsSync(path.join(iconsDir, name)));

  if (haveValidIco && haveValidIcns && haveAllPngs) {
    return;
  }

  const tmpOutDir = path.join(rootDir, "src-tauri", "target", ".generated-icons");
  const tmpInput = path.join(tmpOutDir, "source.png");

  fs.mkdirSync(tmpOutDir, { recursive: true });
  fs.copyFileSync(sourcePng, tmpInput);

  runTauriIcon({ inputPng: tmpInput, tmpOutDir });

  const expectedOutputs = [...expectedPngOutputs, expectedIco, expectedIcns];

  for (const name of expectedOutputs) {
    const generated = path.join(tmpOutDir, name);
    if (!fs.existsSync(generated)) {
      throw new Error(`tauri icon did not generate expected file: ${generated}`);
    }

    fs.copyFileSync(generated, path.join(iconsDir, name));
  }

  console.log(`Prepared Tauri icons: ${expectedOutputs.join(", ")}`);
}

main();
