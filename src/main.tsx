import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/fonts.css'
import './ui/styles.css'
import { App } from './app/App'
import { AppGate } from './ui/AppGate'
import { bootstrap } from './app/bootstrap'
import { registerServiceWorker } from './app/pwa'

const root = createRoot(document.getElementById('root')!)
const retry = () => void bootstrap()

root.render(
  <StrictMode>
    <AppGate onRetry={retry}>
      <App />
    </AppGate>
  </StrictMode>,
)

void bootstrap()
registerServiceWorker()
