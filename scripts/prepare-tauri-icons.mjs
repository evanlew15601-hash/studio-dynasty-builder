import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");

function generateIcns({ inputPng, outputIcns }) {
  const iconsetDir = `${outputIcns}.iconset`;

  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    { name: "icon_16x16.png", w: 16, h: 16 },
    { name: "icon_16x16@2x.png", w: 32, h: 32 },
    { name: "icon_32x32.png", w: 32, h: 32 },
    { name: "icon_32x32@2x.png", w: 64, h: 64 },
    { name: "icon_128x128.png", w: 128, h: 128 },
    { name: "icon_128x128@2x.png", w: 256, h: 256 },
    { name: "icon_256x256.png", w: 256, h: 256 },
    { name: "icon_256x256@2x.png", w: 512, h: 512 },
    { name: "icon_512x512.png", w: 512, h: 512 },
    { name: "icon_512x512@2x.png", w: 1024, h: 1024 },
  ];

  for (const { name, w, h } of sizes) {
    const out = path.join(iconsetDir, name);
    execFileSync("sips", ["-z", String(h), String(w), inputPng, "--out", out], {
      stdio: "inherit",
    });
  }

  execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", outputIcns], {
    stdio: "inherit",
  });

  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

function main() {
  if (process.platform !== "darwin") {
    return;
  }

  const inputPng = path.join(rootDir, "src-tauri", "icons", "icon.png");
  const outputIcns = path.join(rootDir, "src-tauri", "icons", "icon.icns");

  if (fs.existsSync(outputIcns)) {
    return;
  }

  if (!fs.existsSync(inputPng)) {
    throw new Error(`Missing icon source PNG at ${inputPng}`);
  }

  generateIcns({ inputPng, outputIcns });
}

main();
