import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { UIProvider } from './context/UIContext.js';
import { OfflineSyncProvider } from './context/OfflineSyncContext.js';
import App from './App.js';
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        if (error?.isNetworkError) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UIProvider>
          <OfflineSyncProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </OfflineSyncProvider>
        </UIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

