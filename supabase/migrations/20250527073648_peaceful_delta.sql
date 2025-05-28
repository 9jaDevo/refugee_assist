/*
  # Allow null created_by for OSM services
  
  1. Changes
    - Make created_by column nullable to support system-imported services
    - Update RLS policies to handle null created_by values
    - Ensure only manually created services with null created_by can be modified
  
  2. Security
    - Updated RLS policies to maintain security with null created_by values
    - Only authenticated users can modify their own services or manual services
*/

ALTER TABLE services 
ALTER COLUMN created_by DROP NOT NULL;

-- Update RLS policy to handle null created_by values
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