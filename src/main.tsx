import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyProductionConsolePolicy } from '@/utils/consolePolicy';
import { initUiSkin } from '@/utils/uiSkins';
import { installVitePreloadErrorHandler } from '@/utils/chunkLoadRecovery';
import { applyStoredWindowSizePreset } from '@/utils/windowSize';

installVitePreloadErrorHandler();
applyProductionConsolePolicy();
initUiSkin();
void applyStoredWindowSizePreset().catch((err) => {
  console.warn('[windowSize] Failed to apply stored preset', err);
});

createRoot(document.getElementById('root')!).render(<App />);
