import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const tauriDevHost = process.env.TAURI_DEV_HOST;

function normalizeBase(base: string): string {
  const trimmed = base.trim();
  if (trimmed.length === 0) {
    return "/";
  }

  if (trimmed === "/" || trimmed === "./") {
    return trimmed;
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")?.[1];
  const ghPagesBase = (repoName && repoName.length > 0)
    ? repoName.endsWith(".github.io")
      ? "/"
      : `/${repoName}/`
    : null;

  const configuredBase = (env.VITE_BASE && env.VITE_BASE.length > 0)
    ? env.VITE_BASE
    : (process.env.VITE_BASE && process.env.VITE_BASE.length > 0)
      ? process.env.VITE_BASE
      : (process.env.GITHUB_ACTIONS === "true" && mode === "production" && ghPagesBase)
        ? ghPagesBase
        : "/";

  const base = normalizeBase(configuredBase);

  return {
    base,
    server: {
      host: tauriDevHost || "127.0.0.1",
      port: 8080,
      hmr: tauriDevHost
        ? {
          protocol: "ws",
          host: tauriDevHost,
          port: 1421,
        }
        : undefined,
    },
    plugins: [
      react(),
      mode === "development" &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
        "react": path.resolve(rootDir, "./node_modules/react"),
        "react-dom": path.resolve(rootDir, "./node_modules/react-dom"),
      },
    },
  };
});
