-- Enables PostGIS spatial functions (ST_Distance, geography type, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS police_stations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT,
    -- geography(Point, 4326) stores lat/lon and lets PostGIS calculate
    -- real-world distances in meters, accounting for the Earth's curvature
    -- (a plain "distance formula" on raw lat/lon would be inaccurate).
    location GEOGRAPHY(Point, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    traveler_id TEXT NOT NULL,
    incident_timestamp TIMESTAMPTZ NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    confidence TEXT NOT NULL,          -- 'high' or 'low'
    reason TEXT NOT NULL,              -- e.g. 'sos_with_crash_signal', 'sos_timeout_no_cancel'
    nearest_station_id INTEGER REFERENCES police_stations(id),
    nearest_station_distance_m DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'open',   -- 'open', 'acknowledged', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up "find incidents for this traveler" and "recent incidents" queries
CREATE INDEX IF NOT EXISTS idx_incidents_traveler ON incidents(traveler_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

-- A spatial index is what makes "nearest station" queries fast even with
-- thousands of stations, instead of checking distance to every single row.
CREATE INDEX IF NOT EXISTS idx_police_stations_location
    ON police_stations USING GIST (location);