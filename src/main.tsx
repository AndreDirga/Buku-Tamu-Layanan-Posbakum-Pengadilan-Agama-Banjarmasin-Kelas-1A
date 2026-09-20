import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Defensive Storage.prototype.setItem safety layer:
// Protects against browser QuotaExceededError (e.g., when base64 photos or old storage keys fill quota)
if (typeof window !== 'undefined' && window.Storage) {
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
    } catch (e: any) {
      if (
        e &&
        (e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e.code === 22 ||
          e.number === -2147024882 ||
          (typeof e.message === 'string' && e.message.toLowerCase().includes('quota')))
      ) {
        console.warn(`[Storage SafeGuard] Prevented uncaught QuotaExceededError for key: "${key}"`);
        try {
          this.removeItem(key);
          if (typeof value === 'string' && value.length < 80000) {
            originalSetItem.call(this, key, value);
          }
        } catch {}
        return;
      }
      throw e;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
