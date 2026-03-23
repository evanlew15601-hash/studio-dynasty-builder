import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");

const tauriCli = path.join(rootDir, "node_modules", "@tauri-apps", "cli", "tauri.js");

const platformConfig = (() => {
  if (process.platform === "darwin") return "src-tauri/tauri.release.macos.conf.json";
  if (process.platform === "win32") return "src-tauri/tauri.release.windows.conf.json";
  return "src-tauri/tauri.release.conf.json";
})();

execFileSync(process.execPath, ["scripts/prepare-tauri-icons.mjs"], {
  stdio: "inherit",
  cwd: rootDir,
});

execFileSync(process.execPath, [tauriCli, "build", "--config", platformConfig, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: rootDir,
});
