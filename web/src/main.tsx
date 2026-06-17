import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EtapaProvider } from './lib/etapa.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EtapaProvider>
      <App />
    </EtapaProvider>
  </StrictMode>,
)
