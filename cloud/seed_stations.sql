-- Seed data: real Hyderabad localities and their police stations.
-- Coordinates are approximate (locality-level precision), sourced for a
-- course-project demo -- not guaranteed to be the exact station address.
-- This is only used to demonstrate the nearest-station PostGIS query;
-- no real dispatch or contact happens anywhere in this project (see README).

INSERT INTO police_stations (name, area, location) VALUES
    ('Gachibowli Police Station', 'Gachibowli', ST_MakePoint(78.3489, 17.4401)::geography),
    ('Madhapur Police Station', 'Madhapur', ST_MakePoint(78.3915, 17.4483)::geography),
    ('Kukatpally Police Station', 'Kukatpally', ST_MakePoint(78.4138, 17.4849)::geography),
    ('Begumpet Police Station', 'Begumpet', ST_MakePoint(78.4482, 17.4400)::geography),
    ('Banjara Hills Police Station', 'Banjara Hills', ST_MakePoint(78.4487, 17.4126)::geography),
    ('Secunderabad Police Station', 'Secunderabad', ST_MakePoint(78.4983, 17.4399)::geography);

-- Note: ST_MakePoint takes (longitude, latitude) -- in that order, which
-- trips people up constantly since we normally say "lat, lon" out loud.