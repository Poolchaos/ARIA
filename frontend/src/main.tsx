import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import './index.css'
import App from './App.tsx'

// Initialize tsparticles engine once
initParticlesEngine(async (engine) => {
  await loadSlim(engine);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
