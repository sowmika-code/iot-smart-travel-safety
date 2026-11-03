import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL= "http://127.0.0.1:8000";

function FlyToLatest({ incident }) {
  const map = useMap();
  useEffect(() => {
    if (incident) map.setView([incident.lat, incident.lon], 14);
  }, [incident?.id]);
  return null;
}

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [stations, setStations] = useState([]);

  const [demoMsg, setDemoMsg] = useState("");

  const [pending, setPending] = useState({ pending: false });
  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${API}/demo/status`).then((r) => r.json()).then(setPending).catch(() => {});
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const demo = (action) =>
    fetch(`${API}/demo/${action}`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => setDemoMsg(d.message))
      .catch(console.error);

  const resolve = (id) =>
    fetch(`${API}/incidents/${id}/resolve`, { method: "PATCH" })
      .then(() =>
        setIncidents((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: "resolved" } : i))
        )
      )
      .catch(console.error);

  useEffect(() => {
    fetch(`${API}/police-stations`)
      .then((r) => r.json())
      .then(setStations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const load = () =>
      fetch(`${API}/incidents`)
        .then((r) => r.json())
        .then(setIncidents)
        .catch(console.error);
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ flex: 1 }}>
        <MapContainer center={[17.44, 78.4]} zoom={12} style={{ height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          <FlyToLatest incident={incidents[0]} />
          {stations.map((s) => (
            <CircleMarker key={s.id} center={[s.lat, s.lon]} radius={8}
              pathOptions={{ color: "#1d4ed8" }}>
              <Popup>{s.name}</Popup>
            </CircleMarker>
          ))}
          {incidents.map((i) => (
            <CircleMarker key={i.id} center={[i.lat, i.lon]} radius={6}
              pathOptions={{
                color: i.status === "resolved" ? "#9ca3af"
                     : i.confidence === "high" ? "#dc2626" : "#f59e0b"
              }}>
              <Popup>
                #{i.id} {i.traveler_id}<br />
                {i.reason}<br />
                Nearest: {i.nearest_station_name}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div style={{ width: 340, overflowY: "auto", padding: 12 }}>
        <div style={{ padding: 8, marginBottom: 12, background: "#f3f4f6", borderRadius: 6 }}>
          <b>Demo panel</b>
          <div style={{ marginBottom: 8 }}><a href="#/">← Home</a> · <a href="#/traveler">Traveler view</a></div>
          <div style={{ padding: 8, marginBottom: 12, background: "#fef3c7", borderRadius: 6, fontSize: 13 }}>
          Demo only. All data is simulated. No real emergency services are contacted.
        </div>
          <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
            <button onClick={() => demo("crash")}>Simulate crash</button>
            <button onClick={() => demo("sos")}>Press SOS</button>
            <button onClick={() => demo("cancel")}>Cancel</button>
          </div>
          <div style={{ fontSize: 13 }}>{demoMsg}</div>
        </div>
        {pending.pending && (
          <div style={{ padding: 8, marginBottom: 8, background: "#fee2e2", borderRadius: 6 }}>
            <b>SOS pending</b>: traveler can still cancel. Escalating in {pending.seconds_left}s.
          </div>
        )}
        <h2>Incidents ({incidents.length})</h2>
        {incidents.map((i) => (
          <div key={i.id} style={{ borderBottom: "1px solid #ddd", padding: "8px 0" }}>
            <b>#{i.id}</b> {i.traveler_id} · <i>{i.confidence}</i> · {i.status}
            <div style={{ fontSize: 13 }}>{i.reason}</div>
            <div style={{ fontSize: 13 }}>
              {i.nearest_station_name} ({Math.round(i.nearest_station_distance_m)} m)
              {i.status === "open" && (
              <button onClick={() => resolve(i.id)} style={{ marginTop: 4 }}>
                Mark resolved
              </button>
            )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}