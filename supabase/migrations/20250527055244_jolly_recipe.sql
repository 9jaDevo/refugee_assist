/*
  # Add external services table

  1. New Tables
    - `external_services`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `address` (text)
      - `country` (text)
      - `source` (text)
      - `last_fetched_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `external_services` table
    - Add policy for public to read external services
    - Add policy for authenticated users to manage external services
*/

-- Create external_services table
CREATE TABLE IF NOT EXISTS external_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  address text NOT NULL,
  country text NOT NULL,
  source text NOT NULL,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT external_services_type_check CHECK (
    type = ANY (ARRAY['clinic'::text, 'shelter'::text, 'legal'::text, 'food'::text, 'education'::text, 'other'::text])
  )
);

-- Add country column to services table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'country'
  ) THEN
    ALTER TABLE services ADD COLUMN country text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE external_services ENABLE ROW LEVEL SECURITY;

-- Policies for external_services
CREATE POLICY "Allow public to read external services"
  ON external_services
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to manage external services"
  ON external_services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_external_services_updated_at
  BEFORE UPDATE ON external_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS external_services_type_country_idx 
  ON external_services (type, country);

CREATE INDEX IF NOT EXISTS external_services_last_fetched_idx 
  ON external_services (last_fetched_at);