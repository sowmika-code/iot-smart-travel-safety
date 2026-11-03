"""
Fog node.

Sits between the edge devices and the cloud backend. Subscribes to every
traveler's telemetry/event/SOS topics (using MQTT wildcards) and runs the
smarter, stateful logic that a single edge device shouldn't have to do
alone:

  - Keeps a short rolling history of each traveler's recent telemetry.
  - When an SOS arrives, checks whether it's corroborated by a recent
    crash-like spike from the SAME traveler (high confidence) or is an
    isolated button press (low confidence).
  - High confidence -> escalate immediately.
  - Low confidence -> start a countdown window. If the traveler cancels
    within that window, nothing is escalated. If the window expires,
    it auto-escalates (better a false alarm reaches someone than a real
    emergency gets silently dropped).

Escalated incidents are published to `fog/escalated`, which the cloud
layer will subscribe to in Phase 3.
"""
import json
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from importlib import import_module

try:
    # Load dynamically so the fog node can still be analyzed when the optional
    # MQTT dependency is not installed in the editor's active environment.
    mqtt = import_module("paho.mqtt.client")
except ModuleNotFoundError as exc:
    if exc.name == "paho" or exc.name.startswith("paho."):
        raise RuntimeError(
            "The fog node requires the 'paho-mqtt' package. "
            "Install it with: python -m pip install paho-mqtt"
        ) from exc
    raise

MQTT_BROKER = "localhost"
MQTT_PORT = 1883

# How far back we look for a corroborating crash signal when an SOS arrives.
CORROBORATION_WINDOW_S = 10

# How long a low-confidence SOS waits for a cancel before auto-escalating.
CONFIRMATION_WINDOW_S = 15

# How long we keep telemetry history in memory per traveler.
HISTORY_RETENTION_S = 30


class FogNode:
    def __init__(self):
        self.client = mqtt.Client(client_id="fog-node-1")
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

        # traveler_id -> deque of (timestamp, accel_magnitude_g, local_anomaly)
        self.telemetry_history = defaultdict(lambda: deque(maxlen=60))

        # traveler_id -> threading.Timer currently counting down to auto-escalate
        self.pending_confirmations = {}

        # Protects both dicts above, since MQTT callbacks and Timer threads
        # can touch them concurrently.
        self._lock = threading.Lock()

    def _on_connect(self, client, userdata, flags, rc):
        print(f"[fog] Connected to broker (rc={rc}). Subscribing to all traveler topics...")
        client.subscribe("travel/+/telemetry")
        client.subscribe("travel/+/sos")
        client.subscribe("travel/+/sos_cancel")
        client.subscribe("travel/+/event")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            print(f"[fog] Ignoring malformed message on {msg.topic}")
            return

        topic_parts = msg.topic.split("/")  # e.g. ["travel", "traveler_001", "sos"]
        if len(topic_parts) != 3:
            return
        _, traveler_id, message_type = topic_parts

        if message_type == "telemetry":
            self._handle_telemetry(traveler_id, payload)
        elif message_type == "sos":
            self._handle_sos(traveler_id, payload)
        elif message_type == "sos_cancel":
            self._handle_cancel(traveler_id, payload)
        elif message_type == "event":
            print(f"[fog] Event from {traveler_id}: {payload.get('type')}")

    def _handle_telemetry(self, traveler_id, payload):
        now = time.time()
        magnitude = payload.get("accel_magnitude_g", 0.0)
        anomaly = payload.get("local_anomaly", False)

        with self._lock:
            history = self.telemetry_history[traveler_id]
            history.append((now, magnitude, anomaly))
            # Trim anything older than our retention window
            while history and now - history[0][0] > HISTORY_RETENTION_S:
                history.popleft()

    def _recent_crash_signal(self, traveler_id):
        """Returns True if this traveler had a local_anomaly reading recently."""
        now = time.time()
        with self._lock:
            history = self.telemetry_history[traveler_id]
            for timestamp, magnitude, anomaly in reversed(history):
                if now - timestamp > CORROBORATION_WINDOW_S:
                    break
                if anomaly:
                    return True
        return False

    def _handle_sos(self, traveler_id, payload):
        confidence = "high" if self._recent_crash_signal(traveler_id) else "low"
        print(f"[fog] SOS received from {traveler_id} -- confidence: {confidence}")

        if confidence == "high":
            self._escalate(traveler_id, payload, confidence, reason="sos_with_crash_signal")
            return

        # Low confidence: start (or restart) a confirmation countdown.
        with self._lock:
            existing_timer = self.pending_confirmations.get(traveler_id)
            if existing_timer:
                existing_timer.cancel()

            timer = threading.Timer(
                CONFIRMATION_WINDOW_S,
                self._escalate,
                args=(traveler_id, payload, confidence, "sos_timeout_no_cancel"),
            )
            self.pending_confirmations[traveler_id] = timer
            timer.start()

        print(f"[fog] Low-confidence SOS from {traveler_id}: waiting {CONFIRMATION_WINDOW_S}s "
              f"for a cancel before escalating.")

    def _handle_cancel(self, traveler_id, payload):
        with self._lock:
            timer = self.pending_confirmations.pop(traveler_id, None)

        if timer:
            timer.cancel()
            print(f"[fog] SOS from {traveler_id} was CANCELLED by traveler. No escalation.")
        else:
            print(f"[fog] Cancel received from {traveler_id} but there was nothing pending.")

    def _escalate(self, traveler_id, sos_payload, confidence, reason):
        with self._lock:
            self.pending_confirmations.pop(traveler_id, None)

        incident = {
            "traveler_id": traveler_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "gps": sos_payload.get("gps"),
            "confidence": confidence,
            "reason": reason,
        }
        self.client.publish("fog/escalated", json.dumps(incident))
        print(f"[fog] *** ESCALATED *** {incident}")

    def run(self):
        self.client.connect(MQTT_BROKER, MQTT_PORT)
        print("[fog] Fog node running. Waiting for traveler messages...\n")
        self.client.loop_forever()


if __name__ == "__main__":
    FogNode().run()