import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App.tsx'
import { persistOptions, queryClient } from './lib/queryClient'
import { AuthProvider } from './hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
