/*import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const DEFAULT_POS = [17.44, 78.4];

function Recenter({ pos }) {
  const map = useMap();
  useEffect(() => { map.setView(pos, 15); }, [pos, map]);
  return null;
}

export default function Traveler() {
  const [pos, setPos] = useState(DEFAULT_POS);
  const [located, setLocated] = useState(false);
  const [status, setStatus] = useState("safe"); // safe | countdown | sent
  const [seconds, setSeconds] = useState(15);
  const [message, setMessage] = useState("You're safe. Trip active.");
  const [station, setStation] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => { setPos([p.coords.latitude, p.coords.longitude]); setLocated(true); },
      () => setMessage("Location blocked. Showing a default spot in Hyderabad."),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const post = (action) =>
    fetch(`${API}/demo/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: pos[0], lon: pos[1] }),
    }).then((r) => r.json());

  const pressSOS = async () => {
    await post("sos");
    setStatus("countdown");
    setSeconds(15);
    setMessage("Sending help request in 15 seconds. Press Cancel if this was a mistake.");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer.current);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const finish = async () => {
    setStatus("sent");
    setMessage("Help request sent.");
    const list = await fetch(`${API}/incidents?limit=1`).then((r) => r.json());
    if (list[0]) setStation(`${list[0].nearest_station_name} (about ${Math.round(list[0].nearest_station_distance_m)} m away)`);
  };

  const cancel = async () => {
    clearInterval(timer.current);
    await post("cancel");
    setStatus("safe");
    setStation(null);
    setMessage("Cancelled. You're safe. Trip active.");
  };

  const crash = async () => {
    await post("crash");
    setMessage("Crash detected. If you press SOS now, help is sent immediately.");
  };

  const reset = () => { setStatus("safe"); setStation(null); setMessage("You're safe. Trip active."); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "sans-serif", padding: 12 }}>
      <h2 style={{ margin: "4px 0" }}>Travel Safety</h2>
      <div style={{ fontSize: 12, background: "#fef3c7", padding: 6, borderRadius: 6 }}>
        Demo only. No real emergency service is contacted.
      </div>

      <div style={{ height: 260, margin: "10px 0", borderRadius: 8, overflow: "hidden" }}>
        <MapContainer center={pos} zoom={15} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <Recenter pos={pos} />
          <CircleMarker center={pos} radius={10} pathOptions={{ color: "#2563eb", fillOpacity: 0.8 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        </MapContainer>
      </div>
      <div style={{ fontSize: 12, color: "#555" }}>
        {located ? "Using your real location." : "Waiting for location permission..."}
      </div>

      <div style={{ textAlign: "center", margin: "16px 0" }}>
        {status === "safe" && (
          <button onClick={pressSOS}
            style={{ width: 180, height: 180, borderRadius: "50%", background: "#dc2626",
                     color: "white", fontSize: 36, fontWeight: "bold", border: "none" }}>
            SOS
          </button>
        )}
        {status === "countdown" && (
          <div>
            <div style={{ fontSize: 64, fontWeight: "bold" }}>{seconds}</div>
            <button onClick={cancel}
              style={{ padding: "16px 40px", fontSize: 22, background: "#16a34a", color: "white", border: "none", borderRadius: 8 }}>
              Cancel
            </button>
          </div>
        )}
        {status === "sent" && (
          <button onClick={reset} style={{ padding: "12px 28px", fontSize: 18 }}>Back to safe</button>
        )}
      </div>

      <div style={{ padding: 10, background: "#f3f4f6", borderRadius: 8 }}>
        <b>{message}</b>
        {station && <div style={{ marginTop: 6 }}>Nearest station: {station}</div>}
      </div>

      <div style={{ marginTop: 12, fontSize: 13 }}>
        Want to test the crash check? <button onClick={crash}>Simulate crash</button> then press SOS.
      </div>
      <div style={{ marginTop: 12 }}><a href="#/">← Home</a> · <a href="#/responder">Responder view</a></div>
    </div>
  );
} 
*/
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const DEFAULT_POS = [17.44, 78.4];
function Recenter({pos}){const map=useMap();useEffect(()=>{map.setView(pos,15)},[pos,map]);return null}

export default function Traveler(){
  const [pos,setPos]=useState(DEFAULT_POS);const [located,setLocated]=useState(false);
  const [status,setStatus]=useState('safe');const [seconds,setSeconds]=useState(15);
  const [message,setMessage]=useState("You're safe. Your trip is active.");const [station,setStation]=useState('');
  const [busy,setBusy]=useState(false);const timer=useRef(null);
  useEffect(()=>{if(!navigator.geolocation){setMessage('Location is not supported by this browser.');return}
    const id=navigator.geolocation.watchPosition(p=>{setPos([p.coords.latitude,p.coords.longitude]);setLocated(true)},()=>setMessage('Location permission unavailable. Showing the demo location.'),{enableHighAccuracy:true,maximumAge:10000,timeout:12000});
    return()=>{navigator.geolocation.clearWatch(id);clearInterval(timer.current)}},[]);
  const post=async(action)=>{const response=await fetch(`${API}/demo/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:pos[0],lon:pos[1]})});if(!response.ok)throw new Error(`Request failed (${response.status})`);return response.json()};
  const pressSOS=async()=>{if(busy||status!=='safe')return;setBusy(true);try{await post('sos');setStatus('countdown');setSeconds(15);setMessage('SOS initiated. You can cancel during the 15-second safety window.');clearInterval(timer.current);timer.current=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(timer.current);finish();return 0}return s-1}),1000)}catch{setMessage('Could not send SOS. Please check the server connection and try again.')}finally{setBusy(false)}};
  const finish=async()=>{setStatus('sent');setMessage('Your help request has been submitted to the system.');try{const r=await fetch(`${API}/incidents?limit=1`);if(r.ok){const data=await r.json();if(data?.[0]?.nearest_station_name)setStation(`${data[0].nearest_station_name}${data[0].nearest_station_distance_m!=null?` · approximately ${Math.round(data[0].nearest_station_distance_m)} m away`:''}`)}}catch{}}
  const cancel=async()=>{clearInterval(timer.current);setBusy(true);try{await post('cancel');setStatus('safe');setStation('');setMessage('SOS cancelled. You are safe. Your trip is active.')}catch{setMessage('Unable to cancel with the server. Please check the connection.')}finally{setBusy(false)}};
  const crash=async()=>{setBusy(true);try{await post('crash');setMessage('Crash scenario simulated successfully. Press SOS to test the combined workflow.')}catch{setMessage('Could not simulate crash. Check the backend connection.')}finally{setBusy(false)}};
  const reset=()=>{setStatus('safe');setStation('');setMessage("You're safe. Your trip is active.")};
  return <main className="traveler-page"><header className="traveler-topbar"><a className="landing-brand" href="#/"><span className="brand-mark">S</span><span>SAFEWAY<small>TRAVELER PROTECTION</small></span></a><div className="traveler-top-actions"><span className="secure-label"><i/> SYSTEM READY</span><a href="#/responder">Responder portal ↗</a></div></header>
    <div className="traveler-wrap"><div className="traveler-heading"><div><div className="hero-kicker"><i/> PERSONAL SAFETY SPACE</div><h1>Your journey, <em>protected.</em></h1><p>Share your location and request help when you need it.</p></div><a className="back-link" href="#/">← Back to home</a></div>
    <div className="traveler-grid"><section className="traveler-main-card"><div className="traveler-card-head"><div><span className="section-overline">EMERGENCY ASSISTANCE</span><h2>Need immediate help?</h2><p>Tap SOS to start the emergency workflow.</p></div><span className={`trip-state ${status==='safe'?'is-safe':'is-alert'}`}><i/>{status==='safe'?'Trip active':status==='countdown'?'SOS pending':'SOS submitted'}</span></div>
      <div className="sos-stage">{status==='safe'?<><button className="sos-button" onClick={pressSOS} disabled={busy}><span>{busy?'…':'SOS'}</span><small>{busy?'SENDING':'TAP FOR HELP'}</small></button><p>Emergency assistance request</p></>:status==='countdown'?<><div className="countdown-ring"><strong>{seconds}</strong><span>SECONDS</span></div><h3>Confirming emergency request</h3><p>If this was accidental, cancel before the timer ends.</p><button className="cancel-sos" onClick={cancel} disabled={busy}>{busy?'Please wait':'Cancel SOS request'}</button></>:<><div className="sent-check">✓</div><h3>Request submitted</h3><p>Your incident has been recorded in the system.</p><button className="button button-outline" onClick={reset}>Return to safe mode</button></>}</div>
      <div className={`traveler-message ${status==='sent'?'message-success':''}`}><span>ⓘ</span><div><b>System update</b><p>{message}</p>{station&&<p className="station-result"><b>Nearest station:</b> {station}</p>}</div></div>
      <div className="demo-tools"><div><b>Test the workflow</b><p>Simulate a sensor crash event for your project demonstration.</p></div><button onClick={crash} disabled={busy}>⚡ Simulate crash</button></div>
    </section>
    <aside className="traveler-side"><section className="location-panel"><div className="panel-heading"><div><span className="section-overline">LIVE LOCATION</span><h2>Where you are</h2></div><span className="location-live"><i/> LIVE</span></div><div className="traveler-map"><MapContainer center={pos} zoom={15} scrollWheelZoom={false} zoomControl={true} style={{height:'100%',width:'100%'}}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/><Recenter pos={pos}/><CircleMarker center={pos} radius={10} pathOptions={{color:'#fff',weight:4,fillColor:'#2878e8',fillOpacity:1}}><Popup>Your current location</Popup></CircleMarker></MapContainer></div><div className="location-status"><span className="location-pin">⌖</span><div><b>{located?'Location acquired':'Waiting for location'}</b><small>{located?`${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`:'Allow location access in your browser'}</small></div><span className={located?'location-check':'location-wait'}>{located?'✓':'…'}</span></div></section>
      <section className="privacy-panel"><span className="privacy-icon">◇</span><div><b>Your safety matters</b><p>This is an academic demonstration. Alerts and responder actions are simulated; no real emergency service is contacted.</p></div></section><div className="quick-links"><a href="#/responder">Open responder dashboard <span>→</span></a><a href="#/">SAFEWAY home <span>→</span></a></div></aside></div>
    <footer className="traveler-footer"><span>SAFEWAY · SMART TRAVEL SAFETY</span><span>Edge • Fog • Cloud architecture</span></footer></div></main>
}