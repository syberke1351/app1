/*
  # Create Reading History Table

  1. New Tables
    - `reading_history` - Track user's Quran reading progress
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `surah_number` (integer)
      - `surah_name` (text)
      - `last_ayah` (integer)
      - `total_ayahs` (integer)
      - `progress_percentage` (integer)
      - `last_read` (timestamp)

  2. Security
    - Enable RLS on `reading_history` table
    - Add policy for users to manage their own reading history
*/

CREATE TABLE IF NOT EXISTS reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  surah_name TEXT NOT NULL,
  last_ayah INTEGER NOT NULL DEFAULT 1,
  total_ayahs INTEGER NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  last_read TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own reading history"
  ON reading_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_history_user_surah 
ON reading_history(user_id, surah_number);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON reading_history(last_read);

-- Function to update reading history
CREATE OR REPLACE FUNCTION update_reading_history(
  p_user_id UUID,
  p_surah_number INTEGER,
  p_surah_name TEXT,
  p_last_ayah INTEGER,
  p_total_ayahs INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO reading_history (
    user_id, 
    surah_number, 
    surah_name, 
    last_ayah, 
    total_ayahs,
    progress_percentage,
    last_read
  )
  VALUES (
    p_user_id,
    p_surah_number,
    p_surah_name,
    p_last_ayah,
    p_total_ayahs,
    ROUND((p_last_ayah::FLOAT / p_total_ayahs::FLOAT) * 100),
    now()
  )
  ON CONFLICT (user_id, surah_number)
  DO UPDATE SET
    last_ayah = p_last_ayah,
    progress_percentage = ROUND((p_last_ayah::FLOAT / p_total_ayahs::FLOAT) * 100),
    last_read = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;