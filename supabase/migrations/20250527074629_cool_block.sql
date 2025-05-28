/*
  # Add Google Places Integration

  1. Changes
    - Add google_place_id column
    - Update constraints for external IDs
    - Add indexes and unique constraints
    - Update RLS policies
    - Add geometry update trigger

  2. Security
    - Maintain RLS policies for data access
    - Ensure proper authentication checks
*/

-- Add google_place_id column if it doesn't exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS google_place_id text;

-- Drop existing constraint if it exists
ALTER TABLE services 
DROP CONSTRAINT IF EXISTS check_external_ids;

-- Add updated constraint for external IDs
ALTER TABLE services 
ADD CONSTRAINT check_external_ids 
CHECK (
  (source = 'OSM' AND osm_id IS NOT NULL) OR 
  (source = 'GooglePlaces' AND google_place_id IS NOT NULL) OR 
  (source = 'manual')
);

-- Add index for google_place_id if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_services_google_place_id'
  ) THEN
    CREATE INDEX idx_services_google_place_id ON services(google_place_id);
  END IF;
END $$;

-- Add unique constraint for google_place_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_google_place_id_key'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT services_google_place_id_key UNIQUE (google_place_id);
  END IF;
END $$;

-- Update RLS policies
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

-- Add function to update geom column
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for geometry updates
DROP TRIGGER IF EXISTS update_service_geom ON services;
CREATE TRIGGER update_service_geom
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_geom();