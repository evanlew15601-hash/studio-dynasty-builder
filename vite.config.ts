import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")?.[1];
  const ghPagesBase = (repoName && repoName.length > 0)
    ? repoName.endsWith(".github.io")
      ? "/"
      : `/${repoName}/`
    : null;

  const base = (process.env.VITE_BASE && process.env.VITE_BASE.length > 0)
    ? process.env.VITE_BASE
    : (env.VITE_BASE && env.VITE_BASE.length > 0)
      ? env.VITE_BASE
      : (process.env.GITHUB_ACTIONS === "true" && mode === "production" && ghPagesBase)
        ? ghPagesBase
        : "/";

  return {
    base,
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
        "@": path.resolve(__dirname, "./src"),
        "react": path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      },
    },
  };
});
