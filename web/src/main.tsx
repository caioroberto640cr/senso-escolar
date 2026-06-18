import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EtapaProvider } from './lib/etapa.tsx'
import { AuthProvider } from './lib/auth.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EtapaProvider>
        <App />
      </EtapaProvider>
    </AuthProvider>
  </StrictMode>,
)
