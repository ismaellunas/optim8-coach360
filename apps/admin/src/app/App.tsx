import { AppProviders } from '@/app/providers/AppProviders.js';
import { AppRouter } from '@/app/router/routes.js';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
