/*
  # Remove external services integration
  
  1. Changes
    - Drop external_services table
    - Add OSM-related columns to services table
    
  2. New Columns
    - osm_id (for OpenStreetMap reference)
    - source (to distinguish between manually added and OSM-sourced services)
*/

-- Drop external_services table
DROP TABLE IF EXISTS external_services;

-- Add OSM-related columns to services table
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS osm_id text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create index for OSM ID
CREATE INDEX IF NOT EXISTS idx_services_osm_id ON services(osm_id);

-- Update RLS policies to handle OSM data
CREATE POLICY "Allow public to read OSM services"
  ON services
  FOR SELECT
  TO public
  USING (true);