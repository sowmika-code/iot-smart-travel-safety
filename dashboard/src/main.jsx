import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.jsx';
import Traveler from './Traveler.jsx';

function Landing() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav"><a className="landing-brand" href="#/">⌖ <span>safe<span>Route</span></span></a><span className="landing-pill"><i /> TRAVEL SAFETY PLATFORM</span></nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">SMARTER JOURNEYS. FASTER RESPONSE.</span>
          <h1>Your safety,<br /><em>our priority.</em></h1>
          <p>SafeRoute connects travelers and responders through a smart incident-monitoring platform powered by IoT, edge and fog computing.</p>
          <div className="landing-actions"><a className="landing-action primary" href="#/traveler">Open Traveler Portal <b>→</b></a><a className="landing-action secondary" href="#/responder">Responder Dashboard <b>↗</b></a></div>
          <div className="landing-note"><span>✓</span> Location-aware incident reporting <span>•</span> Live incident monitoring</div>
        </div>
        <div className="hero-visual" aria-label="SafeRoute safety overview">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="visual-card card-top"><span className="mini-icon">⌖</span><div><b>Location tracking</b><small>Traveler position</small></div><i className="green-dot" /></div>
          <div className="visual-map"><div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/><div className="map-pin pin-a">●</div><div className="map-pin pin-b">●</div><div className="map-pin pin-c">⌖</div><div className="map-label">LIVE SAFETY NETWORK</div></div>
          <div className="visual-card card-bottom"><span className="alert-icon">✓</span><div><b>Incident response</b><small>Monitor · Verify · Resolve</small></div><span className="live-tag">ACTIVE</span></div>
        </div>
      </section>
      <section className="landing-features"><article><span>01</span><b>Traveler protection</b><p>Send a location-aware SOS with a short cancellation window.</p></article><article><span>02</span><b>Responder visibility</b><p>Review incidents, locate events and update resolution status.</p></article><article><span>03</span><b>Connected architecture</b><p>Designed around IoT, edge, fog and cloud processing.</p></article></section>
      <footer className="landing-footer"><span>SAFEROUTE</span><span>Prototype environment · No real emergency services are contacted</span></footer>
    </main>
  );
}

function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const update = () => setHash(window.location.hash); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  if (hash === '#/traveler') return <Traveler />;
  if (hash === '#/responder') return <App />;
  return <Landing />;
}

createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>);