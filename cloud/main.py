"""
Cloud backend.

Responsibilities:
  - Subscribe to `fog/escalated` over MQTT (background thread) and write
    each incident to PostgreSQL, running a PostGIS nearest-station lookup
    at the same time.
  - Expose REST endpoints so the dashboard (Phase 4) can read incident
    history and station data.

IMPORTANT: The "notify nearest station" step here is fully simulated --
it logs to the console and records which station *would* be notified.
No real call, SMS, or dispatch API is triggered anywhere in this project.
"""
import json
import os
import threading

try:
    import paho.mqtt.client as mqtt  # type: ignore[import-not-found]
except ModuleNotFoundError as exc:
    raise RuntimeError("Install the 'paho-mqtt' package to run the cloud backend.") from exc

import psycopg2  # type: ignore[import-not-found]
import psycopg2.extras  # type: ignore[import-not-found]

try:
    from fastapi import FastAPI, HTTPException  # type: ignore[import-not-found]
    from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
except ModuleNotFoundError as exc:
    raise RuntimeError("Install the 'fastapi' package to run the cloud backend.") from exc

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": os.getenv("DB_PORT", "5433"),
    "dbname": os.getenv("DB_NAME", "travel_safety"),
    "user": os.getenv("DB_USER", "safety_admin"),
    "password": os.getenv("DB_PASSWORD", "safety_dev_password"),
}

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

app = FastAPI(title="Smart Travel Safety - Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev; tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def find_nearest_station(cur, lon, lat):
    """
    Uses PostGIS to find the closest police station. The `<->` operator
    uses the spatial index for a fast nearest-neighbor search, and
    ST_Distance gives the actual real-world distance in meters, correctly
    accounting for the Earth's curvature.
    """
    cur.execute(
        """
        SELECT id, name, area,
               ST_Distance(location, ST_MakePoint(%s, %s)::geography) AS distance_m
        FROM police_stations
        ORDER BY location <-> ST_MakePoint(%s, %s)::geography
        LIMIT 1
        """,
        (lon, lat, lon, lat),
    )
    return cur.fetchone()


def store_incident(payload):
    gps = payload.get("gps") or {}
    lat, lon = gps.get("lat"), gps.get("lon")

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            nearest = None
            if lat is not None and lon is not None:
                nearest = find_nearest_station(cur, lon, lat)

            cur.execute(
                """
                INSERT INTO incidents
                    (traveler_id, incident_timestamp, location, confidence,
                     reason, nearest_station_id, nearest_station_distance_m)
                VALUES
                    (%s, %s, ST_MakePoint(%s, %s)::geography, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload["traveler_id"],
                    payload["timestamp"],
                    lon, lat,
                    payload["confidence"],
                    payload["reason"],
                    nearest["id"] if nearest else None,
                    nearest["distance_m"] if nearest else None,
                ),
            )
            incident_id = cur.fetchone()["id"]
        conn.commit()

        if nearest:
            print(
                f"[cloud] SIMULATED NOTIFICATION -> {nearest['name']} "
                f"({nearest['distance_m']:.0f}m away) for incident #{incident_id} "
                f"(traveler {payload['traveler_id']}, confidence={payload['confidence']})"
            )
        else:
            print(f"[cloud] Incident #{incident_id} stored, but no GPS to locate a station.")

    finally:
        conn.close()


# ---------- MQTT listener (runs in a background thread) ----------

def on_connect(client, userdata, flags, rc):
    print(f"[cloud] Connected to MQTT broker (rc={rc}). Subscribing to fog/escalated...")
    client.subscribe("fog/escalated")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        print("[cloud] Ignoring malformed escalation message.")
        return
    store_incident(payload)


def start_mqtt_listener():
    client = mqtt.Client(client_id="cloud-backend")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT)
    client.loop_forever()


# ---------- REST API ----------

@app.get("/")
def root():
    return {"service": "Smart Travel Safety Cloud API", "status": "running"}


@app.get("/incidents")
def list_incidents(limit: int = 50):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.id, i.traveler_id, i.incident_timestamp,
                       ST_Y(i.location::geometry) AS lat,
                       ST_X(i.location::geometry) AS lon,
                       i.confidence, i.reason, i.status,
                       ps.name AS nearest_station_name,
                       i.nearest_station_distance_m
                FROM incidents i
                LEFT JOIN police_stations ps ON ps.id = i.nearest_station_id
                ORDER BY i.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.id, i.traveler_id, i.incident_timestamp,
                       ST_Y(i.location::geometry) AS lat,
                       ST_X(i.location::geometry) AS lon,
                       i.confidence, i.reason, i.status,
                       ps.name AS nearest_station_name,
                       i.nearest_station_distance_m
                FROM incidents i
                LEFT JOIN police_stations ps ON ps.id = i.nearest_station_id
                WHERE i.id = %s
                """,
                (incident_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Incident not found")
            return row
    finally:
        conn.close()


@app.get("/police-stations")
def list_stations():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, area,
                       ST_Y(location::geometry) AS lat,
                       ST_X(location::geometry) AS lon
                FROM police_stations
                """
            )
            return cur.fetchall()
    finally:
        conn.close()

@app.patch("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE incidents SET status = 'resolved' WHERE id = %s RETURNING id, status",
                (incident_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Incident not found")
        conn.commit()
        return row
    finally:
        conn.close()
        
import random
import time
from datetime import datetime, timezone

DEMO_TRAVELER = "demo_traveler"
DEMO_STATE = {"last_crash": 0.0, "timer": None}


def demo_payload(confidence, reason):
    return {
        "traveler_id": DEMO_TRAVELER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gps": {
            "lat": 17.44 + random.uniform(-0.02, 0.02),
            "lon": 78.40 + random.uniform(-0.04, 0.04),
        },
        "confidence": confidence,
        "reason": reason,
    }


@app.post("/demo/crash")
def demo_crash():
    DEMO_STATE["last_crash"] = time.time()
    return {"message": "Crash signal recorded. Press SOS within 10 seconds."}


@app.post("/demo/sos")
def demo_sos():
    if DEMO_STATE["timer"]:
        return {"message": "SOS already pending. Press Cancel or wait."}
    if time.time() - DEMO_STATE["last_crash"] < 10:
        store_incident(demo_payload("high", "sos_with_crash_signal"))
        return {"message": "High confidence: escalated immediately."}

    def escalate():
        DEMO_STATE["timer"] = None
        store_incident(demo_payload("low", "sos_timeout_no_cancel"))

    t = threading.Timer(15, escalate)
    DEMO_STATE["timer"] = t
    t.start()
    return {"message": "Low confidence: escalating in 15s unless cancelled."}


@app.post("/demo/cancel")
def demo_cancel():
    t = DEMO_STATE["timer"]
    if t:
        t.cancel()
        DEMO_STATE["timer"] = None
        return {"message": "SOS cancelled. Nothing escalated."}
    return {"message": "Nothing pending to cancel."}

@app.on_event("startup")
def startup():
    listener_thread = threading.Thread(target=start_mqtt_listener, daemon=True)
    listener_thread.start()