import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyProductionConsolePolicy } from '@/utils/consolePolicy';
import { initUiSkin } from '@/utils/uiSkins';
import { installVitePreloadErrorHandler } from '@/utils/chunkLoadRecovery';
import { applyStoredWindowSizePreset } from '@/utils/windowSize';

applyProductionConsolePolicy();
installVitePreloadErrorHandler();

// Basic environment check
if (typeof window === 'undefined' || typeof document === 'undefined') {
  console.error('Studio Magnate requires a browser environment');
  process.exit(1);
}

console.log('Studio Magnate starting...', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  userAgent: navigator.userAgent,
  tauri: (window as any).__TAURI__,
});

// Initialize UI components with error handling and timeout
const initTimeout = setTimeout(() => {
  console.error('Initialization timeout - forcing render');
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.hasChildNodes()) {
    try {
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log('App rendered after timeout');
    } catch (error) {
      console.error('Failed to render after timeout', error);
    }
  }
}, 10000); // 10 second timeout

Promise.all([
  Promise.resolve(initUiSkin()).catch((err) => {
    console.warn('[uiSkin] Failed to initialize UI skin', err);
  }),
  applyStoredWindowSizePreset().catch((err) => {
    console.warn('[windowSize] Failed to apply stored preset', err);
  })
]).then(() => {
  clearTimeout(initTimeout);
  
  // Ensure the DOM is ready
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found - DOM not ready');
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
    return;
  }

  try {
    console.log('Creating React root...');
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Failed to render app', error);
    // Fallback rendering
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif; background: #0f0f0f; color: #ffffff; min-height: 100vh;">
        <h1>Studio Magnate - Loading Error</h1>
        <p>Failed to start the application. Please try restarting.</p>
        <details style="margin-top: 20px;">
          <summary>Error Details</summary>
          <pre style="background: #333; padding: 10px; margin-top: 10px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
        </details>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ffd700; color: #000; border: none; cursor: pointer;">Reload App</button>
      </div>
    `;
  }
}).catch((error) => {
  clearTimeout(initTimeout);
  console.error('Failed to initialize app', error);
  // Last resort fallback
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.hasChildNodes()) {
    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Critical initialization error</div>';
  }
});
