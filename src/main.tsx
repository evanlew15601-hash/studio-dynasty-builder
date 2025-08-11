import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/system/ErrorBoundary'

// Global error listeners for pre-React errors
if (typeof window !== "undefined") {
  function showErrorBanner(msg: string) {
    try {
      const id = "global-error-banner"
      if (document.getElementById(id)) return;
      const banner = document.createElement("div");
      banner.id = id;
      banner.style.position = "fixed";
      banner.style.top = "0";
      banner.style.left = "0";
      banner.style.width = "100vw";
      banner.style.background = "#b91c1c";
      banner.style.color = "#fff";
      banner.style.zIndex = "99999";
      banner.style.fontSize = "1rem";
      banner.style.padding = "0.75em 1.25em";
      banner.style.fontFamily = "monospace";
      banner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.10)";
      banner.textContent = msg;
      document.body.appendChild(banner);
    } catch {}
  }

  window.addEventListener("error", (e) => {
    showErrorBanner("Error: " + (e.message || "Unknown error"));
  });

  window.addEventListener("unhandledrejection", (e) => {
    showErrorBanner("Unhandled rejection: " + (e.reason ? String(e.reason) : ""));
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
