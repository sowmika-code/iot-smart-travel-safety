/*import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import Traveler from './Traveler.jsx'
import './index.css'
import './App.css'


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
  */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.jsx';
import Traveler from './Traveler.jsx';

function Landing(){
  return <main className="landing-shell">
    <nav className="landing-nav"><a className="landing-brand" href="#/"><span className="brand-mark">S</span><span>SAFEWAY<small>SMART TRAVEL SAFETY</small></span></a><div className="nav-links"><a href="#features">Platform</a><a href="#workflow">How it works</a><a className="nav-login" href="#/responder">Responder portal ↗</a></div></nav>
    <section className="hero" id="features"><div className="hero-copy"><div className="hero-kicker"><i/> EDGE • FOG • CLOUD INTELLIGENCE</div><h1>Every journey<br/>deserves a <em>safer</em><br/>way forward.</h1><p className="hero-description">A connected travel-safety platform that helps detect distress events, verify incidents and coordinate response through an intelligent IoT workflow.</p><div className="hero-actions"><a className="button button-primary" href="#/traveler">Open traveler app <span>→</span></a><a className="button button-outline" href="#/responder">Responder dashboard</a></div><div className="hero-proof"><span className="proof-icon">✓</span><span><b>Designed for faster awareness</b><small>Live incident visibility • Location-aware alerts</small></span></div></div>
    <div className="hero-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="visual-center"><div className="visual-shield">✦</div><b>SAFEWAY</b><small>CONNECTED PROTECTION</small></div><div className="floating-card card-top"><span className="mini-icon blue">⌖</span><span><b>Location aware</b><small>GPS-enabled monitoring</small></span><i className="green-dot"/></div><div className="floating-card card-bottom"><span className="mini-icon coral">＋</span><span><b>Emergency ready</b><small>15-second cancel window</small></span><span className="live-pill">ACTIVE</span></div><div className="visual-caption">INTELLIGENT INCIDENT WORKFLOW <span>01 / 03</span></div></div></section>
    <section className="feature-strip" id="workflow"><article><span>01</span><div><b>Detect at the edge</b><p>Sensor signals are checked close to the traveler.</p></div></article><article><span>02</span><div><b>Verify at the fog layer</b><p>Events are evaluated before escalation.</p></div></article><article><span>03</span><div><b>Coordinate in the cloud</b><p>Incidents become visible in the responder console.</p></div></article></section>
    <footer className="landing-footer"><span>© SAFEWAY · IoT SMART TRAVEL SAFETY</span><span>Academic demonstration · Simulated emergency workflow</span></footer>
  </main>
}
function Root(){const [hash,setHash]=useState(window.location.hash);useEffect(()=>{const update=()=>setHash(window.location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[]);if(hash==='#/traveler')return <Traveler/>;if(hash==='#/responder')return <App/>;return <Landing/>}
createRoot(document.getElementById('root')).render(<StrictMode><Root/></StrictMode>);