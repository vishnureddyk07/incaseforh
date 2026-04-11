import './polyfills/performance';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const swUrl = '/service-worker.js';
      const response = await fetch(swUrl, { method: 'GET', cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';

      // Avoid SecurityError when hosting platform rewrites missing SW file to index.html.
      if (!response.ok || !contentType.includes('javascript')) {
        console.warn('Skipping service worker registration: invalid script response', {
          status: response.status,
          contentType,
        });
        return;
      }

      await navigator.serviceWorker.register(swUrl);
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });
}
