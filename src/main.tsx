import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppV6 from './AppV6';
import './styles.css';
import './layout-v51.css';
import './features-v55.css';
import './version6.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppV6 />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading)
      return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=13`, {
        updateViaCache: 'none'
      });
      await registration.update();
    } catch {
      // Appen virker stadig online uden service worker.
    }
  });
}
