/*
  # Initial Schema Setup for RefugeeAssist Platform

  1. New Tables
    - `services`
      - Stores information about service locations like clinics, shelters, etc.
      - Includes geographic coordinates for mapping
      - Contains contact information and supported languages
    - `chat_sessions`
      - Tracks user chat sessions 
    - `chat_messages`
      - Stores individual messages within chat sessions
      - Records language of each message for translation purposes

  2. Security
    - Enable RLS on all tables
    - Services table: authenticated users can insert/update/delete their own entries
    - Public users can read services data
    - Chat data accessible by the users who created it
*/

-- Services table for storing locations of refugee services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('clinic', 'shelter', 'legal', 'food', 'education', 'other')),
  address TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  hours TEXT NOT NULL,
  languages TEXT[] NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS services_geo_idx ON services (latitude, longitude);

-- Chat sessions table to track conversations
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table to store conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster chat message retrieval
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Allow public to read services"
  ON services
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to update their own services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to delete their own services"
  ON services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Chat sessions policies
CREATE POLICY "Allow public to create chat sessions"
  ON chat_sessions
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow users to read their own chat sessions"
  ON chat_sessions
  FOR SELECT
  TO PUBLIC
  USING (user_id IS NULL OR user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Allow public to insert chat messages"
  ON chat_messages
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow users to read messages from their sessions"
  ON chat_messages
  FOR SELECT
  TO PUBLIC
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE user_id IS NULL OR user_id = auth.uid()
    )
  );