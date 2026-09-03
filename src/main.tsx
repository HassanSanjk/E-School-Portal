import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { DirectionProvider } from '@base-ui/react/direction-provider'
import './index.css'
import App from './App.tsx'
import { persistOptions, queryClient } from './lib/queryClient'
import { AuthProvider } from './hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <BrowserRouter>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </DirectionProvider>
  </StrictMode>,
)
