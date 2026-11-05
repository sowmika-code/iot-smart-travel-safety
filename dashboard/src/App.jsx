import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function FlyToLatest({ incident }) {
  const map = useMap();

  useEffect(() => {
    const lat = Number(incident?.lat);
    const lon = Number(incident?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) map.setView([lat, lon], 14);
  }, [incident?.id, incident?.lat, incident?.lon, map]);

  return null;
}

function StatCard({ label, value, detail, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Fetch police stations
  useEffect(() => {
    fetch(`${API}/police-stations`)
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load stations");
        return r.json();
      })
      .then(setStations)
      .catch(() => setApiError("Could not load police stations."));
  }, []);

  // Fetch incidents
  useEffect(() => {
    const loadIncidents = () => {
      fetch(`${API}/incidents`)
        .then((r) => {
          if (!r.ok) throw new Error("Unable to load incidents");
          return r.json();
        })
        .then((data) => {
          setIncidents(data);
          setLoading(false);
          setApiError("");
        })
        .catch(() => {
          setLoading(false);
          setApiError("Backend connection unavailable. Check whether the API is running.");
        });
    };

    loadIncidents();
    const timer = setInterval(loadIncidents, 2000);

    return () => clearInterval(timer);
  }, []);

  // Resolve incident
  const resolve = async (id) => {
    try {
      const response = await fetch(`${API}/incidents/${id}/resolve`, {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("Could not resolve incident");

      setIncidents((previous) =>
        previous.map((incident) =>
          incident.id === id
            ? { ...incident, status: "resolved" }
            : incident
        )
      );
    } catch (error) {
      setApiError(error.message || "Unable to resolve incident. Please check the backend connection.");
    }
  };

  const sortedIncidents = [...incidents].sort((a, b) =>
    new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
  );
  const openIncidents = incidents.filter(
    (incident) => String(incident.status || "open").toLowerCase() !== "resolved"
  );
  const resolvedIncidents = incidents.filter(
    (incident) => String(incident.status || "").toLowerCase() === "resolved"
  );

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <h2>SAFE<span>ROUTE</span></h2>
            <p>INTELLIGENT SAFETY SYSTEM</p>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">MAIN MENU</p>

          <a href="#/" className="nav-item active">
            <span>◈</span> Command Centre
          </a>

          <a href="#/traveler" className="nav-item">
            <span>♙</span> Traveler View
          </a>
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            <div>
              <strong>Demo Environment</strong>
              <small>Simulated data only</small>
            </div>
          </div>

          <div className="sidebar-footer">
            IoT-Based Smart Travel Safety
            <br />
            Edge & Fog Computing
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOP HEADER */}
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW / MONITORING</p>
            <h1>Command Centre</h1>
            <p className="page-subtitle">
              Real-time simulated travel incident monitoring
            </p>
          </div>

          <div className="topbar-right">
            <div className="live-indicator">
              <span className="status-dot"></span>
              LIVE MONITORING
            </div>
            <div className="topbar-badge">IoT PROJECT</div>
          </div>
        </header>

        {/* STATISTICS */}
        <section className="stats-grid">
          <StatCard
            label="Total Incidents"
            value={incidents.length}
            detail="All recorded incidents"
            icon="◈"
          />

          <StatCard
            label="Open Incidents"
            value={openIncidents.length}
            detail="Require attention"
            icon="⚠"
          />

          <StatCard
            label="Resolved"
            value={resolvedIncidents.length}
            detail="Marked as resolved"
            icon="✓"
          />

          <StatCard
            label="Police Stations"
            value={stations.length}
            detail="Available in simulation"
            icon="⌖"
          />
        </section>

        {/* MAP AND RIGHT PANEL */}
        <section className="workspace">

          {/* MAP */}
          <div className="map-panel">
            <div className="panel-heading">
              <div>
                <h2>Live Incident Map</h2>
                <p>Geographical view of incidents and nearby stations</p>
              </div>

              <span className="map-tag">MAP VIEW</span>
            </div>

            <div className="map-container">
              <MapContainer
                center={[17.44, 78.4]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />

                <FlyToLatest incident={sortedIncidents[0]} />

                {stations.filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lon))).map((station) => (
                  <CircleMarker
                    key={station.id}
                    center={[station.lat, station.lon]}
                    radius={8}
                    pathOptions={{
                      color: "#38bdf8",
                      fillColor: "#0284c7",
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>{station.name}</Popup>
                  </CircleMarker>
                ))}

                {incidents.filter((incident) => Number.isFinite(Number(incident.lat)) && Number.isFinite(Number(incident.lon))).map((incident) => (
                  <CircleMarker
                    key={incident.id}
                    center={[incident.lat, incident.lon]}
                    radius={8}
                    pathOptions={{
                      color:
                        incident.status === "resolved"
                          ? "#94a3b8"
                          : incident.confidence === "high"
                          ? "#ef4444"
                          : "#f59e0b",
                      fillColor:
                        incident.status === "resolved"
                          ? "#94a3b8"
                          : incident.confidence === "high"
                          ? "#dc2626"
                          : "#f59e0b",
                      fillOpacity: 0.85,
                    }}
                  >
                    <Popup>
                      <strong>Incident #{incident.id}</strong>
                      <br />
                      Traveler: {incident.traveler_id}
                      <br />
                      Reason: {incident.reason}
                      <br />
                      Nearest station: {incident.nearest_station_name}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            <div className="map-legend">
              <span><i className="legend-dot red"></i> High confidence</span>
              <span><i className="legend-dot yellow"></i> Other open incident</span>
              <span><i className="legend-dot grey"></i> Resolved</span>
              <span><i className="legend-dot blue"></i> Police station</span>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">

            {/* SYSTEM STATUS */}
            <div className="panel demo-panel">
              <div className="panel-heading">
                <div><h2>Monitoring Status</h2><p>Live platform overview</p></div>
                <span className="control-icon">✓</span>
              </div>
              <div className="demo-warning">Responder workspace is for reviewing incoming traveler alerts and updating incident status.</div>
              <div className="system-status-list">
                <div><span className="status-dot"></span><span>Incident feed</span><strong>{loading ? "Loading" : "Connected"}</strong></div>
                <div><span className="status-dot"></span><span>Location map</span><strong>{stations.length + incidents.length} markers</strong></div>
                <div><span className="status-dot"></span><span>Awaiting response</span><strong>{openIncidents.length}</strong></div>
              </div>
            </div>

            {/* INCIDENT LIST */}
            <div className="panel incidents-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Incidents</h2>
                  <p>Latest system activity</p>
                </div>
                <span className="incident-count">{incidents.length}</span>
              </div>

              {loading ? (
                <div className="empty-state">Loading incidents...</div>
              ) : apiError ? (
                <div className="empty-state error-state">{apiError}</div>
              ) : incidents.length === 0 ? (
                <div className="empty-state">
                  <span>◇</span>
                  <strong>No incidents yet</strong>
                  <p>Use simulation controls to generate an incident.</p>
                </div>
              ) : (
                <div className="incident-list">
                  {sortedIncidents.map((incident) => (
                    <div className="incident-item" key={incident.id}>
                      <div className="incident-item-top">
                        <strong>Incident #{incident.id}</strong>
                        <span
                          className={`incident-status ${
                            incident.status === "resolved"
                              ? "resolved"
                              : "open"
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>

                      <p className="traveler-id">
                        Traveler: {incident.traveler_id}
                      </p>

                      <p className="incident-reason">
                        {incident.reason}
                      </p>

                      <div className="incident-meta">
                        <span>
                          {incident.confidence} confidence
                        </span>
                        <span>
                          {incident.nearest_station_name}
                        </span>
                      </div>

                      {incident.status !== "resolved" && (
                        <button
                          className="resolve-button"
                          onClick={() => resolve(incident.id)}
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">
          <span>SAFEROUTE TRAVEL SAFETY</span>
          <span>Powered by IoT • Edge Computing • Fog Computing</span>
        </footer>

      </main>
    </div>
  );
}