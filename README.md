# IoT-Based Smart Travel Safety System (Edge + Fog + Cloud)

*Live demo:* YOUR_VERCEL_LINK
(The API sleeps when idle, so the first load can take 30-50 seconds.)

> Demo only. All data is simulated. No real emergency service is ever contacted.

## Problem
Travelers are most vulnerable in unfamiliar places, on highways, and on weak networks. They may not know which station covers them, and accidental SOS presses waste responders' time.

## Solution
An SOS never goes straight to police. It goes to a *fog node* that checks for a corroborating crash signal first:
- *SOS + crash signal* → high confidence → escalate immediately
- *SOS alone* → low confidence → 15 s cancel window → auto-escalate
- Escalated incidents get the *nearest police station* via PostGIS (6 real Hyderabad stations; notification is simulated).

## Architecture
Edge simulator → MQTT (Mosquitto) → Fog node → Cloud (FastAPI + PostgreSQL/PostGIS) → React dashboard

## Features
- Simulated GPS + accelerometer with local anomaly detection
- Confidence scoring and cancel window at the fog layer
- PostGIS nearest-station lookup with distance in meters
- Live map dashboard, incident list, resolve button
- Demo panel so anyone can try the full flow in the browser
- Docker Compose stack; deployed on Render + Vercel + Supabase

## Tech stack
Python, FastAPI, paho-mqtt, PostgreSQL/PostGIS, React, Leaflet, Docker Compose

## Run locally
    docker compose up -d --build
    # API: http://localhost:8000   Dashboard: http://localhost:8080
    # Optional edge/fog demo:
    python fog/fog_node.py
    python edge/simulator.py   # c = crash, s = SOS, x = cancel

## Limitations
Software-simulated IoT, synthetic data. The hosted demo runs the fog rules inside the API instead of over MQTT.