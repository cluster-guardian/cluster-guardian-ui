import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { SessionProvider } from './api/session';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './components/ui/ui.css';
import './components/shell/shell.css';
import './routes/settings/settings.css';
import './styles/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A report is a point-in-time snapshot; refetching on every window focus
      // would hammer a server whose own cache TTL is measured in seconds.
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      retry: 1,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Identity is resolved once, above the router: every page and every
            control reads it, and a page must not render write affordances
            before knowing whether they are allowed. */}
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
