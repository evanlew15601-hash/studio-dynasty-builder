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

function runMacIconutil({ sourcePng, outDir }) {
  const iconsetDir = path.join(outDir, "icon.iconset");
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    { file: "icon_16x16.png", size: 16 },
    { file: "icon_16x16@2x.png", size: 32 },
    { file: "icon_32x32.png", size: 32 },
    { file: "icon_32x32@2x.png", size: 64 },
    { file: "icon_128x128.png", size: 128 },
    { file: "icon_128x128@2x.png", size: 256 },
    { file: "icon_256x256.png", size: 256 },
    { file: "icon_256x256@2x.png", size: 512 },
    { file: "icon_512x512.png", size: 512 },
    { file: "icon_512x512@2x.png", size: 1024 },
  ];

  for (const { file, size } of sizes) {
    execFileSync("sips", ["-z", String(size), String(size), sourcePng, "--out", path.join(iconsetDir, file)], {
      stdio: "inherit",
    });
  }

  execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", path.join(outDir, "icon.icns")], {
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

function isRcCompatibleIco(filePath) {
  if (!isValidIco(filePath)) {
    return false;
  }

  // RC.EXE rejects ICO files that contain PNG-compressed frames.
  // Detect that by scanning for the PNG signature bytes.
  const buf = fs.readFileSync(filePath);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buf.indexOf(pngSig) === -1;
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
  const needIcns = process.platform === "darwin";

  const haveValidIco =
    process.platform === "win32"
      ? isRcCompatibleIco(path.join(iconsDir, expectedIco))
      : isValidIco(path.join(iconsDir, expectedIco));
  const haveValidIcns = !needIcns || isValidIcns(path.join(iconsDir, expectedIcns));
  const haveAllPngs = expectedPngOutputs.every((name) => fs.existsSync(path.join(iconsDir, name)));

  if (haveValidIco && haveValidIcns && haveAllPngs) {
    // Still ensure Windows fallback favicon is RC-compatible.
    if (process.platform === "win32") {
      const publicFavicon = path.join(rootDir, "public", "favicon.ico");

      if (!isRcCompatibleIco(publicFavicon)) {
        fs.copyFileSync(path.join(iconsDir, expectedIco), publicFavicon);

        if (!isRcCompatibleIco(publicFavicon)) {
          throw new Error(`public/favicon.ico is not RC-compatible after copy: ${publicFavicon}`);
        }
      }
    }

    return;
  }

  const tmpOutDir = path.join(rootDir, "src-tauri", "target", ".generated-icons");
  const tmpInputDir = path.join(rootDir, "src-tauri", "target", ".generated-icons-input");
  const tmpInput = path.join(tmpInputDir, "source.png");

  fs.mkdirSync(tmpInputDir, { recursive: true });
  fs.copyFileSync(sourcePng, tmpInput);

  runTauriIcon({ inputPng: tmpInput, tmpOutDir });

  if (process.platform === "darwin") {
    // `tauri icon` can generate an .icns, but macOS tooling tends to be more reliable,
    // and fixes the `No matching IconType` bundler error.
    runMacIconutil({ sourcePng, outDir: tmpOutDir });
  }

  if (process.platform === "win32") {
    // Ensure RC.EXE-compatible ICO (no PNG-compressed frames).
    const ps1 = path.join(scriptsDir, "generate-windows-ico.ps1");
    const outIco = path.join(tmpOutDir, expectedIco);

    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ps1,
        "-InputPng",
        sourcePng,
        "-OutIco",
        outIco,
      ],
      { stdio: "inherit" },
    );

    if (!isRcCompatibleIco(outIco)) {
      throw new Error(`Generated Windows ICO is not RC-compatible: ${outIco}`);
    }
  }

  const expectedOutputs = [...expectedPngOutputs, expectedIco];
  if (process.platform === "darwin") {
    expectedOutputs.push(expectedIcns);
  }

  for (const name of expectedOutputs) {
    const generated = path.join(tmpOutDir, name);
    if (!fs.existsSync(generated)) {
      throw new Error(`tauri icon did not generate expected file: ${generated}`);
    }

    fs.copyFileSync(generated, path.join(iconsDir, name));
  }

  if (process.platform === "win32") {
    if (!isRcCompatibleIco(path.join(iconsDir, expectedIco))) {
      throw new Error(`Generated Windows ICO is not RC-compatible: ${path.join(iconsDir, expectedIco)}`);
    }
  } else if (!isValidIco(path.join(iconsDir, expectedIco))) {
    throw new Error(`Generated ICO is not valid: ${path.join(iconsDir, expectedIco)}`);
  }

  if (process.platform === "darwin" && !isValidIcns(path.join(iconsDir, expectedIcns))) {
    throw new Error(`Generated ICNS is not valid: ${path.join(iconsDir, expectedIcns)}`);
  }

  // Windows builds (tauri-winres) sometimes fall back to public/favicon.ico.
  // Ensure that file is always an RC.EXE-compatible ICO to avoid RC2175.
  if (process.platform === "win32") {
    const publicFavicon = path.join(rootDir, "public", "favicon.ico");
    fs.copyFileSync(path.join(iconsDir, expectedIco), publicFavicon);

    if (!isRcCompatibleIco(publicFavicon)) {
      throw new Error(`public/favicon.ico is not RC-compatible after copy: ${publicFavicon}`);
    }
  }

  console.log(`Prepared Tauri icons: ${expectedOutputs.join(", ")}`);
}

main();
