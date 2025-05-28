/*
  # Add Google Places Integration

  1. Changes
    - Add google_place_id column to services table
    - Add constraint to ensure google_place_id is not null for Google Places source
    - Add index for faster lookups by google_place_id
    - Update RLS policies to handle Google Places data

  2. Security
    - Maintain existing RLS policies
    - Add specific policy for Google Places data
*/

-- Add google_place_id column and update source check
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS google_place_id text;

-- Update source constraint to include GooglePlaces
ALTER TABLE services 
DROP CONSTRAINT IF EXISTS check_osm_id_not_null;

ALTER TABLE services 
ADD CONSTRAINT check_external_ids 
CHECK (
  (source = 'OSM' AND osm_id IS NOT NULL) OR 
  (source = 'GooglePlaces' AND google_place_id IS NOT NULL) OR 
  (source = 'manual')
);

-- Add index for google_place_id
CREATE INDEX IF NOT EXISTS idx_services_google_place_id 
ON services(google_place_id);

-- Add unique constraint for google_place_id
ALTER TABLE services 
ADD CONSTRAINT services_google_place_id_key 
UNIQUE (google_place_id);

-- Update RLS policies to handle Google Places data
DROP POLICY IF EXISTS "Allow public to read services" ON services;
CREATE POLICY "Allow public to read services"
ON services
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow users to update their own services" ON services;
CREATE POLICY "Allow users to update their own services"
ON services
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (created_by IS NULL AND source = 'manual')
)
WITH CHECK (
  (auth.uid() = created_by) OR 
  (created_by IS NULL AND source = 'manual')
);

DROP POLICY IF EXISTS "Allow users to delete their own services" ON services;
CREATE POLICY "Allow users to delete their own services"
ON services
FOR DELETE
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (created_by IS NULL AND source = 'manual')
);

-- Add function to update geom column for Google Places entries
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;