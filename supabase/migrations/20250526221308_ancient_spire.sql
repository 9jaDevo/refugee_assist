/*
  # Add PostGIS Extension and Geo Functions

  1. Extensions
    - Enable PostGIS for geographic queries
    - Add functions for distance calculations

  2. Updates
    - Add geometry column to services table
    - Create spatial index for faster geo queries
    - Add trigger to automatically update geometry column
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create spatial index
CREATE INDEX IF NOT EXISTS services_geom_idx ON services USING GIST (geom);

-- Create function to update geometry column
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
DROP TRIGGER IF EXISTS update_service_geom ON services;
CREATE TRIGGER update_service_geom
  BEFORE INSERT OR UPDATE
  ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_geom();

-- Update existing records
UPDATE services
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL;

-- Create function to find services within radius
CREATE OR REPLACE FUNCTION find_services_within_radius(
  lat double precision,
  lon double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  website text,
  hours text,
  languages text[],
  description text,
  distance_meters double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.type,
    s.address,
    s.latitude,
    s.longitude,
    s.phone,
    s.email,
    s.website,
    s.hours,
    s.languages,
    s.description,
    ST_Distance(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    ) as distance_meters
  FROM services s
  WHERE ST_DWithin(
    s.geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;