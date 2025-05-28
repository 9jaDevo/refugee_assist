/*
  # Add Chat Session Stages

  1. Changes
    - Add stage column to chat_sessions table
    - Set default stage to 'awaiting_confirmation'
    - Add check constraint for valid stages
    - Update existing sessions to have a stage

  2. Security
    - No changes to RLS policies needed
    - Maintain existing security model
*/

-- Add stage column with check constraint
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS stage text NOT NULL 
DEFAULT 'awaiting_confirmation'
CHECK (stage IN ('awaiting_confirmation', 'awaiting_service', 'completed'));

-- Update any existing sessions to have a stage
UPDATE chat_sessions 
SET stage = 'completed' 
WHERE stage IS NULL;