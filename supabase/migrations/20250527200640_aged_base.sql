/*
  # Add awaiting_country stage
  
  1. Changes
    - Update stage check constraint to include 'awaiting_country'
    - Add country column to chat_sessions if it doesn't exist
    - Ensure existing sessions have valid stages
  
  2. Notes
    - Maintains existing data integrity
    - Adds support for manual country entry flow
*/

-- Update stage check constraint
ALTER TABLE chat_sessions 
DROP CONSTRAINT IF EXISTS chat_sessions_stage_check;

ALTER TABLE chat_sessions 
ADD CONSTRAINT chat_sessions_stage_check 
CHECK (stage IN ('awaiting_confirmation', 'awaiting_country', 'awaiting_service', 'completed'));

-- Add country column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' AND column_name = 'country'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN country text;
  END IF;
END $$;

-- Update any existing sessions to have valid stages
UPDATE chat_sessions 
SET stage = 'completed' 
WHERE stage NOT IN ('awaiting_confirmation', 'awaiting_country', 'awaiting_service', 'completed');