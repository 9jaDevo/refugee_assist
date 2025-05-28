/*
  # Update services table and RLS policies
  
  1. Changes
    - Make created_by column nullable
    - Update RLS policies to use auth.uid() function
    - Handle null created_by values in policies
  
  2. Security
    - Maintain RLS policies for service management
    - Allow authenticated users to manage services they created
    - Allow management of manual services with null created_by
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