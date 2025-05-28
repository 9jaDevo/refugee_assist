/*
  # Add unique constraint for OSM services

  1. Changes
    - Add unique constraint on osm_id column in services table
    - Add NOT NULL constraint to osm_id for OSM-sourced records
    - Add check constraint to ensure osm_id is not empty when source is 'OSM'

  2. Notes
    - This ensures we can safely upsert OSM services without conflicts
    - Manual services (source = 'manual') can have NULL osm_id
*/

DO $$ 
BEGIN
  -- Add NOT NULL constraint to osm_id for OSM records
  ALTER TABLE services 
    ADD CONSTRAINT check_osm_id_not_null 
    CHECK (
      (source = 'OSM' AND osm_id IS NOT NULL) OR 
      (source = 'manual')
    );

  -- Add unique constraint on osm_id
  ALTER TABLE services 
    ADD CONSTRAINT services_osm_id_key 
    UNIQUE (osm_id);
END $$;