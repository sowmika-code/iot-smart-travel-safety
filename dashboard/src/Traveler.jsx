import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const DEFAULT_POS = [17.44, 78.4];
function Recenter({ pos }) { const map = useMap(); useEffect(() => { map.setView(pos, 15); }, [pos, map]); return null; }

export default function Traveler() {
  const [pos, setPos] = useState(DEFAULT_POS);
  const [located, setLocated] = useState(false);
  const [status, setStatus] = useState('safe');
  const [seconds, setSeconds] = useState(10);
  const [message, setMessage] = useState('Your trip is active. Stay safe.');
  const [station, setStation] = useState(null);
  const [activity, setActivity] = useState('Trip active');
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const statusRef = useRef('safe');

  useEffect(() => {
    if (!navigator.geolocation) { setMessage('Location is not supported. A default map position is shown.'); return; }
    const id = navigator.geolocation.watchPosition(
      p => { setPos([p.coords.latitude, p.coords.longitude]); setLocated(true); },
      () => setMessage('Location permission unavailable. Please enable location access.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    return () => { navigator.geolocation.clearWatch(id); clearInterval(timer.current); };
  }, []);

  // Keep the original backend request contract: the API expects GPS coordinates.
  // Extra frontend-only fields previously caused some FastAPI request models to reject SOS.
  const post = async (action) => {
    let response;
    try {
      response = await fetch(`${API}/demo/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pos[0], lon: pos[1] }),
      });
    } catch {
      throw new Error(`Cannot reach ${API}. Check VITE_API_URL and make sure your backend is running.`);
    }
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw }; }
    if (!response.ok) throw new Error(data.detail || data.message || `API returned ${response.status}`);
    return data;
  };

  const finish = async () => {
    statusRef.current = 'sent'; setStatus('sent'); setActivity('SOS submitted'); setBusy(true);
    setMessage('Your SOS cancellation window has ended. The alert has been submitted to the system.');
    try {
      const listResponse = await fetch(`${API}/incidents`);
      if (listResponse.ok) {
        const list = await listResponse.json();
        const newest = Array.isArray(list) ? [...list].sort((a,b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))[0] : null;
        if (newest?.nearest_station_name) setStation(`${newest.nearest_station_name}${newest.nearest_station_distance_m ? ` · approximately ${Math.round(newest.nearest_station_distance_m)} m` : ''}`);
      }
    } catch { /* The incident remains managed by the backend; show status even if lookup is unavailable. */ }
    setBusy(false);
  };

  const pressSOS = async () => {
    if (statusRef.current !== 'safe') return;
    setBusy(true);
    try {
      await post('sos');
      statusRef.current = 'countdown'; setStatus('countdown'); setSeconds(10); setActivity('SOS pending · cancellation available');
      setMessage('SOS initiated. If you need help, do not cancel. If this was accidental, cancel within 10 seconds.');
      timer.current = setInterval(() => setSeconds(current => {
        if (current <= 1) { clearInterval(timer.current); finish(); return 0; }
        return current - 1;
      }), 1000);
    } catch (e) { setMessage(`Could not send SOS: ${e.message}. Check your connection and try again.`); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    clearInterval(timer.current);
    try { await post('cancel'); statusRef.current = 'safe'; setStatus('safe'); setStation(null); setActivity('SOS cancelled'); setMessage('SOS cancelled. Your trip is active.'); }
    catch (e) { setMessage(`Cancellation could not be confirmed: ${e.message}. Please check the responder dashboard.`); }
  };

  const simulateCrash = async () => {
    try { await post('crash'); setActivity('Crash simulation triggered'); setMessage('Crash test signal submitted. This is a simulation, not a real crash report.'); }
    catch (e) { setMessage(`Crash simulation failed: ${e.message}`); }
  };

  return <main className="traveler-shell">
    <header className="traveler-header"><a className="traveler-brand" href="#/">⌖ <span>safe<span>Route</span></span></a><div className="traveler-header-right"><span className="trip-live"><i /> TRIP MONITORING</span><a href="#/responder">Responder view ↗</a></div></header>
    <section className="traveler-welcome"><div><span className="eyebrow">TRAVELER SAFETY PORTAL</span><h1>Your journey, <em>protected.</em></h1><p>Keep your location available so responders can identify where help is needed.</p></div><div className={`safety-chip ${status === 'sent' ? 'alert' : status === 'countdown' ? 'warning' : ''}`}><i />{status === 'safe' ? 'You are safe' : status === 'countdown' ? 'SOS pending' : 'SOS submitted'}</div></section>
    <section className="traveler-grid">
      <div className="traveler-main-card"><div className="traveler-card-heading"><div><span className="eyebrow">YOUR CURRENT LOCATION</span><h2>Location overview</h2></div><span className="gps-chip">{located ? '● GPS CONNECTED' : '○ GPS WAITING'}</span></div>
        <div className="traveler-map"><MapContainer center={pos} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/><Recenter pos={pos}/><CircleMarker center={pos} radius={10} pathOptions={{ color:'#2563eb', fillColor:'#3b82f6', fillOpacity:.85 }}><Popup>Your current location</Popup></CircleMarker></MapContainer></div>
        <div className="location-details"><div><small>LATITUDE</small><b>{pos[0].toFixed(5)}</b></div><div><small>LONGITUDE</small><b>{pos[1].toFixed(5)}</b></div><div><small>LOCATION SOURCE</small><b>{located ? 'Device GPS' : 'Default map'}</b></div></div>
      </div>
      <aside className="sos-card"><span className="eyebrow">EMERGENCY ASSISTANCE</span><h2>Need immediate help?</h2><p>Press SOS to start a 10-second cancellation window. If you don't cancel, the system submits the alert.</p>
        {status === 'safe' && <button className="sos-circle" onClick={pressSOS} disabled={busy}><span>{busy ? '...' : 'SOS'}</span><small>{busy ? 'SENDING' : 'GET HELP'}</small></button>}
        {status === 'countdown' && <div className="countdown-wrap"><div className="countdown-number">{seconds}<small>SECONDS</small></div><button className="cancel-sos" onClick={cancel}>Cancel SOS</button></div>}
        {status === 'sent' && <div className="submitted-state"><span>✓</span><b>Alert submitted</b><small>Incident details are being handled by the system.</small><button onClick={() => { statusRef.current='safe'; setStatus('safe'); setActivity('Trip active'); setStation(null); setMessage('Your trip is active. Stay safe.'); }}>Return to trip</button></div>}
        <div className="sos-message">{message}</div>{station && <div className="nearest-station"><small>NEAREST STATION</small><b>{station}</b></div>}
        <div className="sos-disclaimer">Prototype only. This application does not contact real emergency services. In a real emergency, contact local emergency services directly.</div>
      </aside>
    </section>
    <section className="activity-card"><div><span className="eyebrow">TRIP ACTIVITY</span><h2>Recent activity</h2></div><div className="activity-row"><span className="activity-symbol">◷</span><div><b>{activity}</b><small>{new Date().toLocaleString()}</small></div><span className="activity-current">CURRENT</span></div><div className="activity-actions"><button className="crash-test-button" onClick={simulateCrash} disabled={busy}>⚡ Test crash signal</button><span>Testing only · Does not represent a real incident</span></div></section>
    <footer className="traveler-footer"><span>SAFEROUTE</span><span>Travel safely. Help is one tap away.</span><a href="#/">← Back to home</a></footer>
  </main>;
}