import { useEffect, useRef, useState } from "react";
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