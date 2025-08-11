import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars and inject our feature flag with a default of false
  const env = loadEnv(mode, process.cwd(), "");
  const VITE_ENABLE_STUDIO_SIM_FEATURES =
    env.VITE_ENABLE_STUDIO_SIM_FEATURES === "true" ? "true" : "false";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_ENABLE_STUDIO_SIM_FEATURES": JSON.stringify(
        VITE_ENABLE_STUDIO_SIM_FEATURES
      ),
    },
  };
});
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
