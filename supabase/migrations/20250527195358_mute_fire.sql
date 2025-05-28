/*
  # Add stage column with default value and update existing sessions

  1. Changes
    - Add stage column with NOT NULL constraint and default value
    - Add check constraint for valid stage values
    - Update existing sessions to have a stage value
    - Add index for faster stage lookups

  2. Security
    - No changes to RLS policies needed
*/

-- Add stage column with check constraint if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' AND column_name = 'stage'
  ) THEN
    ALTER TABLE chat_sessions 
    ADD COLUMN stage text NOT NULL 
    DEFAULT 'awaiting_confirmation'
    CHECK (stage IN ('awaiting_confirmation', 'awaiting_service', 'completed'));
  END IF;
END $$;

-- Update any existing sessions without a stage
UPDATE chat_sessions 
SET stage = 'completed' 
WHERE stage IS NULL;

-- Create index for faster stage lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_stage 
ON chat_sessions(stage);