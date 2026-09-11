"""
Sensor simulators for the edge layer.

These classes generate realistic-looking GPS and accelerometer data
without any real hardware, standing in for what a phone or vehicle
telematics unit would report.
"""
import math
import random
import time


class GPSSimulator:
    """Simulates a traveler moving along a straight route between two points."""

    def __init__(self, start_lat, start_lon, end_lat, end_lon, trip_duration_s=300):
        self.start_lat = start_lat
        self.start_lon = start_lon
        self.end_lat = end_lat
        self.end_lon = end_lon
        self.trip_duration_s = trip_duration_s
        self.start_time = time.time()
        self._deviation_lat = 0.0
        self._deviation_lon = 0.0

    def _progress(self):
        """Returns 0.0 -> 1.0 fraction of the trip completed, capped at 1.0."""
        elapsed = time.time() - self.start_time
        return min(elapsed / self.trip_duration_s, 1.0)

    def inject_route_deviation(self, lat_offset, lon_offset):
        """Simulates the traveler going off the planned route (for geofence testing)."""
        self._deviation_lat += lat_offset
        self._deviation_lon += lon_offset

    def read(self):
        """Returns the current (lat, lon) with small GPS noise added."""
        t = self._progress()
        lat = self.start_lat + (self.end_lat - self.start_lat) * t
        lon = self.start_lon + (self.end_lon - self.start_lon) * t

        # Real GPS has small jitter (~5-10 meters) even when stationary
        noise = 0.00005
        lat += random.uniform(-noise, noise) + self._deviation_lat
        lon += random.uniform(-noise, noise) + self._deviation_lon

        return round(lat, 6), round(lon, 6)

    def is_trip_complete(self):
        return self._progress() >= 1.0


class AccelerometerSimulator:
    """
    Simulates a 3-axis accelerometer (units: g, where 1g = 9.8 m/s^2).
    Baseline is gentle road vibration. Events (crash, hard brake) can be
    injected to produce a realistic spike.
    """

    def __init__(self):
        self._pending_event = None  # e.g. "crash", "hard_brake"
        self._event_ticks_remaining = 0

    def trigger_event(self, event_type, duration_ticks=3):
        """Queue a sudden-motion event to appear over the next few reads."""
        self._pending_event = event_type
        self._event_ticks_remaining = duration_ticks

    def read(self):
        """Returns a dict with x, y, z acceleration in g."""
        # Baseline: normal driving vibration, roughly centered on gravity in z
        x = random.uniform(-0.05, 0.05)
        y = random.uniform(-0.05, 0.05)
        z = 1.0 + random.uniform(-0.03, 0.03)

        if self._event_ticks_remaining > 0:
            if self._pending_event == "crash":
                # Crash: a sharp, large-magnitude spike in a random direction
                x += random.uniform(-4.0, 4.0)
                y += random.uniform(-4.0, 4.0)
                z += random.uniform(-2.0, 2.0)
            elif self._pending_event == "hard_brake":
                # Hard braking: strong deceleration along the direction of travel
                x -= random.uniform(0.8, 1.2)

            self._event_ticks_remaining -= 1
            if self._event_ticks_remaining == 0:
                self._pending_event = None

        return {"x": round(x, 3), "y": round(y, 3), "z": round(z, 3)}

    @staticmethod
    def magnitude(accel):
        """Total acceleration magnitude -- used for local anomaly thresholding."""
        return math.sqrt(accel["x"] ** 2 + accel["y"] ** 2 + accel["z"] ** 2)