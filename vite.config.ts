import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { componentTagger } from "lovable-tagger";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require("./package.json") as { version?: string };
const appVersion = pkg.version ?? "0.0.0";

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

  const isProd = mode === "production";

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      host: "127.0.0.1",
      port: 8080,
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
    build: {
      sourcemap: false,
    },
    esbuild: isProd ? { drop: ["console", "debugger"] } : undefined,
  };
});
