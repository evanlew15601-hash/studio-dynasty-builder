import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyProductionConsolePolicy } from '@/utils/consolePolicy';
import { initUiSkin } from '@/utils/uiSkins';

applyProductionConsolePolicy();
initUiSkin();

createRoot(document.getElementById('root')!).render(<App />);
