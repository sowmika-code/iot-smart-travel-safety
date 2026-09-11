"""
Edge device simulator.

Represents a single traveler's device: publishes periodic telemetry
(GPS + accelerometer) over MQTT, runs a cheap local anomaly check
before publishing, and lets you trigger SOS or crash events live
from the console for demoing.

This is the ONLY component that runs "on the device" -- everything
here should be things a real phone/vehicle unit could compute without
needing a network round-trip. Everything smarter (confidence scoring,
escalation) happens downstream in the fog layer.
"""
import json
import msvcrt
import time
from datetime import datetime, timezone

try:
    import paho.mqtt.client as mqtt  # type: ignore[import-not-found]
except ImportError:
    class _FallbackMqttClient:
        def __init__(self, *args, **kwargs):
            self._connected = False

        def connect(self, *args, **kwargs):
            self._connected = True
            print("[mqtt stub] MQTT broker unavailable; telemetry is not being published.")
            return None

        def publish(self, *args, **kwargs):
            return None

        def disconnect(self, *args, **kwargs):
            self._connected = False
            return None

    class _FallbackMqttModule:
        Client = _FallbackMqttClient

    mqtt = _FallbackMqttModule()

from sensors import AccelerometerSimulator, GPSSimulator

MQTT_BROKER = "localhost"
MQTT_PORT = 1883

# Local anomaly threshold: above this total acceleration magnitude (in g),
# the edge device flags the reading before it even reaches the fog layer.
CRASH_MAGNITUDE_THRESHOLD_G = 3.5


class TravelerDevice:
    def __init__(self, traveler_id, start_coords, end_coords, trip_duration_s=300):
        self.traveler_id = traveler_id
        self.gps = GPSSimulator(*start_coords, *end_coords, trip_duration_s)
        self.accel = AccelerometerSimulator()

        self.client = mqtt.Client(client_id=f"edge-{traveler_id}")
        self.client.connect(MQTT_BROKER, MQTT_PORT)

        self.telemetry_topic = f"travel/{traveler_id}/telemetry"
        self.sos_topic = f"travel/{traveler_id}/sos"
        self.sos_cancel_topic = f"travel/{traveler_id}/sos_cancel"
        self.event_topic = f"travel/{traveler_id}/event"

    def _timestamp(self):
        return datetime.now(timezone.utc).isoformat()

    def _publish_telemetry(self):
        lat, lon = self.gps.read()
        accel = self.accel.read()
        magnitude = AccelerometerSimulator.magnitude(accel)

        payload = {
            "traveler_id": self.traveler_id,
            "timestamp": self._timestamp(),
            "gps": {"lat": lat, "lon": lon},
            "accel": accel,
            "accel_magnitude_g": round(magnitude, 3),
            "local_anomaly": magnitude >= CRASH_MAGNITUDE_THRESHOLD_G,
        }

        self.client.publish(self.telemetry_topic, json.dumps(payload))
        print(f"[telemetry] {payload}")

        # If the edge-level check flags a possible crash, raise it as its
        # own event too -- this is local anomaly detection in action.
        if payload["local_anomaly"]:
            self._publish_event("possible_crash", {"accel_magnitude_g": round(magnitude, 3)})

    def _publish_event(self, event_type, extra=None):
        lat, lon = self.gps.read()
        payload = {
            "traveler_id": self.traveler_id,
            "timestamp": self._timestamp(),
            "type": event_type,
            "gps": {"lat": lat, "lon": lon},
        }
        if extra:
            payload.update(extra)

        self.client.publish(self.event_topic, json.dumps(payload))
        print(f"[event] {payload}")

    def _publish_sos(self):
        lat, lon = self.gps.read()
        payload = {
            "traveler_id": self.traveler_id,
            "timestamp": self._timestamp(),
            "gps": {"lat": lat, "lon": lon},
        }
        self.client.publish(self.sos_topic, json.dumps(payload))
        print(f"[SOS] {payload}")

    def _publish_sos_cancel(self):
        payload = {
            "traveler_id": self.traveler_id,
            "timestamp": self._timestamp(),
        }
        self.client.publish(self.sos_cancel_topic, json.dumps(payload))
        print(f"[SOS CANCEL] {payload}")

    def _check_keypress(self):
        """
        Non-blocking single-keypress check (Windows only, via msvcrt).
        No Enter key needed -- this avoids the race between typed input
        and the telemetry prints that happen every second in this loop.
        """
        if msvcrt.kbhit():
            try:
                return msvcrt.getch().decode(errors="ignore").lower()
            except UnicodeDecodeError:
                return None
        return None

    def run(self, publish_interval_s=1.0):
        print(f"Starting simulation for {self.traveler_id}. Publishing every {publish_interval_s}s.")
        print("Press 's' = SOS | 'x' = cancel SOS | 'c' = simulate crash | 'q' = quit  (no Enter needed)\n")

        while True:
            key = self._check_keypress()
            if key == "s":
                self._publish_sos()
            elif key == "x":
                self._publish_sos_cancel()
            elif key == "c":
                print(">>> Crash triggered, watch the next few readings <<<")
                self.accel.trigger_event("crash")
            elif key == "q":
                print("Stopping simulator.")
                self.client.disconnect()
                return

            self._publish_telemetry()
            time.sleep(publish_interval_s)


if __name__ == "__main__":
    # Example trip: adjust these coordinates to any route you like.
    device = TravelerDevice(
        traveler_id="traveler_001",
        start_coords=(17.4401, 78.3489),
        end_coords=(17.4399, 78.4983),
        trip_duration_s=600,
    )
    device.run(publish_interval_s=1.0)