import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ApiError, restoreSession } from './lib/api';
import { applyTheme, loadLanguage } from './lib/i18n';
import './styles/index.css';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      // Only lost connections and server faults are worth another try.
      retry: (n, e) => n < 2 && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500),
    },
  },
});
applyTheme();
void restoreSession();

async function start() {
  await loadLanguage();
  // Imported after the language is ready: labels in module scope are translated once, at import.
  const { App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
          <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 4, fontFamily: 'Golos' } }} />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
void start();
