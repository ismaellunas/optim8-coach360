import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import App from './App.jsx';
import { initNativeShell } from './lib/capacitor.js';
import { AppProviders } from './app/providers/AppProviders.jsx';

async function bootstrap() {
  try {
    await initNativeShell();
  } catch (error) {
    console.error('Native shell init failed', error);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}

bootstrap().catch(function (error) {
  console.error('App bootstrap failed', error);
});
