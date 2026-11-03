import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Traveler from './Traveler.jsx'

function Landing() {
  const card = {
    display: 'block', padding: 20, margin: '12px 0', borderRadius: 12,
    textDecoration: 'none', color: 'white', fontSize: 20, fontWeight: 'bold',
  }
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Smart Travel Safety</h1>
      <p>
        Press SOS and the system checks for a crash signal before alerting the
        nearest police station. Accidental presses can be cancelled within 15 seconds.
      </p>
      <a href="#/traveler" style={{ ...card, background: '#dc2626' }}>
        I'm a traveler
        <div style={{ fontSize: 14, fontWeight: 'normal' }}>Send an SOS from your location</div>
      </a>
      <a href="#/responder" style={{ ...card, background: '#1d4ed8' }}>
        I'm a responder
        <div style={{ fontSize: 14, fontWeight: 'normal' }}>See live incidents and nearest stations</div>
      </a>
      <p style={{ fontSize: 13, background: '#fef3c7', padding: 8, borderRadius: 6 }}>
        Demo only. All data is simulated. No real emergency services are contacted.
      </p>
      <p style={{ fontSize: 13 }}>
        Tip: open both pages in two tabs, press SOS as a traveler, and watch it appear for the responder.
      </p>
    </div>
  )
}

function Root() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const h = () => setHash(window.location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  if (hash === '#/traveler') return <Traveler />
  if (hash === '#/responder') return <App />
  return <Landing />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)