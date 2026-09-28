import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import App from './App.tsx'
import './index.css'
import { AuthProvider } from './core/auth-context.tsx'
import { queryClient } from './core/query-client.ts'
import { ToastProvider } from './core/toast-context.tsx'
import { TooltipProvider } from './components/kit/Tooltip.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <TooltipProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </TooltipProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
